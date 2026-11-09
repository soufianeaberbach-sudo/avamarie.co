/* Public contact API. No customer content or credentials are logged.
 * Persist before email. Only provider acceptance is success; KV alone is not.
 * KV is recovery storage, NOT a queue, atomic lock, or rate-limit counter.
 */
const MAX_BYTES = 16 * 1024;
const RETENTION = 90 * 86400;
const ACTION = 'ava_contact';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)+$/;
const FIELDS = { 'first-name': 100, 'last-name': 100, email: 254, phone: 50, company: 200, message: 5000 };
const UNAVAILABLE = 'The contact service is temporarily unavailable. Please try again or email our team directly.';

class ApiError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}
function json(status, body, extra = {}) {
  return new Response(JSON.stringify(body), { status, headers: {
    'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'", ...extra,
  } });
}
function validEmail(value) {
  return typeof value === 'string' && value.length <= 254 && EMAIL.test(value) && !value.includes('..') &&
    value.split('@')[0].length <= 64 && value.split('@')[1].split('.').every(label => label.length <= 63);
}
function reject(status, code, message) { throw new ApiError(status, code, message); }
function isLocal(url, env) {
  return env.ENVIRONMENT === 'development' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
}
function configured(url, env) {
  const origins = (env.CONTACT_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  const local = isLocal(url, env);
  return (local || (url.protocol === 'https:' && origins.includes(url.origin))) &&
    !!(env.RESEND_API_KEY?.trim() && env.TURNSTILE_SECRET?.trim() && env.TURNSTILE_SITE_KEY?.trim() &&
       validEmail(env.CONTACT_TO_EMAIL) && validEmail(env.CONTACT_FROM_EMAIL) &&
       env.CONTACT_ENQUIRIES?.put && env.CONTACT_RATE_LIMITER?.limit);
}
async function digest(text) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
}
async function readJson(request) {
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    reject(415, 'content_type', 'Please submit this form using the website.');
  }
  if (Number(request.headers.get('content-length')) > MAX_BYTES) reject(413, 'too_large', 'Your message is too large.');
  const reader = request.body?.getReader();
  let length = 0;
  const chunks = [];
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; reader?.cancel().catch(() => {}); }, 10000);
  try {
    if (reader) while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_BYTES) {
        await reader.cancel().catch(() => {});
        reject(413, 'too_large', 'Your message is too large.');
      }
      chunks.push(value);
    }
    if (timedOut) reject(408, 'timeout', 'The submission timed out. Please try again.');
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
    catch { reject(400, 'invalid_json', 'The submission could not be read. Please try again.'); }
  } finally { clearTimeout(timer); reader?.releaseLock(); }
}
function validate(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) reject(400, 'validation', 'Please check your form fields.');
  const allowed = [...Object.keys(FIELDS), 'bot-field', 'token', 'submissionId'];
  if (Object.keys(raw).some(k => !allowed.includes(k) || typeof raw[k] !== 'string')) {
    reject(400, 'validation', 'Please check your form fields.');
  }
  if (raw['bot-field']) reject(400, 'spam', 'The submission could not be verified.');
  const data = {};
  for (const [key, max] of Object.entries(FIELDS)) {
    const value = (raw[key] || '').normalize('NFC').replace(/\r\n?/g, '\n').trim();
    if (value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value) ||
        (key !== 'message' && /[\r\n]/.test(value))) {
      reject(400, 'validation', `Please check the ${key.replace('-', ' ')} field and its length.`);
    }
    data[key] = key === 'message' ? value : value.replace(/\s+/g, ' ');
  }
  if (!validEmail(data.email)) {
    reject(400, 'validation', 'Please enter a valid email address.');
  }
  if (!data.message) reject(400, 'validation', 'Please enter a message.');
  if (!UUID.test(raw.submissionId || '')) reject(400, 'validation', 'Please reload the page and try again.');
  if (!raw.token || raw.token.length > 2048) reject(400, 'verification', 'Please complete the security verification again.');
  return data;
}
// Abort covers BOTH the network and reading/parsing the provider's response body.
async function providerJson(url, options, timeout) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    // Workers does not support redirect: 'error' (throws TypeError before network I/O).
    // Manual redirects stay blocked by the response.ok check below.
    const response = await fetch(url, { ...options, signal: controller.signal, redirect: 'manual' });
    if (!response.ok) { const error = new Error('provider_rejected'); error.status = response.status; throw error; }
    return await response.json();
  } finally { clearTimeout(timer); }
}
// Presentation only. Keep both alternatives deterministic for unchanged retries.
function contactEmail(data, id) {
  const escapeHtml = value => value.replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
  const contactDetails = [
    ['First Name', data['first-name'] || 'Not provided'],
    ['Last Name', data['last-name'] || 'Not provided'],
    ['Email', data.email],
    ['Phone', data.phone || 'Not provided'],
  ];
  const company = [['Company Name', data.company || 'Not provided']];
  const metadata = [
    ['Reference ID', id],
    ['Submission source', 'avamarie.co'],
    ['Submission type', 'Website contact form'],
  ];
  const textFields = fields => fields.map(([label, value]) => `${label}: ${value}`);
  const htmlFields = fields => `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;table-layout:fixed;">${fields.map(([label, value]) =>
    `<tr><th scope="row" align="left" valign="top" width="112" style="width:112px;padding:6px 16px 6px 0;font-size:14px;line-height:22px;font-weight:600;color:#555555;">${escapeHtml(label)}</th><td valign="top" style="padding:6px 0;font-size:14px;line-height:22px;word-wrap:break-word;overflow-wrap:anywhere;word-break:break-word;"><span dir="auto">${escapeHtml(value)}</span></td></tr>`
  ).join('')}</table>`;
  const section = (title, content) => `<tr><td style="padding:0 0 16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;border:1px solid #dddddd;table-layout:fixed;"><tr><td style="padding:16px;"><h2 style="margin:0 0 8px;font-size:16px;line-height:24px;font-weight:600;">${title}</h2>${content}</td></tr></table></td></tr>`;
  const message = `<div dir="auto" style="margin:0;font-size:14px;line-height:24px;white-space:pre-wrap;word-wrap:break-word;overflow-wrap:anywhere;word-break:break-word;">${escapeHtml(data.message).replace(/\n/g, '<br>')}</div>`;
  return {
    subject: 'New Website Enquiry — Ava Marie',
    text: [
      'Ava Marie Website Enquiry', 'New message received from the contact form', '',
      'CONTACT DETAILS', '---------------', ...textFields(contactDetails), '',
      'COMPANY', '-------', ...textFields(company), '',
      'MESSAGE', '-------', data.message, '',
      'REFERENCE / METADATA', '--------------------', ...textFields(metadata), '',
    ].join('\n'),
    // Tables, inline styles and the Outlook width wrapper require no CSS framework,
    // images, web fonts or external assets. Every customer value is escaped above.
    html: `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Ava Marie Website Enquiry</title></head>
<body style="margin:0;padding:0;background-color:#ffffff;color:#222222;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="width:100%;border-collapse:collapse;"><tr><td align="center" style="padding:24px 12px;">
<!--[if mso]><table role="presentation" width="640" align="center" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:640px;border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;text-align:left;">
<tr><td style="padding:0 0 24px;"><h1 style="margin:0 0 8px;font-size:24px;line-height:32px;font-weight:600;">Ava Marie Website Enquiry</h1><p style="margin:0;font-size:14px;line-height:22px;color:#666666;">New message received from the contact form</p></td></tr>
${section('Contact Details', htmlFields(contactDetails))}
${section('Company', htmlFields(company))}
${section('Message', message)}
${section('Reference / Metadata', htmlFields(metadata))}
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body></html>`,
  };
}
async function contact(request, env, url) {
  if (request.method !== 'POST') return json(405, { ok: false, code: 'method', message: 'Use POST.' }, { Allow: 'POST' });
  if (!configured(url, env)) reject(503, 'unavailable', UNAVAILABLE);
  if (request.headers.get('origin') !== url.origin || request.headers.get('sec-fetch-site') === 'cross-site') {
    reject(403, 'origin', 'Please submit this form from the Ava Marie website.');
  }
  // Anonymous public form: a generous shared-IP ceiling screens floods before Siteverify.
  // Cloudflare's native limiter is approximate per location, not a global quota.
  const ip = request.headers.get('cf-connecting-ip');
  if (!ip && !isLocal(url, env)) reject(503, 'unavailable', UNAVAILABLE);
  let permitted;
  try { permitted = await env.CONTACT_RATE_LIMITER.limit({ key: `ava-contact:${await digest(ip || 'local')}` }); }
  catch { reject(503, 'unavailable', UNAVAILABLE); }
  if (!permitted.success) return json(429, { ok: false, code: 'rate_limited', message: 'Too many attempts. Please wait a minute and try again.' }, { 'Retry-After': '60' });
  const raw = await readJson(request);
  const data = validate(raw);
  let verification;
  try {
    verification = await providerJson('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: env.TURNSTILE_SECRET, response: raw.token, ...(ip ? { remoteip: ip } : {}) }),
    }, 8000);
  } catch (error) {
    // Operational diagnostics only: never log Turnstile tokens, secrets, IPs or enquiry data.
    const reason = error?.message === 'provider_rejected' ? 'provider_http_error'
      : error?.name === 'AbortError' ? 'timeout'
      : error instanceof SyntaxError ? 'invalid_json'
      : error instanceof TypeError ? 'fetch_error' : 'unexpected_error';
    console.warn(JSON.stringify({
      event: 'contact_turnstile_siteverify_unavailable', reason,
      ...(Number.isInteger(error?.status) ? { httpStatus: error.status } : {}),
    }));
    reject(503, 'verification_unavailable', 'Security verification is unavailable. Please try again.');
  }
  const expectedHostname = isLocal(url, env) ? 'dummy-key-pass' : url.hostname;
  if (verification.success !== true || verification.action !== ACTION || verification.hostname !== expectedHostname) {
    reject(400, 'verification', 'Security verification failed. Please try again.');
  }
  // Stable for unchanged form retries; Resend deduplicates this exact email for 24 hours.
  // KV is eventual and deliberately NOT used as a duplicate lock.
  const id = await digest(JSON.stringify({ submissionId: raw.submissionId, data }));
  try {
    await env.CONTACT_ENQUIRIES.put(`enquiry:${id}`, JSON.stringify({
      id, receivedAt: new Date().toISOString(), data, emailState: 'unconfirmed',
    }), { expirationTtl: RETENTION });
  } catch { reject(503, 'storage', 'Your message could not be saved or sent. Please try again or email our team directly.'); }
  const email = contactEmail(data, id);
  let accepted;
  try {
    accepted = await providerJson('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json', 'Idempotency-Key': `ava-contact/${id}` },
      body: JSON.stringify({ from: env.CONTACT_FROM_EMAIL, to: [env.CONTACT_TO_EMAIL],
        reply_to: data.email, ...email }),
    }, 10000);
    if (typeof accepted.id !== 'string' || !accepted.id.trim()) throw new Error('invalid_acceptance');
  } catch {
    // A timeout may mean Resend accepted but its response was lost. Never claim sent.
    console.warn(JSON.stringify({ event: 'contact_email_unconfirmed', reference: id }));
    return json(502, { ok: false, code: 'email_unconfirmed', reference: id,
      message: 'Your enquiry was saved, but email submission could not be confirmed. Please retry or contact our team directly.' });
  }
  try {
    // A separate key avoids KV's per-key write frequency restriction.
    await env.CONTACT_ENQUIRIES.put(`accepted:${id}`, JSON.stringify({
      id, providerId: accepted.id, acceptedAt: new Date().toISOString(),
    }), { expirationTtl: RETENTION });
  } catch {
    // Provider acceptance remains true; operators must reconcile the missing marker.
    console.warn(JSON.stringify({ event: 'contact_acceptance_marker_failed', reference: id }));
  }
  return json(200, { ok: true, reference: id, message: 'Thank you. Your message has been submitted successfully.' });
}
// These are the routes declared by the existing compiled Admin router.
// Scope the shell fallback to real SPA routes; missing bundles and unknown paths
// retain a genuine 404. Static serving is routing, not an authentication bypass.
const ADMIN_ROUTE = /^\/admin\/(?:models(?:\/[^/]+)?|orders|planning|cutting|sewing|finishing|packing|materials|settings)\/?$/;
async function website(request, env, url) {
  if (url.pathname === '/index' || url.pathname === '/index/') {
    return new Response(null, { status: 301, headers: { Location: `/${url.search}` } });
  }
  const asset = await env.ASSETS.fetch(request);
  if (asset.status === 404 && ['GET', 'HEAD'].includes(request.method) && ADMIN_ROUTE.test(url.pathname)) {
    // Fetch the canonical directory URL: /admin/index.html would redirect back
    // to /admin/ under Cloudflare's default HTML handling and lose the SPA route.
    const shell = new URL(request.url);
    shell.pathname = '/admin/';
    return env.ASSETS.fetch(new Request(shell, request));
  }
  return asset;
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return website(request, env, url);
    try {
      if (url.pathname === '/api/contact-config') {
        if (request.method !== 'GET') return json(405, { ok: false, code: 'method' }, { Allow: 'GET' });
        if (!configured(url, env)) reject(503, 'unavailable', UNAVAILABLE);
        // Runtime configuration exposes ONLY the public key, never secrets or addresses.
        return json(200, { ok: true, siteKey: env.TURNSTILE_SITE_KEY });
      }
      if (url.pathname === '/api/contact') return await contact(request, env, url);
      return json(404, { ok: false, code: 'not_found' });
    } catch (error) {
      if (error instanceof ApiError) return json(error.status, { ok: false, code: error.code, message: error.message });
      console.warn(JSON.stringify({ event: 'contact_unexpected_failure' }));
      return json(503, { ok: false, code: 'unavailable', message: UNAVAILABLE });
    }
  },
};

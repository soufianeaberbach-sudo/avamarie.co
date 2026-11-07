/* Kept separate from the generated HTML; every entry point uses this module. */
class ContactError extends Error {}
const form = document.querySelector('form[name="contact"]');
if (form) {
  const button = form.querySelector('button[type="submit"]');
  const status = form.querySelector('[data-contact-status]');
  const fallback = form.querySelector('[data-contact-fallback]');
  const container = form.querySelector('[data-turnstile]');
  const originalButton = button.innerHTML;
  let busy = false;
  let widget;
  let loading;
  let pending;
  let identity;
  let identityFields;

  const feedback = message => { status.hidden = false; status.textContent = message; };
  const failVerification = () => {
    if (pending) { pending.reject(new ContactError('Security verification failed. Please try again.')); pending = undefined; }
  };
  async function requestJson(path, options = {}, timeout = 25000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(path, { ...options, signal: controller.signal, credentials: 'same-origin', headers: {
        Accept: 'application/json', ...options.headers,
      } });
      const data = await response.json();
      if (!response.ok || data.ok !== true) {
        // Error bodies must never be able to echo a success message.
        const messages = {
          validation: 'Please check your form fields and try again.',
          verification: 'Security verification failed. Please try again.',
          verification_unavailable: 'Security verification is unavailable. Please try again.',
          rate_limited: 'Too many attempts. Please wait a minute and try again.',
          email_unconfirmed: 'Your enquiry was saved, but email submission could not be confirmed. Please retry or contact our team directly.',
          storage: 'Your message could not be saved or sent. Please try again.',
        };
        throw new ContactError((Object.hasOwn(messages, data.code) ? messages[data.code] : '') || 'Submission could not be confirmed. Please try again or email our team directly.');
      }
      return data;
    } finally { clearTimeout(timer); }
  }
  async function prepareVerification() {
    if (widget !== undefined) return;
    if (loading) return loading;
    loading = (async () => {
      const config = await requestJson('/api/contact-config', {}, 10000);
      if (!config.siteKey) throw new ContactError('Security verification is unavailable. Please try again.');
      if (!window.turnstile) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          const timer = setTimeout(() => { script.remove(); reject(new ContactError('Security verification could not load. Please try again.')); }, 12000);
          script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
          script.async = true;
          script.onload = () => { clearTimeout(timer); resolve(); };
          script.onerror = () => { clearTimeout(timer); script.remove(); reject(new ContactError('Security verification could not load. Please try again.')); };
          document.head.appendChild(script);
        });
      }
      widget = window.turnstile.render(container, {
        sitekey: config.siteKey, action: 'ava_contact', execution: 'execute', appearance: 'interaction-only', size: 'flexible',
        'response-field': false, retry: 'never', 'refresh-expired': 'manual',
        callback: token => { if (pending) { pending.resolve(token); pending = undefined; } },
        'error-callback': () => { failVerification(); return true; },
        'expired-callback': failVerification, 'timeout-callback': failVerification,
      });
    })();
    try { await loading; } finally { loading = undefined; }
  }
  async function verify() {
    await prepareVerification();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending = undefined;
        reject(new ContactError('Security verification timed out. Please try again.'));
      }, 120000);
      pending = {
        resolve: token => { clearTimeout(timer); resolve(token); },
        reject: error => { clearTimeout(timer); reject(error); },
      };
      window.turnstile.reset(widget);
      window.turnstile.execute(widget);
    });
  }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || !form.reportValidity()) return;
    busy = true;
    button.disabled = true;
    button.innerHTML = '<span>SENDING…</span>';
    form.setAttribute('aria-busy', 'true');
    fallback.hidden = true;
    feedback('Verifying and submitting your message…');
    const fields = Object.fromEntries(new FormData(form));
    const snapshot = JSON.stringify(fields);
    // Reuse only for an unchanged retry in this page session. No PII in browser storage.
    try {
      if (snapshot !== identityFields) { identity = crypto.randomUUID(); identityFields = snapshot; }
      const token = await verify();
      const result = await requestJson('/api/contact', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...fields, token, submissionId: identity }),
      });
      if (typeof result.reference !== 'string' || !result.reference) throw new ContactError('Submission could not be confirmed. Please try again.');
      feedback('Thank you. Your message has been submitted successfully.');
      // Keep any edits made during verification/network transit.
      if (JSON.stringify(Object.fromEntries(new FormData(form))) === snapshot) form.reset();
      identityFields = undefined;
      identity = undefined;
    } catch (error) {
      feedback(error.name === 'AbortError'
        ? 'Submission could not be confirmed. Please try again or email our team directly.'
        : (error instanceof ContactError ? error.message : 'Submission could not be confirmed. Please try again or email our team directly.'));
      fallback.hidden = false;
    } finally {
      busy = false;
      button.disabled = false;
      button.innerHTML = originalButton;
      form.setAttribute('aria-busy', 'false');
      if (widget !== undefined) window.turnstile.reset(widget);
    }
  });
}

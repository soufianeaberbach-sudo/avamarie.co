import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker/index.js';

const origin = 'https://avamarie.co';
const body = { 'first-name': ' Ava ', 'last-name': 'Customer', email: 'client@example.com',
  phone: '+44 123 456', company: 'Fashion Co', message: 'A manufacturing enquiry.',
  'bot-field': '', token: 'mock-token', submissionId: 'b04d9669-f47d-4d16-9a30-9da9fd5b64cc' };
function setup(t, options = {}) {
  const records = new Map(), writes = [], calls = [];
  const env = { ENVIRONMENT: 'production', CONTACT_ORIGINS: origin,
    RESEND_API_KEY: 'fake-resend-secret', TURNSTILE_SECRET: 'fake-turnstile-secret',
    TURNSTILE_SITE_KEY: 'public-test-key', CONTACT_FROM_EMAIL: 'enquiries@example.com', CONTACT_TO_EMAIL: 'owner@example.com',
    CONTACT_RATE_LIMITER: { limit: async () => ({ success: true }) },
    CONTACT_ENQUIRIES: { put: async (key, value, config) => {
      writes.push({ key, config });
      if (options.failStorage || (options.failMarker && key.startsWith('accepted:'))) throw Error('KV failed');
      records.set(key, JSON.parse(value));
    } }, ASSETS: { fetch: async () => new Response('asset', { status: 200 }) } };
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    calls.push({ url, init });
    if (url.includes('siteverify')) {
      if (options.turnstileNetwork) throw Error('network');
      return Response.json(options.verification ?? { success: true, action: 'ava_contact', hostname: 'avamarie.co' }, { status: options.turnstileStatus ?? 200 });
    }
    assert.equal([...records.keys()].some(k => k.startsWith('enquiry:')), true, 'persist before email');
    if (options.resendNetwork) throw Error('network');
    if (options.resendTimeout) return new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(Error('aborted'))));
    return Response.json(options.resendBody ?? { id: 'email-provider-id' }, { status: options.resendStatus ?? 200 });
  });
  const submit = (changes = {}, headers = {}, requestBody) => worker.fetch(new Request(origin + '/api/contact', {
    method: 'POST', headers: { Origin: origin, 'CF-Connecting-IP': '192.0.2.10', 'Content-Type': 'application/json', ...headers },
    body: requestBody ?? JSON.stringify({ ...body, ...changes }),
  }), env);
  return { env, records, writes, calls, submit };
}
test('valid submission: normalized fields, private storage, provider acceptance and safe responses', async t => {
  const h = setup(t); const res = await h.submit(); const data = await res.json();
  assert.equal(res.status, 200); assert.equal(data.ok, true); assert.match(data.message, /submitted successfully/);
  assert.equal(h.records.get('enquiry:' + data.reference).data['first-name'], 'Ava');
  assert.equal(h.records.get('accepted:' + data.reference).providerId, 'email-provider-id');
  assert.ok(h.writes.every(w => w.config.expirationTtl === 90 * 86400));
  const email = JSON.parse(h.calls[1].init.body);
  assert.equal(email.reply_to, body.email); assert.deepEqual(email.to, [h.env.CONTACT_TO_EMAIL]);
  assert.equal(email.subject, 'New Website Enquiry — Ava Marie');
  assert.equal(typeof email.html, 'string'); assert.equal(typeof email.text, 'string');
  assert.equal(email.from, h.env.CONTACT_FROM_EMAIL);
  assert.equal(h.calls[1].init.headers.Authorization, `Bearer ${h.env.RESEND_API_KEY}`);
  assert.equal(h.calls[1].init.headers['Idempotency-Key'], `ava-contact/${data.reference}`);
  for (const [label, value] of [['First Name','Ava'],['Last Name',body['last-name']],['Email',body.email],['Phone',body.phone],['Company Name',body.company],['Reference ID',data.reference],['Submission source','avamarie.co'],['Submission type','Website contact form']]) {
    assert.ok(email.text.includes(`${label}: ${value}`));
    assert.ok(email.html.includes(label)); assert.ok(email.html.includes(value));
  }
  for (const heading of ['Contact Details','Company','Message','Reference / Metadata']) assert.match(email.html, new RegExp(`<h2[^>]*>${heading}</h2>`));
  assert.ok(email.text.includes(body.message)); assert.ok(email.html.includes(body.message));
  assert.equal(res.headers.get('access-control-allow-origin'), null);
  assert.equal(res.headers.get('cache-control'), 'no-store');
  const stored = JSON.stringify([...h.records]);
  for (const privateValue of ['fake-resend-secret', 'fake-turnstile-secret', body.token, '192.0.2.10']) assert.ok(!stored.includes(privateValue));
});
for (const [label, changes] of Object.entries({ 'missing email': {email:''}, 'missing message': {message:''},
  'blank message': {message:' \r\n '}, 'invalid email': {email:'bad@address'}, 'email header injection': {email:'a@example.com\r\nBcc:foo@example.com'},
  'name header injection': {'first-name':'a\nb'}, 'long message': {message:'x'.repeat(5001)}, 'long phone': {phone:'1'.repeat(51)},
  'non-string': {company: {}}, 'array field': {message: ['hello']}, 'control characters': {message:'a\u0000b'},
  'bad request identity': {submissionId:'not-a-uuid'}, 'honeypot': {'bot-field':'spam'},
  'missing token': {token:undefined}, 'empty token': {token:''}, 'long token': {token:'x'.repeat(2049)},
  'unknown fields': {admin:'true'} })) {
  test('rejects ' + label, async t => { const h=setup(t); const r=await h.submit(changes); assert.equal(r.status,400); assert.equal((await r.json()).ok,false); assert.equal(h.calls.length,0); assert.equal(h.records.size,0); });
}
test('optional fields stay optional; multiline messages survive', async t => {
  const h=setup(t); const r=await h.submit({'first-name':'','last-name':'',company:'',phone:'',message:'one\r\ntwo'});
  assert.equal(r.status,200); assert.equal([...h.records.values()][0].data.message,'one\ntwo');
});
test('customer HTML is escaped in HTML and preserved as plain text', async t => {
  const h=setup(t); const r=await h.submit({message:'<script>alert(1)</script><img src=x onerror=alert(1)>',company:'<b>Brand</b>'});
  assert.equal(r.status,200); const email=JSON.parse(h.calls[1].init.body);
  assert.match(email.html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(email.html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.match(email.html, /&lt;b&gt;Brand&lt;\/b&gt;/);
  assert.doesNotMatch(email.html, /<(script|img|b)\b/i);
  assert.match(email.text, /<script>/);
});
for (const key of ['RESEND_API_KEY','CONTACT_TO_EMAIL','CONTACT_FROM_EMAIL','TURNSTILE_SITE_KEY','TURNSTILE_SECRET','CONTACT_ORIGINS','CONTACT_ENQUIRIES','CONTACT_RATE_LIMITER']) {
  test('fails closed without ' + key, async t=>{const h=setup(t);delete h.env[key];const r=await h.submit();assert.equal(r.status,503);assert.equal(h.calls.length,0);assert.equal(h.records.size,0);});
}
for (const [label,headers] of [['foreign origin',{Origin:'https://evil.test'}],['missing origin',{Origin:''}],['null origin',{Origin:'null'}],['cross-site',{'Sec-Fetch-Site':'cross-site'}]]) {
  test('rejects '+label,async t=>{const h=setup(t);assert.equal((await h.submit({},headers)).status,403);assert.equal(h.calls.length,0);});
}
for(const verification of [{success:false},{success:true,action:'other',hostname:'avamarie.co'},{success:true,action:'ava_contact',hostname:'evil.test'},{success:true,action:'ava_contact'},{success:'true',action:'ava_contact',hostname:'avamarie.co'}]) {
  test('rejects invalid Siteverify context '+JSON.stringify(verification), async t=>{const h=setup(t,{verification});assert.equal((await h.submit()).status,400);assert.equal(h.calls.length,1);assert.equal(h.records.size,0);});
}
for(const options of [{turnstileNetwork:true},{turnstileStatus:500}])test('Siteverify outage fails safely '+JSON.stringify(options),async t=>{const h=setup(t,options);assert.equal((await h.submit()).status,503);assert.equal(h.records.size,0);});
for(const options of [{resendStatus:401},{resendStatus:422},{resendStatus:429},{resendStatus:500},{resendNetwork:true},{resendBody:{}},{resendBody:{id:''}}]) {
  test('Resend failure is not success '+JSON.stringify(options),async t=>{const h=setup(t,options);const r=await h.submit();assert.equal(r.status,502);assert.equal((await r.json()).ok,false);assert.equal(h.records.size,1);assert.ok([...h.records.keys()][0].startsWith('enquiry:'));});
}
test('Resend timeout preserves enquiry and never claims acceptance',async t=>{const h=setup(t,{resendTimeout:true});const r=await h.submit();assert.equal(r.status,502);assert.equal(h.records.size,1);});
test('failed initial persistence prevents email',async t=>{const h=setup(t,{failStorage:true});assert.equal((await h.submit()).status,503);assert.equal(h.calls.length,1);});
test('failed acceptance marker does not deny real provider acceptance',async t=>{const h=setup(t,{failMarker:true});assert.equal((await h.submit()).status,200);assert.equal(h.records.size,1);});
test('retries of same fields keep identical Resend payload/idempotency key',async t=>{const h=setup(t);await h.submit();await h.submit({token:'new-token'});assert.equal(h.calls[1].init.body,h.calls[3].init.body);assert.equal(h.calls[1].init.headers['Idempotency-Key'],h.calls[3].init.headers['Idempotency-Key']);});
test('abuse limit returns 429 before provider/storage work',async t=>{const h=setup(t);let count=0;h.env.CONTACT_RATE_LIMITER.limit=async()=>({success:++count<=2});assert.equal((await h.submit()).status,200);assert.equal((await h.submit()).status,200);const r=await h.submit();assert.equal(r.status,429);assert.equal(r.headers.get('retry-after'),'60');assert.equal(h.calls.length,4);});
test('limiter outage fails closed',async t=>{const h=setup(t);h.env.CONTACT_RATE_LIMITER.limit=async()=>{throw Error('outage')};assert.equal((await h.submit()).status,503);assert.equal(h.calls.length,0);});
test('missing trusted client IP fails closed in production',async t=>{const h=setup(t);assert.equal((await h.submit({}, {'CF-Connecting-IP':''})).status,503);});
test('rejects oversized bytes even without Content-Length',async t=>{const h=setup(t);assert.equal((await h.submit({}, {}, ' '.repeat(16385))).status,413);assert.equal(h.calls.length,0);});
test('rejects oversized declared body',async t=>{const h=setup(t);assert.equal((await h.submit({}, {'Content-Length':'999999'})).status,413);});
for (const [label,payload,headers,expected] of [['malformed','{',{},400],['array','[]',{},400],['null','null',{},400],['form','message=hi',{'Content-Type':'application/x-www-form-urlencoded'},415],['text','hi',{'Content-Type':'text/plain'},415]]) {
  test('rejects '+label,async t=>{const h=setup(t);assert.equal((await h.submit({}, headers, payload)).status,expected);});
}
test('all unsupported HTTP methods return structured 405',async t=>{const h=setup(t);for(const method of ['GET','HEAD','OPTIONS','PUT','DELETE']){const r=await worker.fetch(new Request(origin+'/api/contact',{method}),h.env);assert.equal(r.status,405);assert.equal(r.headers.get('allow'),'POST');}assert.equal(h.calls.length,0);});
test('runtime public configuration exposes no secrets or recipient',async t=>{const h=setup(t);const r=await worker.fetch(new Request(origin+'/api/contact-config'),h.env);assert.deepEqual(await r.json(),{ok:true,siteKey:'public-test-key'});});
test('unknown API stays JSON; website assets retain fallback',async t=>{const h=setup(t);assert.equal((await worker.fetch(new Request(origin+'/api/other'),h.env)).status,404);const r=await worker.fetch(new Request(origin+'/portfolio/'),h.env);assert.equal(await r.text(),'asset');});
test('development flag cannot bypass production-host validation',async t=>{const h=setup(t);h.env.ENVIRONMENT='development';delete h.env.TURNSTILE_SECRET;assert.equal((await h.submit()).status,503);});
test('rejects DNS label beyond email limits',async t=>{const h=setup(t);assert.equal((await h.submit({email:'a@'+'b'.repeat(64)+'.com'})).status,400);});
test('rejects streamed oversized body before parsing',async t=>{const h=setup(t);const stream=new ReadableStream({start(c){c.enqueue(new Uint8Array(9000));c.enqueue(new Uint8Array(9000));c.close();}});const r=await worker.fetch(new Request(origin+'/api/contact',{method:'POST',headers:{Origin:origin,'CF-Connecting-IP':'192.0.2.10','Content-Type':'application/json'},body:stream,duplex:'half'}),h.env);assert.equal(r.status,413);assert.equal(h.calls.length,0);});
test('rejects invalid UTF-8',async t=>{const h=setup(t);assert.equal((await h.submit({}, {}, new Uint8Array([255,254]))).status,400);});
test('rejects unlisted production host even with matching origin',async t=>{const h=setup(t);const r=await worker.fetch(new Request('https://preview.example/api/contact',{method:'POST',headers:{Origin:'https://preview.example'},body:JSON.stringify(body)}),h.env);assert.equal(r.status,503);});
test('local test keys still require Siteverify and all bindings',async t=>{const h=setup(t,{verification:{success:true,action:'ava_contact',hostname:'dummy-key-pass'}});h.env.ENVIRONMENT='development';const r=await worker.fetch(new Request('http://localhost:8787/api/contact',{method:'POST',headers:{Origin:'http://localhost:8787','Content-Type':'application/json'},body:JSON.stringify(body)}),h.env);assert.equal(r.status,200);assert.equal(h.calls.length,2);});
for (const path of ['/index','/index/']) test('legacy canonical redirect '+path,async t=>{
 const h=setup(t);let calls=0;h.env.ASSETS.fetch=async()=>{calls++;return new Response('wrong asset');};
 for(const method of ['GET','HEAD','POST']){const r=await worker.fetch(new Request(origin+path+'?campaign=sample',{method}),h.env);assert.equal(r.status,301);assert.equal(r.headers.get('location'),'/?campaign=sample');}
 assert.equal(calls,0);
});
for (const path of ['/admin/models','/admin/models/AM-001','/admin/orders','/admin/planning','/admin/cutting','/admin/sewing','/admin/finishing','/admin/packing','/admin/materials','/admin/settings/']) test('Admin SPA deep link '+path,async t=>{
 const h=setup(t);const calls=[];h.env.ASSETS.fetch=async request=>{const url=new URL(request.url);calls.push([url.pathname,url.search,request.method]);return new Response(request.method==='HEAD'?null:(url.pathname==='/admin/'?'admin shell':'not found'),{status:url.pathname==='/admin/'?200:404});};
 for(const method of ['GET','HEAD']){calls.length=0;const r=await worker.fetch(new Request(origin+path+'?filter=open',{method}),h.env);assert.equal(r.status,200);assert.deepEqual(calls,[[path,'?filter=open',method],['/admin/','?filter=open',method]]);if(method==='HEAD')assert.equal(await r.text(),'');else assert.equal(await r.text(),'admin shell');}
});
for(const path of ['/missing','/admin/missing','/admin/assets/missing.js','/admin/missing.css','/administrator/orders']) test('unmatched route retains 404 '+path,async t=>{const h=setup(t);let count=0;h.env.ASSETS.fetch=async()=>{count++;return new Response('404',{status:404});};const r=await worker.fetch(new Request(origin+path),h.env);assert.equal(r.status,404);assert.equal(count,1);});
test('Admin static assets and non-GET requests never become shell responses',async t=>{const h=setup(t);let count=0;h.env.ASSETS.fetch=async request=>{count++;return new Response('asset',{status:request.method==='GET'?200:405});};assert.equal((await worker.fetch(new Request(origin+'/admin/assets/app.js'),h.env)).status,200);assert.equal((await worker.fetch(new Request(origin+'/admin/orders',{method:'POST'}),h.env)).status,405);assert.equal(count,2);});
test('formatted alternatives preserve multilingual messages, blank lines and escaped field values', async t => {
  const h=setup(t);
  const customerEmail="o'connor+team@example.com";
  const message='مرحبًا — Bonjour & <sample> "L’été"\r\n\r\nLine 3  double spaces';
  const r=await h.submit({'first-name':`Ava & <Marie> "O'Neil"`,email:customerEmail,message});
  assert.equal(r.status,200);
  const email=JSON.parse(h.calls[1].init.body);
  assert.equal(email.reply_to,customerEmail);
  assert.equal(email.subject,'New Website Enquiry — Ava Marie');
  assert.ok(email.text.includes(message.replace(/\r\n/g,'\n')));
  assert.ok(email.text.includes(`First Name: Ava & <Marie> "O'Neil"`));
  assert.ok(email.html.includes('Ava &amp; &lt;Marie&gt; &quot;O&#39;Neil&quot;'));
  assert.ok(email.html.includes('مرحبًا — Bonjour &amp; &lt;sample&gt; &quot;L’été&quot;<br><br>Line 3  double spaces'));
  assert.ok(email.html.includes('o&#39;connor+team@example.com'));
  assert.doesNotMatch(email.html, /<sample>|<Marie>|<script\b/i);
  for (const value of ['fake-resend-secret','fake-turnstile-secret',body.token]) {
    assert.ok(!email.html.includes(value)); assert.ok(!email.text.includes(value));
  }
});
test('empty optional contact details are clearly identified in both alternatives', async t => {
  const h=setup(t);const r=await h.submit({'first-name':'','last-name':'',phone:'',company:''});
  assert.equal(r.status,200);const email=JSON.parse(h.calls[1].init.body);
  for(const key of ['html','text'])assert.equal(email[key].match(/Not provided/g).length,4);
  for(const label of ['First Name','Last Name','Phone','Company Name'])assert.ok(email.text.includes(`${label}: Not provided`));
});
test('the full maximum-length message is retained in HTML and text', async t => {
  const h=setup(t);const message='x'.repeat(4989)+'\nFinal line';assert.equal(message.length,5000);
  assert.equal((await h.submit({message})).status,200);
  const email=JSON.parse(h.calls[1].init.body);
  assert.ok(email.text.includes(message)); assert.ok(email.html.includes(message.replace('\n','<br>')));
});

import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
const success = { ok:true, reference:'mock-reference', message:'Thank you. Your message has been submitted successfully.' };
async function setup(page, path='/contact/') {
  // No live providers or third-party content. Turnstile's browser API is mocked.
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname === 'challenges.cloudflare.com') return route.fulfill({contentType:'application/javascript',body:`
      window.turnstile = {
        render(el, options) { window.widgetOptions = options; return 'widget'; },
        reset() {}, execute() { window.widgetOptions.callback('mock-token'); }
      };`});
    if (url.origin !== 'http://127.0.0.1:8080') return route.abort();
    if (/\.(mp4)(\?|$)/.test(url.pathname)) return route.abort();
    return route.continue();
  });
  await page.route('**/api/contact-config', route=>route.fulfill({json:{ok:true,siteKey:'mock-public-key'}}));
  await page.goto(path);
  if (path !== '/contact/') await page.evaluate(() => window.goPage('contact'));
  await page.addStyleTag({content:'.sr{opacity:1!important;transform:none!important;transition:none!important}'});
  await page.locator('#contact-email').fill('customer@example.com');
  await page.locator('#contact-message').fill('Please discuss our production order.');
}
const button = page => page.locator('form[name="contact"] button');
const status = page => page.locator('[data-contact-status]');
test('correct endpoint, sending state, duplicate blocking, confirmed reset',async({page})=>{
  await setup(page);let count=0,release;
  await page.route('**/api/contact',async route=>{count++;await new Promise(r=>release=r);expect(route.request().method()).toBe('POST');const body=route.request().postDataJSON();expect(body.email).toBe('customer@example.com');expect(body.token).toBe('mock-token');expect(body.submissionId).toMatch(/^[0-9a-f-]{36}$/);await route.fulfill({json:success});});
  await button(page).click();await expect(button(page)).toHaveText('SENDING…');await expect(button(page)).toBeDisabled();
  await page.locator('form[name="contact"]').evaluate(form=>form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
  await expect.poll(()=>count).toBe(1);release();
  await expect(status(page)).toHaveText(success.message);await expect(page.locator('#contact-email')).toHaveValue('');await expect(button(page)).toBeEnabled();
});
for(const [label,response] of [['validation',{status:400,json:{ok:false,message:'Please check your message.'}}],['provider',{status:502,json:{ok:false,message:'Email could not be confirmed.'}}],['rate limit',{status:429,json:{ok:false,message:'Please wait a minute.'}}],['503',{status:503,json:{ok:false,message:'Service is unavailable.'}}],['malformed success',{status:200,json:{ok:true}}],['false ok with 200',{status:200,json:{ok:false}}],['HTML instead of JSON',{status:200,contentType:'text/html',body:'<p>not sent</p>'}],['HTTP error despite true ok',{status:500,json:success}]]) {
  test(label+' never displays success and preserves inputs',async({page})=>{await setup(page);await page.route('**/api/contact',route=>route.fulfill(response));await button(page).click();await expect(page.locator('[data-contact-fallback]')).toBeVisible();await expect(status(page)).not.toContainText('submitted successfully');await expect(page.locator('#contact-email')).toHaveValue('customer@example.com');await expect(page.locator('#contact-message')).toHaveValue('Please discuss our production order.');await expect(button(page)).toBeEnabled();});
}
test('network failure preserves data and unchanged retry identity',async({page})=>{await setup(page);let first;
 await page.route('**/api/contact',route=>{first=route.request().postDataJSON();return route.abort();});await button(page).click();await expect(page.locator('[data-contact-fallback]')).toBeVisible();await expect(button(page)).toBeEnabled();
 await page.route('**/api/contact',route=>{expect(route.request().postDataJSON().submissionId).toBe(first.submissionId);return route.fulfill({json:success});});await button(page).click();await expect(status(page)).toHaveText(success.message);
});
test('Turnstile rejection never reaches contact endpoint',async({page})=>{await setup(page);let count=0;await page.route('**/api/contact',route=>{count++;return route.fulfill({json:success});});
 await page.route('**/turnstile/v0/api.js?render=explicit',route=>route.fulfill({contentType:'application/javascript',body:`window.turnstile={render(el,o){window.opts=o;return 'w'},reset(){},execute(){window.opts['error-callback']()}};`}));
 await button(page).click();await expect(status(page)).toContainText('verification failed');expect(count).toBe(0);await expect(page.locator('#contact-email')).toHaveValue('customer@example.com');await expect(button(page)).toBeEnabled();
});
test('configuration unavailable fails safely',async({page})=>{await setup(page);await page.route('**/api/contact-config',route=>route.fulfill({status:503,json:{ok:false,message:'Contact service unavailable.'}}));await button(page).click();await expect(status(page)).toContainText('could not be confirmed');await expect(page.locator('[data-contact-fallback]')).toBeVisible();});
test('edits during pending send are retained',async({page})=>{await setup(page);let release;await page.route('**/api/contact',async route=>{await new Promise(r=>release=r);await route.fulfill({json:success});});await button(page).click();await expect.poll(()=>!!release).toBe(true);await page.locator('#contact-message').fill('A new message typed while sending');release();await expect(status(page)).toHaveText(success.message);await expect(page.locator('#contact-message')).toHaveValue('A new message typed while sending');});
for(const path of ['/','/our-story/','/manufacturing/','/services/','/portfolio/','/partners/','/contact/']) {
 test('shared generated form works from '+path,async({page})=>{await setup(page,path);if(path!='/contact/')await page.evaluate(()=>window.goPage('contact'));await page.route('**/api/contact',route=>route.fulfill({json:success}));await button(page).click();await expect(status(page)).toHaveText(success.message);});
}
test('JavaScript unavailable offers existing business email',async({browser})=>{const context=await browser.newContext({javaScriptEnabled:false});const page=await context.newPage();await page.goto('/contact/');await expect(page.locator('#pg-contact noscript a')).toHaveText('Anwar@sweetthreadsltd.com');await expect(page.locator('#pg-contact noscript a')).toBeVisible();await expect(page.locator('form[name="contact"]')).toBeHidden();await context.close();});
// Baseline documents come from the audited main SHA. No generated HTML is independently edited.
for(const width of [1440,390])for(const path of ['/','/contact/','/manufacturing/','/services/','/portfolio/']) {
 test('visual preservation '+width+' '+path,async({page},testInfo)=>{
  await page.setViewportSize({width,height:900});
  const baselinePath=path==='/'?'index.html':path.slice(1)+'index.html';
  const baseline=execFileSync('git',['show','24e7365:'+baselinePath],{encoding:'utf8',maxBuffer:2e6});
  await page.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin!=='http://127.0.0.1:8080'||/\.mp4$/.test(url.pathname))return route.abort();return route.continue();});
  const style='*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}.sr{opacity:1!important;transform:none!important}video,iframe{visibility:hidden!important}';
  await page.route('http://127.0.0.1:8080'+path,route=>route.fulfill({contentType:'text/html',body:baseline}));
  await page.goto(path);await page.addStyleTag({content:style});await page.evaluate(()=>document.fonts.ready);
  const baselineWidth=await page.evaluate(()=>document.documentElement.scrollWidth);
  const before=await page.screenshot({fullPage:true,animations:'disabled',path:testInfo.outputPath('before.png')});
  await page.unroute('http://127.0.0.1:8080'+path);await page.goto(path);await page.addStyleTag({content:style});await page.evaluate(()=>document.fonts.ready);
  const after=await page.screenshot({fullPage:true,animations:'disabled',path:testInfo.outputPath('after.png')});
  // Browser images/fonts/media are controlled identically for old and new documents.
  expect(after.equals(before)).toBe(true);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(baselineWidth);
 });
}
test('main navigation reaches every public section',async({page})=>{await setup(page,'/');for(const slug of ['story','journey','services','portfolio','partners','contact','home']){await page.locator('nav .nav-link[data-pg="'+slug+'"]').click();await expect(page.locator('#pg-'+slug)).toHaveClass(/active/);}});
test('Wrangler routes API before assets, fails closed, and denies development files',async({request})=>{
 for(const accept of ['application/json','text/html']){const r=await request.post('http://127.0.0.1:8787/api/contact',{headers:{Accept:accept,Origin:'http://127.0.0.1:8787'},data:{}});expect(r.status()).toBe(503);expect((await r.json()).ok).toBe(false);}
 for(const path of ['/worker/index.js','/wrangler.jsonc','/.dev.vars','/package.json','/scripts/build.py','/docs/CONTACT-ACTIVATION.md','/.git/config']){const r=await request.get('http://127.0.0.1:8787'+path);expect(r.status()).toBe(404);}
 for(const path of ['/','/contact/','/portfolio/','/manufacturing/','/services/','/js/contact.js','/admin/','/erp.html','/views/dashboard.html','/AVA%20MARIE/icon.png']){expect((await request.get('http://127.0.0.1:8787'+path)).status()).toBe(200);}
 expect((await request.get('http://127.0.0.1:8787/api/contact')).status()).toBe(405);
});
test('network timeout re-enables form and preserves customer input',async({page})=>{
 await setup(page);await page.clock.install();
 await page.evaluate(()=>{const original=window.fetch;window.fetch=(path,options)=>path==='/api/contact'?new Promise((_,reject)=>options.signal.addEventListener('abort',()=>reject(new DOMException('timeout','AbortError')))):original(path,options);});
 await button(page).click();await expect(button(page)).toHaveText('SENDING…');
 await expect.poll(()=>page.evaluate(()=>!!window.widgetOptions)).toBe(true);
 await page.clock.fastForward(26000);await expect(page.locator('[data-contact-fallback]')).toBeVisible();await expect(status(page)).not.toContainText('submitted successfully');await expect(button(page)).toBeEnabled();await expect(page.locator('#contact-message')).toHaveValue('Please discuss our production order.');
});
test('unavailable Turnstile script preserves data and re-enables submission',async({page})=>{await setup(page);await page.route('**/turnstile/v0/api.js?render=explicit',route=>route.abort());await button(page).click();await expect(status(page)).toContainText('could not load');await expect(button(page)).toBeEnabled();await expect(page.locator('#contact-email')).toHaveValue('customer@example.com');});
test('mobile navigation and form submission',async({page})=>{await page.setViewportSize({width:390,height:844});await setup(page);await page.evaluate(()=>window.goPage('home'));await page.locator('#ham').click();await page.locator('#mobileMenu .mob-link[href="/contact/"]').click();await expect(page.locator('#pg-contact')).toHaveClass(/active/);await page.route('**/api/contact',route=>route.fulfill({json:success}));await button(page).click();await expect(status(page)).toHaveText(success.message);});

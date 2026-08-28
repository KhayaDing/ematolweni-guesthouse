const {test,expect}=require('@playwright/test');
const AxeBuilder=require('@axe-core/playwright').default;
const collections=require('../src/data/gallery.json').filter(c=>c.status==='visible');
const pages=['index.html','gallery.html','policies.html','privacy.html','404.html','enquiry.html'];
// All tests are local. Prevent any form submission or external navigation even on regression.
let errors;
test.beforeEach(async({page})=>{
  errors=[];
  await page.route('**/*',async route=>{
    const request=route.request(),url=new URL(request.url());
    if(!['GET','HEAD'].includes(request.method())){errors.push('Blocked write: '+request.method()+' '+url.pathname);return route.abort();}
    if(url.origin==='https://ematolweni-guesthouse.netlify.app') {
      const response=await page.request.get('http://127.0.0.1:8091'+url.pathname+url.search);
      return route.fulfill({response});
    }
    if(url.hostname!=='127.0.0.1' && !['stylesheet','font'].includes(request.resourceType()))return route.fulfill({status:200,contentType:'text/html',body:''});
    return route.continue();
  });
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  page.on('response',response=>{if(response.url().startsWith('http://127.0.0.1:8091')&&response.status()>=400)errors.push(response.status()+' '+response.url());});
});
test.afterEach(()=>expect(errors).toEqual([]));

for(const name of pages)test('layout, links and accessibility: '+name,async({page},testInfo)=>{
  await page.goto('/'+name);
  await page.evaluate(()=>document.fonts.ready);
  await expect(page.locator('main')).toBeVisible();
  await expect(page.locator('.site-footer')).toBeAttached();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
  const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
  await testInfo.attach('accessibility',{body:JSON.stringify(result.violations,null,2),contentType:'application/json'});
  expect(result.violations).toEqual([]);
  await page.screenshot({path:testInfo.outputPath(name+'.png'),fullPage:true});
});

test('gallery expansion, navigation and keyboard lightbox',async({page})=>{
  await page.goto('/gallery.html');
  const room3=page.locator('#room3');
  await page.getByRole('link',{name:'Room 3',exact:true}).click();
  await expect(page.getByRole('link',{name:'Room 3',exact:true})).toHaveAttribute('aria-current','location');
  await expect(room3.getByText('Photos coming soon')).toBeVisible();
  await expect(room3.getByText('This room is currently under renovation.')).toBeVisible();
  await expect(room3.locator('.gallery-card, .gallery-show-more-btn')).toHaveCount(0);
  expect(await page.locator('.gallery-section').evaluateAll(sections=>sections.map(section=>section.id))).toEqual(require('../src/data/gallery.json').map(collection=>collection.id));
  await room3.screenshot({path:test.info().outputPath('room3-placeholder.png')});
  for(const collection of collections){
    const section=page.locator('#'+collection.id);
    await expect(section.locator('.gallery-card')).toHaveCount(collection.photos.length);
    await expect(section.locator('.gallery-card:visible')).toHaveCount(6);
    const toggle=section.locator('.gallery-show-more-btn');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded','true');
    await expect(section.locator('.gallery-card:visible')).toHaveCount(collection.photos.length);
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded','false');
  }
  const first=page.locator('#exterior .gallery-card').first();
  await first.focus();await first.press('Enter');
  const dialog=page.getByRole('dialog');
  const close=page.getByRole('button',{name:'Close photo viewer'});
  await expect(dialog).toBeVisible();await expect(close).toBeFocused();
  expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze()).violations).toEqual([]);
  const photo=page.locator('#img01');
  await expect(photo).toHaveAttribute('alt',collections[0].photos[0].alt);
  await close.press('ArrowRight');await expect(photo).toHaveAttribute('alt',collections[0].photos[1].alt);
  await close.press('ArrowLeft');await expect(photo).toHaveAttribute('alt',collections[0].photos[0].alt);
  await close.press('ArrowLeft');await expect(photo).toHaveAttribute('alt',collections.at(-1).photos.at(-1).alt);
  await close.press('Shift+Tab');await expect(page.getByRole('button',{name:'Next Image'})).toBeFocused();
  await page.keyboard.press('Tab');await expect(close).toBeFocused();
  await page.keyboard.press('Escape');await expect(dialog).toBeHidden();await expect(first).toBeFocused();
  await first.press('Space');await expect(dialog).toBeVisible();await close.click();await expect(dialog).toBeHidden();
  await first.click();await page.locator('#imageModal').click({position:{x:2,y:2}});await expect(dialog).toBeHidden();
  await page.getByRole('link',{name:'Room 8',exact:true}).click();
  await expect(page.getByRole('link',{name:'Room 8',exact:true})).toHaveAttribute('aria-current','location');
});

test('mobile menu and carousel controls',async({page})=>{
  await page.goto('/index.html');
  if(page.viewportSize().width<=900){
    const toggle=page.locator('#mobile-menu');
    await toggle.click();await expect(toggle).toHaveAttribute('aria-expanded','true');
    expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze()).violations).toEqual([]);
    await toggle.press('Escape');await expect(toggle).toHaveAttribute('aria-expanded','false');await expect(toggle).toBeFocused();
    await toggle.click();await page.locator('#main-navigation').getByRole('link',{name:'About',exact:true}).click();
    await expect(toggle).toHaveAttribute('aria-expanded','false');
  }
  await page.getByRole('button',{name:'Show slide 2',exact:true}).click();
  await expect(page.locator('.hero-slide.active')).toHaveAttribute('data-slide','2');
  if(page.viewportSize().width<=600)await page.getByRole('button',{name:'Show slide 3',exact:true}).click();
  else await page.getByRole('button',{name:'Next slide',exact:true}).click();
  await expect(page.locator('.hero-slide.active')).toHaveAttribute('data-slide','3');
});

test('contact form validates locally without submitting',async({page})=>{
  await page.goto('/enquiry.html');
  expect(await page.locator('.contact-form').evaluate(form=>form.checkValidity())).toBe(false);
  await page.locator('#firstName').fill('Test');await page.locator('#surname').fill('Guest');
  await page.locator('#email').fill('invalid');expect(await page.locator('#email').evaluate(input=>input.validity.typeMismatch)).toBe(true);
  await page.locator('#email').fill('test@example.invalid');await page.locator('#phone').fill('0000000000');
  const date=new Date();date.setDate(date.getDate()+7);const checkIn=date.toISOString().slice(0,10);
  date.setDate(date.getDate()+1);const checkOut=date.toISOString().slice(0,10);
  await page.locator('#checkIn').fill(checkIn);await page.locator('#checkIn').press('Tab');
  await expect(page.locator('#checkOut')).toHaveAttribute('min',checkIn);
  await page.locator('#checkOut').fill('2000-01-01');expect(await page.locator('#checkOut').evaluate(input=>input.validity.rangeUnderflow)).toBe(true);
  await page.locator('#checkOut').fill(checkOut);await page.locator('#message').fill('Local validation only. Do not send.');
  expect(await page.locator('.contact-form').evaluate(form=>form.checkValidity())).toBe(false);
  await expect(page.locator('#consent-error')).toBeVisible();
  await page.locator('#privacyConsent').check();await expect(page.locator('#consent-error')).toBeHidden();
  expect(await page.locator('.contact-form').evaluate(form=>form.checkValidity())).toBe(true);
  // Never click submit, dispatch submit or call requestSubmit().
});

test('complete gallery and essential layout without JavaScript',async({browser},testInfo)=>{
  const context=await browser.newContext({javaScriptEnabled:false,viewport:testInfo.project.use.viewport});
  const page=await context.newPage();
  await page.goto('http://127.0.0.1:8091/gallery.html');
  await expect(page.locator('#room3').getByText('Photos coming soon')).toBeVisible();
  await expect(page.locator('.gallery-card:visible')).toHaveCount(collections.reduce((n,c)=>n+c.photos.length,0));
  await expect(page.locator('.gallery-show-more-btn')).toHaveCount(0);
  await expect(page.locator('#main-navigation').getByRole('link',{name:'Home',exact:true})).toBeVisible();
  await expect(page.locator('.site-footer')).toBeVisible();
  const cards=page.locator('.gallery-card');
  for(let i=0;i<await cards.count();i++){
    const image=cards.nth(i).locator('img');await image.scrollIntoViewIfNeeded();
    await expect.poll(()=>image.evaluate(img=>img.complete && img.naturalWidth>0)).toBe(true);
  }
  await page.screenshot({path:testInfo.outputPath('gallery-nojs.png'),fullPage:true});
  const target=await cards.first().getAttribute('href');await cards.first().click();
  await expect(page).toHaveURL(new RegExp(target.replaceAll('.','\\.')));
  await context.close();
});

test('development files are not served',async({request})=>{
  for(const file of ['README.md','src/pages/index.html','scripts/build.cjs','tests/business-contracts.json','package.json','.env','.git/config','.netlify/state.json','node_modules/sharp/package.json'])expect((await request.get('/'+file)).status()).toBe(404);
});

// Exercise handler states with an in-memory fetch substitute, never a real backend.
// Only the local test response points to a mocked same-origin endpoint. Production URLs stay fixed.
async function mockContact(page, scenario = 'pending') {
  await page.route('http://127.0.0.1:8091/enquiry.html', async route => {
    const response = await route.fetch();
    const body = (await response.text()).replace('action="https://ematolweni-guesthouse.netlify.app/"', 'action="http://127.0.0.1:8091/"');
    await route.fulfill({response, body});
  });
  await page.addInitScript(scenario => {
    window.contactRequests = [];
    window.fetch = (url, options) => {
      if (url !== 'http://127.0.0.1:8091/' || options.method !== 'POST') throw new Error('Unexpected mocked transport');
      window.contactRequests.push({url, body: options.body, headers: options.headers, mode: options.mode, credentials: options.credentials, redirect: options.redirect});
      return new Promise((resolve, reject) => {
        window.resolveContact = () => resolve({ok: true, type: 'basic', redirected: false});
        options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
        if (scenario === 'http-error') resolve({ok: false, status: 503, type: 'basic'});
        if (scenario === 'network-error') reject(new TypeError('Network unavailable'));
        if (scenario === 'opaque') resolve({ok: true, type: 'opaque'});
        if (scenario === 'redirect') resolve({ok: true, type: 'basic', redirected: true});
      });
    };
  }, scenario);
  await page.goto('/enquiry.html');
}
async function fillContact(page) {
  await page.locator('#firstName').fill('Local');
  await page.locator('#surname').fill('Test');
  await page.locator('#email').fill('test@example.invalid');
  await page.locator('#phone').fill('0000000000');
  const date = new Date(); date.setDate(date.getDate() + 7);
  await page.locator('#checkIn').fill(date.toISOString().slice(0,10));
  await page.locator('#checkIn').press('Tab');
  date.setDate(date.getDate() + 1);
  await page.locator('#checkOut').fill(date.toISOString().slice(0,10));
  await page.locator('#message').fill('LOCAL MOCK ONLY. No real enquiry. Symbols: & + = and café.');
  await page.locator('#privacyConsent').check();
}

test('receiver downloaded onto another host blocks AJAX including dispatched events', async ({page}) => {
  await page.goto('/enquiry.html');
  await fillContact(page);
  const form = page.locator('.contact-form');
  await expect(form.locator('button[type=submit]')).toBeDisabled();
  await expect(page.locator('#privacy-notice')).toContainText('Netlify Forms');
  await form.dispatchEvent('submit');
  await expect(page.locator('#form-error')).toContainText('This local copy cannot accept submissions');
  await expect(page.locator('#form-success')).toBeHidden();
  await expect(page.locator('[name=bot-field]')).toBeHidden();
  await form.screenshot({path:test.info().outputPath('contact-release-gated.png')});
});

test('contact required inputs, whitespace, email and consent prevent mocked transport', async ({page}) => {
  await mockContact(page);
  await fillContact(page);
  const button = page.locator('.contact-form button[type=submit]');
  for (const selector of ['#firstName', '#surname', '#email', '#phone', '#checkIn', '#checkOut']) {
    const input = page.locator(selector), previous = await input.inputValue();
    await input.fill('');
    await button.click();
    expect(await input.evaluate(input => input.validity.valueMissing)).toBe(true);
    expect(await page.evaluate(() => window.contactRequests.length)).toBe(0);
    await input.fill(previous);
  }
  await page.locator('#firstName').fill('   ');
  await button.click();
  await expect(page.locator('#firstName')).toHaveValue('');
  await page.locator('#firstName').fill('Local');
  await page.locator('#email').fill('invalid');
  await button.click();
  expect(await page.locator('#email').evaluate(input => input.validity.typeMismatch)).toBe(true);
  await page.locator('#email').fill('test@example.invalid');
  await page.locator('#privacyConsent').uncheck();
  await button.click();
  await expect(page.locator('#consent-error')).toBeVisible();
  await expect(page.locator('#privacyConsent')).toHaveAttribute('aria-invalid','true');
  expect(await page.evaluate(() => window.contactRequests.length)).toBe(0);
  await expect(page.locator('#form-success')).toBeHidden();
});

test('contact pending lock and success only after mocked acceptance', async ({page}) => {
  await mockContact(page);
  await fillContact(page);
  const form = page.locator('.contact-form'), button = form.locator('button[type=submit]');
  await button.click();
  await expect(button).toBeDisabled();
  await expect(button).toHaveText('Sending...');
  await expect(form).toHaveAttribute('aria-busy','true');
  await expect(page.locator('#form-success')).toBeHidden();
  await form.dispatchEvent('submit');
  const calls = await page.evaluate(() => window.contactRequests);
  expect(calls).toHaveLength(1);
  expect(calls[0].headers['Content-Type']).toBe('application/x-www-form-urlencoded');
  expect(calls[0].mode).toBe('same-origin');
  expect(calls[0].credentials).toBe('omit');
  expect(calls[0].redirect).toBe('error');
  expect(Object.fromEntries(new URLSearchParams(calls[0].body))).toMatchObject({
    'form-name':'contact', 'bot-field':'', firstName:'Local', surname:'Test', email:'test@example.invalid',
    phone:'0000000000', privacyConsent:'consented', message:'LOCAL MOCK ONLY. No real enquiry. Symbols: & + = and café.'
  });
  await form.screenshot({path:test.info().outputPath('contact-mocked-pending.png')});
  await page.evaluate(() => window.resolveContact());
  await expect(page.locator('#form-success')).toBeVisible();
  await expect(page.locator('#form-success')).toContainText('submission service accepted');
  await expect(page.locator('#form-success')).toContainText('does not confirm email delivery');
  await expect(page.locator('#form-error')).toBeHidden();
  await expect(page.locator('#firstName')).toHaveValue('');
  await expect(page.locator('#privacyConsent')).not.toBeChecked();
  await expect(button).toBeEnabled();
  await expect(form).not.toHaveAttribute('aria-busy','true');
  expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze()).violations).toEqual([]);
  await form.screenshot({path:test.info().outputPath('contact-mocked-success.png')});
});

for (const scenario of ['http-error','network-error','opaque','redirect','timeout']) {
  test('contact retains data and reports uncertain acceptance: '+scenario, async ({page}) => {
    await mockContact(page, scenario);
    await fillContact(page);
    const form=page.locator('.contact-form'), button=form.locator('button[type=submit]');
    await button.click();
    await expect(page.locator('#form-error')).toBeVisible({timeout:20000});
    await expect(page.locator('#form-error')).toContainText('could not confirm acceptance');
    await expect(page.locator('#form-success')).toBeHidden();
    await expect(page.locator('#firstName')).toHaveValue('Local');
    await expect(page.locator('#privacyConsent')).toBeChecked();
    await expect(button).toBeEnabled();
    await expect(form).not.toHaveAttribute('aria-busy','true');
    expect(await page.evaluate(() => window.contactRequests.length)).toBe(1);
    if (scenario === 'http-error') await form.screenshot({path:test.info().outputPath('contact-mocked-error.png')});
  });
}

test('contact honeypot stops transport without claiming success', async ({page}) => {
  await mockContact(page);
  await fillContact(page);
  await page.locator('[name=bot-field]').evaluate(input => { input.value='bot'; });
  await page.locator('.contact-form button[type=submit]').click();
  await expect(page.locator('#form-error')).toContainText('could not be submitted');
  await expect(page.locator('#form-success')).toBeHidden();
  expect(await page.evaluate(() => window.contactRequests.length)).toBe(0);
});

test('no-JS form posts only to the fixed Netlify endpoint with consent', async ({browser},testInfo) => {
  const context=await browser.newContext({javaScriptEnabled:false,viewport:testInfo.project.use.viewport});
  let submission;
  await context.route('**/*', async route => {
    const req=route.request(), url=new URL(req.url());
    if(req.method()==='POST') {
      submission={url:req.url(),fields:Object.fromEntries(new URLSearchParams(req.postData()))};
      return route.fulfill({status:200,contentType:'text/html',body:'<p>Local mock only</p>'});
    }
    if(url.hostname!=='127.0.0.1')return route.fulfill({status:200,body:''});
    return route.continue();
  });
  const page=await context.newPage();
  await page.goto('http://127.0.0.1:8091/enquiry.html');
  await fillContact(page);
  await expect(page.locator('.contact-form button[type=submit]')).toBeEnabled();
  await page.locator('#privacyConsent').uncheck();
  await page.locator('button[type=submit]').click();
  expect(submission).toBeUndefined();
  await page.locator('#privacyConsent').check();
  await page.locator('button[type=submit]').click({noWaitAfter:true});
  await expect.poll(()=>submission?.url).toBe('https://ematolweni-guesthouse.netlify.app/');
  expect(submission.fields).toMatchObject({'form-name':'contact',privacyConsent:'consented',firstName:'Local'});
  await context.close();
});

test('home embeds the working receiver and validates resize origin, source and bounds', async ({page},testInfo) => {
  // Simulate the real cross-origin Afrihost parent; every response remains loopback-only.
  await page.route('https://www.ematolweniguesthouse.co.za/**', async route => {
    if(!['GET','HEAD'].includes(route.request().method()))return route.abort();
    const url=new URL(route.request().url());
    const response=await page.request.get('http://127.0.0.1:8091'+url.pathname+url.search);
    return route.fulfill({response});
  });
  await page.goto('https://www.ematolweniguesthouse.co.za/index.html');
  const frame=page.locator('#enquiry-frame');
  await frame.scrollIntoViewIfNeeded();
  await expect(frame).toHaveAttribute('src','https://ematolweni-guesthouse.netlify.app/enquiry.html');
  await expect(page.getByRole('link',{name:'open the enquiry form in a new tab'})).toHaveAttribute('href','https://ematolweni-guesthouse.netlify.app/enquiry.html');
  const receiver=page.frameLocator('#enquiry-frame');
  await expect(receiver.locator('button[type=submit]')).toBeEnabled();
  await receiver.locator('#firstName').fill('Embed');
  await expect(receiver.locator('#firstName')).toHaveValue('Embed');
  const child=page.frames().find(f=>f.url().includes('/enquiry.html'));
  await child.evaluate(()=>document.fonts.ready);
  const expectedHeight=await child.evaluate(()=>Math.min(2400,Math.max(500,document.querySelector('.enquiry-shell').scrollHeight+16)));
  await expect(frame).toHaveCSS('height',expectedHeight+'px');
  expect(await child.evaluate(()=>document.documentElement.scrollHeight<=innerHeight)).toBeTruthy();
  await receiver.locator('h1').scrollIntoViewIfNeeded();
  await page.screenshot({path:testInfo.outputPath('embedded-enquiry-viewport.png')});
  await frame.screenshot({path:testInfo.outputPath('embedded-enquiry.png')});
  await page.evaluate(()=>{
    window.dispatchEvent(new MessageEvent('message',{origin:'https://wrong.example',source:document.getElementById('enquiry-frame').contentWindow,data:{type:'ematolweni:enquiry-height',height:777}}));
    window.dispatchEvent(new MessageEvent('message',{origin:'https://ematolweni-guesthouse.netlify.app',source:window,data:{type:'ematolweni:enquiry-height',height:777}}));
  });
  await expect(frame).not.toHaveAttribute('style',/777px/);
  await child.evaluate(()=>parent.postMessage({type:'ematolweni:enquiry-height',height:99999},'https://www.ematolweniguesthouse.co.za'));
  await expect(frame).toHaveCSS('height','2400px');
  await child.evaluate(()=>parent.postMessage({type:'ematolweni:enquiry-height',height:100},'https://www.ematolweniguesthouse.co.za'));
  await expect(frame).toHaveCSS('height','500px');
});

test('static preview rejects POST instead of claiming acceptance', async ({request}) => {
  // Fixed loopback endpoint and empty body only, never enquiry data.
  const response=await request.post('http://127.0.0.1:8091/', {data:''});
  expect(response.status()).toBe(405);
  expect(response.headers().allow).toBe('GET, HEAD');
});

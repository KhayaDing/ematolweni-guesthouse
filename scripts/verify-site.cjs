// Validate references in complete static output, including deferred/large images.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {pages} = require('./render-site.cjs');
const contracts = require('../tests/business-contracts.json');
const decode = text => text.replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&#39;', "'");
const html = Object.fromEntries(pages.map(page => [page, fs.readFileSync('dist/'+page,'utf8')]));
const ids = {};
for (const [page, content] of Object.entries(html)) {
  const list = [...content.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  ids[page] = new Set(list);
  assert.equal(ids[page].size,list.length,page+': duplicate IDs');
  assert(!content.includes('{{'),page+': unrendered template');
  assert.match(content, /Generated from src\/pages\//);
  assert.match(content, /<nav[^>]+id="main-navigation"/);
  assert.match(content, /<footer class="site-footer">/);
  assert(content.includes('&copy; '+new Date().getFullYear()),page+': stale copyright');
  assert.equal([...content.matchAll(/<h1\b/g)].length,1,page+': one main heading');
  const links=[...content.matchAll(/href="([^"]+)"/g)].map(m=>m[1]);
  assert.deepEqual(links.filter(v=>/^(https:\/\/(book.nightsbridge.com|wa.me)\/|tel:|mailto:)/.test(v)).sort(),contracts[page].destinations,page+': business destinations changed');
  assert.deepEqual([...content.matchAll(/<form\b[^>]*>/g)].map(m=>m[0]),contracts[page].forms,page+': form endpoint/configuration changed');
  for (const image of content.matchAll(/<img\b[^>]*>/g)) {
    assert(/\balt="[^"]*"/.test(image[0]),page+': missing image alternative');
    assert(/\bwidth="\d+"/.test(image[0]) && /\bheight="\d+"/.test(image[0]),page+': missing image dimensions');
  }
}
let checked=0;
function reference(raw, from) {
  const value=decode(raw);
  if (/^(?:https?:|mailto:|tel:|data:|\/\/)/.test(value)) return;
  assert(!value.startsWith('/'),from+': site-local reference must be portable: '+value);
  const url=new URL(value,'https://local.test/'+from);
  const file=decodeURIComponent(url.pathname).replace(/^\//,'') || 'index.html';
  const local=path.resolve('dist',file);
  assert(local.startsWith(path.resolve('dist')+path.sep),'Reference outside output: '+value);
  assert(fs.existsSync(local) && fs.statSync(local).isFile(),from+': missing '+file);
  if(url.hash) {
    assert(ids[file]?.has(decodeURIComponent(url.hash.slice(1))),from+': broken fragment '+value);
  }
  checked++;
}
for(const [page,content] of Object.entries(html)) {
  for(const match of content.matchAll(/\s(?:src|href|poster|data-src|data-full|data-fallback)="([^"]+)"/g)) reference(match[1],page);
  for(const match of content.matchAll(/\s(?:srcset|data-srcset)="([^"]+)"/g)) {
    if(match[1].startsWith('data:'))continue;
    for(const item of match[1].split(',')) reference(item.trim().split(/\s+/)[0],page);
  }
  for(const match of content.matchAll(/\b(?:aria-controls|aria-labelledby|aria-describedby|for)="([^"]+)"/g))
    for(const id of match[1].split(/\s+/)) assert(ids[page].has(id),page+': missing associated ID '+id);
}
const map=JSON.parse(fs.readFileSync('dist/asset-manifest.json'));
for(const file of Object.values(map).filter(p=>p.endsWith('.css'))) {
  const css=fs.readFileSync('dist/'+file,'utf8');
  assert(!/@import\b/.test(css),'Unexpected CSS import: '+file);
  for(const match of css.matchAll(/url\(\s*["']?([^)'"\s]+)["']?\s*\)/g)) reference(match[1],file);
}
const gallery=html['gallery.html'];
const collections=require('../src/data/gallery.json');
assert.equal([...gallery.matchAll(/class="gallery-card"/g)].length,collections.filter(c=>c.status==='visible').reduce((n,c)=>n+c.photos.length,0));
for(const collection of collections.filter(c=>c.status==='renovation')) {
  assert(ids['gallery.html'].has(collection.id),'Missing renovation placeholder');
  assert(gallery.includes(`href="#${collection.id}"`),'Missing renovation navigation');
  const section=gallery.split(`class="gallery-section" id="${collection.id}">`)[1]?.split('<div class="gallery-section"')[0];
  assert(section?.includes('class="gallery-placeholder"'),'Missing placeholder content');
  assert(!section.includes('class="gallery-card"'),'Renovation photographs published');
}
assert(!gallery.includes('media-manifest.js'),'Client gallery manifest remains');
assert.equal([...gallery.matchAll(/href="css\/gallery-sections\.[a-f0-9]+\.css"/g)].length,1,'Gallery stylesheet must load once');
console.log('PASS '+pages.length+' pages: '+checked+' references, fragments, IDs, headings, static gallery/layout and unchanged business destinations/forms');

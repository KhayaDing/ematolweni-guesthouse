const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const {pages}=require('./render-site.cjs');
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(dir+'/'+e.name):[dir+'/'+e.name]).sort();}
function snapshot(dir){return Object.fromEntries(files(dir).map(file=>[file,digest(fs.readFileSync(file))]));}
const map=JSON.parse(fs.readFileSync('dist/asset-manifest.json','utf8'));
for(const [source,target] of Object.entries(map)){
  assert(target.includes('.'+digest(fs.readFileSync('dist/'+target)).slice(0,16)+'.'),'Incorrect fingerprint: '+target);
  assert(fs.existsSync(source),'Missing source: '+source);
}
const publicFiles=require('../src/data/public-files.json');
const allowed=new Set([...pages,...Object.values(map),'asset-manifest.json',...publicFiles]);
for(const file of files('dist'))assert(allowed.has(file.slice(5)),'Unexpected deployed file: '+file);
for(const file of publicFiles)assert.deepEqual(fs.readFileSync('dist/'+file),fs.readFileSync('public/'+file));
const home=fs.readFileSync('dist/index.html','utf8');
assert(/hero-1[^]*?fetchpriority="high"/.test(home));
for(const slide of ['2','3']){
  const picture=home.match(new RegExp('<picture data-media="assets/images/hero/hero-'+slide+'\\.jpg">([\\s\\S]*?)</picture>'))[1];
  assert(!/\s(?:src|srcset)="(?!data:)/.test(picture),'Inactive hero eagerly referenced');
}
const before=snapshot('dist');
const sources={...snapshot('src'),...snapshot('css'),...snapshot('js')};
execFileSync(process.execPath,['scripts/build.cjs'],{stdio:'inherit',windowsHide:true});
assert.deepEqual(snapshot('dist'),before,'Unexplained output changes on second build');
assert.deepEqual({...snapshot('src'),...snapshot('css'),...snapshot('js')},sources,'Build mutated sources');
console.log('PASS '+allowed.size+' allowed output files, fingerprints, deferred heroes and byte-identical second build');

const fs=require('node:fs');
const crypto=require('node:crypto');
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(`${dir}/${e.name}`):[`${dir}/${e.name}`]);}
const bytes=list=>list.reduce((n,p)=>n+fs.statSync(p).size,0);
const baseline=files('.performance/before/assets');
const sameOriginals=baseline.every(p=>{
  const current=p.replace('.performance/before/','');
  return fs.existsSync(current)&&crypto.createHash('sha256').update(fs.readFileSync(current)).digest('hex')===crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
});
const result={date:new Date().toISOString(),sizes:{originalAssets:bytes(baseline),sourceAssetsIncludingOriginalsAndVariants:bytes(files('assets')),deployAssets:bytes(files('dist/assets')),deployTotal:bytes(files('dist'))},allOriginalsUnchanged:sameOriginals,runs:[]};
for(const phase of ['before','final'])for(const mode of ['desktop','mobile']) {
  const report=JSON.parse(fs.readFileSync(`.performance/reports/${phase}-${mode}.json`));
  if(report.runtimeError)throw new Error(JSON.stringify(report.runtimeError));
  const requests=report.audits['network-requests'].details.items.filter(r=>/^https?:/.test(r.url));
  const local=requests.filter(r=>new URL(r.url).hostname==='127.0.0.1');
  result.runs.push({phase,mode,score:report.categories.performance.score*100,LCPms:report.audits['largest-contentful-paint'].numericValue,CLS:report.audits['cumulative-layout-shift'].numericValue,FCPms:report.audits['first-contentful-paint'].numericValue,TBTms:report.audits['total-blocking-time'].numericValue,requests:requests.length,transferBytes:requests.reduce((n,r)=>n+(r.transferSize||0),0),localRequests:local.length,localTransferBytes:local.reduce((n,r)=>n+(r.transferSize||0),0),videoRequests:requests.filter(r=>/\.mp4/.test(r.url)).length,inactiveHeroRequests:requests.filter(r=>/hero-[23](?:-|\.jpg)/.test(r.url)).length,errors:requests.filter(r=>r.statusCode>=400),settings:report.configSettings});
}
fs.writeFileSync('.performance/measurements.json',JSON.stringify(result,null,2));
console.log(JSON.stringify({...result,runs:result.runs.map(({settings,...r})=>r)},null,2));

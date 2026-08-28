// Lighthouse launches its own temporary, cold-cache Chrome for each audit.
const {spawn} = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const phase=process.argv[2]||'after';
const url=process.argv[3]||'http://127.0.0.1:8081/';
fs.mkdirSync('.performance/reports',{recursive:true});
(async()=>{
  for(const mode of ['desktop','mobile']) {
    const output=path.resolve(`.performance/reports/${phase}-${mode}`);
    const args=[require.resolve('lighthouse/cli/index.js'),url,'--only-categories=performance','--output=json',`--output-path=${output}.json`,'--save-assets','--chrome-flags=--headless=new --no-sandbox','--quiet'];
    if(mode==='desktop') args.push('--preset=desktop');
    const exitCode=await new Promise(resolve=>spawn(process.execPath,args,{stdio:'inherit',windowsHide:true,env:{...process.env,CHROME_PATH:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'}}).on('exit',resolve));
    if(exitCode && !fs.existsSync(output+'.json')) throw new Error(`Lighthouse ${mode} exited ${exitCode}`);
    if(exitCode) console.warn('Chrome cleanup failed; audit report was saved. Check runtimeError before using results.');
    const report=JSON.parse(fs.readFileSync(output+'.json'));
    console.log(JSON.stringify({phase,mode,score:report.categories.performance.score*100,lcp:report.audits['largest-contentful-paint'].numericValue,cls:report.audits['cumulative-layout-shift'].numericValue,bytes:report.audits['total-byte-weight'].numericValue,requests:report.audits['network-requests'].details.items.length}));
  }
})().catch(e=>{console.error(e);process.exitCode=1});

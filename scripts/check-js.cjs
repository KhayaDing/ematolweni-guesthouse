// Syntax checking uses Node itself; no lint framework is needed for this site.
const fs = require('node:fs');
const {execFileSync} = require('node:child_process');
const files = ['playwright.config.cjs', ...['js','scripts','tests'].flatMap(dir => fs.readdirSync(dir).filter(file => /\.(c?js)$/.test(file)).map(file => dir + '/' + file))];
for (const file of files) execFileSync(process.execPath, ['--check', file], {stdio:'inherit', windowsHide:true});
console.log('PASS JavaScript syntax: ' + files.length + ' files');

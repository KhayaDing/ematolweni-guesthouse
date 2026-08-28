// Local-only static preview; never a production server.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(process.argv[2] || 'dist');
const types = {'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.avif':'image/avif','.mp4':'video/mp4'};
http.createServer((req,res) => {
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405, {Allow: 'GET, HEAD'}).end('Static preview does not accept submissions'); return; }
  let name;
  try { name = decodeURIComponent(new URL(req.url,'http://localhost').pathname); } catch { res.writeHead(400).end(); return; }
  const file = path.resolve(root, '.' + (name.endsWith('/') ? name+'index.html' : name));
  if (!file.startsWith(root+path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {res.writeHead(404).end('Not found'); return;}
  const size = fs.statSync(file).size;
  const headers = {'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control': /\.[a-f0-9]{16}\./.test(file) ? 'public, max-age=31536000, immutable':'no-cache','Accept-Ranges':'bytes'};
  // Test-only switch to exercise the real browser with scripting disabled.
  if (new URL(req.url,'http://localhost').searchParams.has('nojs')) headers['Content-Security-Policy']="script-src 'none'";
  const range = req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
  let start=0, end=size-1;
  if(range) {start=Number(range[1]);end=Math.min(range[2]?Number(range[2]):end,end); headers['Content-Range']=`bytes ${start}-${end}/${size}`;}
  if(start>end) {res.writeHead(416).end();return;}
  headers['Content-Length']=end-start+1;
  res.writeHead(range?206:200,headers);
  if(req.method==='HEAD') res.end(); else fs.createReadStream(file,{start,end}).pipe(res);
}).listen(Number(process.argv[3]||8080),'127.0.0.1',()=>console.log(`Preview ${root} on http://127.0.0.1:${process.argv[3]||8080}`));

// Static output allowlist + content fingerprints. Never publish the project root.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {renderSite} = require('./render-site.cjs');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex').slice(0, 16);
const pages = renderSite();
const code = ['css/styles.css', 'css/gallery-sections.css', 'js/script.js'];
const inputs = {...pages, ...Object.fromEntries(code.map(file => [file, fs.readFileSync(file, 'utf8')]))};
const all = Object.values(inputs).join('\n');
const output = new Map();
const mappings = {};
function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, {withFileTypes: true}).sort((a,b) => a.name.localeCompare(b.name)).flatMap(entry => {
    // OneDrive files can report as reparse points; verify their resolved target.
    if (!fs.realpathSync(`${dir}/${entry.name}`).startsWith(fs.realpathSync(".") + path.sep)) throw new Error(`Build path leaves project: ${dir}/${entry.name}`);
    return entry.isDirectory() ? walk(`${dir}/${entry.name}`) : [`${dir}/${entry.name}`];
  });
}
function emit(file, bytes) {
  const ext = path.extname(file);
  const target = file.slice(0, -ext.length) + '.' + hash(bytes) + ext;
  output.set(target, bytes);
  mappings[file] = target;
}
const candidates = walk('assets').filter(file =>
  (file.startsWith('assets/optimized/') && /\.(avif|webp|jpg|png)$/.test(file)) ||
  /\.(svg|mp4)$/.test(file) || file === 'assets/images/logos/brownlogo-180.png');
for (const file of candidates) if (all.includes(file)) emit(file, fs.readFileSync(file));
function update(text) {
  for (const [source, target] of Object.entries(mappings)) text = text.replaceAll(source, target);
  return text;
}
for (const file of code) emit(file, Buffer.from(update(inputs[file])));
for (const [file, html] of Object.entries(pages)) output.set(file, Buffer.from(update(html)));
// Explicit public passthrough list. Add legitimate .well-known files individually here.
// Keep verification resources byte-for-byte intact; never copy hidden directories wholesale.
const publicFiles = JSON.parse(fs.readFileSync('src/data/public-files.json', 'utf8'));
for (const file of publicFiles) {
  if (!/^(robots\.txt|sitemap\.xml|\.well-known\/[a-zA-Z0-9_-]+(?:\.(?:txt|json))?)$/.test(file)) throw new Error(`Unapproved public file: ${file}`);
  output.set(file, fs.readFileSync('public/' + file));
}
output.set('asset-manifest.json', Buffer.from(JSON.stringify(mappings, null, 2) + '\n'));
// Fail closed on unexpected files instead of deleting unrelated user files in dist.
const previous = fs.existsSync('dist/asset-manifest.json') ? JSON.parse(fs.readFileSync('dist/asset-manifest.json','utf8')) : {};
const known = new Set([...Object.values(previous), ...Object.keys(pages), 'asset-manifest.json', ...publicFiles]);
const existing = walk('dist');
for (const file of existing) if (!output.has(file.slice(5)) && !known.has(file.slice(5))) throw new Error(`Unexpected deployment file: ${file}. Move it outside dist after review, then rebuild.`);
const distRoot = path.resolve('dist') + path.sep;
for (const file of existing) if (!output.has(file.slice(5))) {
  if (!path.resolve(file).startsWith(distRoot)) throw new Error('Refusing to prune outside dist');
  fs.unlinkSync(file);
}
for (const [file, bytes] of output) {
  fs.mkdirSync(path.dirname('dist/' + file), {recursive: true});
  fs.writeFileSync('dist/' + file, bytes);
}
console.log(`Built ${Object.keys(pages).length} pages and ${Object.keys(mappings).length} fingerprinted assets in dist/. Sources and original photographs are unchanged.`);

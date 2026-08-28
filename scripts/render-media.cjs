// Pure renderer: source templates are never rewritten by the build.
const fs=require('node:fs');
const media=JSON.parse(fs.readFileSync('assets/media-manifest.json','utf8'));
const escape=s=>s.replaceAll('&','&amp;').replaceAll('"','&quot;');
const placeholder='data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
function picture(src,old) {
  const m=media[src];
  if(!m) throw new Error(`Missing optimized media: ${src}`);
  const hero=src.includes('/hero/');
  const logo=src.includes('/logos/');
  const secondary=src.endsWith('/about-image.jpg');
  const deferred=/hero-[23]\.jpg$/.test(src);
  const footer=/trans-logo/.test(src);
  // Account for cover cropping: hero source must span both the width and height of its box.
  const ratio=m.width/m.height;
  const coverWidth=(src.includes('/attractions/')?210:170)*ratio;
  const sizes=logo?'60px':src.endsWith('gallery-hero.jpg')?`max(100vw, ${(50*ratio).toFixed(2)}vh)`:hero?`(max-width: 900px) max(100vw, ${(78*ratio).toFixed(2)}vh), max(100vw, calc((100vh - 80px) * ${ratio.toFixed(6)}))`:secondary?'(max-width: 900px) calc(100vw - 48px), (max-width: 1168px) calc((100vw - 96px) * 0.20625), 221.1px':`(max-width: 900px) max(calc(100vw - 48px), ${coverWidth.toFixed(2)}px), (max-width: 1168px) max(calc((100vw - 92.8px) / 3), ${coverWidth.toFixed(2)}px), ${Math.max(358.4,coverWidth).toFixed(2)}px`;
  const values={};
  for(const [,key,value] of old.matchAll(/([\w-]+)="([^"]*)"/g)) if(!['src','data-src','srcset','data-srcset','sizes','width','height','loading','decoding','fetchpriority'].includes(key)) values[key]=value;
  const attrs=Object.entries(values).map(([k,v])=>`${k}="${v}"`).join(' ');
  const fallback=logo?'png':'jpg';
  const list=m.variants;
  const choice=list.find(v=>v.width>=720)||list[list.length-1];
  const sources=['avif','webp'].map(format=>{
    // An AVIF set must cover all sizes, otherwise WebP is a better responsive choice.
    if(!list.every(v=>v[format])) return '';
    return `<source type="image/${format}" ${deferred?`srcset="${placeholder}" `:''}${deferred?'data-srcset':'srcset'}="${list.map(v=>`${v[format]} ${v.width}w`).join(', ')}" sizes="${escape(sizes)}">`;
  }).join('');
  return `<picture data-media="${src}">${sources}<img ${attrs} ${deferred?`src="${placeholder}" `:''}${deferred?'data-src':'src'}="${choice[fallback]}" ${deferred?'data-srcset':'srcset'}="${list.map(v=>`${v[fallback]} ${v.width}w`).join(', ')}" sizes="${escape(sizes)}" width="${m.width}" height="${m.height}" loading="${hero||logo&&!footer?'eager':'lazy'}" decoding="async"${hero&&!deferred?' fetchpriority="high"':''}></picture>`;
}
function renderMedia(html) {
  html=html.replace(/<img\b[^>]*>/g,img=>{
    const src=img.match(/\bsrc="([^"]+)"/)?.[1];
    if(media[src]) return picture(src,img);
    if(src?.includes('upload.wikimedia.org')) return img.replace(src,'assets/icons/whatsapp.svg').replace(/\s(?:width|height|decoding)="[^"]*"/g,'').replace(/\s*\/?\s*>$/,' width="512" height="513" decoding="async">');
    if(img.includes('partner-logo')) return img.replace('loading="eager"','loading="lazy"').replace(/\sdecoding="[^"]*"/g,'').replace(/\s*\/?\s*>$/,' decoding="async">');
    return img;
  });
  // Keep old cache-busting queries out of the build; hashes are authoritative.
  html=html.replace(/(css\/[^"?]+|js\/[^"?]+)\?v=[^"]+/g,'$1');
  if(!html.includes('rel="preconnect"')) html=html.replace('</head>',`  <link rel="preconnect" href="https://fonts.googleapis.com">\n  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n  <link rel="preconnect" href="https://cdnjs.cloudflare.com" crossorigin>\n</head>`);
  return html;
}
module.exports={renderMedia};

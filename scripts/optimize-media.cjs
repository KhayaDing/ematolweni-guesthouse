// Deterministic local conversions: no cropping, no upscaling, EXIF orientation applied.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {execFileSync} = require('node:child_process');
const sharp = require('sharp');
const out = 'assets/optimized';
fs.mkdirSync(out,{recursive:true});
function walk(dir) {return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(`${dir}/${e.name}`):[`${dir}/${e.name}`]);}
async function convert(src,widths,avif=false,logo=false) {
  const metadata=await sharp(src).metadata();
  const rotated=[5,6,7,8].includes(metadata.orientation);
  const width=rotated?metadata.height:metadata.width, height=rotated?metadata.width:metadata.height;
  const base=path.basename(src,path.extname(src));
  const result={width,height,variants:[]};
  const avifQuality=src.endsWith('/hero-1.jpg')?48:55;
  const digest=crypto.createHash('sha256').update(fs.readFileSync(src)).update(`v2-webp80-jpeg84-avif${avifQuality}-effort6-losslesslogo`).digest('hex');
  for(const w of [...new Set(widths.map(w=>Math.min(w,width)))].sort((a,b)=>a-b)) {
    const item={width:w,height:Math.round(height*w/width)};
    for(const format of logo?['png','webp']:['jpg','webp',...(avif?['avif']:[])]) {
      const file=`${out}/${base}-${w}.${format}`;
      const cache=`${file}.source`;
      if(!fs.existsSync(file)||!fs.existsSync(cache)||fs.readFileSync(cache,'utf8')!==digest) {
        let pipeline=sharp(src).rotate().resize({width:w,withoutEnlargement:true});
        if(format==='webp') pipeline=pipeline.webp(logo?{lossless:true}:{quality:80,effort:5});
        if(format==='jpg') pipeline=pipeline.jpeg({quality:84,mozjpeg:true});
        if(format==='png') pipeline=pipeline.png({compressionLevel:9});
        if(format==='avif') pipeline=pipeline.avif({quality:avifQuality,effort:6});
        await pipeline.toFile(file);
        fs.writeFileSync(cache,digest);
      }
      item[format]=file;
    }
    // Record actual encoder output, including JPEG shrink-on-load rounding.
    const rendered=await sharp(item.jpg||item.png).metadata();
    item.width=rendered.width;
    item.height=rendered.height;
    // Only offer AVIF when it saves at least 15% over the matching WebP.
    if(item.avif&&fs.statSync(item.avif).size>fs.statSync(item.webp).size*0.85) delete item.avif;
    result.variants.push(item);
  }
  return result;
}
(async()=>{
  const poster='assets/video-poster.jpg';
  const video='assets/videos/about-video.mp4';
  const posterKey=crypto.createHash('sha256').update(fs.readFileSync(video)).digest('hex');
  if(!fs.existsSync(poster)||!fs.existsSync(poster+'.source')||fs.readFileSync(poster+'.source','utf8')!==posterKey) {
    const ffmpeg=require('ffmpeg-static');
    if(!fs.existsSync(ffmpeg)) throw new Error('FFmpeg missing. Allow ffmpeg-static install script (see PERFORMANCE.md).');
    execFileSync(ffmpeg,['-y','-ss','0','-i',video,'-frames:v','1','-q:v','2',poster],{stdio:'pipe',windowsHide:true});
    fs.writeFileSync(poster+'.source',posterKey);
  }
  const files=walk('assets/images').filter(p=>/\.(jpg|png)$/i.test(p)&&!p.includes('/logos/'));
  const manifest={};
  for(const src of files) {
    const hero=src.includes('/hero/');
    const gallery=/\/(exterior|room \d+)\//.test(src);
    manifest[src]=await convert(src,hero?[640,1024,1440,1800,2070]:gallery?[360,720,1600]:[360,720,1200,1800],!gallery);
  }
  manifest[poster]=await convert(poster,[480,960],true);
  // Existing brownlogo-180 is already a good 3x PNG. Reuse it as PNG fallback.
  manifest['assets/images/logos/brownlogo.png']=await convert('assets/images/logos/brownlogo-180.png',[180],false,true);
  manifest['assets/images/logos/brownlogo.png'].variants[0].png='assets/images/logos/brownlogo-180.png';
  manifest['assets/images/logos/trans-logo.png']=await convert('assets/images/logos/trans-logo.png',[180],false,true);
  fs.writeFileSync('assets/media-manifest.json',JSON.stringify(manifest,null,2)+'\n');
  console.log(`Optimized ${Object.keys(manifest).length} source images; originals retained.`);
})().catch(e=>{console.error(e);process.exitCode=1});

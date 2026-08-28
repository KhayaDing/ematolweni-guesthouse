const fs=require('node:fs');
const sharp=require('sharp');
(async()=>{
  const manifest=JSON.parse(fs.readFileSync('assets/media-manifest.json'));
  let variantsChecked=0;
  for(const [source,media] of Object.entries(manifest)) for(const variant of media.variants) {
    if(variant.width>media.width) throw new Error(`Upscaled: ${source}`);
    for(const format of ['jpg','png','webp','avif']) if(variant[format]) {
      const decoded=await sharp(variant[format]).metadata();
      if(decoded.width!==variant.width||decoded.height!==variant.height) throw new Error(`Dimensions: ${variant[format]}`);
      if(source.includes('/logos/')&&!decoded.hasAlpha) throw new Error(`Lost transparency: ${source}`);
      variantsChecked++;
    }
  }
  let httpAssetsChecked=0;
  if(process.argv[2]) {
    const map=JSON.parse(fs.readFileSync('dist/asset-manifest.json'));
    const paths=[...Object.values(map),'index.html','gallery.html','policies.html','privacy.html','404.html','asset-manifest.json'];
    for(let i=0;i<paths.length;i+=20) await Promise.all(paths.slice(i,i+20).map(async p=>{
      const response=await fetch(new URL(p,process.argv[2]),{method:'HEAD'});
      const expected=/\.(html|json)$/.test(p)?'no-cache':'public, max-age=31536000, immutable';
      if(response.status!==200||response.headers.get('cache-control')!==expected) throw new Error(`HTTP/cache: ${p}`);
      httpAssetsChecked++;
    }));
  }
  const result={variantsChecked,httpAssetsChecked,errors:[]};
  fs.mkdirSync('.performance',{recursive:true});
  fs.writeFileSync('.performance/validation.json',JSON.stringify(result,null,2));
  console.log('PASS media and optional preview cache verification:',result);
})().catch(e=>{console.error(e);process.exitCode=1;});

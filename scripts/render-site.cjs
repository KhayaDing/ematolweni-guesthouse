// Deliberately small template renderer: known tokens only, no client-side includes.
const fs = require('node:fs');
const {renderMedia} = require('./render-media.cjs');
const pages = ['index.html', 'gallery.html', 'policies.html', 'privacy.html', '404.html', 'enquiry.html'];
const read = file => fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
function fill(template, values) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (!(key in values)) throw new Error(`Unknown template token: ${key}`);
    return values[key];
  });
}
function renderGallery() {
  const collections = JSON.parse(read('src/data/gallery.json'));
  const media = JSON.parse(read('assets/media-manifest.json'));
  const ids = new Set(), sources = new Set();
  for (const collection of collections) {
    if (!/^[a-z][a-z0-9-]*$/.test(collection.id) || ids.has(collection.id)) throw new Error(`Invalid/duplicate gallery ID: ${collection.id}`);
    ids.add(collection.id);
    if (!['visible', 'renovation'].includes(collection.status)) throw new Error(`Invalid gallery status: ${collection.id}`);
    if (!collection.title.trim()) throw new Error(`Missing title: ${collection.id}`);
    if (collection.status === 'visible' && !collection.photos.length) throw new Error(`Empty visible collection: ${collection.id}`);
    for (const photo of collection.photos) {
      if (!photo.src.startsWith('assets/images/') || photo.src.includes('..') || !fs.existsSync(photo.src) || !media[photo.src]) throw new Error(`Missing/unoptimized gallery photo: ${photo.src}; run pnpm media`);
      if (!photo.alt?.trim() || sources.has(photo.src)) throw new Error(`Missing alt or duplicate gallery photograph: ${photo.src}`);
      sources.add(photo.src);
    }
  }
  const sizes = '(max-width: 600px) calc(100vw - 80px), (max-width: 900px) calc((100vw - 96px) / 2), (max-width: 1168px) calc((100vw - 144px) / 3), 341.34px';
  const navigation = collections.map((collection, i) => `<a href="#${collection.id}" class="gallery-nav-link${i ? '' : ' active'}"${i ? '' : ' aria-current="location"'}>${escape(collection.title)}</a>`).join('\n');
  const sections = collections.map(collection => {
    if (collection.status === 'renovation') return `<div class="gallery-section" id="${collection.id}">
  <h2 class="gallery-heading">${escape(collection.title)}</h2>
  <div class="gallery-placeholder">
    <i class="fas fa-camera" aria-hidden="true"></i>
    <p class="gallery-placeholder-title">Photos coming soon</p>
    <p>This room is currently under renovation.</p>
  </div>
</div>`;
    const cards = collection.photos.map(photo => {
      const info = media[photo.src];
      const thumbnails = info.variants.filter(variant => variant.width <= 720);
      const full = info.variants.at(-1);
      if (!thumbnails.length) throw new Error(`Missing thumbnails: ${photo.src}`);
      const srcset = format => thumbnails.map(variant => `${variant[format]} ${variant.width}w`).join(', ');
      return `<a class="gallery-card" href="${full.jpg}" aria-label="Open ${escape(photo.alt)}">
  <picture><source type="image/webp" srcset="${srcset('webp')}" sizes="${sizes}"><img src="${thumbnails.at(-1).jpg}" srcset="${srcset('jpg')}" sizes="${sizes}" width="${info.width}" height="${info.height}" alt="${escape(photo.alt)}" loading="lazy" decoding="async" data-full="${full.webp}" data-fallback="${full.jpg}"></picture>
  <span class="gallery-overlay" aria-hidden="true"><i class="fas fa-expand"></i></span>
</a>`;
    }).join('\n');
    return `<div class="gallery-section" id="${collection.id}">
  <h2 class="gallery-heading">${escape(collection.title)}</h2>
  <div class="gallery-masonry" id="${collection.id}-photos">${cards}</div>
</div>`;
  }).join('\n');
  return `<nav class="gallery-nav" aria-label="Gallery collections"><div class="gallery-nav-inner">${navigation}</div></nav>\n${sections}`;
}
function renderSite() {
  const header = read('src/partials/header.html');
  const footer = read('src/partials/footer.html');
  const gallery = renderGallery();
  return Object.fromEntries(pages.map(page => {
    const values = {
      homeActive: page === 'index.html' ? 'class="active" aria-current="page"' : '',
      galleryActive: page === 'gallery.html' ? 'class="active" aria-current="page"' : '',
      year: new Date().getFullYear(),
      footerSocial: page === '404.html' ? '' : read('src/partials/footer-social.html'),
    };
    const html = fill(read('src/pages/' + page), {year: values.year, header: fill(header, values), footer: fill(footer, values), gallery});
    return [page, renderMedia(html).replace('<!DOCTYPE html>', `<!DOCTYPE html>\n<!-- Generated from src/pages/${page}, src/partials and src/data by pnpm build. Do not edit. -->`)];
  }));
}
module.exports = {renderSite, pages};

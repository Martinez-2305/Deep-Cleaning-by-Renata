#!/usr/bin/env node
// Zero-dependency build: renders src/**/*.html with site.config.json into dist/,
// once per language: English at the site root, Polish under /pl/.
//
// Template syntax
//   {{path}}               escaped text; [[placeholders]] are highlighted with <mark>
//   {{attr:path}}          escaped text for attributes; placeholders shown as [text]
//   {{raw:path}}           unescaped
//   {{t:key}}              interface text from src/_i18n/<lang>.json; the value is itself
//                          a template fragment, so it can use {{business.owner}}, {{.name}}…
//   {{img:path "sizes" eager}}  photo slot { name, width, height, alt, brief } → responsive
//                          <picture>, or a "Coming soon" frame while name is empty
//   {{> name}}             include src/_partials/name.html (partials may include partials)
//   {{#each path}}…{{/each path}}      loop; inside, {{.field}}, {{.}} and {{@n}} (1-based)
//   {{#if path}}…{{/if path}}          rendered when value is non-empty
//   {{#unless path}}…{{/unless path}}  rendered when value is empty
//   {{base}}               relative path to the site root ('' or '../'), for assets
//   {{root}}               relative path to this language's root, for pages in the same language
//   {{home}}               link to this language's home page ('' on the home page itself, so #anchors stay in-page)
//   {{altHref}}            the same page in the other language
const fs = require('fs');
const path = require('path');

const root = __dirname;
const srcDir = path.join(root, 'src');
const partialsDir = path.join(srcDir, '_partials');
const i18nDir = path.join(srcDir, '_i18n');
const outDir = path.join(root, 'dist');

// English first: its config is the base that other languages override.
const LOCALES = [
  { code: 'en', dir: '' },
  { code: 'pl', dir: 'pl' },
];

const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));

// Keys starting with "_" are notes for whoever edits the config; list entries
// that contain only notes are dropped.
function clean(v) {
  if (Array.isArray(v)) return v.map(clean).filter((x) => !(x && typeof x === 'object' && !Array.isArray(x) && !Object.keys(x).length));
  if (v && typeof v === 'object') {
    return Object.fromEntries(Object.entries(v).filter(([k]) => !k.startsWith('_')).map(([k, c]) => [k, clean(c)]));
  }
  return v;
}

// Language overrides: objects merge by key, lists of objects merge item by item,
// anything else (text, lists of text) replaces the base value.
function merge(base, over) {
  if (over === undefined) return base;
  const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
  if (Array.isArray(base) && Array.isArray(over) && over.every(isObj)) {
    return base.map((b, i) => merge(b, over[i]));
  }
  if (isObj(base) && isObj(over)) {
    const out = { ...base };
    for (const [k, v] of Object.entries(over)) out[k] = merge(base[k], v);
    return out;
  }
  return over;
}

const baseConfig = clean(readJson(path.join(root, 'site.config.json')));

const PH = /\[\[(.+?)\]\]/g;
const isPlaceholder = (v) => typeof v === 'string' && /\[\[.+?\]\]/.test(v);
const real = (v) => (v && !isPlaceholder(v) ? v : '');

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
// Placeholders are listed by the build but never shown on the page.
const text = (v) => esc(v).replace(PH, '').trim();
const attr = (v) => esc(v).replace(PH, '').trim();

const missing = new Set();
const missingPhotos = new Set();
let schemaReady = false;

// Build the template context for one language.
function makeCtx(locale) {
  const overlayFile = path.join(root, `site.config.${locale.code}.json`);
  const config = locale.code === 'en' || !fs.existsSync(overlayFile)
    ? structuredClone(baseConfig)
    : merge(structuredClone(baseConfig), clean(readJson(overlayFile)));
  const t = clean(readJson(path.join(i18nDir, `${locale.code}.json`)));

  // Collect every placeholder so the build can report what is still missing.
  (function walk(v, key) {
    if (typeof v === 'string') for (const m of v.matchAll(PH)) missing.add(`${key}: ${m[1]}`);
    else if (v && typeof v === 'object') for (const [k, c] of Object.entries(v)) walk(c, key ? `${key}.${k}` : k);
  })(config, '');

  // Photo slots. A slot is { name, width, height, alt, brief }; empty name = photo still to come.
  const slot = (name, alt, brief, width = 1000, height = 750) => ({ name, alt, brief, width, height });
  // Captions show only confirmed details; placeholders never reach the page.
  config.results = config.results.map((r) => {
    const alt = real(r.alt) || r.service;
    return {
      ...r,
      job: real(r.job),
      area: real(r.area),
      label: [r.service, real(r.job)].filter(Boolean).join(', '),
      beforeImg: slot(r.before, `${t.photo.beforeAlt}${alt}`, t.photo.before),
      afterImg: slot(r.after, `${t.photo.afterAlt}${alt}`, t.photo.after),
    };
  });
  config.tackle = config.tackle.map((x) => ({ ...x, img: slot(x.photo, x.alt || `${x.label}: ${x.detail}`, x.label) }));
  const photoSlots = [
    ['hero.photo', config.hero.photo],
    ['founder.photo', config.founder.photo],
    ...(config.founder.morePhoto ? [['founder.morePhoto', config.founder.morePhoto]] : []),
    ...config.results.flatMap((r, i) => [[`results.${i}.before`, r.beforeImg], [`results.${i}.after`, r.afterImg]]),
    ...config.tackle.map((x, i) => [`tackle.${i}.photo`, x.img]),
  ];
  const pagePhotosMissing = photoSlots.filter(([, s]) => !s.name).map(([k]) => k);
  pagePhotosMissing.forEach((k) => missingPhotos.add(k));

  // Star ratings only render as stars once the value is a real number.
  const starsPct = (v) => {
    const n = parseFloat(real(v));
    return n > 0 && n <= 5 ? `${(n / 5) * 100}%` : '';
  };
  config.reviews.ratingPct = starsPct(config.reviews.rating);
  config.reviews.link = real(config.reviews.url);
  config.reviews.writeLink = real(config.reviews.writeUrl) || config.reviews.link;
  config.reviews.items = config.reviews.items.map((r) => ({ ...r, starsPct: starsPct(r.stars) }));
  config.reviews.draft = config.reviews.items.some((r) => isPlaceholder(r.quote));
  // Privacy notice details that fall back to general wording until confirmed.
  config.form.processorReal = real(config.form.processor) ? 'yes' : '';
  config.privacy.icoReal = real(config.privacy.ico) ? 'yes' : '';
  config.privacy.retentionReal = real(config.privacy.retention) ? 'yes' : '';
  // The rating line needs both a real rating and a real count.
  config.reviews.summary = config.reviews.ratingPct && real(config.reviews.count) ? 'yes' : '';
  // The section (and its nav link) shows once there are reviews or a profile to send people to.
  config.reviews.show = config.reviews.items.length || config.reviews.link ? 'yes' : '';

  // Values derived from config so templates never build links from placeholders.
  const b = config.business;
  const siteUrl = real(config.site.url).replace(/\/$/, '');
  const wa = real(b.whatsapp).replace(/\D/g, '');
  const realAreas = config.areas.filter(real);
  const ctx = {
    ...config,
    t,
    locale,
    isEn: locale.code === 'en' ? 'yes' : '',
    siteUrl,
    year: String(new Date().getFullYear()),
    phoneHref: real(b.phoneLink) ? `tel:${b.phoneLink.replace(/\s+/g, '')}` : '#quote',
    mailHref: real(b.email) ? `mailto:${b.email}` : '#quote',
    whatsappHref: wa ? `https://wa.me/${wa}?text=${encodeURIComponent(b.whatsappMessage)}` : '#quote',
    coverage: [config.areas.join(', '), config.coverageNote].filter(Boolean).join(' '),
    formEndpoint: real(config.form.endpoint),
    meta: { image: `${siteUrl}/assets/img/og-image.jpg` },
    // Interface text for main.js; "<" escaped so it can't close the script tag.
    jsStrings: JSON.stringify(t.js).replace(/</g, '\\u003c'),
  };

  // Structured data for the home page, only with verified production details.
  // LocalBusiness (HouseCleaningService): one entity with a fixed @id, so the English
  // and Polish pages describe the same business; names follow the page's language.
  schemaReady = !!(siteUrl && real(b.phoneLink) && real(b.locality) && realAreas.length && real(b.email));
  const scripts = [];
  if (schemaReady) {
    const business = {
      '@context': 'https://schema.org',
      '@type': 'HouseCleaningService',
      '@id': `${siteUrl}/#business`,
      name: b.name,
      url: `${siteUrl}/`,
      telephone: b.phoneLink,
      email: b.email,
      image: ctx.meta.image,
      logo: `${siteUrl}/assets/img/logo-720.jpg`,
      founder: { '@type': 'Person', name: b.owner },
      areaServed: realAreas.map((name) => ({ '@type': 'Place', name })),
      address: { '@type': 'PostalAddress', addressLocality: b.locality, addressRegion: 'London', addressCountry: 'GB' },
      knowsLanguage: ['en', 'pl'],
      paymentAccepted: 'Cash, Bank transfer',
      hasOfferCatalog: {
        '@type': 'OfferCatalog',
        name: t.nav.services,
        itemListElement: config.services.map((s) => ({
          '@type': 'Offer',
          itemOffered: { '@type': 'Service', name: s.name, description: s.summary, areaServed: realAreas.map((name) => ({ '@type': 'Place', name })) },
        })),
      },
    };
    // Opening hours only once confirmed (they must match the Google Business Profile).
    const hours = (config.hours && config.hours.schema) || [];
    if (hours.length) {
      business.openingHoursSpecification = hours.map((h) => ({ '@type': 'OpeningHoursSpecification', dayOfWeek: h.days, opens: h.opens, closes: h.closes }));
    }
    if (config.reviews.link) business.sameAs = [config.reviews.link];
    // No aggregateRating: Google's review-snippet rules don't allow marking up ratings
    // collected on another site (here, Google reviews). The profile shows them itself.
    scripts.push(business);
  }
  // FAQPage: the same questions and answers shown in the FAQ section, in the page's language.
  if (config.faqs.length && !config.faqs.some((f) => isPlaceholder(f.q) || isPlaceholder(f.a))) {
    scripts.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      inLanguage: t.lang,
      mainEntity: config.faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    });
  }
  ctx.schema = scripts.map((s) => `<script type="application/ld+json">${JSON.stringify(s).replace(/</g, '\\u003c')}</script>`).join('\n  ');
  return ctx;
}

let ctx;

function lookup(p, scope) {
  if (p === '.') return scope.item;
  if (p === '@n') return scope.n;
  const [base, keys] = p.startsWith('.') ? [scope.item, p.slice(1).split('.')] : [ctx, p.split('.')];
  return keys.reduce((o, k) => (o == null ? undefined : o[k]), base);
}

const empty = (v) => v == null || v === '' || v === false || (Array.isArray(v) && v.length === 0);

function image(s, sizes = '100vw', eager = false) {
  if (!s.name) {
    return `<div class="photo-ph" role="img" aria-label="${attr(ctx.t.photo.toCome)}"><span class="photo-ph-tag">${text(ctx.t.photo.toCome)}</span></div>`;
  }
  const set = (ext) => [480, 720, 1000].map((w) => `${ctx.base}assets/img/${s.name}-${w}.${ext} ${w}w`).join(', ');
  const load = eager ? 'fetchpriority="high"' : 'loading="lazy" decoding="async"';
  // AVIF first (smallest) only when tools/images.js has made it; browsers skip types they can't show.
  const avif = fs.existsSync(path.join(srcDir, 'assets', 'img', `${s.name}-480.avif`))
    ? `<source type="image/avif" srcset="${set('avif')}" sizes="${sizes}">` : '';
  return `<picture>${avif}<source type="image/webp" srcset="${set('webp')}" sizes="${sizes}">` +
    `<img src="${ctx.base}assets/img/${s.name}-720.jpg" srcset="${set('jpg')}" sizes="${sizes}" ` +
    `width="${s.width || 1000}" height="${s.height || 750}" ${load} alt="${attr(s.alt)}"></picture>`;
}

function render(tpl, scope = {}) {
  const partial = /\{\{> ?([\w-]+)\}\}/g;
  while (partial.test(tpl)) {
    tpl = tpl.replace(partial, (_, name) => fs.readFileSync(path.join(partialsDir, `${name}.html`), 'utf8'));
  }
  tpl = tpl.replace(/\{\{t:([\w.]+)\}\}/g, (_, key) => {
    const v = key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), ctx.t);
    if (typeof v !== 'string') throw new Error(`Text not found in src/_i18n/${ctx.locale.code}.json: ${key}`);
    return v;
  });
  tpl = tpl.replace(/\{\{#each ([\w.@]+)\}\}([\s\S]*?)\{\{\/each \1\}\}/g, (_, p, body) =>
    (lookup(p, scope) || []).map((item, i) => render(body, { item, n: i + 1 })).join(''));
  tpl = tpl.replace(/\{\{#(if|unless) ([\w.@]+)\}\}([\s\S]*?)\{\{\/\1 \2\}\}/g, (_, kind, p, body) =>
    (kind === 'if') !== empty(lookup(p, scope)) ? render(body, scope) : '');
  tpl = tpl.replace(/\{\{img:([\w.@]+)(?: "([^"]*)")?( eager)?\}\}/g, (_, p, sizes, eager) => {
    const s = lookup(p, scope);
    if (!s) throw new Error(`Photo slot not found: ${p}`);
    return image(s, sizes, !!eager);
  });
  return tpl.replace(/\{\{(raw:|attr:)?([\w.@]+)\}\}/g, (_, mode, p) => {
    const v = lookup(p, scope);
    if (v == null) throw new Error(`Template value not found: ${p}`);
    if (mode === 'raw:') return String(v);
    return mode === 'attr:' ? attr(v) : text(v);
  });
}

// Pages: every .html under src/ except partials, keeping folder structure,
// so e.g. src/end-of-tenancy-cleaning/index.html → /end-of-tenancy-cleaning/.
function pages(dir, rel = '') {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (e.name.startsWith('_')) return [];
    const r = path.join(rel, e.name);
    if (e.isDirectory()) return pages(path.join(dir, e.name), r);
    return e.name.endsWith('.html') ? [r] : [];
  });
}

// URL of a page within a language, e.g. 'pl/' or 'privacy.html'.
const pageUrl = (locale, file) =>
  (locale.dir ? `${locale.dir}/` : '') + file.split(path.sep).join('/').replace(/(^|\/)index\.html$/, '$1');

// Empty dist/ rather than deleting it: on Windows a folder held open by a
// preview server or OneDrive can't be removed.
fs.mkdirSync(outDir, { recursive: true });
for (const e of fs.readdirSync(outDir)) fs.rmSync(path.join(outDir, e), { recursive: true, force: true });
fs.cpSync(srcDir, outDir, {
  recursive: true,
  filter: (f) => !f.endsWith('.html') && !path.relative(srcDir, f).split(path.sep).some((p) => p.startsWith('_')),
});

// Pages that search engines may index (anything without a noindex robots tag),
// as file → { localeCode: { loc, lastmod } }, for sitemap.xml.
const indexable = new Map();

// When a page's content last changed: the newest commit touching its sources, or
// today if those sources have uncommitted edits. '' when git isn't available.
const { execFileSync } = require('child_process');
function lastmod(locale, file) {
  const sources = [path.join('src', file), 'src/_partials', `src/_i18n/${locale.code}.json`, 'src/assets', 'site.config.json']
    .concat(locale.code === 'en' ? [] : [`site.config.${locale.code}.json`]);
  const git = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  try {
    if (git(['status', '--porcelain', '--', ...sources])) return new Date().toISOString().slice(0, 10);
    return git(['log', '-1', '--format=%cs', '--', ...sources]);
  } catch {
    return '';
  }
}

for (const locale of LOCALES) {
  ctx = makeCtx(locale);
  const other = LOCALES.find((l) => l !== locale);
  for (const file of pages(srcDir)) {
    const depth = file.split(path.sep).length - 1;
    ctx.root = '../'.repeat(depth);
    ctx.base = '../'.repeat(depth + (locale.dir ? 1 : 0));
    ctx.home = file === 'index.html' ? '' : ctx.root || './';
    ctx.altHref = ctx.base + pageUrl(other, file) || './';
    // The 404 page is served at whatever URL was missing, so its links must be absolute.
    const notFound = file === '404.html';
    if (notFound) {
      ctx.base = '/';
      ctx.root = ctx.home = '/' + (locale.dir ? `${locale.dir}/` : '');
      ctx.altHref = '/' + pageUrl(other, file);
    }

    // Canonical and language alternates only with the verified production URL.
    const head = [];
    if (ctx.siteUrl && !notFound) {
      const url = (l) => `${ctx.siteUrl}/${pageUrl(l, file)}`;
      head.push(`<link rel="canonical" href="${esc(url(locale))}">`, `<meta property="og:url" content="${esc(url(locale))}">`);
      for (const l of LOCALES) head.push(`<link rel="alternate" hreflang="${l.code}" href="${esc(url(l))}">`);
      head.push(`<link rel="alternate" hreflang="x-default" href="${esc(url(LOCALES[0]))}">`);
    }
    if (ctx.schema && file === 'index.html') head.push(ctx.schema);
    ctx.headExtras = head.join('\n  ');

    const out = path.join(outDir, locale.dir, file);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    const html = render(fs.readFileSync(path.join(srcDir, file), 'utf8'));
    // Template comments are for editors, not visitors.
    fs.writeFileSync(out, html.replace(/[ \t]*<!--[\s\S]*?-->\r?\n?/g, ''));

    if (ctx.siteUrl && !/<meta name="robots" content="[^"]*noindex/.test(html)) {
      if (!indexable.has(file)) indexable.set(file, {});
      indexable.get(file)[locale.code] = { loc: `${ctx.siteUrl}/${pageUrl(locale, file)}`, lastmod: lastmod(locale, file) };
    }
  }
}

// robots.txt and sitemap.xml, only once the production URL is known.
const siteUrl = real(baseConfig.site.url).replace(/\/$/, '');
if (siteUrl) {
  fs.writeFileSync(path.join(outDir, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`);
  // Each URL lists every language version, itself included, plus x-default (English),
  // matching the hreflang links in each page's <head>.
  const entries = [...indexable.values()].flatMap((urls) => Object.values(urls).map((u) => [
    '  <url>',
    `    <loc>${esc(u.loc)}</loc>`,
    ...(u.lastmod ? [`    <lastmod>${u.lastmod}</lastmod>`] : []),
    ...Object.entries(urls).map(([code, alt]) => `    <xhtml:link rel="alternate" hreflang="${code}" href="${esc(alt.loc)}"/>`),
    ...(urls[LOCALES[0].code] ? [`    <xhtml:link rel="alternate" hreflang="x-default" href="${esc(urls[LOCALES[0].code].loc)}"/>`] : []),
    '  </url>',
  ].join('\n')));
  fs.writeFileSync(path.join(outDir, 'sitemap.xml'),
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' +
    `${entries.join('\n')}\n</urlset>\n`);
}

console.log(`Built ${outDir} (${LOCALES.map((l) => l.code).join(', ')})`);
if (missing.size) {
  console.log(`\n${missing.size} placeholder(s) still to confirm (hidden on the page until filled in):`);
  for (const m of missing) console.log(`  - ${m}`);
}
if (missingPhotos.size) {
  console.log(`\n${missingPhotos.size} photo slot(s) still showing "Coming soon":`);
  for (const m of missingPhotos) console.log(`  - ${m}`);
}
if (!schemaReady) console.log('\nLocalBusiness schema omitted until URL, phone, email, locality and areas are real.');

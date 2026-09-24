#!/usr/bin/env node
// Zero-dependency build: renders src/*.html with site.config.json into dist/.
//
// Template syntax
//   {{path}}               escaped text; [[placeholders]] are highlighted with <mark>
//   {{attr:path}}          escaped text for attributes; placeholders shown as [text]
//   {{#each path}}…{{/each path}}      loop; inside, {{.field}}, {{.}} and {{@n}} (1-based)
//   {{#if path}}…{{/if path}}          rendered when value is non-empty
//   {{#unless path}}…{{/unless path}}  rendered when value is empty
const fs = require('fs');
const path = require('path');

const root = __dirname;
const srcDir = path.join(root, 'src');
const outDir = path.join(root, 'dist');
const config = JSON.parse(fs.readFileSync(path.join(root, 'site.config.json'), 'utf8'));

const PH = /\[\[(.+?)\]\]/g;
const isPlaceholder = (v) => typeof v === 'string' && /\[\[.+?\]\]/.test(v);
const real = (v) => (v && !isPlaceholder(v) ? v : '');

// Collect every placeholder so the build can report what is still missing.
const missing = new Set();
(function walk(v, key) {
  if (typeof v === 'string') for (const m of v.matchAll(PH)) missing.add(`${key}: ${m[1]}`);
  else if (v && typeof v === 'object') {
    for (const [k, c] of Object.entries(v)) if (!k.startsWith('_')) walk(c, key ? `${key}.${k}` : k);
  }
})(config, '');

// Values derived from config so templates never build links from placeholders.
const b = config.business;
const siteUrl = real(config.site.url).replace(/\/$/, '');
const ctx = {
  ...config,
  draft: missing.size > 0,
  year: String(new Date().getFullYear()),
  phoneHref: real(b.phoneLink) ? `tel:${b.phoneLink.replace(/\s+/g, '')}` : '#quote',
  mailHref: real(b.email) ? `mailto:${b.email}` : '#quote',
  formEndpoint: real(config.form.endpoint),
  meta: {
    title: `${b.name} | Eco-friendly end-of-tenancy & after-builders cleaning in ${b.location}`,
    description: `End-of-tenancy, after-builders and one-off deep cleans in ${b.location}, using eco-friendly products with strong chemicals kept to a minimum. Get the scope and price agreed before any work starts.`,
    image: `${siteUrl}/assets/img/og-image.jpg`,
  },
};

// Head tags that must only appear with verified production details.
const headExtras = [];
if (siteUrl) {
  headExtras.push(`<link rel="canonical" href="${esc(siteUrl)}/">`, `<meta property="og:url" content="${esc(siteUrl)}/">`);
}
const schemaReady = siteUrl && real(b.phoneLink) && real(b.location) && real(b.coverage) && real(b.email);
if (schemaReady) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'HouseCleaningService',
    name: b.name,
    url: `${siteUrl}/`,
    telephone: b.phoneLink,
    email: b.email,
    image: ctx.meta.image,
    areaServed: b.coverage,
    address: { '@type': 'PostalAddress', addressLocality: b.location, addressCountry: 'GB' },
  };
  headExtras.push(`<script type="application/ld+json">${JSON.stringify(schema)}</script>`);
}
ctx.headExtras = headExtras.join('\n  ');

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function lookup(p, scope) {
  if (p === '.') return scope.item;
  if (p === '@n') return scope.n;
  const [base, keys] = p.startsWith('.') ? [scope.item, p.slice(1).split('.')] : [ctx, p.split('.')];
  return keys.reduce((o, k) => (o == null ? undefined : o[k]), base);
}

const empty = (v) => v == null || v === '' || v === false || (Array.isArray(v) && v.length === 0);

function render(tpl, scope = {}) {
  tpl = tpl.replace(/\{\{#each ([\w.@]+)\}\}([\s\S]*?)\{\{\/each \1\}\}/g, (_, p, body) =>
    (lookup(p, scope) || []).map((item, i) => render(body, { item, n: i + 1 })).join(''));
  tpl = tpl.replace(/\{\{#(if|unless) ([\w.@]+)\}\}([\s\S]*?)\{\{\/\1 \2\}\}/g, (_, kind, p, body) =>
    (kind === 'if') !== empty(lookup(p, scope)) ? render(body, scope) : '');
  return tpl.replace(/\{\{(raw:|attr:)?([\w.@]+)\}\}/g, (_, mode, p) => {
    const v = lookup(p, scope);
    if (v == null) throw new Error(`Template value not found: ${p}`);
    if (mode === 'raw:') return String(v);
    const text = esc(v);
    return mode === 'attr:'
      ? text.replace(PH, '[$1]')
      : text.replace(PH, '<mark class="ph" title="Placeholder — edit site.config.json">[$1]</mark>');
  });
}

fs.rmSync(outDir, { recursive: true, force: true });
fs.cpSync(srcDir, outDir, { recursive: true, filter: (f) => !f.endsWith('.html') });
for (const file of fs.readdirSync(srcDir).filter((f) => f.endsWith('.html'))) {
  fs.writeFileSync(path.join(outDir, file), render(fs.readFileSync(path.join(srcDir, file), 'utf8')));
}

console.log(`Built ${outDir}`);
if (missing.size) {
  console.log(`\n${missing.size} placeholder(s) still to confirm (page shows a draft banner):`);
  for (const m of missing) console.log(`  - ${m}`);
  if (!schemaReady) console.log('\nLocalBusiness schema omitted until URL, phone, email, location and coverage are real.');
}

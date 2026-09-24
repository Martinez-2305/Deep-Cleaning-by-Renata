# Deep Cleaning by Renata — implementation notes

## Running it
- Edit `site.config.json` (every fact about the business lives there).
- `node build.js` → writes the finished site to `dist/` and lists any placeholders still to confirm. No npm install needed.
- Preview: open `dist/index.html` in a browser, or serve `dist/` with any static server.
- Deploy: upload the contents of `dist/`.
- GitHub Pages (temporary): the live copy is served from the repo root (`index.html`, `privacy.html`, `main.js`, `styles.css`, `assets/`). After `node build.js`, copy the contents of `dist/` over those root files and commit. `dist/` itself is gitignored. Don't point `build.js` at the root: it empties its output folder before rebuilding.
- Images: `tools/images.js` crops/compresses the logo and portrait, plus every file in `images/photos/`, into `src/assets/img`. Only rerun it when photos change (it needs `npm i -D sharp`).

## Structure
```
site.config.json   business facts, trust items, services, photos, results, reviews, areas, FAQs, form
build.js           zero-dependency template renderer → dist/
src/index.html     home page template   src/privacy.html   privacy notice template
src/_partials/     header.html, footer.html (+ mobile bar), shared by every page
src/styles.css     all styles           src/main.js        form, before/after sliders, mobile bar
src/assets/img/    generated WebP/JPEG images
```
Home page order: hero → trust strip → services (+ "what a deep clean tackles") → before/after results → why choose Renata → meet Renata → how it works (+ quote/pricing message) → reviews → products → areas → FAQs → quote form → footer.
Anything written as `[[…]]` in the config is a placeholder: it is highlighted on the page, a draft banner is shown, the build lists it, and LocalBusiness schema and the canonical tag are left out until the real details are in.

## Photos
Every photo on the page is a slot in `site.config.json`. While a slot's name is empty the page shows a labelled "Photo to come" frame at the right size, so nothing shifts when the real photo arrives.
1. Put the original in `images/photos/`, e.g. `images/photos/eot-kitchen-before.jpg`.
2. Run `node tools/images.js` → `src/assets/img/eot-kitchen-before-480/720/1000.webp|jpg`.
3. Put the base name in the slot: `hero.photo.name`, `founder.photo.name`, `results[].before` / `after`, or `tackle[].photo`. Update the slot's `alt` text.
4. `node build.js`. The build lists every slot still waiting for a photo.

Only use Renata's own job photos, especially for before/after pairs, which should be taken from the same angle. Don't use stock or AI images as evidence. The hero currently uses Renata's portrait; a photo of her actively cleaning a real kitchen or bathroom would be stronger.

## Adding a service page later
`services[].id` is already the intended URL (`end-of-tenancy-cleaning`, `after-builders-cleaning`, `deep-cleaning`), and each card has that id as its anchor.
1. Create `src/<id>/index.html` with its own `<head>` (title/description), `{{> header}}` and `{{> footer}}`. Use `{{base}}` in front of asset paths (`{{base}}styles.css`). `{{home}}` in the partials already points nav links back to the home page.
2. Set `"page": true` on that service. The card gets a "More about…" link, and the footer links to the page instead of the anchor.
Don't create per-town doorway pages.

## Research (September 2026)
| Reference | Found via | Principle taken |
| --- | --- | --- |
| https://charliehornerdesign.com/ | Siteinspire → Interior Design | One photograph at a time, with a specific caption beneath it (place, listing, status), and generous space around it. Used for the hero portrait's named caption. |
| https://studio-mcgee.com/ | Siteinspire → Interior Design | The founders are the brand: people photographed in context on a warm, off-white ground. Used for putting Renata at the centre of the hero, not stock imagery. |
| https://www.typewolf.com/libre-baskerville | Typewolf | Libre Baskerville is one of the strongest free serifs, best used for headings against a plain sans. Used in the first draft; later replaced by Manrope (see Typography). |
| https://www.typewolf.com/manrope | Typewolf | Manrope (open source, 7 weights + variable) is a geometric-grotesque sans; Typewolf lists Inter and Fakt as close relatives. Its only documented site is Bookr (paired with Eksell Display), so real-site pairing evidence with Public Sans is thin. |

Not inspected / honest gaps:
- **Land-book** returned HTTP 403 to automated access, so none of its examples were inspected.
- Heller Studios (Siteinspire) was checked at 375px but is an art-direction showcase with no service or enquiry content, so it wasn't used.
- Typewolf's Roald Dahl example no longer appears to use Libre Baskerville; the real-site pairing evidence is therefore limited to Typewolf's own notes.
- Originality: neither reference has a split hero, service rows, a process band or a quote form. The Charlie Horner layout is a centred project carousel and Studio McGee's is an editorial/blog grid. No layout, copy or code was reproduced.

## Palette (sampled from `images/DCBR-logo.jpg`)
| Sampled | Where in logo | Role on page |
| --- | --- | --- |
| `#076719` | "Cleaning" script, darkest green | Primary / buttons / links (`--green-700`, 7.1:1 with white) |
| `#055214`, `#0b3a15` | derived shades | Hover; quote-section background |
| `#468a19` | leaves / lighter script | Accent; darkened to `#3b7a15` for small text (5.3:1) |
| `#0677c7` (`#1897d8` lighter) | "Deep" lettering, water | Focus rings only (4.7:1 on white) |
| `#d8eb9a` | logo background lime | Labels on dark green; tints `#edf4d6` (bands), `#f7faee` (page) |
| — | neutrals | Text `#17261a`, muted `#4a5a4d` (6.9:1), borders `#d4dcc4`, inputs `#76846c` (4:1) |

The logo is shown unaltered (cropped to its artwork, on its own lime background).

## Typography
Manrope 700 (headings, step numbers, review quotes) + Public Sans 400/600 (body/UI), both SIL Open Font License via Google Fonts. Body 17px / 1.6.

Changed from Libre Baskerville at the client's request: the serif read as traditional/editorial, and the business wants a contemporary service-business look. Because both families are now sans, hierarchy comes from weight (700 vs 400), size and slight negative tracking on headings (H1 −0.018em, line-height 1.16) rather than serif/sans contrast.

## Decisions
- **Conversion restructure (September 2026)**: page reordered around services → evidence → trust → process, per the client's brief. The hero H1 is benefit-led and the service + location keywords sit in the line directly under it and in the title tag ("End of Tenancy & After-Builders Cleaning in [area] | Deep Cleaning by Renata"). Headings use sentence case to match the rest of the site.
- **Products, not "eco" as the headline**: the products section moved below reviews and is now "Thoughtful products, strong results". It says gentler products are used where they'll work and stronger specialist ones may be needed for heavy grease or limescale. The UK CMA Green Claims Code still applies: products, credentials and when stronger products are used are placeholders (`eco.*`). Never "chemical-free", "non-toxic" or "100% eco-friendly" without proof.
- **No invented facts**: no prices, ratings, review text, insurance, experience, availability or deposit promises. "Fully insured" and "All equipment supplied" in the trust strip are placeholders until confirmed. The deposit FAQ says no cleaner can promise a deposit back.
- **Service points**: the three points per service come from the brief. Confirm them with Renata. Oven interiors, carpets and rubbish removal are described as not assumed.
- **Reviews**: the section renders a placeholder layout with a visible "Placeholder layout" note until genuine reviews are pasted in. Stars only render once `stars`/`rating` are real numbers. AggregateRating schema is only added with a real rating and count.
- **Before/after**: a range input over two stacked images (keyboard and screen-reader operable, `touch-action: pan-y` so page scrolling still works on phones). No animation.
- **WhatsApp**: `business.whatsapp` builds a `wa.me` link with a prefilled message. Until it's set, WhatsApp buttons fall back to the quote form (`#quote`), like phone and email.
- **Form**: posts `FormData` (multipart, including optional photos) with `Accept: application/json` to `form.endpoint`. It shows success only after a 2xx response. Until an endpoint is set, it says the form isn't connected. Photo upload: up to 5 images, 20 MB total, checked client-side. The provider's plan must accept file uploads (Formspree's free plan doesn't; Basin does), otherwise set `form.fileUploads` to false. Includes a `_gotcha` honeypot.
- **Mobile**: a WhatsApp / Get a quote bar is fixed to the bottom. It hides while the hero buttons, quote form or footer are on screen, so it never duplicates the hero CTAs or covers the form. From 900px the header is sticky and the bar is gone.

## Verified (September 2026 restructure)
- Screenshots at 375, 768 and 1440px; no horizontal scroll. One H1; H2/H3 hierarchy checked.
- Form: empty submit shows all 7 errors and focuses the first; service-card links preselect the service; "not connected" state; with a stubbed 200 response every field (including photos) is sent and the success state shows.
- Before/after slider updates on input.
- Lighthouse (mobile, draft build): Accessibility 100, Best Practices 100, SEO 100.

## Before launch — still needed
- Phone, WhatsApp number, email, primary area and areas covered, trading details, production URL
- Trust strip: confirm insurance and equipment, or swap in other verified signals
- Renata's short bio and a second photo of her at work
- Genuine before/after job photos (6 pairs) and close-ups for "What a deep clean tackles"
- Genuine reviews, Google rating, review count and profile link
- Products used, when stronger products are used, any proven eco credentials
- FAQ answers: equipment, typical duration, after-builders exclusions, access, coverage, preparation, payment
- A form endpoint that accepts file uploads + provider name; privacy notice details (provider storage, retention); have the notice checked
- Performance check on the real host (fonts load from Google; consider self-hosting them)

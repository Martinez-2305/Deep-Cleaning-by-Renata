# Deep Cleaning by Renata — implementation notes

## Running it
- Edit `site.config.json` (every fact about the business lives there).
- `node build.js` → writes the finished site to `dist/` and lists any placeholders still to confirm. No npm install needed.
- The build also writes `robots.txt` (allow all, points to the sitemap) and `sitemap.xml` (every page without a `noindex` tag, in both languages, with `hreflang` alternates). Both use `site.url`, and are skipped while it's a placeholder. The privacy notices and the 404 page are `noindex`, so they're not in the sitemap (and robots.txt doesn't block them, so crawlers can see the noindex). `<lastmod>` is the date of the last commit touching a page's sources, or today if they have uncommitted edits. Checked against the sitemaps.org 0.9 schema plus Google's `xhtml:link` format.
- Cache-busting: the build adds a content fingerprint to the stylesheet and script links (`styles.css?v=…`, `main.js?v=…`). Hostinger tells browsers to keep CSS/JS for a week, so without it returning visitors would get new pages with old styles or scripts after an update.
- Preview: open `dist/index.html` in a browser, or serve `dist/` with any static server.
- Deploy: push to `main`. The GitHub Action (`.github/workflows/deploy.yml`) runs `node build.js` and commits the contents of `dist/` to the `deploy` branch; Hostinger auto-deploys that branch into public_html of deepcleaningbyrenata.co.uk (account `u225414582`, server `145.14.152.16`, GitHub connected in hPanel → Git). Only built files are on the `deploy` branch, so source files are never public. Don't edit files on the server or the `deploy` branch by hand; they're overwritten on the next push.
- Domain: registered at Namecheap (no transfer). HTTPS: free Let’s Encrypt certificate from Hostinger (covers www), HTTP → HTTPS redirect on in Hostinger; `src/.htaccess` redirects www to the plain domain and `/index.html` to `/`, serves the branded `404.html` (built from `src/404.html` with absolute links, since it's shown at any missing URL), and sets security headers (HSTS, nosniff, Referrer-Policy, X-Frame-Options, Permissions-Policy) and a one-year cache for fonts. There's deliberately no HTTPS rewrite in it: Hostinger already forces HTTPS, and checking `%{HTTPS}` behind a CDN can loop. Namecheap BasicDNS with A `@` → 145.14.152.16 and CNAME `www` → deepcleaningbyrenata.co.uk. GitHub Pages was switched off on 17 October 2026, and the built copies in the repo root were removed.
- Images: `tools/images.js` crops/compresses the logo and portrait, plus every file in `images/photos/`, into `src/assets/img`. Only rerun it when photos change (it needs `npm i -D sharp`).

## Structure
```
site.config.json   business facts, trust items, services, photos, results, reviews, areas, FAQs, form (English)
site.config.pl.json  Polish overrides for the /pl/ pages (only translated fields)
build.js           zero-dependency template renderer → dist/
src/index.html     home page template   src/privacy.html   privacy notice template
src/_partials/     header.html, footer.html (+ mobile bar), lang-switch.html, shared by every page
src/_i18n/         en.json, pl.json: interface text (headings, buttons, form labels, JS messages)
src/styles.css     all styles           src/main.js        form, before/after sliders, mobile bar
src/assets/img/    generated WebP/JPEG images
```
Home page order: hero → trust strip → services (+ "what a deep clean tackles") → before/after results → why choose Renata → meet Renata → how it works (+ quote/pricing message) → reviews (hidden until there are genuine ones) → products → a little more about me → areas → FAQs → quote form → footer.
Anything written as `[[…]]` in the config is a placeholder: the build lists it, it's never shown on the page (sentences that depend on it fall back to general wording or are left out), and LocalBusiness schema and the canonical tag are left out until the real details are in. Empty photo slots show a small "Coming soon" tag. HTML comments in templates are stripped from the built pages.

## Languages (English / Polish)
Every page is built twice: English at the site root, Polish under `/pl/` (`/pl/`, `/pl/privacy.html`). The language switch sits beside the logo: a globe icon (from 480px) and an EN | PL toggle with the current language filled in. The other option links to the same page in that language; the footer has a text link too. Below 480px the header quote button says "Get a quote" / "Wycena" so everything fits on one line, and below 350px it's hidden (the hero button and bottom bar cover it). Canonical, `hreflang` alternates and `<html lang>` are set per language.
- Interface text lives in `src/_i18n/<lang>.json` and is used in templates as `{{t:key}}`. Values are template fragments, so English strings can use `{{business.owner}}`; Polish strings write Renata's name and the area out in full because Polish declines them (Renaty, Renacie, w Wimbledonie).
- Business content is translated in `site.config.pl.json`, merged over `site.config.json`: objects by key, lists of objects item by item, text and lists of text replaced. Anything not in the Polish file falls back to English. When adding or reordering services, tackle items, results or FAQs, do the same in both files.
- Both About texts on the Polish page are Renata's own translations. Everything else was translated for the site and should be read over by Renata.
- `main.js` reads its messages (validation, form status, slider) from a JSON block the build writes into each page. The form sends a hidden `language` field so Renata can see which version an enquiry came from.
- Adding a language: add it to `LOCALES` in `build.js`, create `src/_i18n/<code>.json` and `site.config.<code>.json`, and change the switch to a list (it currently links to "the other" language).

## Photos
Every photo on the page is a slot in `site.config.json`. While a slot's name is empty the page shows a frame with a small "Coming soon" tag at the right size, so nothing shifts when the real photo arrives.
1. Put the original in `images/photos/`, e.g. `images/photos/eot-kitchen-before.jpg`.
2. Run `node tools/images.js` → `src/assets/img/eot-kitchen-before-480/720/1000.avif|webp|jpg`. The page offers AVIF first (about 30% smaller than WebP), then WebP, then JPEG; `build.js` only adds the AVIF source when the AVIF files exist.
3. Put the base name in the slot: `hero.photo.name`, `founder.photo.name`, `results[].before` / `after`, or `tackle[].photo`. Update the slot's `alt` text.
4. `node build.js`. The build lists every slot still waiting for a photo.

Job photos (October 2026): Renata's 66 originals are in `images/images of cleaning jobs/`. That folder is git-ignored (the GitHub repo is public and the originals show unblurred labels), so keep a backup of it elsewhere; the web versions in `src/assets/img` and the crops in `images/photos` are committed. The ones in use were cropped to 4:3 into `images/photos/` (slider pairs lined up by eye, since some were taken from slightly different distances): before/after = oven (27, the two halves of Renata's own before/after collage, cropped below its BEFOR/AFTER labels), gas hob (17 → 19), fridge drawer (36 → 35), skirting (53 → 54); close-ups = kitchen grease (44), limescale (15), renovation dust (23, new herringbone shower tiles), skirting (9). Brand labels: `BLUR_LABELS` in `tools/images.js` lists, per photo, the areas to blur (cleaning-product bottles in 40, 43, 45, 47, 49; toothpaste and soap in 56). They are blurred with a soft edge in the source before any size or format is made, so every gallery image inherits it; add an entry for any new photo with a readable label. Photo 27's two halves have identical framing, so confirm it's a genuine job photo, not an app-edited "after" (ASA rules on before/after claims). Captions say what's shown, not the service or area, because those aren't known; add `area` in `results` once Renata confirms.

Only use Renata's own job photos, especially for before/after pairs, which should be taken from the same angle. Don't use stock or AI images as evidence. The hero currently uses Renata's portrait; a photo of her actively cleaning a real kitchen or bathroom would be stronger.

## On-page SEO (October 2026 checklist)
Done:
- **One H1 per page**: "Professional deep cleaning in South West London" (Polish: "Profesjonalne sprzątanie gruntowne w południowo-zachodnim Londynie"). Sentence case, like every other heading. H2 per section; each service card's H3 is just the service name, with its tagline as a paragraph under it.
- **Alt text**: descriptive and local, e.g. "Deep cleaning kitchen surfaces in a South West London home" (`tackle[].alt`; hero and founder photo alts mention South West London). When real photos go in, describe what each photo actually shows.
- **Images**: every photo slot serves WebP at 480/720/1000px with a JPEG fallback, sized to avoid layout shift, lazy-loaded below the fold. Logos are WebP too (privacy page included). `tools/images.js` produces these from originals.
- **Structured data** (home pages only):
  - `HouseCleaningService` (a LocalBusiness type): name, phone, email, URL, logo, founder, locality, service areas, the four services as an `OfferCatalog`, payment methods, and `sameAs` (the Google Business Profile). It has a fixed `@id` (`/#business`), so the English and Polish pages describe the same business.
  - `openingHoursSpecification` comes from `hours.schema` (Mon–Fri 08:00–17:30, Sat 09:00–15:30; Sunday closed, so left out). The same hours show in the quote section and footer. If they change on the Google Business Profile, change them here too.
  - `FAQPage` repeats the visible FAQs word for word, in the page's language. Note: Google now shows FAQ rich results only for government and health sites, but the markup is still valid and readable by other search engines and AI tools.
- **CTAs**: header ("Request a quote"), hero, mid-page (Meet Renata, How it works), quote section, and a "Ready for a quote?" band at the top of the footer on every page except the home page (where the quote form is directly above it). On phones there's also the bottom bar.
- **Footer** (October 2026): logo lime tint (`--lime-100`) with a leaf-green top line, kept compact: four columns on desktop (brand, contact, services, areas + hours); on phones the logo sits beside its line, contact links wrap in a row, services sit in two columns, and areas and hours side by side.
- **NAP consistency**: name, phone, email and areas all come from `site.config.json`, so the header, quote section, footer, privacy notice and schema always match. Use exactly this on the Google Business Profile and in directories:
  - Name: Deep Cleaning by Renata
  - Phone: 07456 950999 (+44 7456 950999)
  - Email: deepcleaning.renata@gmail.com
  - Website: https://deepcleaningbyrenata.co.uk
  - Service area: Wimbledon, Putney, Richmond, Barnes and areas close to these (South West London). No public street address; set it up as a service-area business.
  - Hours: Monday–Friday 08:00–17:30, Saturday 09:00–15:30, Sunday closed (from the Google Business Profile, October 2026)

Still to do:
- **Service pages**: /kitchen-deep-cleaning/, /bathroom-deep-cleaning/, /end-of-tenancy-cleaning/, /move-in-move-out-cleaning/, /post-renovation-cleaning/ (see "Adding a service page later" below). Each links back to the home page and to the quote form (`{{home}}#quote` until there's a separate contact/booking page), with a breadcrumb and its own `Service` schema. Add each to both languages. Current home-page anchors: `end-of-tenancy-cleaning` and `post-renovation-cleaning` already match their future URLs. Kitchen, bathroom and move-in/move-out are new pages; one-off deep cleaning and regular cleaning stay on the home page unless pages are added for them too.
- **Genuine reviews and original before/after photos**, with the customers' and property owners' consent (see Reviews and Photos).

`services[].id` is already the intended URL (`end-of-tenancy-cleaning`, `post-renovation-cleaning`, `deep-cleaning`, `regular-cleaning`), and each card has that id as its anchor.
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
Manrope 700 (headings, step numbers, review quotes) + Public Sans 400/600 (body/UI), both SIL Open Font License. Self-hosted since October 2026 (`src/assets/fonts/`, Latin and Latin Extended variable WOFF2 files, the Latin ones preloaded), so no visitor data goes to Google and nothing loads from another server. Body 17px / 1.6; H1 32–48px, H2 24–34px, H3 20px.

Changed from Libre Baskerville at the client's request: the serif read as traditional/editorial, and the business wants a contemporary service-business look. Because both families are now sans, hierarchy comes from weight (700 vs 400), size and slight negative tracking on headings (H1 −0.018em, line-height 1.16) rather than serif/sans contrast.

## Decisions
- **Conversion restructure (September 2026)**: page reordered around services → evidence → trust → process, per the client's brief. The hero H1 is benefit-led and the service + location keywords sit in the line directly under it and in the title tag ("End of Tenancy & After-Builders Cleaning in [area] | Deep Cleaning by Renata"). Headings use sentence case to match the rest of the site.
- **Products illustration**: the products section has an inline SVG spray bottle (brand greens, leaf label, sprig) under the intro text, with a slow mist puff and twinkle that switch off for reduced-motion settings. It's decorative (`aria-hidden`).
- **A little more about me**: Renata's seated photo (`images/more-abt-pic.jpeg` → `renata-more`, 4:5 crop, `founder.morePhoto`). From 900px it sits left of the heading and text; on phones it comes between the heading and the text.
- **Products**: "Natural-based products, thorough results". Renata confirmed (October 2026) that all cleaning is done with products made with naturally derived ingredients and no stronger products are used, so the section says tough jobs get more time and attention, not stronger chemicals (`eco.products`, `eco.toughJobs`). The credentials row is hidden while `eco.credentials` is empty. UK CMA Green Claims Code still applies: keep the wording to "made with naturally derived ingredients"; never "chemical-free", "non-toxic", "100% natural" or "100% eco-friendly" without proof.
- **No invented facts**: no prices, ratings, review text, insurance, availability or deposit-return promises. Experience ("nearly 15 years"), DBS check, equipment, payment terms (10% deposit for first-time customers, bank transfer or cash) and coverage come from Renata's questionnaire answers (September 2026). Insurance is "to be confirmed", so it's not on the site. The deposit FAQ says no cleaner can promise a deposit back.
- **Services**: four services. Regular (weekly/fortnightly) cleaning was added at Renata's request, overriding the original brief's "no recurring housekeeping". Service points, extras (oven, fridge/freezer, carpets, rubbish removal: quoted separately) and exclusions (exterior windows, hazardous materials, heavy waste, work at heights) are her answers. The service grid is 2×2 from 720px.
- **About Renata**: her professional text is `founder.bio` (Meet Renata); her personal text is `founder.more` in a separate "A little more about me" section lower down, as she asked. She also supplied Polish translations of both (in the questionnaire PDF); not used yet.
- **Reviews and Google Business Profile**: `reviews.url` is Renata's profile (https://www.google.com/search?kgmid=/g/11zyjxt4m1). It's linked from the reviews section and footer, and is `sameAs` in the LocalBusiness schema. With no reviews, the section shows an invitation with "Leave a review on Google" and "See Renata on Google". Set `reviews.writeUrl` to the review link from her Business Profile dashboard ("Ask for reviews"); until then that button opens the profile, which has Google's own "Write a review" button. The page's own review cards appear once genuine reviews are pasted into `reviews.items`. A Google badge ("Reviews on Google", the multicolour G) beside the heading links to the profile; once `reviews.rating` and `reviews.count` are real, it shows the stars and count instead of the profile line. Stars only ever show with a real rating and count. No AggregateRating schema: Google doesn't allow marking up ratings collected on another site.
- **Scroll reveal** (October 2026): headings, cards, photos and panels below the hero fade in and rise 16px as they enter the screen (fully shown once 160px in; grid items slightly staggered). Pure CSS scroll-driven animation (`animation-timeline: view()`), opacity/transform only, no JavaScript, so it costs nothing on load (LCP and CLS unchanged). Chrome, Edge and Safari 26+ show it; Firefox and reduced-motion settings simply show the content.
- **Gallery page** (`src/gallery/index.html` → /gallery/ and /pl/gallery/, October 2026): all 66 job photos as square thumbnails, filters (Ovens & extractors, Kitchens, Bathrooms & basins, Skirting & details; revealed by main.js), and a full-size viewer (`<dialog>`: arrows, keyboard, swipe, Escape; focus returns to the photo). Without JavaScript each thumbnail links to its full-size JPEG. Photos and Polish alt text: `gallery` in both configs (same order). Linked from the menu ("Gallery") and a button under the before/after sliders. In the sitemap.
- **Before/after**: plays once on its own when it scrolls into view (sweeps to the before, then the after, then the middle, about 3 s; requestAnimationFrame on the `--pos` custom property), stops for good once the visitor moves it, and never runs for reduced motion. Four pairs in a 2×2 grid from 760px. Underneath: a range input over two stacked images (keyboard and screen-reader operable, `touch-action: pan-y` so page scrolling still works on phones). No animation.
- **WhatsApp**: `business.whatsapp` builds a `wa.me` link with a prefilled message. Until it's set, WhatsApp buttons fall back to the quote form (`#quote`), like phone and email.
- **Form**: simplified in October 2026 to name, phone and/or email, postcode, service (a dropdown), "About the job" and an optional "send photos on WhatsApp" tick box. Property type, size and preferred date were removed; the job hint asks for size, condition and dates instead. Postcode and service sit side by side from 600px. It posts `FormData` with `Accept: application/json` to `form.endpoint`. It shows success only after a 2xx response. Until an endpoint is set, it says the form isn't connected. Connected to Formspree (October 2026, `https://formspree.io/f/mqppaeqe`); a hidden `_subject` names the email "New quote request from the website" (Polish page says so too), and Formspree uses the `email` field as reply-to. Photos are not uploaded through the form (WhatsApp links can carry text but not files, and Formspree's free plan has no file storage). Instead there's a "I'd like to send photos on WhatsApp" tick box (`photos_on_whatsapp`, so the email says photos are coming). When ticked, the thank-you message shows a "Send photos on WhatsApp" button: a `wa.me` link to `business.whatsapp`, opened in a new tab or the app, pre-filled with a greeting and a copy of the enquiry (short labels from `js.waFields`), so the customer just attaches photos and sends. Includes a `_gotcha` honeypot.
- **Header and menu**: the header is sticky at every size. Below 1024px (phones and iPads in portrait) the nav sits behind a menu button and rolls down from the header: a 0.35s grid-row height transition with a fade, while the hamburger icon turns into an ×. Reduced-motion settings switch the animation off. The menu also holds WhatsApp and Call buttons. It closes on Escape (focus returns to the button), on a click outside, and when the window widens to desktop. Menu links roll the panel up first and then scroll, because scrolling while the header collapses makes browsers abandon the smooth scroll. Without JavaScript the menu is simply shown open. From 1024px the full nav is inline; the header phone number appears from 1200px, where there's room for it.
- **Mobile bar**: a WhatsApp / Get a quote bar is fixed to the bottom below 900px. It hides while the hero buttons, quote form, footer or open menu are on screen, so it never duplicates the hero CTAs or covers the form.

## Verified (September 2026 restructure)
- Screenshots at 375, 768 and 1440px; no horizontal scroll. One H1; H2/H3 hierarchy checked.
- Form: empty submit shows all 7 errors (5 since the October 2026 simplification) and focuses the first; service-card links preselect the service; "not connected" state; with a stubbed 200 response every field (including photos) is sent and the success state shows.
- Before/after slider updates on input.
- Lighthouse (mobile, draft build): Accessibility 100, Best Practices 100, SEO 100.

## Before launch — still needed
- Public liability insurance (Renata: "to be confirmed"); add to the trust strip once the certificate is seen
- Optional: a photo of Renata at work on a real job. Meet Renata now uses her sage-blazer portrait (`renata-portrait`, from `images/founder-img2.jpeg`)
- Renata to read over the Polish page
- `reviews.writeUrl` from Renata's Business Profile dashboard; set the profile's website to https://deepcleaningbyrenata.co.uk once the domain is live; paste genuine reviews in as they arrive
- Cancellation / rescheduling terms (Renata: skip for now)
- Privacy notice: retention period and ICO registration still to add; have the notice checked.
- Point the deepcleaningbyrenata.co.uk domain at the host (the canonical tag, schema, robots.txt and sitemap.xml use it), then submit https://deepcleaningbyrenata.co.uk/sitemap.xml in Google Search Console

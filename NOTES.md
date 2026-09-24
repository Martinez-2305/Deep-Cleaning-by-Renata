# Deep Cleaning by Renata — implementation notes

## Running it
- Edit `site.config.json` (every fact about the business lives there).
- `node build.js` → writes the finished site to `dist/` and lists any placeholders still to confirm. No npm install needed.
- Preview: open `dist/index.html` in a browser, or serve `dist/` with any static server.
- Deploy: upload the contents of `dist/`.
- GitHub Pages (temporary): the live copy is served from the repo root (`index.html`, `privacy.html`, `main.js`, `styles.css`, `assets/`). After `node build.js`, copy the contents of `dist/` over those root files and commit. `dist/` itself is gitignored. Don't point `build.js` at the root: it deletes its output folder before rebuilding.
- Images: `tools/images.js` crops/compresses `images/*` into `src/assets/img`. Only rerun it if the source photos change (it needs `npm i -D sharp`).

## Structure
```
site.config.json   business facts, services, FAQs, reviews, form endpoint
build.js           zero-dependency template renderer → dist/
src/index.html     page template        src/privacy.html  privacy notice template
src/styles.css     all styles           src/main.js       form + mobile action bar
src/assets/img/    generated WebP/JPEG images
```
Anything written as `[[…]]` in the config is a placeholder: it is highlighted on the page, a draft banner is shown, the build lists it, and LocalBusiness schema and the canonical tag are left out until the real details are in.

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
- **Selling point — eco-friendly products, minimal strong chemicals**: stated in the hero intro, in its own section straight after the hero (nav: "Eco products"), in a FAQ, and in the page title/description. Worded exactly as the client described it. The UK CMA Green Claims Code requires claims to be specific and substantiated, so the products/brands, any certifications, and when stronger products are needed are placeholders (`eco.*`) for Renata to confirm. Avoid "chemical-free", "non-toxic" or "100% natural", and don't show a certification logo without proof.
- **No invented facts**: no prices, ratings, insurance, years of experience, availability or deposit promises. The deposit FAQ says outright that no cleaner can promise a deposit back.
- **Inclusions**: each service's `inclusions` list is empty, so the page says the checklist is agreed with the quote. Add confirmed items to show an "Included" list. Oven interiors, carpets and rubbish removal are described as not assumed.
- **Evidence**: no reviews, job photos or credentials were supplied, so the reviews section is hidden. Add genuine attributed reviews to `reviews` (`{ "quote", "name", "detail" }`) to show it.
- **Form**: posts `FormData` with `Accept: application/json` to `form.endpoint` (compatible with Formspree/Basin/Getform-style services). It shows success only after a 2xx response. Until an endpoint is set, it tells visitors the form isn't connected and to call or email. Includes a `_gotcha` honeypot.
- **Mobile**: the header isn't sticky; a Call / Request a quote bar is fixed to the bottom and hides while the quote form or footer is on screen. From 900px the header is sticky and the bar is gone.

## Verified
- Screenshots at 375, 768 and 1440px; no horizontal scroll.
- Form: empty/invalid validation with focus on first error, service links preselect type, "not connected" state, failed send (HTTP 500 → retry, data kept), success (HTTP 200) — tested against a local mock endpoint.
- Keyboard: skip link, visible focus. One H1, logical headings, all fields labelled, all images have alt text.
- Lighthouse (mobile, draft build): Accessibility 100, Best Practices 100, SEO 100.

## Before launch — still needed
- Phone, email, town/area, areas covered, trading details, production URL
- Renata's short bio; answers for coverage, access, preparation and payment FAQs
- Confirmed inclusions per service (optional but recommended)
- A form endpoint + provider name; privacy notice details (provider storage, retention) — have the notice checked
- Genuine reviews / real job photos if available
- Performance check on the real host (fonts load from Google; consider self-hosting them)

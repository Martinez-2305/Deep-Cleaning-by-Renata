# Deep Cleaning Landing Page

## Brief
Build a polished, mobile-first UK cleaning landing page exclusively for end-of-tenancy, post-renovation and one-off general deep cleans. Goal: qualified quote enquiries. No recurring housekeeping or unrelated services. Unique selling point: eco-friendly cleaning products with minimal use of strong chemicals — make this prominent, but keep every environmental claim specific and substantiated (UK CMA Green Claims Code); never "chemical-free", "100% natural" or unverified certifications.

Inspect the existing project and reuse its conventions. Prefer simple implementation and minimal dependencies. Supplied branding takes precedence. Keep missing business name, location, contact details and other facts as explicit placeholders in one editable config; never invent them. State the design direction briefly, then implement without repeated approval requests.

## Research and inspiration — before coding
Inspect three relevant examples from at least two sources below. Follow gallery links to the original websites and inspect mobile layouts where possible; do not rely solely on thumbnails. Prioritise local services, interiors and property businesses over SaaS launches.

| Source | What to study |
| --- | --- |
| [Siteinspire](https://www.siteinspire.com/) | Browse Minimal, Typographic and Grid Layout; look for property/interiors examples. Study alignment, photographic composition and whitespace. |
| [Landbook](https://land-book.com/design/landing-page) | Use Local Business, Furniture & Interiors or Real Estate filters and Service/Single Page types where available. Study service explanation, CTA placement and page rhythm. |
| [Typewolf](https://www.typewolf.com/) | Study real font pairings, heading/body contrast and readable text. Starting point: [Manrope](https://www.typewolf.com/manrope) headings with [Public Sans](https://www.typewolf.com/public-sans) body. |

Record the three exact reference URLs and one useful principle from each in your implementation notes, not on the public page. If access fails, state that honestly and proceed with this brief; never pretend to have inspected a reference.

**Originality:** extract principles, not finished sections. Create a fresh wireframe around this business's services, photos and enquiry journey. Do not trace screenshots, reproduce another page's distinctive composition/section sequence, copy its wording or code, or reuse its imagery without permission. Do not reproduce one site's combined palette, typography and layout with a replacement logo. Use references to inform a coherent original system, not a collage. Compare the finished page against references and redesign any conspicuously similar section.

## Visual system
- Mood: established, meticulous, welcoming. Before choosing colours, locate and visually inspect the logo image in the project folder, including asset/public directories. Extract its dominant and accent colours as hex values (inspect SVG fills or sample raster pixels); ignore transparent backgrounds and anti-aliasing artefacts. If several logos exist, prefer the one already used by the project; ask only if the intended brand is unclear.
- Build the palette from those logo colours: assign primary/action, accent, background, surface and text tokens; derive restrained tints/shades and complementary neutrals. Check text/button contrast and adjust UI shades where necessary without recolouring the logo. Record extracted colours and their roles in implementation notes. Do not invent sampled values or force every logo colour into the page. Only if no usable logo or supplied palette exists, use warm white #F7F5F0, charcoal #202A28 and deep green #234D43 as a fallback.
- Starting typography: Manrope 600/700 headings with Public Sans 400/600 body/UI; at most two families. The aim is a contemporary service-business look, not a traditional/editorial one, so avoid serif display faces such as Libre Baskerville. This is a project choice, not an automatic recipe for quality. Confirm font licensing before use.
- Body: 16–18px, approximately 1.6 line height, 55–70 characters per line. Headings: responsive sizing, approximately 1.1–1.2 line height; judge mobile wrapping. Avoid ultra-thin text, arbitrary italic emphasis, excessive letter spacing and oversized headlines that bury the service/CTA.
- Use a roughly 1200px container, consistent spacing scale and clear alignment. Vary composition by content: split hero, service rows, photographic evidence, compact process. Start with 4–8px control corners; use borders and whitespace before shadows. Consistency should support hierarchy, not make every section identical.
- Prefer authentic cleaning/property photography, consistent light and intentional crops. Never represent stock/generated photographs as actual jobs or before/after evidence. Use one restrained icon family only where it aids understanding.

## Avoid the generic AI-template look
These are design associations, not proof of AI authorship. Inter, Roboto, Arial and system fonts are not inherently bad; avoid choosing them automatically or treating a font swap as a complete redesign. Do not simply substitute another fashionable default such as Space Grotesk.

Avoid purple/blue gradient heroes, gradient headline text, glow blobs, glass panels, floating dashboard mockups, decorative sparkle icons, excessive pills, giant rounded cards and identical three-card rows throughout. Avoid empty badge → centred slogan → two buttons → cards as an unquestioned template. No fake counters, invented trust badges or filler sections.

Do not replace those clichés with gratuitous brutalism, huge serif slogans or decorative complexity. Every prominent element must explain the service, provide evidence or help someone enquire. Keep animation subtle, respect reduced motion and never hide content behind entrance effects.

Research basis: [Anthropic's frontend design guidance](https://claude.com/blog/improving-frontend-design-through-skills) describes recurring typography, gradient and layout defaults; [Kosta Canatselis's design critique](https://world.hey.com/kostac/spot-the-slop-a-ui-designer-s-guide-to-fixing-ai-defaults-4c448c9c) discusses uniform components, generic copy and missing interaction states. Apply these observations to this brief, not as universal bans.

## Content and conversion
1. Header: name/logo, short anchor navigation, phone and “Request a quote”.
2. Hero: one specific H1 naming the service/location, short supporting copy, quote CTA, call action and strong photograph.
3. Services: distinguish the three cleaning types, intended customers and confirmed inclusions/extras. Never assume carpet cleaning, waste removal or appliance interiors are included.
4. Evidence: genuine attributed reviews, job photos and verified credentials; omit if unavailable.
5. Process: enquiry → scope/quote agreed → clean completed. Explain that size, condition and requirements affect pricing.
6. FAQs: confirmed answers on coverage, access, preparation, inclusions and booking.
7. Quote/footer: name, contact details, postcode, cleaning type, short description; optional preferred date. Include contact information and a real privacy link.

Write concise British English. Avoid vague claims such as “sparkling perfection” or “unparalleled service”. Never invent prices, ratings, insurance, experience, availability or guarantees; never promise deposit returns. Repeat the same primary CTA at useful points. Make phone links tappable; sticky controls must not obscure content.

## Completion checks
- Semantic HTML, one H1, logical headings, labelled fields, keyboard navigation, visible focus, readable contrast, useful alt text and comfortable touch targets.
- Working form integration with validation, submitting, confirmed-success and recoverable-error states. Never simulate delivery; disclose missing integration.
- Responsive compressed images with reserved dimensions; prioritise the hero and lazy-load below-fold media. Minimise scripts/fonts.
- Accurate title, description and social metadata; canonical URL and LocalBusiness schema only with verified production details.
- Inspect screenshots at 375px, 768px and 1440px; refine hierarchy, spacing, image crops and wrapping. Check originality against references.
- Test navigation, CTAs, keyboard use and form outcomes; run available build checks. Report missing content/integrations honestly before calling the page production-ready.

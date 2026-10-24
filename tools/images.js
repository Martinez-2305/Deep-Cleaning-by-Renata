// One-off image preparation: crops and compresses the supplied originals in /images
// into responsive WebP/JPEG files in src/assets/img. Needs `sharp`
// (npm i -D sharp). Only rerun when the source images change; output is committed.
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

const root = path.join(__dirname, '..');

// Brand labels to blur, by photo number in "images/images of cleaning jobs" (areas in the
// original photo's pixels; a soft margin is added around each). Add an entry for any new
// photo that shows a cleaning product or other branded label.
const BLUR_LABELS = {
  40: [{ left: 950, top: 120, width: 460, height: 540 }],  // tub and tile spray
  43: [{ left: 650, top: 640, width: 350, height: 510 }],  // cleaner bottle on the hood
  45: [{ left: 820, top: 670, width: 270, height: 400 }],  // cleaner bottle on the hood
  47: [{ left: 1370, top: 740, width: 230, height: 330 }], // bottle at the edge of the sink
  49: [{ left: 660, top: 110, width: 290, height: 370 }],  // cleaner bottle behind the sink
  56: [{ left: 0, top: 220, width: 200, height: 260 }],    // toothpaste and hand soap by the basin
};

// Returns the photo with each area blurred, fading softly into the surrounding image.
async function blurAreas(file, areas) {
  const base = await sharp(file).rotate().toBuffer();
  const meta = await sharp(base).metadata();
  const patches = await Promise.all(areas.map(async (box) => {
    const f = Math.round(Math.min(box.width, box.height) * 0.15); // fade width
    const left = Math.max(0, box.left - f), top = Math.max(0, box.top - f);
    const r = { left, top, width: Math.min(meta.width, box.left + box.width + f) - left, height: Math.min(meta.height, box.top + box.height + f) - top };
    const mask = Buffer.from(`<svg width="${r.width}" height="${r.height}"><defs><filter id="f" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${f / 2}"/></filter></defs><rect x="${f}" y="${f}" width="${r.width - 2 * f}" height="${r.height - 2 * f}" rx="${f}" fill="#fff" filter="url(#f)"/></svg>`);
    const blurred = await sharp(base).extract(r).blur(Math.max(18, Math.round(Math.min(box.width, box.height) / 9)))
      .ensureAlpha().composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
    return { input: blurred, left: r.left, top: r.top };
  }));
  return sharp(base).composite(patches).toBuffer();
}
const src = (f) => path.join(root, 'images', f);
const out = (f) => path.join(root, 'src', 'assets', 'img', f);
fs.mkdirSync(path.dirname(out('x')), { recursive: true });

(async () => {
  // Logo: trim the empty square canvas down to the artwork (plus a little padding).
  const logoCrop = { left: 59, top: 244, width: 890, height: 508 };
  for (const w of [360, 720]) {
    const img = sharp(src('DCBR-logo.jpg')).extract(logoCrop).resize(w);
    await img.clone().webp({ quality: 82 }).toFile(out(`logo-${w}.webp`));
    await img.clone().jpeg({ quality: 82, mozjpeg: true }).toFile(out(`logo-${w}.jpg`));
  }

  // Portraits: AVIF (smallest), WebP and JPEG (fallback) at 480/720/1000px wide.
  // build.js only offers AVIF for images that have AVIF files.
  async function portrait(file, crop, name) {
    for (const w of [480, 720, 1000]) {
      const img = sharp(src(file)).extract(crop).resize(w);
      await img.clone().avif({ quality: 55, effort: 6 }).toFile(out(`${name}-${w}.avif`));
      await img.clone().webp({ quality: 78 }).toFile(out(`${name}-${w}.webp`));
      await img.clone().jpeg({ quality: 80, mozjpeg: true }).toFile(out(`${name}-${w}.jpg`));
    }
  }

  // Founder portrait: 4:5 crop keeping Renata's face and the branded apron.
  await portrait('Founder-image.jpeg', { left: 0, top: 60, width: 1067, height: 1334 }, 'renata');

  // Second portrait for Meet Renata (sage blazer): 4:5 crop from just above her head
  // to below the jacket hem. The square mobile crop (CSS, 50% 15%) still frames her face.
  await portrait('founder-img2.jpeg', { left: 0, top: 40, width: 1067, height: 1334 }, 'renata-portrait');

  // "A little more about me" (green jumper, seated): 4:5 crop from above her head to
  // just below her hands.
  await portrait('more-abt-pic.jpeg', { left: 0, top: 190, width: 1067, height: 1334 }, 'renata-more');

  // Social share image (1200x630): the logo's own background band, no recolouring.
  await sharp(src('DCBR-logo.jpg'))
    .extract({ left: 0, top: 243, width: 1024, height: 538 })
    .resize(1200, 630)
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(out('og-image.jpg'));

  // Favicon / touch icon: the house mark from the logo.
  const house = { left: 722, top: 518, width: 172, height: 132 };
  const icon = sharp(src('DCBR-logo.jpg')).extract(house)
    .resize(180, 180, { fit: 'contain', background: '#e9f4bd' });
  await icon.clone().png().toFile(out('apple-touch-icon.png'));
  await icon.clone().resize(48, 48).png().toFile(out('favicon-48.png'));

  // Job photos: every file in images/photos → <name>-480/720/1000.webp|jpg, ready to
  // reference by <name> in site.config.json photo slots (hero, founder, results, tackle).
  // Cropping to the slot's shape happens in CSS, so keep the subject near the centre.
  const photoDir = path.join(root, 'images', 'photos');
  const photos = fs.existsSync(photoDir) ? fs.readdirSync(photoDir).filter((f) => /\.(jpe?g|png|webp|heic)$/i.test(f)) : [];
  for (const file of photos) {
    const name = path.parse(file).name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    for (const w of [480, 720, 1000]) {
      const img = sharp(path.join(photoDir, file)).rotate().resize({ width: w, withoutEnlargement: true });
      await img.clone().avif({ quality: 55, effort: 6 }).toFile(out(`${name}-${w}.avif`));
      await img.clone().webp({ quality: 78 }).toFile(out(`${name}-${w}.webp`));
      await img.clone().jpeg({ quality: 80, mozjpeg: true }).toFile(out(`${name}-${w}.jpg`));
    }
    console.log(`  photo "${name}"`);
  }

  // Gallery page: every photo in images/images of cleaning jobs → gallery-NN-400 (thumbnail)
  // and gallery-NN-1200 (full size), AVIF + JPEG. NN is the number in "cleaning-img (NN).jpeg";
  // site.config.json → gallery lists them in display order with alt text.
  const jobsDir = path.join(root, 'images', 'images of cleaning jobs');
  const jobs = fs.existsSync(jobsDir) ? fs.readdirSync(jobsDir).filter((f) => /\((\d+)\)\.(jpe?g|png|webp)$/i.test(f)) : [];
  for (const file of jobs) {
    const n = file.match(/\((\d+)\)/)[1].padStart(2, '0');
    // Product labels are blurred in the source first, so every size and format inherits it.
    const input = BLUR_LABELS[Number(n)] ? await blurAreas(path.join(jobsDir, file), BLUR_LABELS[Number(n)]) : path.join(jobsDir, file);
    for (const [w, q, qa] of [[400, 72, 50], [1200, 80, 55]]) {
      const img = sharp(input).rotate().resize({ width: w, withoutEnlargement: true });
      await img.clone().avif({ quality: qa, effort: 6 }).toFile(out(`gallery-${n}-${w}.avif`));
      await img.clone().jpeg({ quality: q, mozjpeg: true }).toFile(out(`gallery-${n}-${w}.jpg`));
    }
  }
  if (jobs.length) console.log(`  ${jobs.length} gallery photos`);

  console.log('Images written to src/assets/img');
})();

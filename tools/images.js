// One-off image preparation: crops and compresses the supplied originals in /images
// into responsive WebP/JPEG files in src/assets/img. Needs `sharp`
// (npm i -D sharp). Only rerun when the source images change; output is committed.
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

const root = path.join(__dirname, '..');
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

  console.log('Images written to src/assets/img');
})();

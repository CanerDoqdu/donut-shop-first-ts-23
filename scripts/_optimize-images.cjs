/**
 * One-time image optimization script.
 * Resizes all PNGs in /public to max 800px width and compresses them.
 * Backs up originals to /public/_originals/ before overwriting.
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const PUBLIC = path.join(__dirname, '..', 'public');
const BACKUP = path.join(PUBLIC, '_originals');
const MAX_WIDTH = 800;
const PNG_QUALITY = 80; // 0-100 for palette/effort based compression

async function main() {
  fs.mkdirSync(BACKUP, { recursive: true });

  const files = fs.readdirSync(PUBLIC).filter((f) => f.endsWith('.png'));
  console.log(`Found ${files.length} PNG files to optimize.`);

  for (const file of files) {
    const src = path.join(PUBLIC, file);
    const backup = path.join(BACKUP, file);
    const stat = fs.statSync(src);
    const sizeMB = (stat.size / 1024 / 1024).toFixed(2);

    // Skip already-small files (< 500KB)
    if (stat.size < 500 * 1024) {
      console.log(`  SKIP ${file} (${sizeMB} MB — already small)`);
      continue;
    }

    // Backup original
    if (!fs.existsSync(backup)) {
      fs.copyFileSync(src, backup);
    }

    try {
      const meta = await sharp(src).metadata();
      const needsResize = meta.width && meta.width > MAX_WIDTH;

      let pipeline = sharp(src);
      if (needsResize) {
        pipeline = pipeline.resize({ width: MAX_WIDTH, withoutEnlargement: true });
      }
      pipeline = pipeline.png({ compressionLevel: 9, effort: 10, quality: PNG_QUALITY });

      const buf = await pipeline.toBuffer();
      fs.writeFileSync(src, buf);

      const newSize = (buf.length / 1024).toFixed(0);
      const ratio = ((1 - buf.length / stat.size) * 100).toFixed(0);
      console.log(
        `  OK ${file}: ${sizeMB} MB → ${newSize} KB (${ratio}% smaller)` +
          (needsResize ? ` [resized ${meta.width}→${MAX_WIDTH}]` : '')
      );
    } catch (err) {
      console.error(`  ERR ${file}: ${err.message}`);
    }
  }

  console.log('\nDone. Originals backed up to public/_originals/');
}

main();

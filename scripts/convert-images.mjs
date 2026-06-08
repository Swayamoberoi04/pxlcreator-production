/**
 * One-off script: convert all .jpg files in public/presets/ and public/assets/
 * to .webp at 80% quality using sharp.
 *
 * Run with:  node scripts/convert-images.mjs
 *
 * Originals are NOT deleted — verify the .webp files look correct first,
 * then remove the .jpg files manually (or re-run with --delete).
 */

import sharp from 'sharp';
import { readdir, stat } from 'node:fs/promises';
import { join, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIRS = ['public/presets', 'public/assets'];
const QUALITY = 80;
const DELETE_ORIGINALS = process.argv.includes('--delete');

async function jpgsIn(dir) {
  const entries = await readdir(join(ROOT, dir));
  return entries
    .filter(f => extname(f).toLowerCase() === '.jpg')
    .map(f => ({ dir, file: f, abs: join(ROOT, dir, f) }));
}

async function convertFile({ abs, dir, file }) {
  const outPath = join(ROOT, dir, basename(file, extname(file)) + '.webp');
  await sharp(abs).webp({ quality: QUALITY }).toFile(outPath);

  const [srcStat, dstStat] = await Promise.all([stat(abs), stat(outPath)]);
  const saved = ((1 - dstStat.size / srcStat.size) * 100).toFixed(1);
  const srcKB = (srcStat.size / 1024).toFixed(0).padStart(6);
  const dstKB = (dstStat.size / 1024).toFixed(0).padStart(6);
  console.log(`  ${String(saved).padStart(5)}% saved  ${srcKB} KB → ${dstKB} KB  ${dir}/${file}`);
  return { srcSize: srcStat.size, dstSize: dstStat.size };
}

async function main() {
  const allFiles = (await Promise.all(DIRS.map(jpgsIn))).flat();
  console.log(`Converting ${allFiles.length} JPEG files to WebP (quality ${QUALITY})…\n`);

  let totalSrc = 0, totalDst = 0;
  for (const entry of allFiles) {
    const { srcSize, dstSize } = await convertFile(entry);
    totalSrc += srcSize;
    totalDst += dstSize;
  }

  const totalSavedMB = ((totalSrc - totalDst) / 1024 / 1024).toFixed(1);
  const totalPct = ((1 - totalDst / totalSrc) * 100).toFixed(1);
  console.log(`\nTotal saved: ${totalSavedMB} MB  (${totalPct}% reduction)`);

  if (DELETE_ORIGINALS) {
    const { unlink } = await import('node:fs/promises');
    console.log('\n--delete flag set: removing original .jpg files…');
    for (const { abs, dir, file } of allFiles) {
      await unlink(abs);
      console.log(`  deleted ${dir}/${file}`);
    }
  } else {
    console.log('\nOriginals kept. Re-run with --delete once you have verified the .webp files.');
  }
}

main().catch(err => { console.error(err); process.exit(1); });

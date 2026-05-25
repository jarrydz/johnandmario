/**
 * upload.mjs — upload captioned originals to R2 via wrangler.
 *
 * Good for the test batch and incremental top-ups (tens–hundreds of files).
 * For the full ~6,700-image run, use rclone instead (see scripts/README.md) —
 * it is far faster than spawning wrangler per file.
 *
 * Resumable: uploaded filenames are recorded in data/uploaded.log and skipped.
 *
 * Usage:
 *   npx wrangler login        # once, if not already
 *   node upload.mjs           # uploads every captioned image not yet uploaded
 *   node upload.mjs --limit 50
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '..');
const IMG_DIR = path.join(ROOT, 'original-blog-imgs');
const CAPTIONS = path.join(import.meta.dirname, 'data', 'captions.jsonl');
const UPLOADED = path.join(import.meta.dirname, 'data', 'uploaded.log');
const BUCKET = 'johnandmario-images';

const args = process.argv.slice(2);
const limitIdx = args.indexOf('--limit');
const limit = limitIdx === -1 ? 0 : Number(args[limitIdx + 1]) || 0;
const concurrency = 3;

const MEDIA = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp' };

const done = new Set(
  fs.existsSync(UPLOADED) ? fs.readFileSync(UPLOADED, 'utf8').split('\n').filter(Boolean) : [],
);

let files = fs
  .readFileSync(CAPTIONS, 'utf8')
  .split('\n')
  .filter((l) => l.trim())
  .map((l) => JSON.parse(l).filename)
  .filter((fn) => !done.has(fn));

if (limit) files = files.slice(0, limit);

console.log(`To upload: ${files.length} (already uploaded: ${done.size}).`);
if (files.length === 0) process.exit(0);

const uploadedStream = fs.createWriteStream(UPLOADED, { flags: 'a' });

function putOne(fn) {
  const ext = path.extname(fn).toLowerCase();
  const mime = MEDIA[ext] || 'application/octet-stream';
  const filePath = path.join(IMG_DIR, fn);
  return new Promise((resolve) => {
    const child = spawn(
      'npx',
      ['wrangler', 'r2', 'object', 'put', `${BUCKET}/${fn}`, '--file', filePath, '--content-type', mime, '--remote'],
      { cwd: import.meta.dirname, stdio: ['ignore', 'ignore', 'pipe'] },
    );
    let err = '';
    child.stderr.on('data', (d) => (err += d));
    child.on('close', (code) => {
      if (code === 0) {
        uploadedStream.write(fn + '\n');
        resolve(true);
      } else {
        console.error(`  ! failed: ${fn} — ${err.trim().split('\n').pop()}`);
        resolve(false);
      }
    });
  });
}

let cursor = 0;
let ok = 0;
async function worker() {
  while (cursor < files.length) {
    const fn = files[cursor++];
    const success = await putOne(fn);
    if (success) ok++;
    if ((ok % 10 === 0 && success) || cursor === files.length) {
      console.log(`  ${cursor}/${files.length} processed`);
    }
  }
}

await Promise.all(Array.from({ length: concurrency }, worker));
uploadedStream.end();
console.log(`Done. ${ok}/${files.length} uploaded.`);

/**
 * img.mjs — add ONE new photo post to the Look feed, end to end.
 *
 * Point it at an image. It reads the dimensions, captions it with Claude
 * (the same prompt that captioned the 6,726-image archive), uploads the
 * original to R2, writes the Astro markdown post, then commits and pushes —
 * which triggers the GitHub Actions deploy. Live in ~1–2 minutes.
 *
 * This is the single-post counterpart to the bulk import trio
 * (caption.mjs → generate-posts.mjs → upload.mjs). It does not touch
 * data/index.json or data/captions.jsonl — a new post is self-contained.
 *
 * Usage (key is read from the macOS Keychain by the npm script — never on disk):
 *   npm run img -- ~/Desktop/cabin.jpg
 *   npm run img -- ~/Desktop/cabin.jpg --tags architecture,timber --date 2026-06-20
 *   npm run img -- ~/Desktop/cabin.jpg --no-push      # commit, but don't deploy
 *   npm run img -- ~/Desktop/cabin.jpg -y             # skip the confirm prompt
 *   npm run img -- ~/Desktop/cabin.jpg --dry-run      # no API, no upload, no git
 *
 * Flags:
 *   --date <ISO>      post date (default: now)
 *   --tags a,b,c      extra tags, merged with the AI tags (deduped)
 *   --title "..."     optional post title
 *   --source "..."    original creator/source (renders an attribution line)
 *   --source-url URL  link for the attribution
 *   --slug <text>     override the auto id (becomes the URL)
 *   --no-push         commit but don't push (no live deploy)
 *   -y, --yes         skip the confirmation prompt
 *   --dry-run         do everything local except API, upload, and git (for testing)
 *   --model NAME      override the model (default Claude Haiku 4.5)
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import readline from 'node:readline/promises';
import { spawn } from 'node:child_process';
import sharp from 'sharp';
import Anthropic from '@anthropic-ai/sdk';

const SCRIPTS_DIR = import.meta.dirname;
const ROOT = path.resolve(SCRIPTS_DIR, '..');
const POSTS_DIR = path.join(ROOT, 'src', 'content', 'posts');
const BUCKET = 'johnandmario-images';
const KEY_PREFIX = 'new/'; // namespaces fresh uploads apart from the archive
const SITE_BASE = 'https://jarrydz.github.io/johnandmario';
const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';

const MEDIA = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

// ---- caption prompt (mirrors caption.mjs — keep the two in sync) ----------
const SYSTEM = `You caption images for a curated visual-inspiration archive (early-2010s Tumblr aesthetic spanning architecture, interiors, design, fashion, nature, travel, food, art and people). You produce two things: plain factual alt text for screen-reader accessibility, and an evocative description rich enough to use as a generative-image (Midjourney-style) prompt. Ground everything in what is visibly present — subject, setting, materials, light, colour palette, mood, composition, and visual style or medium. Be confident and sensory about the aesthetics. Never invent or transcribe brand names, logos, label text, identities, or place names — describe them generically (e.g. "a bottle of red wine", "a canvas holdall"). Write in British English (colour, grey, neutral tones). Do not begin with "image of" or "a photo of".`;

const USER = `Return ONLY a JSON object (no markdown) with keys:
"alt": one concise, plainly factual sentence (max ~125 characters) for screen readers — accurate, no flourish.
"description": one or two evocative sentences that could be fed to an image generator to recreate the scene — capture subject, setting, materials, light, colour palette, mood, composition, and visual style or medium (e.g. "35mm film", "architectural photography", "soft overcast light", "muted earth tones"). Sensory and atmospheric, but grounded in what is shown.
"tags": array of 6–12 short lowercase keywords (subjects, materials, style, palette, setting, mood).
Do not transcribe text, logos, or brand labels — describe them generically.`;

// ---- args -----------------------------------------------------------------
const args = process.argv.slice(2);
const getFlag = (name, def) => {
  const i = args.indexOf(name);
  return i === -1 ? def : args[i + 1];
};
const has = (name) => args.includes(name);

// First non-flag argument that isn't itself a flag's value:
const FLAGS_WITH_VALUES = new Set(['--date', '--tags', '--title', '--source', '--source-url', '--slug', '--model']);
let imageArg;
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a.startsWith('-')) {
    if (FLAGS_WITH_VALUES.has(a)) i++; // skip its value
    continue;
  }
  imageArg = a;
  break;
}

const dryRun = has('--dry-run');
const noPush = has('--no-push');
const skipConfirm = has('-y') || has('--yes');
const model = getFlag('--model', DEFAULT_MODEL);
const extraTags = (getFlag('--tags', '') || '')
  .split(',')
  .map((t) => t.trim().toLowerCase())
  .filter(Boolean);
const title = getFlag('--title', null);
const source = getFlag('--source', null);
const sourceUrl = getFlag('--source-url', null);
const slugOverride = getFlag('--slug', null);
const dateArg = getFlag('--date', null);

function fail(msg) {
  console.error(`\n✗ ${msg}\n`);
  process.exit(1);
}

if (!imageArg) {
  fail('No image given.  Usage:  npm run img -- <image-path> [flags]');
}

// Resolve the path against where the user *ran* npm (INIT_CWD), expanding ~.
const baseCwd = process.env.INIT_CWD || process.cwd();
let imagePath = imageArg.startsWith('~')
  ? path.join(os.homedir(), imageArg.slice(1))
  : imageArg;
imagePath = path.resolve(baseCwd, imagePath);

if (!fs.existsSync(imagePath)) fail(`Image not found: ${imagePath}`);
const ext = path.extname(imagePath).toLowerCase();
const mime = MEDIA[ext];
if (!mime) fail(`Unsupported image type "${ext}". Use one of: ${Object.keys(MEDIA).join(', ')}`);

if (!dryRun && !process.env.ANTHROPIC_API_KEY) {
  fail(
    'No ANTHROPIC_API_KEY. Run via "npm run img" (it reads the macOS Keychain),\n' +
      '  or store it once:  security add-generic-password -U -a "$USER" -s ANTHROPIC_API_KEY -w',
  );
}

// ---- helpers --------------------------------------------------------------
function extractJson(text) {
  const s = text.indexOf('{');
  const e = text.lastIndexOf('}');
  if (s === -1 || e === -1) throw new Error('no JSON object in model response');
  return JSON.parse(text.slice(s, e + 1));
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Run a command, inheriting stdio so the user sees git/wrangler progress.
function run(cmd, argv, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, argv, { stdio: 'inherit', ...opts });
    child.on('close', (code) =>
      code === 0 ? resolve() : reject(new Error(`${cmd} ${argv.join(' ')} exited ${code}`)),
    );
  });
}

// Like run(), but retries on failure — git exits 128 when another process
// (commonly an editor's git worker, e.g. Cursor) is holding a .lock for a
// split second. A short backoff almost always clears it.
async function runRetry(cmd, argv, { attempts = 4, delayMs = 1500, label, ...opts } = {}) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      await run(cmd, argv, opts);
      return;
    } catch (e) {
      lastErr = e;
      if (i < attempts - 1) {
        process.stdout.write(`  ${label || cmd} blocked (an editor's git worker?) — retrying…\n`);
        await sleep(delayMs);
      }
    }
  }
  throw lastErr;
}

async function caption(buffer) {
  if (dryRun) {
    return {
      alt: '[dry-run] factual alt text would go here.',
      description: '[dry-run] evocative description would go here.',
      tags: ['dry-run'],
    };
  }
  const client = new Anthropic();
  let lastErr;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const msg = await client.messages.create({
        model,
        max_tokens: 500,
        system: SYSTEM,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: buffer.toString('base64') } },
              { type: 'text', text: USER },
            ],
          },
          { role: 'assistant', content: '{' }, // prefill forces a JSON object
        ],
      });
      const data = extractJson('{' + msg.content[0].text);
      return {
        alt: String(data.alt || '').trim(),
        description: String(data.description || '').trim(),
        tags: Array.isArray(data.tags) ? data.tags.map((t) => String(t).toLowerCase().trim()).filter(Boolean) : [],
      };
    } catch (e) {
      lastErr = e;
      const status = e?.status;
      if (status === 429 || status === 500 || status === 529 || e instanceof SyntaxError) {
        await sleep(1000 * 2 ** attempt);
        continue;
      }
      throw e;
    }
  }
  throw lastErr;
}

// ---- main -----------------------------------------------------------------
async function main() {
  // 1. Dimensions + a downscaled payload for the vision call (cheaper tokens).
  const meta = await sharp(imagePath).metadata();
  const small = await sharp(imagePath)
    .rotate()
    .resize(768, 768, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();

  // 2. Identity: date → slug → r2 key.
  const dateIso = dateArg || new Date().toISOString();
  const dateOnly = String(dateIso).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}/.test(dateOnly)) fail(`--date must be ISO (YYYY-MM-DD…), got "${dateArg}"`);
  const id = slugOverride
    ? String(slugOverride).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '')
    : crypto.randomBytes(4).toString('hex');
  const slug = `${dateOnly}-${id}`;
  const r2Key = `${KEY_PREFIX}${slug}${ext}`;
  const postPath = path.join(POSTS_DIR, `${slug}.md`);
  if (fs.existsSync(postPath)) fail(`A post already exists at ${path.relative(ROOT, postPath)} — pass a different --slug.`);

  // 3. Caption.
  process.stdout.write(dryRun ? 'Captioning (dry-run, skipped)…\n' : 'Captioning with Claude…\n');
  const cap = await caption(small);
  const tags = [...new Set([...extraTags, ...cap.tags])];

  // 4. Build the frontmatter (mirrors generate-posts.mjs; JSON.stringify gives
  //    safe double-quoted YAML scalars for colons/quotes/unicode).
  const fm = [
    '---',
    `date: ${JSON.stringify(dateIso)}`,
    'post_type: photo',
    title ? `title: ${JSON.stringify(title)}` : null,
    `r2_key: ${JSON.stringify(r2Key)}`,
    `image_width: ${meta.width}`,
    `image_height: ${meta.height}`,
    `image_alt: ${JSON.stringify(cap.alt)}`,
    cap.description ? `description: ${JSON.stringify(cap.description)}` : null,
    tags.length ? `tags: ${JSON.stringify(tags)}` : null,
    source ? `source: ${JSON.stringify(source)}` : null,
    sourceUrl ? `source_url: ${JSON.stringify(sourceUrl)}` : null,
    '---',
    '',
  ]
    .filter((l) => l !== null)
    .join('\n');

  // 5. Preview.
  console.log('\n────────────────────────────────────────────');
  console.log(`  image     ${path.relative(baseCwd, imagePath)}  (${meta.width}×${meta.height})`);
  console.log(`  post      src/content/posts/${slug}.md`);
  console.log(`  r2 key    ${r2Key}`);
  console.log(`  url       ${SITE_BASE}/posts/${slug}/`);
  console.log(`  alt       ${cap.alt}`);
  console.log(`  desc      ${cap.description}`);
  console.log(`  tags      ${tags.join(', ') || '—'}`);
  console.log('────────────────────────────────────────────\n');

  // 6. Confirm.
  if (!skipConfirm && !dryRun && process.stdin.isTTY) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = (await rl.question('Publish this post? [Y/n] ')).trim().toLowerCase();
    rl.close();
    if (answer === 'n' || answer === 'no') {
      console.log('Aborted. Nothing uploaded or committed.');
      process.exit(0);
    }
  }

  if (dryRun) {
    console.log('Dry run complete — no upload, no file written, no git. Drop --dry-run to publish.');
    return;
  }

  // 7. Upload the original to R2 (the --remote flag hits the real bucket, not
  //    the local wrangler sim).
  console.log('Uploading original to R2…');
  await run(
    'npx',
    ['wrangler', 'r2', 'object', 'put', `${BUCKET}/${r2Key}`, '--file', imagePath, '--content-type', mime, '--remote'],
    { cwd: SCRIPTS_DIR },
  );

  // 8. Write the post.
  fs.mkdirSync(POSTS_DIR, { recursive: true });
  fs.writeFileSync(postPath, fm);
  console.log(`Wrote src/content/posts/${slug}.md`);

  // 9. Commit (+ push) from the repo root. Retried, because the image is
  //    already in R2 and the post is written — a git lock must not strand us.
  try {
    await runRetry('git', ['add', postPath], { cwd: ROOT, label: 'git add' });
    await runRetry('git', ['commit', '-m', `Add post ${slug}`], { cwd: ROOT, label: 'git commit' });
    if (noPush) {
      console.log(`\nCommitted, not pushed (--no-push). Run "git push" to deploy.`);
    } else {
      await runRetry('git', ['push', '-u', 'origin', 'HEAD'], { cwd: ROOT, label: 'git push' });
      console.log(`\n✓ Pushed. Live in ~1–2 min at ${SITE_BASE}/posts/${slug}/`);
    }
  } catch (e) {
    console.error(
      `\n✗ Git step failed after retries: ${e.message}\n\n` +
        `  The image is uploaded and the post is written — only the commit/push remains.\n` +
        `  A stuck git lock (often Cursor's git worker) is the usual cause. Finish manually:\n\n` +
        `    find "${ROOT}/.git" -name '*.lock' -delete\n` +
        `    git -C "${ROOT}" add -A && git -C "${ROOT}" commit -m "Add post ${slug}" && git -C "${ROOT}" push -u origin HEAD\n`,
    );
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(`\n✗ ${e?.message || e}\n`);
  process.exit(1);
});

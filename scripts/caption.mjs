/**
 * caption.mjs — generate alt text + description + tags for archive images
 * using Claude vision. Resumable: results are appended to data/captions.jsonl
 * keyed by filename, and anything already captioned is skipped on re-run.
 *
 * Usage:
 *   export ANTHROPIC_API_KEY=sk-ant-...
 *   node caption.mjs --sample --limit 50          # representative 50 across the timeline
 *   node caption.mjs                              # everything not yet captioned
 *   node caption.mjs --limit 200 --concurrency 6
 *
 * Flags:
 *   --limit N        cap how many NEW images to caption this run
 *   --sample         pick an even spread across the whole timeline (good for testing)
 *   --concurrency N  parallel requests (default 4)
 *   --model NAME     override the model (default Claude Haiku 4.5)
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import Anthropic from '@anthropic-ai/sdk';

const ROOT = path.resolve(import.meta.dirname, '..');
const IMG_DIR = path.join(ROOT, 'original-blog-imgs');
const INDEX = path.join(import.meta.dirname, 'data', 'index.json');
const OUT = path.join(import.meta.dirname, 'data', 'captions.jsonl');
const ERR = path.join(import.meta.dirname, 'data', 'captions-errors.log');

// Swap to 'claude-sonnet-4-6' for maximum quality (a few× the cost).
const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';

// The hand-written example post already covers this image — skip it so we don't
// create a duplicate when sampling/generating.
const EXAMPLE_FILENAME = '00001_4943938579.jpg';

const args = process.argv.slice(2);
const getFlag = (name, def) => {
  const i = args.indexOf(name);
  return i === -1 ? def : args[i + 1];
};
const limit = Number(getFlag('--limit', '0')) || 0;
const sample = args.includes('--sample');
const concurrency = Number(getFlag('--concurrency', '4')) || 4;
const model = getFlag('--model', DEFAULT_MODEL);

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('Set ANTHROPIC_API_KEY first:  export ANTHROPIC_API_KEY=sk-ant-...');
  process.exit(1);
}

const client = new Anthropic();

const SYSTEM = `You caption images for a curated visual-inspiration archive (early-2010s Tumblr aesthetic spanning architecture, interiors, design, fashion, nature, travel, food, art and people). You produce two things: plain factual alt text for screen-reader accessibility, and an evocative description rich enough to use as a generative-image (Midjourney-style) prompt. Ground everything in what is visibly present — subject, setting, materials, light, colour palette, mood, composition, and visual style or medium. Be confident and sensory about the aesthetics. Never invent or transcribe brand names, logos, label text, identities, or place names — describe them generically (e.g. "a bottle of red wine", "a canvas holdall"). Write in British English (colour, grey, neutral tones). Do not begin with "image of" or "a photo of".`;

const USER = `Return ONLY a JSON object (no markdown) with keys:
"alt": one concise, plainly factual sentence (max ~125 characters) for screen readers — accurate, no flourish.
"description": one or two evocative sentences that could be fed to an image generator to recreate the scene — capture subject, setting, materials, light, colour palette, mood, composition, and visual style or medium (e.g. "35mm film", "architectural photography", "soft overcast light", "muted earth tones"). Sensory and atmospheric, but grounded in what is shown.
"tags": array of 6–12 short lowercase keywords (subjects, materials, style, palette, setting, mood).
Do not transcribe text, logos, or brand labels — describe them generically.`;

const MEDIA = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp' };

function loadDone() {
  if (!fs.existsSync(OUT)) return new Set();
  const done = new Set();
  for (const line of fs.readFileSync(OUT, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try { done.add(JSON.parse(line).filename); } catch {}
  }
  return done;
}

function pickSample(records, n) {
  // Even spread across the (date-sorted) timeline.
  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length <= n) return sorted;
  const step = sorted.length / n;
  const out = [];
  for (let i = 0; i < n; i++) out.push(sorted[Math.floor(i * step)]);
  return out;
}

function extractJson(text) {
  const s = text.indexOf('{');
  const e = text.lastIndexOf('}');
  if (s === -1 || e === -1) throw new Error('no JSON object in response');
  return JSON.parse(text.slice(s, e + 1));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function captionOne(rec) {
  const file = path.join(IMG_DIR, rec.filename);
  const meta = await sharp(file).metadata();
  // Downscale the payload (keeps caption quality, cuts tokens/cost).
  const buf = await sharp(file)
    .rotate()
    .resize(768, 768, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();

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
              { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: buf.toString('base64') } },
              { type: 'text', text: USER },
            ],
          },
          { role: 'assistant', content: '{' }, // prefill forces a JSON object
        ],
      });
      const data = extractJson('{' + msg.content[0].text);
      return {
        filename: rec.filename,
        width: meta.width,
        height: meta.height,
        alt: String(data.alt || '').trim(),
        description: String(data.description || '').trim(),
        tags: Array.isArray(data.tags) ? data.tags.map((t) => String(t).toLowerCase().trim()).filter(Boolean) : [],
      };
    } catch (e) {
      lastErr = e;
      const status = e?.status;
      if (status === 429 || status === 500 || status === 529) {
        await sleep(1000 * 2 ** attempt); // backoff
        continue;
      }
      throw e;
    }
  }
  throw lastErr;
}

async function main() {
  const records = JSON.parse(fs.readFileSync(INDEX, 'utf8'));
  const done = loadDone();

  let pool = records.filter((r) => r.filename !== EXAMPLE_FILENAME && !done.has(r.filename));
  if (sample) pool = pickSample(pool, limit || 50);
  else if (limit) pool = pool.slice(0, limit);

  console.log(`To caption: ${pool.length} (model: ${model}, concurrency: ${concurrency}). Already done: ${done.size}.`);
  if (pool.length === 0) return;

  const outStream = fs.createWriteStream(OUT, { flags: 'a' });
  let completed = 0;
  let cursor = 0;

  async function worker() {
    while (cursor < pool.length) {
      const rec = pool[cursor++];
      try {
        const result = await captionOne(rec);
        outStream.write(JSON.stringify(result) + '\n');
        completed++;
        if (completed % 10 === 0 || completed === pool.length) {
          console.log(`  ${completed}/${pool.length} captioned`);
        }
      } catch (e) {
        const line = `${new Date().toISOString()} ${rec.filename} ${e?.message || e}\n`;
        fs.appendFileSync(ERR, line);
        console.error(`  ! failed: ${rec.filename} — ${e?.message || e}`);
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));
  outStream.end();
  console.log(`Done. ${completed} captioned this run. Output: data/captions.jsonl`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

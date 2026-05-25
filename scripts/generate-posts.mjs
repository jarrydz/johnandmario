/**
 * generate-posts.mjs — turn captioned images into Astro markdown posts.
 *
 * Reads data/index.json (metadata) + data/captions.jsonl (AI captions) and
 * writes one markdown file per captioned image into src/content/posts/.
 * Idempotent: re-running overwrites the generated files.
 *
 * Usage:  node generate-posts.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const INDEX = path.join(import.meta.dirname, 'data', 'index.json');
const CAPTIONS = path.join(import.meta.dirname, 'data', 'captions.jsonl');
const POSTS_DIR = path.join(ROOT, 'src', 'content', 'posts');

const index = new Map(
  JSON.parse(fs.readFileSync(INDEX, 'utf8')).map((r) => [r.filename, r]),
);

if (!fs.existsSync(CAPTIONS)) {
  console.error('No captions found at data/captions.jsonl — run `node caption.mjs` first.');
  process.exit(1);
}

const captions = fs
  .readFileSync(CAPTIONS, 'utf8')
  .split('\n')
  .filter((l) => l.trim())
  .map((l) => JSON.parse(l));

fs.mkdirSync(POSTS_DIR, { recursive: true });

let written = 0;
let skipped = 0;

for (const cap of captions) {
  const meta = index.get(cap.filename);
  if (!meta) {
    console.warn(`  ? no index record for ${cap.filename}, skipping`);
    skipped++;
    continue;
  }
  // Merge curatorial tags (from the original blog) with AI tags, deduped.
  const tags = [...new Set([...(meta.tags || []), ...(cap.tags || [])])];

  const slug = `${meta.date.slice(0, 10)}-${meta.postid}`;

  // JSON.stringify produces valid double-quoted YAML scalars/arrays — safe for
  // colons, quotes and unicode in alt text and descriptions.
  const fm = [
    '---',
    `date: ${JSON.stringify(meta.date)}`,
    'post_type: photo',
    `r2_key: ${JSON.stringify(cap.filename)}`,
    `image_width: ${cap.width}`,
    `image_height: ${cap.height}`,
    `image_alt: ${JSON.stringify(cap.alt)}`,
    cap.description ? `description: ${JSON.stringify(cap.description)}` : null,
    tags.length ? `tags: ${JSON.stringify(tags)}` : null,
    meta.tumblr_url ? `tumblr_url: ${JSON.stringify(meta.tumblr_url)}` : null,
    '---',
    '', // image-first: no body; description lives in frontmatter for meta + search
  ]
    .filter((l) => l !== null)
    .join('\n');

  fs.writeFileSync(path.join(POSTS_DIR, `${slug}.md`), fm);
  written++;
}

console.log(`Wrote ${written} posts to src/content/posts/ (${skipped} skipped).`);

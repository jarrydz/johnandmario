/**
 * quote.mjs — add ONE quote to the Read feed, end to end.
 *
 * The text-only counterpart to img.mjs. A quote is just a short markdown file:
 * the quote is the body, the attribution and source live in frontmatter. No
 * image, no R2, no captioning, no API key — so this runs instantly and offline.
 *
 * Usage (from the repo root):
 *   npm run quote -- "Nothing is a mistake. There's only make." --by "Sister Corita Kent"
 *   npm run quote -- "Words are energy." --by "Unknown" --tags manifestation,language
 *   npm run quote -- "…" --by "Brian Eno" --source "A Year With Swollen Appendices" --year 1996
 *   npm run quote -- --file ~/Desktop/long-passage.txt --by "Someone"
 *   npm run quote                                 # prompts for the text
 *
 * Flags:
 *   --by "..."         attribution (the speaker/author); --attribution also works
 *   --source "..."     the work it's from
 *   --source-url URL   link for the source
 *   --year N           year of the source (source_year)
 *   --tags a,b,c       thematic tags
 *   --lang xx          language code, if not English
 *   --date <ISO>       filing date (default: now)
 *   --slug <text>      override the auto URL slug (recommended for a clean URL)
 *   --file <path>      read the quote body from a file (for longer passages)
 *   --no-push          commit but don't deploy
 *   -y, --yes          skip the confirmation prompt
 *   --dry-run          preview only — no file written, no git
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline/promises';
import { spawn } from 'node:child_process';

const SCRIPTS_DIR = import.meta.dirname;
const ROOT = path.resolve(SCRIPTS_DIR, '..');
const QUOTES_DIR = path.join(ROOT, 'src', 'content', 'quotes');
const SITE_BASE = 'https://jarrydz.github.io/johnandmario';

// ---- args -----------------------------------------------------------------
const args = process.argv.slice(2);
const getFlag = (name, def = null) => {
  const i = args.indexOf(name);
  return i === -1 ? def : args[i + 1];
};
const has = (name) => args.includes(name);

const FLAGS_WITH_VALUES = new Set([
  '--by', '--attribution', '--source', '--source-url', '--year',
  '--tags', '--lang', '--date', '--slug', '--file',
]);
let textArg;
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a.startsWith('-')) {
    if (FLAGS_WITH_VALUES.has(a)) i++;
    continue;
  }
  textArg = a;
  break;
}

const dryRun = has('--dry-run');
const noPush = has('--no-push');
const skipConfirm = has('-y') || has('--yes');
const attribution = getFlag('--by') ?? getFlag('--attribution') ?? 'Unknown';
const sourceText = getFlag('--source');
const sourceUrl = getFlag('--source-url');
const yearRaw = getFlag('--year');
const lang = getFlag('--lang');
const slugOverride = getFlag('--slug');
const dateArg = getFlag('--date');
const fileArg = getFlag('--file');
const extraTags = (getFlag('--tags', '') || '')
  .split(',')
  .map((t) => t.trim().toLowerCase())
  .filter(Boolean);

function fail(msg) {
  console.error(`\n✗ ${msg}\n`);
  process.exit(1);
}

const expand = (p) => (p.startsWith('~') ? path.join(os.homedir(), p.slice(1)) : p);

// Year, if given, must be an integer.
let sourceYear = null;
if (yearRaw != null) {
  sourceYear = Number(yearRaw);
  if (!Number.isInteger(sourceYear)) fail(`--year must be a whole number, got "${yearRaw}"`);
}

// ---- helpers --------------------------------------------------------------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const kebab = (s) =>
  String(s)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

function run(cmd, argv, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, argv, { stdio: 'inherit', ...opts });
    child.on('close', (code) =>
      code === 0 ? resolve() : reject(new Error(`${cmd} ${argv.join(' ')} exited ${code}`)),
    );
  });
}

// Retry on failure — git exits 128 when an editor's git worker (e.g. Cursor)
// briefly holds a .lock. A short backoff clears it.
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

// Push, recovering from the two failures that strand an already-written post:
//   • a transient .lock from an editor's git worker — back off and retry;
//   • a diverged remote ("fetch first" / "[rejected]") because origin advanced
//     since our last fetch — pull --rebase to replay our commit, then re-push.
// runRetry can't tell these apart (it inherits stdio and never reads stderr),
// so push gets its own loop that captures stderr and branches on the cause.
function pushOnce(branch) {
  return new Promise((resolve) => {
    const child = spawn('git', ['push', '-u', 'origin', branch], { cwd: ROOT, stdio: ['inherit', 'inherit', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (d) => {
      stderr += d;
      process.stderr.write(d);
    });
    child.on('close', (code) => resolve({ code, stderr }));
  });
}

async function gitPush(branch = 'HEAD') {
  for (let attempt = 0; attempt < 5; attempt++) {
    const { code, stderr } = await pushOnce(branch);
    if (code === 0) return;
    if (/fetch first|\[rejected\]|non-fast-forward/i.test(stderr)) {
      process.stdout.write('  Remote moved on — pulling with rebase, then re-pushing…\n');
      await runRetry('git', ['pull', '--rebase', 'origin', 'main'], { cwd: ROOT, label: 'git pull --rebase' });
      continue;
    }
    if (/\.lock|another git process|Unable to create/i.test(stderr) && attempt < 4) {
      process.stdout.write("  git push blocked (an editor's git worker?) — retrying…\n");
      await sleep(1500);
      continue;
    }
    throw new Error(`git push exited ${code}`);
  }
  throw new Error('git push failed after rebase/lock retries');
}

// The set of URL slugs already taken (date prefix stripped, mirroring quoteSlug).
function existingUrlSlugs() {
  if (!fs.existsSync(QUOTES_DIR)) return new Set();
  return new Set(
    fs
      .readdirSync(QUOTES_DIR)
      .filter((f) => f.endsWith('.md'))
      .map((f) => f.replace(/\.md$/, '').replace(/^\d{4}-\d{2}-\d{2}-/, '')),
  );
}

async function readBody() {
  if (fileArg) {
    const p = path.resolve(process.env.INIT_CWD || process.cwd(), expand(fileArg));
    if (!fs.existsSync(p)) fail(`--file not found: ${p}`);
    return fs.readFileSync(p, 'utf8').trim();
  }
  if (textArg) return textArg.trim();
  if (process.stdin.isTTY) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const t = (await rl.question('Quote: ')).trim();
    rl.close();
    return t;
  }
  return '';
}

// ---- main -----------------------------------------------------------------
async function main() {
  const body = await readBody();
  if (!body) fail('No quote text. Pass it as an argument, via --file, or type it when prompted.');

  // Identity: date → slug → filename. Slug mirrors the hand-authored style
  // (author + opening words); --slug overrides for a cleaner URL.
  const dateIso = dateArg || new Date().toISOString();
  const dateOnly = String(dateIso).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}/.test(dateOnly)) fail(`--date must be ISO (YYYY-MM-DD…), got "${dateArg}"`);

  const firstWords = body.split(/\s+/).slice(0, 4).join(' ');
  const autoSlug = [kebab(attribution || 'unknown'), kebab(firstWords)].filter(Boolean).join('-');
  let slug = slugOverride ? kebab(slugOverride) : autoSlug;
  if (!slug) fail('Could not build a slug — pass one with --slug.');

  // Guard against URL collisions (two files sharing a slug break the build).
  const taken = existingUrlSlugs();
  if (taken.has(slug)) {
    if (slugOverride) fail(`The URL slug "${slug}" is already used by another quote — choose a different --slug.`);
    let n = 2;
    while (taken.has(`${slug}-${n}`)) n++;
    slug = `${slug}-${n}`;
  }

  const filename = `${dateOnly}-${slug}.md`;
  const postPath = path.join(QUOTES_DIR, filename);
  if (fs.existsSync(postPath)) fail(`A file already exists at src/content/quotes/${filename} — pass a different --slug.`);

  // Frontmatter (JSON.stringify gives safe quoted YAML scalars). Order mirrors
  // the existing quotes: date, attribution, source, url, year, tags, lang.
  const tags = [...new Set(extraTags)];
  const fm = [
    '---',
    `date: ${JSON.stringify(dateIso)}`,
    attribution ? `attribution: ${JSON.stringify(attribution)}` : null,
    sourceText ? `source: ${JSON.stringify(sourceText)}` : null,
    sourceUrl ? `source_url: ${JSON.stringify(sourceUrl)}` : null,
    sourceYear != null ? `source_year: ${sourceYear}` : null,
    tags.length ? `tags: ${JSON.stringify(tags)}` : null,
    lang ? `lang: ${JSON.stringify(lang)}` : null,
    '---',
    '',
    body,
    '',
  ]
    .filter((l) => l !== null)
    .join('\n');

  // Preview.
  console.log('\n────────────────────────────────────────────');
  console.log(`  quote     “${body.replace(/\s+/g, ' ').slice(0, 80)}${body.length > 80 ? '…' : ''}”`);
  console.log(`  by        ${attribution || '—'}`);
  console.log(`  source    ${[sourceText, sourceYear].filter(Boolean).join(', ') || '—'}`);
  console.log(`  tags      ${tags.join(', ') || '—'}`);
  console.log(`  file      src/content/quotes/${filename}`);
  console.log(`  url       ${SITE_BASE}/read/${slug}/`);
  console.log('────────────────────────────────────────────\n');

  if (!skipConfirm && !dryRun && process.stdin.isTTY) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = (await rl.question('Publish this quote? [Y/n] ')).trim().toLowerCase();
    rl.close();
    if (answer === 'n' || answer === 'no') {
      console.log('Aborted. Nothing written or committed.');
      process.exit(0);
    }
  }

  if (dryRun) {
    console.log('----- file contents -----');
    console.log(fm);
    console.log('Dry run complete — nothing written, no git. Drop --dry-run to publish.');
    return;
  }

  // Write the quote.
  fs.mkdirSync(QUOTES_DIR, { recursive: true });
  fs.writeFileSync(postPath, fm);
  console.log(`Wrote src/content/quotes/${filename}`);

  // Commit (+ push), retried against editor git-lock contention.
  try {
    await runRetry('git', ['add', postPath], { cwd: ROOT, label: 'git add' });
    await runRetry('git', ['commit', '-m', `Add quote ${slug}`], { cwd: ROOT, label: 'git commit' });
    if (noPush) {
      console.log(`\nCommitted, not pushed (--no-push). Run "git push" to deploy.`);
    } else {
      await gitPush('HEAD');
      console.log(`\n✓ Pushed. Live in ~1–2 min at ${SITE_BASE}/read/${slug}/`);
    }
  } catch (e) {
    console.error(
      `\n✗ Git step failed after retries: ${e.message}\n\n` +
        `  The quote is written — only the commit/push remains.\n` +
        `  Usual cause is a diverged remote or a stuck git lock. Finish manually:\n\n` +
        `    git -C "${ROOT}" add -A && git -C "${ROOT}" commit -m "Add quote ${slug}"\n` +
        `    git -C "${ROOT}" pull --rebase origin main && git -C "${ROOT}" push -u origin HEAD\n\n` +
        `  If a lock is stuck instead, clear it first:\n` +
        `    find "${ROOT}/.git" -name '*.lock' -delete\n`,
    );
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(`\n✗ ${e?.message || e}\n`);
  process.exit(1);
});

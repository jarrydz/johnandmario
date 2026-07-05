/**
 * experience.mjs — scaffold a bespoke quote experience (ADR 0015).
 *
 * The creative counterpart to quote.mjs: where that script adds the words,
 * this one stamps the canvas they'll be painted on. It writes
 * src/experiences/<slug>.astro pre-wired with ExperienceFrame, the quote as
 * real text, an empty stage, and a reduced-motion still — plumbing done, art
 * pending. No git, no network; you commit when the page is worth keeping.
 *
 * Usage (from the repo root):
 *   npm run experience jim-rohn-we-must-all-suffer
 *
 * Refuses if no quote in src/content/quotes/ matches the slug (date prefix
 * stripped, mirroring quoteSlug), or if the experience file already exists.
 */
import fs from 'node:fs';
import path from 'node:path';

const SCRIPTS_DIR = import.meta.dirname;
const ROOT = path.resolve(SCRIPTS_DIR, '..');
const QUOTES_DIR = path.join(ROOT, 'src', 'content', 'quotes');
const EXPERIENCES_DIR = path.join(ROOT, 'src', 'experiences');

function fail(msg) {
  console.error(`\n✗ ${msg}\n`);
  process.exit(1);
}

const slug = process.argv[2];
if (!slug || slug.startsWith('-')) {
  fail('Usage: npm run experience <slug>\n  e.g. npm run experience jim-rohn-we-must-all-suffer');
}

// Map URL slugs (date prefix stripped, mirroring quoteSlug) to quote files.
const quoteFiles = fs.existsSync(QUOTES_DIR)
  ? fs.readdirSync(QUOTES_DIR).filter((f) => f.endsWith('.md'))
  : [];
const bySlug = new Map(
  quoteFiles.map((f) => [f.replace(/\.md$/, '').replace(/^\d{4}-\d{2}-\d{2}-/, ''), f]),
);

const quoteFile = bySlug.get(slug);
if (!quoteFile) {
  fail(
    `No quote matches the slug "${slug}".\n\n` +
      `  An experience needs a quote to embody — add one first (npm run quote).\n` +
      `  Available slugs:\n${[...bySlug.keys()].map((s) => `    ${s}`).join('\n')}`,
  );
}

const outPath = path.join(EXPERIENCES_DIR, `${slug}.astro`);
if (fs.existsSync(outPath)) {
  fail(
    `src/experiences/${slug}.astro already exists — this quote has a bespoke page.\n` +
      `  Edit it in place, or delete it first if you're starting over.`,
  );
}

// Pull the opening words + attribution out of the quote file for the header
// comment, so the stamped page opens with the words it exists to serve.
const raw = fs.readFileSync(path.join(QUOTES_DIR, quoteFile), 'utf8');
const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n?/);
const body = (fmMatch ? raw.slice(fmMatch[0].length) : raw).replace(/\s+/g, ' ').trim();
const attribution = (fmMatch?.[1].match(/^attribution:\s*"?([^"\n]*)"?\s*$/m)?.[1] ?? '').trim();
const opening = body.split(/\s+/).slice(0, 8).join(' ');

const template = `---
import type { CollectionEntry } from 'astro:content';
import ExperienceFrame from '../layouts/ExperienceFrame.astro';

/**
 * "${opening}…"${attribution ? ` — ${attribution}` : ''}
 *
 * TODO: name the idea. What does this page do that embodies the quote —
 * not decorates it? One sentence here keeps the build honest.
 */

interface Props {
  quote: CollectionEntry<'quotes'>;
}

const { quote } = Astro.props;
const { attribution } = quote.data;
const body = (quote.body ?? '').trim();
---

<ExperienceFrame quote={quote}>
  <main class="stage">
    <!-- TODO: the art. Reshape this markup freely, but the quote must stay
         real, selectable text — the frame's legibility floor (ADR 0015). -->
    <blockquote class="words">
      <p>{body}</p>
    </blockquote>
    {attribution && <footer class="attribution">— <cite>{attribution}</cite></footer>}
  </main>
</ExperienceFrame>

<style>
  .stage {
    /* TODO: palette + composition. Everything outside the no-preference block
       is the resting state — it doubles as the reduced-motion still. */
    min-height: 100dvh;
    display: grid;
    place-content: center;
    gap: 1.5rem;
    padding: 4rem clamp(1.25rem, 5vw, 3rem);
    text-align: center;
  }
  .words {
    margin: 0;
    font-family: var(--font-display);
    font-size: clamp(1.4rem, 4vw, 2.2rem);
    line-height: 1.3;
    max-width: 24ch;
  }
  .words p {
    margin: 0;
  }
  .attribution {
    font-size: 0.85rem;
    letter-spacing: 0.1em;
    opacity: 0.6;
  }
  .attribution cite {
    font-style: normal;
  }

  @media (prefers-reduced-motion: no-preference) {
    /* TODO: motion lives here, and only here. Need a library? Vendor it
       version-pinned under src/lib/vendor/ — no CDNs, no \`latest\`. */
  }
</style>
`;

fs.mkdirSync(EXPERIENCES_DIR, { recursive: true });
fs.writeFileSync(outPath, template);

console.log(`\n✓ Stamped src/experiences/${slug}.astro`);
console.log(`  quote  "${body.slice(0, 70)}${body.length > 70 ? '…' : ''}"`);
console.log(`  view   npm run dev → /johnandmario/read/${slug}`);
console.log(`  next   open the file and make the art — the TODOs mark the blanks\n`);

# John & Mario

A personal archive — photographs and quotes, two ways to read. A rebuild of the
2011–2013 blog `johnandmario.tumblr.com` as a self-owned static site, with no
platform lock-in and no engagement loops.

Built with [Astro](https://astro.build/) and deployed to GitHub Pages.

- **Live site:** https://jarrydz.github.io/johnandmario/
- **Stack:** Astro static output, Markdown content collections, Cloudflare R2 + Worker for images, Pagefind for client-side search, GitHub Actions for deploy.

## Two modes

- **[Look](https://jarrydz.github.io/johnandmario/look)** — the photo archive (6,727 images from the original Tumblr). Image-first, reverse chronological.
- **[Read](https://jarrydz.github.io/johnandmario/read)** — quotes worth keeping. Each lives in a typographic *mood* preset (Epigram, Literary, Technical for Phase 1; four more in Phase 2).

`/` is a typographic portal — pick a mode.

## A note on the images

This is a curation archive. The images were collected over many years and are
mostly not mine; original attribution was often not preserved. I don't claim
authorship. See the [/about](https://jarrydz.github.io/johnandmario/about) page
for the full disclosure and a contact address.

The `LICENSE` file (MIT) covers **the site code only** — not the images. There
is deliberately no content licence, because the images aren't mine to license.

## Run it locally

You need Node.js (installed via Homebrew is fine).

```sh
npm install      # first time only
npm run dev      # dev server at http://localhost:4321/johnandmario/
npm run build    # production build into dist/ (also runs Pagefind indexing)
npm run preview  # serve the built site locally
```

> **Note on `base`:** the dev and preview URLs include `/johnandmario/` because
> the site is served from a sub-path on GitHub Pages. Visiting plain
> `localhost:4321/` will 404 — use the `/johnandmario/` path.

## Add content

Day-to-day authoring lives in **[docs/authoring.md](docs/authoring.md)**:
frontmatter templates, mood picks, tag discipline, and the Obsidian-vault
symlink workflow for composing quotes.

The fast paths:

- **Add a quote** — create `src/content/quotes/YYYY-MM-DD-slug.md` with the
  frontmatter template from `docs/authoring.md`, then commit.
- **Add a photo** — create `src/content/posts/YYYY-MM-DD-slug.md` referencing
  either a local `image:` (committed to the repo) or an `r2_key:` (served from
  Cloudflare R2 via the image worker). Image alt text is required for
  accessibility.

The full schemas are Zod-validated in `src/content.config.ts` — the build
fails on schema errors, which keeps the archive consistent.

## Architecture

The full picture lives in **[docs/architecture.md](docs/architecture.md)**:
routing, the two content collections, the image pipeline (R2 + Worker), the
search and caching approach, and where each piece of the system lives.

Other top-level docs:

- [docs/design-system.md](docs/design-system.md) — typography, palette tokens, the seven mood presets
- [docs/content-model.md](docs/content-model.md) — schemas, tagging strategy, relational queries
- [docs/build-plan.md](docs/build-plan.md) — phased delivery plan (Phase 1 → Phase 5+)

Decisions are captured as ADRs in the Obsidian vault and symlinked into
`docs/adr/` for local editor / AI context. The canonical store lives at
`~/Projects/vaults/play/projects/johnandmario/adr/`.

## Project structure

```
.
├── .github/workflows/deploy.yml   # GitHub Pages deploy (Astro official action)
├── astro.config.mjs               # site + base config, sitemap integration
├── docs/                          # top-level architecture / authoring docs
├── image-worker/                  # Cloudflare Worker that resizes R2 images
├── public/fonts/                  # self-hosted variable woff2 fonts (~234 KB)
├── scripts/                       # one-off import tooling (captioning, post generation)
├── src/
│   ├── assets/images/             # local images (full R2 archive lives elsewhere)
│   ├── components/                # Header, Footer, PostCard, QuoteCard, QuoteLayout, …
│   │   └── presets/               # Epigram / Literary / Technical mood layouts
│   ├── content/posts/             # ← markdown photo posts
│   ├── content/quotes/            # ← markdown quote entries
│   ├── content.config.ts          # content collections + Zod schemas
│   ├── layouts/                   # BaseLayout, PostLayout
│   ├── pages/
│   │   ├── index.astro            # /          → typographic portal
│   │   ├── look/[...page].astro   # /look      → paginated photo feed
│   │   ├── read/index.astro       # /read      → quote grid
│   │   ├── read/[slug].astro      # /read/<slug> → immersive quote in its mood preset
│   │   ├── posts/[...id].astro    # /posts/<slug> → single photo (unchanged)
│   │   ├── archive.astro          # /archive   → photo thumbnail grid with filters
│   │   ├── search.astro           # /search    → Pagefind UI
│   │   ├── about.astro
│   │   └── rss.xml.js
│   ├── styles/global.css          # @font-face, theme tokens, mood palettes, portal, /read
│   ├── consts.ts                  # title, description, CDN base, etc.
│   └── utils.ts                   # base-path + date helpers
└── LICENSE                        # MIT — covers code only, not images
```

## Not in the repo

- The full ~479 MB original image archive (`original-blog-imgs/`) and metadata
  index (`blog-image-index.xlsx`) — git-ignored, local staging only.
- `docs/adr/` — symlink to the canonical ADR store in the Obsidian vault.
- `docs/handoff-claude-code.md` — transient process doc, git-ignored.

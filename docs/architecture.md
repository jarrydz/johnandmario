# Architecture — John & Mario

Status: Active. Written 2026-05-28.
Supersedes the implicit "single photo blog" architecture of v0.1.

## What this site is now

John & Mario is a **multi-modal personal archive**. It started as a photo blog (rebuilt from a 2011–2013 Tumblr). It is becoming a typographic, image-led, multi-format archive of things curated over time.

The site has three layers of identity:

- **One wordmark** — *John & Mario*. Consistent across every page.
- **Two (eventually more) modes** — each mode is its own visual language. Look is image-led. Read is type-led. Future modes (Listen, Watch, Walk) will each get their own treatment.
- **One curatorial voice** — explicit framing as curation, not ownership. Carried over from [brief.md](../brief.md).

The dual-aesthetic decision is deliberate. The site should *feel* like different rooms in the same house — same door frame, different furniture.

## Routes

| Route | What | State |
|---|---|---|
| `/` | Portal page. Typographic doorway: **Look** and **Read** as massive type. No feed. | New — Phase 1 |
| `/look` | Photo feed. Reverse-chronological grid. The current homepage moves here. | Renamed in Phase 1 |
| `/look/[slug]` | Single photo post. | Existing, unchanged |
| `/read` | Quote grid. Browse view. Filterable by tag, mood, author. | New — Phase 1 |
| `/read/[slug]` | Immersive single quote. Mood preset drives layout. Swipe / arrow-key navigation between neighbours. | New — Phase 1 |
| `/read/source/[slug]` | All quotes from one source (book/film/interview). | Phase 3 |
| `/read/author/[slug]` | All quotes by one author. | Phase 3 |
| `/all` | Combined reverse-chron feed. Quotes + photos + future modes intermingled. | Phase 4 |
| `/classic` | Tumblr-era image-only view. Nostalgic. See [ADR 0008](adr/0008-tumblr-classic-view-deferred.md). | Deferred |
| `/about` | Existing. | Unchanged |
| `/search` | Existing. Pagefind index covers both `posts` and `quotes`. | Updated in Phase 2 |
| `/archive` | Existing. May extend to quotes in Phase 3. | Unchanged initially |
| `/rss.xml` | Existing. Photos only. | Unchanged |
| `/read/rss.xml` | New. Quotes only. | Phase 2 |

## Redirects

When `/` becomes the portal, the old photo feed at `/` moves to `/look`. Existing routes for individual posts (`/posts/[slug]`) are preserved or 301'd as needed.

[Astro redirects config](https://docs.astro.build/en/reference/configuration-reference/#redirects) handles this in `astro.config.mjs`. Keep the redirect map minimal — old single-post URLs should not move if possible. Only the homepage moves.

## Collections

| Collection | Status | Notes |
|---|---|---|
| `posts` | Existing | Stays as-is. Already supports `post_type` enum but in practice we now treat it as photo-only. |
| `quotes` | New — Phase 1 | Separate Zod schema. See [content-model.md](content-model.md). |

Decision rationale for keeping quotes in their own collection: [ADR 0003](adr/0003-quotes-as-separate-collection.md).

## Portal page

The new homepage at `/`. Pure typography. **Look** and **Read** rendered as massive display type, stacked on mobile, side-by-side on desktop. No feed. No content.

Behaviour:

- Each word is a doorway. Click → enter that mode.
- Hover/focus triggers a faint preview behind the word — soft image bleed behind Look, fragment of a quote behind Read.
- Wordmark sits small at the top. Footer is light.
- Refreshes on every page load — previews are randomised so it feels alive.

Decision rationale: [ADR 0002](adr/0002-portal-as-homepage.md).

Future verbs (Listen, Watch, Walk) slot into the same layout system without redesign.

## Cross-section relational layer

Tags bridge Look and Read. A quote tagged `#solitude` surfaces related quotes by tag, and also surfaces photos from `/look` tagged `#solitude`. Reverse-linked from the photo. Built in Phase 3.

This is the long-term value of the architecture: the archive compounds through consistent tagging discipline, with no extra editorial work. Precedent: [The Marginalian's lateral linking](https://www.themarginalian.org/).

Decision rationale: [ADR 0007](adr/0007-cross-section-relational-layer.md).

## Shared infrastructure

Across all modes:

- `BaseHead.astro` — meta, fonts, base styles
- `Header.astro` — wordmark + nav (Look · Read · About)
- `Footer.astro` — attribution, RSS links
- `Tags.astro` — single taxonomy
- Pagefind — search across both collections
- Image worker (Cloudflare R2) — unchanged

What varies per mode: typography, palette, layout system, motion language. See [design-system.md](design-system.md).

## Why this architecture

- **Extensible.** Adding Listen, Watch, Walk requires one new collection, one new section, one new portal verb. No re-architecture.
- **Decoupled.** Each mode evolves independently. The Look section can keep its image-focused minimalism even if Read goes maximalist.
- **Composable.** The mixed `/all` feed at Phase 4 is a build-time merge of all collections, cheap to add with [Astro's Content Layer API](https://docs.astro.build/en/guides/content-collections/).
- **Curation-honest.** Reflects what the archive actually is: a personal collection of things, not a content stream.

## Out of scope (intentional)

- Comments
- Likes / reactions
- User accounts
- Algorithmic feeds
- Recommendations beyond tag-based linking
- Analytics beyond basic privacy-respecting metrics

The brief is explicit: no engagement loops, no platform behaviours. The architecture preserves this.

## Reference

- [brief.md](../brief.md) — original project brief
- [design-system.md](design-system.md) — visual language per mode
- [content-model.md](content-model.md) — schemas and tagging
- [build-plan.md](build-plan.md) — phased delivery
- ADRs in [adr/](adr/) — symlinked to the Obsidian vault at `~/Projects/vaults/play/projects/johnandmario/adr/`

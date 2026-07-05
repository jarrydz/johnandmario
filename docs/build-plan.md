# Build Plan — John & Mario

Status: Active. Written 2026-05-28. Updated 2026-07-05: the mood-preset system planned below shipped in Phase 1 and was later **removed** by [ADR 0015](adr/0015-bespoke-quote-experiences.md) — bespoke experiences replace it. Preset items are annotated rather than rewritten; no further preset work is scheduled.

This document sequences the build of the multi-modal architecture. Each phase ships independently. Each phase ends with the site in a working, deployable state.

## Phase 1 — Foundations

**Goal**: ship the portal, the new Read mode with three starter presets *(shipped, presets since removed — ADR 0015)*, and the rename of the current homepage to `/look`.

**Scope**:

1. **Routing**
   - Move current `/` photo feed to `/look` (use the existing `[...page].astro` paginator at the new path).
   - Build new portal at `/`.
   - Add Astro redirect from `/page/N` (if used) to `/look/page/N`.
   - Verify all existing post URLs (`/posts/[slug]`) remain unchanged.

2. **Content collection**
   - Add `quotes` collection to [src/content.config.ts](../src/content.config.ts) per [content-model.md](content-model.md).
   - Schema note: `attribution` is **optional** (see ADR 0009 — many curated quotes lack preserved attribution). Image alt text remains required when an image is present.
   - Create `src/content/quotes/` folder.
   - Set up the Obsidian vault symlink (see ADR 0010): `ln -s ~/Projects/code/play/johnandmario/src/content/quotes ~/Projects/vaults/play/projects/johnandmario/quotes`
   - Add quote template to `~/Projects/vaults/templates/quote.md` per [authoring.md](authoring.md).
   - Seed with 5–10 hand-picked quotes.

3. **Portal page** (`src/pages/index.astro`)
   - Replace current photo feed.
   - Large display type for **Look** and **Read** as doorways.
   - Wordmark small at top, footer light.
   - No feed.
   - Defer the hover preview to Phase 2 — Phase 1 ships static portal.

4. **Read — grid view** (`src/pages/read/index.astro`)
   - Reverse-chronological grid of quote cards.
   - Each card shows the quote (truncated if long) and attribution.
   - No filtering yet — Phase 2 adds tag/author filters.

5. **Read — immersive view** (`src/pages/read/[slug].astro`) *(done; preset rendering since removed — /read/[slug] now exists only for quotes with a bespoke experience, ADR 0015)*
   - Full-viewport, one quote per page.

6. **Components**
   - New: `QuoteCard.astro` (grid view). *(QuoteLayout and the preset components were built, then removed by ADR 0015.)*
   - Existing `PostCard.astro` and `PostLayout.astro` unchanged.
   - `Header.astro` updated: nav becomes **Look · Read · About**.

7. **Typography setup**
   - Add variable fonts per [design-system.md](design-system.md): Inter, Source Serif 4, Monaspace. Self-hosted woff2 in `public/fonts/`.

9. **Documentation**
   - This doc, [architecture.md](architecture.md), [design-system.md](design-system.md), [content-model.md](content-model.md), and [authoring.md](authoring.md) live in `docs/` (git-ignored working area). The ADRs are symlinked into the Obsidian vault at `docs/adr/` (canonical store).

**Ship criterion**: Portal works, /look works, /read shows seeded quotes, nav links go to the right places, no broken existing URLs. *(Met.)*

**Estimated effort**: One focused weekend in Claude Code.

## Phase 2 — Range

**Goal**: complete the visual range and the immersive interaction layer.

**Scope**:

1. **Bespoke experiences, one at a time** ([ADR 0015](adr/0015-bespoke-quote-experiences.md))
   - `npm run experience <slug>` scaffolds; each page is its own focused design exercise. Ship one per session.

2. **Tag and author filters on `/read`**
   - URL params: `/read?tag=solitude`, `/read?tag=solitude&author=rohn`.
   - Filter UI: minimal type-led toggles, not chrome-heavy.

3. **Portal hover previews**
   - Soft image bleed behind **Look**.
   - Fragment of a randomised quote behind **Read**.
   - Refreshes on page load.

4. **Quote-only RSS** at `/read/rss.xml`.

5. **Pagefind index** extended to cover the `quotes` collection.

**Ship criterion**: A steady cadence of bespoke experiences shipping, portal previews work, Read has its own RSS.

## Phase 3 — Relational

**Goal**: make the archive compound. Cross-section linking via shared tags.

**Scope**:

1. **Related quotes** module at bottom of `/read/[slug]`
   - More by Author
   - More from Source
   - Related (tag intersection ≥ 2)

2. **Look bridge** at bottom of `/read/[slug]`
   - Photos from `/look` sharing tags with the current quote.

3. **Reverse bridge** at bottom of `/look/[slug]`
   - Related quotes from `/read` sharing tags with the current photo.

4. **Source and author pages**
   - `/read/source/[slug]` — all quotes from one source.
   - `/read/author/[slug]` — all quotes by one author.

5. **Tag pages updated** to show both quotes and photos under each tag, optionally grouped.

**Ship criterion**: Every quote and photo page shows related content from the other section. Source and author pages exist.

## Phase 4 — Mixed feed and Tumblr classic

**Goal**: a single chronological river of everything, and the nostalgic Tumblr view.

**Scope**:

1. **`/all` route** — reverse-chronological merge of `posts` and `quotes` (and future collections).
   - Build-time merge via [Astro's Content Layer API](https://docs.astro.build/en/guides/content-collections/).
   - Each item rendered with its mode-appropriate card.

2. **Possible fourth portal verb** — *Everything* or *All* — if the mixed feed becomes core to the experience.

3. **Tumblr classic view** at `/classic` (see [ADR 0008](adr/0008-tumblr-classic-view-deferred.md))
   - Image-only, single-column, infinite scroll.
   - Recreates the 2011–2013 Tumblr aesthetic.
   - Linked from footer: "View as it began →".

4. **Possible everything RSS** at `/all/rss.xml`.

**Ship criterion**: `/all` works. Tumblr classic view is live.

## Phase 5+ — Future modes

When ready: add Listen, Watch, Walk. Each is one new collection, one new section, one new portal verb. The architecture supports this without redesign.

## What does NOT ship in any phase

These are out of scope by deliberate decision (per [brief.md](../brief.md)):

- Comments
- Likes / reactions
- User accounts
- Algorithmic feeds
- Newsletter sign-up forms (use RSS instead)
- Analytics beyond basic privacy-respecting metrics
- Engagement loops of any kind

## Decisions made along the way

Every meaningful technical or design decision during build should land as a new ADR in `docs/adr/` (the symlinked vault folder). Per standing rule: document as work proceeds, not after.

## Where this plan can change

Phase boundaries are guidance, not contracts. If during Phase 1 you discover that the portal hover previews are trivial to add and the portal would feel incomplete without them, pull them forward. The phases exist to prevent biting off more than one weekend at a time, not to constrain.

What should NOT change without an ADR:

- Section names (Look, Read)
- Two-collection content model
- Portal-as-homepage (no feed on `/`)
- Curation framing (no engagement loops)

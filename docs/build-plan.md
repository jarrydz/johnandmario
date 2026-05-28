# Build Plan — John & Mario

Status: Active. Written 2026-05-28.

This document sequences the build of the multi-modal architecture. Each phase ships independently. Each phase ends with the site in a working, deployable state.

## Phase 1 — Foundations

**Goal**: ship the portal, the new Read mode with three starter presets, and the rename of the current homepage to `/look`.

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
   - Seed with 5–10 hand-picked quotes covering at least three moods (recommended: Epigram, Literary, Technical to start).

3. **Portal page** (`src/pages/index.astro`)
   - Replace current photo feed.
   - Large display type for **Look** and **Read** as doorways.
   - Wordmark small at top, footer light.
   - No feed.
   - Defer the hover preview to Phase 2 — Phase 1 ships static portal.

4. **Read — grid view** (`src/pages/read/index.astro`)
   - Reverse-chronological grid of quote cards.
   - Each card shows the quote (truncated if long), attribution, mood as a visual hint.
   - No filtering yet — Phase 2 adds tag/mood/author filters.

5. **Read — immersive view** (`src/pages/read/[slug].astro`)
   - Full-viewport, one quote, mood preset drives layout.
   - Three presets built: **Epigram**, **Literary**, **Technical**.
   - Plain prev/next links to chronological neighbours (no swipe / arrow keys yet — Phase 2).
   - Attribution + source rendered per preset's style.

6. **Components**
   - New: `QuoteCard.astro` (grid view), `QuoteLayout.astro` (immersive view).
   - New: `presets/Epigram.astro`, `presets/Literary.astro`, `presets/Technical.astro`.
   - Existing `PostCard.astro` and `PostLayout.astro` unchanged.
   - `Header.astro` updated: nav becomes **Look · Read · About**.

7. **Typography setup**
   - Add variable fonts per [design-system.md](design-system.md): Inter, Source Serif 4, Monaspace. Self-hosted woff2 in `public/fonts/`.
   - CSS custom property tokens for each mood preset's palette.

8. **Mood preset attribution rendering**
   - Each of the three starter presets (Epigram, Literary, Technical) must handle the case where `attribution` is absent — render no em-dash + name line. See ADR 0009.
   - Cinematic preset (Phase 2) film-credit treatment: if attribution absent but `source` present, show source only.

9. **Documentation**
   - This doc, [architecture.md](architecture.md), [design-system.md](design-system.md), [content-model.md](content-model.md), and [authoring.md](authoring.md) live in `docs/` (git-ignored working area). The ADRs are symlinked into the Obsidian vault at `docs/adr/` (canonical store).

**Ship criterion**: Portal works, /look works, /read shows seeded quotes, three preset pages render distinct visual languages, nav links go to the right places, no broken existing URLs.

**Estimated effort**: One focused weekend in Claude Code.

## Phase 2 — Range

**Goal**: complete the visual range and the immersive interaction layer.

**Scope**:

1. **Remaining presets**
   - Cinematic, Handwritten, Broadside, Fragment.
   - Each is its own focused design exercise. Ship one preset per session.

2. **Swipe / arrow-key navigation** on `/read/[slug]`
   - Touch swipe (mobile), arrow keys (desktop).
   - URL updates via `history.pushState` so each position is shareable.
   - Sequence is contextual — if filtered by tag, swipe stays inside the tag set.
   - Progressive enhancement: without JS, prev/next remain as plain links.

3. **Tag and mood filters on `/read`**
   - URL params: `/read?tag=solitude`, `/read?mood=epigram`, `/read?tag=solitude&mood=literary`.
   - Filter UI: minimal type-led toggles, not chrome-heavy.

4. **Portal hover previews**
   - Soft image bleed behind **Look**.
   - Fragment of a randomised quote behind **Read**.
   - Refreshes on page load.

5. **Quote-only RSS** at `/read/rss.xml`.

6. **Pagefind index** extended to cover the `quotes` collection.

**Ship criterion**: All seven presets work, immersive view feels alive (swipe, keyboard, URL sync), portal previews work, Read has its own RSS.

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
- Dark mode toggle (each preset has its own palette — no global toggle needed)
- Engagement loops of any kind

## Decisions made along the way

Every meaningful technical or design decision during build should land as a new ADR in `docs/adr/` (the symlinked vault folder). Per standing rule: document as work proceeds, not after.

## Where this plan can change

Phase boundaries are guidance, not contracts. If during Phase 1 you discover that swipe navigation is trivial to add and would feel incomplete without it, pull it forward. The phases exist to prevent biting off more than one weekend at a time, not to constrain.

What should NOT change without an ADR:

- Section names (Look, Read)
- Two-collection content model
- Mood preset count or names (once we settle them — currently seven)
- Portal-as-homepage (no feed on `/`)
- Curation framing (no engagement loops)

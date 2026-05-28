# Content Model — John & Mario

Status: Active. Written 2026-05-28.

This document defines how content is structured and related across the site.

## Two collections

The site uses two Astro Content Collections:

| Collection | Folder | Purpose | Status |
|---|---|---|---|
| `posts` | `src/content/posts/` | Photo posts. The original archive. | Existing |
| `quotes` | `src/content/quotes/` | Quote entries. The new mode. | New — Phase 1 |

Rationale for two collections vs one filtered collection: [ADR 0003](adr/0003-quotes-as-separate-collection.md).

## `posts` schema (existing)

Defined in [src/content.config.ts](../src/content.config.ts). Unchanged.

Key fields: `date`, `image` or `r2_key`, `image_alt`, `tags`, `post_type` (now effectively always `photo`).

The `post_type: 'quote'` enum value should be deprecated. New quote content does not live in `posts`. Existing posts that were originally Tumblr quotes can stay where they are or be migrated to `quotes` in a one-off Phase 3 task.

## `quotes` schema (new)

Add to `src/content.config.ts`:

```ts
const quotes = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/quotes' }),
  schema: ({ image }) =>
    z
      .object({
        // Identity
        date: z.coerce.date(),
        attribution: z.string().optional(), // see ADR 0009 (attribution optional)
        source: z.string().optional(),
        source_url: z.string().url().optional(),
        source_year: z.number().int().optional(),

        // Visual treatment
        mood: z
          .enum(['epigram', 'literary', 'cinematic', 'handwritten', 'technical', 'broadside', 'fragment'])
          .default('literary'),

        // Optional atmosphere image (not source image — see ADR 0006)
        image: image().optional(),
        r2_key: z.string().optional(),
        image_width: z.number().int().positive().optional(),
        image_height: z.number().int().positive().optional(),
        image_alt: z.string().optional(),
        image_position: z.enum(['backdrop', 'inline', 'none']).default('none'),

        // Discovery
        tags: z.array(z.string()).optional(),
        lang: z.string().optional(), // e.g. "en", "fr" — informs typography choices
      })
      .refine(
        (data) => (!data.image && !data.r2_key) || Boolean(data.image_alt),
        { message: '`image_alt` is required when an image is present.', path: ['image_alt'] }
      )
      .refine(
        (data) => data.image_position === 'none' || Boolean(data.image || data.r2_key),
        { message: 'image_position requires an image or r2_key.', path: ['image_position'] }
      ),
});

export const collections = { posts, quotes };
```

### Field rationale

- **`date`** — when *you* (the curator) added it, not when it was said. The archive is a record of what you noticed when.
- **`attribution`** — optional. Who said it, when known. Many curated quotes have no preserved attribution and that's fine — see [ADR on attribution optionality](adr/0009-attribution-optional.md). If absent, the layout renders no attribution block. If you want a quote marked as "Found" or "Unknown", write that string into the field — it'll render as-is.
- **`source`** + **`source_url`** + **`source_year`** — optional metadata. Powers Phase 3 source pages.
- **`mood`** — drives the layout preset. Defaults to `literary` (safest fallback).
- **`image`** / `r2_key` etc. — atmosphere images. Not the source. See [ADR 0006](adr/0006-dual-view-grid-and-immersive.md) for the source-vs-atmosphere distinction.
- **`image_position`** — controls how the image relates to the type. Only Cinematic preset uses `backdrop` typically.
- **`tags`** — the relational layer. See below.
- **`lang`** — affects typography for non-English quotes (CJK fallbacks, RTL handling). Out of scope for Phase 1 but worth declaring now.

### Body content

The quote text itself lives in the markdown body, not in frontmatter. This allows:

- Multi-line quotes with paragraph breaks
- Inline emphasis (`*italic*`, `**bold**`)
- Optional rich content (links, footnotes) that the Literary and Handwritten presets may render

Keep the body to the quote alone. No commentary. No author notes. (If commentary is wanted, add a `note:` frontmatter field in Phase 3.)

### File naming convention

`src/content/quotes/YYYY-MM-DD-short-slug.md`

Matches the `posts` convention. Date in filename means file listings sort chronologically.

Example: `src/content/quotes/2026-05-28-didion-on-keeping-notebook.md`

## Tagging strategy — the relational backbone

Tags are the single most important field for long-term archive value. Discipline matters more than cleverness.

### Tag conventions

- Lowercase, hyphenated, no spaces: `attention`, `slow-living`, `craft-and-practice`.
- Singular not plural: `book` not `books`.
- Concept-led, not source-led: tag `solitude` not `merton` (the `attribution` field handles authors).
- Aim for 3–7 tags per item. Fewer is noise, more is dilution.

### Cross-section tag bridge

Tags are shared between `posts` and `quotes`. A `#solitude` tag on a quote relates it to `#solitude`-tagged photos. This is the relational layer described in [architecture.md](architecture.md) and [ADR 0007](adr/0007-cross-section-relational-layer.md).

### A starter tag vocabulary

Pre-seed a small set of concept tags to anchor the system. Recommended starter list:

`attention` · `solitude` · `craft` · `practice` · `time` · `place` · `light` · `silence` · `memory` · `walking` · `home` · `work` · `nature` · `cities` · `objects` · `people` · `family` · `friendship` · `loss` · `joy` · `wonder` · `language` · `image` · `music` · `architecture` · `food` · `weather` · `season`

Free to add. Don't prune aggressively in year one. Tag vocabularies need to grow before they need to be cleaned.

## Relational queries (Phase 3)

At the bottom of every `/read/[slug]` page, surface:

1. **More by [Author]** — `quotes.where(attribution == current.attribution)`
2. **More from [Source]** — `quotes.where(source == current.source)`
3. **Related quotes** — `quotes.where(tags ∩ current.tags >= 2)`
4. **Related from Look** — `posts.where(tags ∩ current.tags >= 2)` — the bridge

Sorted by date desc. Limit 6 per section. Hide a section if empty.

Reverse: on every `/look/[slug]`, surface "Related from Read" using the same tag-intersection logic.

## Search

Pagefind indexes both collections. Search results show mixed posts and quotes. Each result links to its mode-appropriate template.

Out of scope for Phase 1: search filtering by collection. Phase 2 adds a "Look only / Read only / All" filter on `/search`.

## RSS

| Feed | Path | Content |
|---|---|---|
| Photos | `/rss.xml` | `posts` only (existing) |
| Quotes | `/read/rss.xml` | `quotes` only (new — Phase 2) |
| Everything | `/all/rss.xml` | Merged feed (Phase 4) |

Three feeds, three audiences. Some subscribers want photos only. Some want quotes only. Some want everything.

## Migration

No existing quote content. Phase 1 seeds with 5–10 hand-picked quotes the author already loves, varied across at least three moods. This proves the system end-to-end.

If old Tumblr-era text posts (originally `post_type: 'quote'` in `posts`) need migrating, that's a Phase 3 one-off script. Out of scope for now.

## Open questions

- Should `attribution` accept structured author data (slug + display name) for clean `/read/author/[slug]` pages? Probably yes — convert in Phase 3.
- Should `source` be a structured object (`{ title, type: 'book'|'film'|'interview', isbn? }`)? Probably yes — convert in Phase 3. Phase 1 keeps it as a string for speed.
- How to handle translation? If a quote is translated, where does the translator credit live? Defer to Phase 3.

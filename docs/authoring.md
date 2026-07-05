# Authoring — How to add and edit content

Status: Active. Written 2026-05-28.

This guide covers the practical workflow for adding photos to Look and quotes to Read. The schemas and architectural decisions live in [content-model.md](content-model.md); this doc is about the day-to-day "how do I write a thing".

## Adding a photo (Look)

Unchanged from existing workflow. Create a markdown file in `src/content/posts/` with photo frontmatter. See [content-model.md](content-model.md) for the `posts` schema. The R2-backed image path is documented in the original brief.

## Adding a quote (Read)

### The fast path — Obsidian

Once the vault symlink is set up (see Phase 1 setup below), composing a quote is:

1. Open Obsidian.
2. Navigate to `play/projects/johnandmario/quotes/`.
3. Create a new note from the **Quote** template (see Template setup).
4. Fill in the frontmatter and body.
5. Save with the filename convention: `YYYY-MM-DD-short-slug.md`.
6. Commit via terminal or your editor: `git add src/content/quotes/ && git commit -m "Add quote: <slug>"`.

The Obsidian path is a symlink — the file actually lives in the code repo at `src/content/quotes/`, where Astro picks it up at build time.

### The alternative — direct markdown editing

If Obsidian isn't open, or you prefer:

1. Create `src/content/quotes/YYYY-MM-DD-short-slug.md` in your editor of choice (Cursor, VS Code, vim).
2. Use the frontmatter template (below).
3. Save and commit.

Same outcome, different surface.

## Frontmatter template

```markdown
---
date: YYYY-MM-DD
attribution: "Author Name"           # optional — omit entirely if unknown
source: "Book or Film or Source"     # optional
source_url: "https://..."            # optional
source_year: 1968                    # optional
tags: [tag1, tag2, tag3]             # optional — but strongly recommended

# Optional atmosphere image:
# image_position: backdrop           # backdrop | inline | none (default: none)
# image: ./atmosphere.jpg            # local image, build-optimised
# image_width: 1920
# image_height: 1080
# image_alt: "Required when image is present — describe the image"
---

The quote body goes here. It can span multiple paragraphs.

Inline emphasis works: *italic*, **bold**.

The body is the quote itself — no commentary, no author notes. (If you want commentary on a quote, hold it for a future `note:` field; for now keep the body pure.)
```

### Field notes

- **`date`** — when *you* added the quote, not when it was said. The archive logs your curatorial moments.
- **`attribution`** — optional. Omit entirely if the author is unknown or doesn't matter. Write `"Found"` or `"Unknown"` if you want that displayed. See [ADR 0009](adr/0009-attribution-optional.md).
- **`source`** — book/film/interview/album/wherever the quote came from.
- **`tags`** — the relational backbone. Use lowercase, hyphenated, concept-led tags. Consult the starter vocabulary in [content-model.md](content-model.md). Aim for 3–7 tags per quote.
- **`image`** + related fields — only needed if you want an atmosphere image. Image alt text is required when an image is present (accessibility).

### Filename convention

`YYYY-MM-DD-short-slug.md`

Examples:
- `2026-05-28-didion-on-keeping-notebook.md`
- `2026-05-28-berger-relation-between-seeing-knowing.md`
- `2026-05-28-eno-art-as-trigger.md`

Date in filename = chronological sort in file listings = matches the `posts` convention.

Slug should be short, hyphenated, lowercase. The filename keeps the date prefix (filesystem sort + uniqueness) but the date is **stripped from the URL** — `2026-05-28-didion-on-keeping-notebook.md` serves at `/read/didion-on-keeping-notebook`. See [ADR 0013](adr/0013-quote-url-pattern.md).

## Phase 1 setup

These tasks run once during Phase 1 to enable the workflow above.

### Vault symlink

```bash
ln -s ~/Projects/code/play/johnandmario/src/content/quotes ~/Projects/vaults/play/projects/johnandmario/quotes
```

Test: `ls ~/Projects/vaults/play/projects/johnandmario/quotes/` should list the same files as `ls ~/Projects/code/play/johnandmario/src/content/quotes/`.

Rationale: [ADR 0010](adr/0010-obsidian-vault-symlink-for-quotes.md).

### Obsidian template

Create `~/Projects/vaults/templates/quote.md` with the frontmatter template above. Configure Obsidian's [core Templates plugin](https://help.obsidian.md/Plugins/Templates) to use this folder.

Then in Obsidian, `Cmd+T` (or whatever you bind) → "Quote" → new file scaffolds with the frontmatter ready.

### Optional: an npm script for new quotes

If you prefer command-line authoring:

```json
// in package.json scripts:
"new-quote": "node scripts/new-quote.js"
```

The script would prompt for a slug, today's date, and open the file in `$EDITOR` with the template pre-filled. Phase 2 nicety; not blocking Phase 1.

## Editing existing quotes

Same flow. Open the file in Obsidian or your editor, change the frontmatter or body, save, commit.

To **replace** one of the seed quotes shipped with Phase 1: edit its `.md` file or delete and recreate with a new slug. Both work.

## Bespoke experiences

Any quote can be given its own hand-designed page ([ADR 0015](adr/0015-bespoke-quote-experiences.md)). A `/read/<slug>` page exists **only** if `src/experiences/<slug>.astro` does; quotes without one are read in place on `/read` (no page of their own). On the index, a bespoke quote's card is a link marked with the ↗ badge; the rest are plain cards.

```bash
npm run experience <slug>   # e.g. npm run experience jim-rohn-we-must-all-suffer
```

This stamps `src/experiences/<slug>.astro` pre-wired with `ExperienceFrame` (head, back link, full-bleed body) and the quote as real text — open the file and make the art. It refuses if no quote matches the slug or if the page already exists.

Two floors are non-negotiable: the quote stays **real, selectable text** (`<blockquote>` + attribution), and all motion lives behind `@media (prefers-reduced-motion: no-preference)` — the resting styles are the reduced-motion still. Libraries are vendored version-pinned under `src/lib/vendor/` (no CDNs, no `latest`). The workbench at `/read/lab` lists every quote and shows which are bespoke versus read in place.

## Tag discipline

Tags are the most important field. They power:

- Tag pages (`/tags/[tag]`)
- The cross-section relational layer ([ADR 0007](adr/0007-cross-section-relational-layer.md)) — quotes find related photos, photos find related quotes
- Future filtering UI in Phase 2

**Rules**:

- Lowercase, hyphenated: `slow-living` not `Slow Living`.
- Singular, not plural: `book` not `books`.
- Concept-led, not source-led: `solitude` not `merton` (use `attribution` for the author).
- 3–7 tags per quote. Fewer is noise, more is dilution.
- Reuse existing tags before inventing new ones. Consult the starter vocabulary in [content-model.md](content-model.md).

## Things to avoid

- **Don't** put commentary in the quote body. The body is the quote. If commentary becomes important, ADR a `note:` field first.
- **Don't** use bullet lists in quote bodies — cards and experiences expect prose.
- **Don't** invent attributions when you don't know. Leave the field out.

## What about photos as quote sources?

A quote attached image is **atmosphere, not source**. Don't use a book cover or film still as the quote's image — that turns the page into a product card. Source information belongs in `source`, `source_url`, `source_year` (text and links). Images are for mood.

See [ADR 0006](adr/0006-dual-view-grid-and-immersive.md) for the source-vs-atmosphere distinction.

## References

- [content-model.md](content-model.md) — full schema
- [design-system.md](design-system.md) — Read-mode design principles
- [ADR 0009](adr/0009-attribution-optional.md) — attribution optionality
- [ADR 0010](adr/0010-obsidian-vault-symlink-for-quotes.md) — Obsidian symlink

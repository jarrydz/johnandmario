# Design System — John & Mario

Status: Active. Written 2026-05-28. Updated 2026-07-05 — mood presets removed, superseded by bespoke experiences ([ADR 0015](adr/0015-bespoke-quote-experiences.md)).

This document defines the visual language across the site. It has three layers:

1. **Shared primitives** — wordmark, footer, search, tags, motion language.
2. **Section aesthetics** — Look (image-led) and Read (type-led) have distinct visual identities.
3. **Bespoke experiences** (Read only) — each quote worth a page gets its own hand-designed one-off inside a minimal shared frame ([ADR 0015](adr/0015-bespoke-quote-experiences.md)).

## Shared primitives

### Wordmark
*John & Mario*. Consistent typeface, weight, and placement on every page including the portal. The wordmark is the door frame that proves the visitor is still in the same house regardless of which mode they're in.

### Header navigation
**Look · Read · About**. Plain text links. Active state subtle. Position: top of every page except the portal, where the wordmark alone suffices.

### Footer
Light. Attribution to the curatorial project, links to RSS feeds (one per mode), search link.

### Search
Pagefind index covers both `posts` and `quotes`. One search box, all content.

### Motion language
A small consistent catalogue for the shared chrome; bespoke experiences own their motion individually.

- **Page load**: type fades in over 200–300ms. Letters stagger by a few ms for poetic effect.
- **Attribution hover**: reveals source detail (book, year, source URL).
- **Bespoke experiences**: each page defines its own motion, always behind `@media (prefers-reduced-motion: no-preference)` — the resting styles are the reduced-motion still (the frame's non-negotiable floor).

That is the entire shared catalogue. Restraint is the brief.

## Section aesthetics

| Element | Look | Read |
|---|---|---|
| Type system | Sans-led (existing) | Sans-led chrome; each experience picks its own |
| Background | Pure white (#FFFFFF) | Site tokens on the index; each experience owns its page |
| Header behaviour | Sticky/minimal | Fades on scroll; none inside an experience |
| Animation | None — content speaks | Subtle — motion catalogue above |
| Grid | Single-column reverse-chron | Card grid on /read; full-bleed bespoke pages |

Cost: ~2x CSS for the Read section. Worth it. The visitor should feel they have stepped into a different room.

## Bespoke experiences (Read only)

The preset system is gone ([ADR 0005](adr/0005-mood-preset-system.md), superseded). Each quote worth a page gets `src/experiences/<slug>.astro` — a one-off typographic/interactive page that embodies that quote ([ADR 0015](adr/0015-bespoke-quote-experiences.md)). Quotes without one are read in place on `/read`.

What every experience shares (`ExperienceFrame`, the gallery wall):

- **Head + fonts** via `BaseHead`; full-bleed `100dvh` body, safe-area insets, no Header, no container.
- **One back link** to `/read` — the sole inherited chrome (difference-blended so it survives any palette).
- **Legibility floor**: the quote is always real, selectable, semantic text (`<blockquote>` + `<cite>`/`<footer>`).
- **Reduced-motion floor**: motion only inside `prefers-reduced-motion: no-preference`; resting styles are the still.

Everything else — palette, type, layout, motion, libraries — belongs to the page. Libraries are vendored version-pinned under `src/lib/vendor/` (no CDNs, no `latest`).

On the `/read` index, a quote with an experience becomes a whole-card link with a hairline ↗ badge; the rest are plain, unlinked cards.

## Variable fonts strategy

Variable fonts unlock the motion-on-weight axis micro-interactions cheaply. Strongly preferred wherever a variable variant exists.

Suggested variable fonts to include:

- [Inter](https://rsms.me/inter/) — UI sans, fallback, weight + opsz axes
- [Source Serif 4](https://github.com/adobe-fonts/source-serif) — serif reading face, weight + opsz
- [Monaspace](https://github.com/githubnext/monaspace) — monospace, weight axis

Cap the font payload at ~150KB total. Bespoke experiences draw on these self-hosted faces first; a page may vendor its own face only with a strong reason.

## Colour palette tokens

The shared chrome uses the global tokens (`--color-bg`, `--color-text`, `--color-muted`, `--color-rule`), which respect the site theme toggle. Each bespoke experience defines its own palette in its own scoped `<style>` — pages are isolated by design, so nothing leaks between them.

## Out of scope for the design system

- Custom illustrations per quote outside an experience (an experience owns its whole page; the index stays systematic)
- Internationalisation typography (e.g., CJK fallbacks) — add when first non-Latin quote arrives

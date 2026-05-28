# Design System — John & Mario

Status: Active. Written 2026-05-28.

This document defines the visual language across the site. It has three layers:

1. **Shared primitives** — wordmark, footer, search, tags, motion language.
2. **Section aesthetics** — Look (image-led) and Read (type-led) have distinct visual identities.
3. **Mood presets** (Read only) — seven typographic/layout variants the author picks per quote.

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
A small consistent catalogue, not seven different motion systems per mood.

- **Page load**: type fades in over 200–300ms. Letters stagger by a few ms for poetic effect.
- **Idle on Epigram pages**: weight-axis breathing on the display type (400 ↔ 500 over 8 seconds). Variable-font interpolation.
- **Navigation between quotes**: smooth horizontal slide on swipe. Vertical fade on scroll.
- **Attribution hover**: reveals source detail (book, year, source URL).
- **Cursor on Cinematic backdrops**: soft 200px radial gloom-lift follows the cursor, raising type legibility.

That is the entire motion catalogue. Restraint is the brief.

## Section aesthetics

| Element | Look | Read |
|---|---|---|
| Type system | Sans-led (existing) | Serif-led with mood overrides |
| Background | Pure white (#FFFFFF) | Warm off-white (varies by mood) |
| Header behaviour | Sticky/minimal | Fades on scroll |
| Animation | None — content speaks | Subtle — motion catalogue above |
| Grid | Single-column reverse-chron | Mood-dependent |

Cost: ~2x CSS for the Read section. Worth it. The visitor should feel they have stepped into a different room.

## The seven mood presets (Read only)

Each preset is its own visual language — typography, palette, layout, energy. The author picks one per quote via the `mood` frontmatter field. The system applies the preset.

Rationale for a preset system vs bespoke per quote: [ADR 0005](adr/0005-mood-preset-system.md).

### Preset 1 — Epigram

**Personality**: The loudest preset. One sentence fills the viewport.

- **Type**: Display sans, 120–200px on desktop, variable-weight. Suggested: [GT Sectra Display](https://www.grillitype.com/typeface/gt-sectra) or [Inter Display](https://rsms.me/inter/) in heavy weights.
- **Layout**: Centred. Quote dominates. Attribution small, bottom-right, en-dash prefix.
- **Palette**: Bone white background (#F8F6F2), ink black type (#0E0E0C), single saffron accent (#E8A33D) on punctuation or first letter.
- **Use for**: Aphorisms, one-liners, declarations.
- **Reference**: [Pentagram book covers](https://www.pentagram.com/work/sector/book-design).

### Preset 2 — Literary

**Personality**: Classical, hushed, page-as-spread.

- **Type**: Serif, 24–32px, generous leading (1.6+). [Tiempos Headline](https://klim.co.nz/retail-fonts/tiempos-headline/) or open-source [Source Serif 4](https://github.com/adobe-fonts/source-serif).
- **Layout**: Centred. Quote sits within a measured column (max-width ~60ch). Hanging punctuation. Attribution in small caps below.
- **Palette**: Warm paper (#F4ECE1) background, ink (#1A1612) type, no accent.
- **Use for**: Book passages, long quotes, classical literary excerpts.
- **Reference**: [The Marginalian](https://www.themarginalian.org/), [Pelican Books cover design](https://www.penguin.co.uk/series/PEL/pelican).

### Preset 3 — Cinematic

**Personality**: Atmospheric, image-led, film-credit attribution.

- **Type**: Light sans on dark image. 32–48px. Letterspaced. [Söhne](https://klim.co.nz/retail-fonts/sohne/) Light or system sans equivalent.
- **Layout**: Full-bleed image as backdrop. Type bottom-left or bottom-centre. Attribution rendered as film credits.
- **Palette**: Pure black (#000000) base, near-white type (#F0F0F0), image takes the rest. Cursor gloom-lift effect (see Motion language).
- **Use for**: Mood-led quotes, film stills, photography references.
- **Reference**: Criterion Collection covers, [A24 film pages](https://a24films.com/).
- **Caveat**: Use sparingly. Gets cheesy fast if overused.

### Preset 4 — Handwritten

**Personality**: Personal, tender, journal-feel.

- **Type**: A looser typeface — could be a script (use very sparingly) or a humanist sans with slight irregularity. [iA Writer Duospace](https://github.com/iaolo/iA-Fonts) or [Spectral](https://fonts.google.com/specimen/Spectral) in italic work well.
- **Layout**: Slight rotation (-1°). Off-grid. Like a journal page. Margin notes possible.
- **Palette**: Aged paper (#EEE7D9) background, soft ink (#2C2620), optional faint paper texture.
- **Use for**: Diary-like notes, personal observations, marginalia.
- **Reference**: [Austin Kleon's blog](https://austinkleon.com/), [Maira Kalman's illustrated journals](https://www.mairakalman.com/).

### Preset 5 — Technical

**Personality**: System aesthetic, terminal-flavoured.

- **Type**: Monospace. [Monaspace](https://github.com/githubnext/monaspace), [JetBrains Mono](https://www.jetbrains.com/lp/mono/), or [iA Writer Mono](https://github.com/iaolo/iA-Fonts). 18–22px.
- **Layout**: Left-aligned. Fixed column. Attribution prefixed `// — Author`. Blinking cursor at end of attribution.
- **Palette**: System dark (#0F1115) background, off-white (#E8E8E8) type, mint accent (#50C878) for highlights.
- **Use for**: Sharp, structural, programmer-poet quotes. Technical writing.
- **Reference**: [Robin Rendle's CSS Tricks era](https://css-tricks.com/), terminal output.

### Preset 6 — Broadside

**Personality**: Political-poster energy. Bold colour blocks. Manifesto.

- **Type**: Oversize geometric sans, 80–140px. [GT America](https://www.grillitype.com/typeface/gt-america) Black, [Inter](https://rsms.me/inter/) Black, or [Atlas Grotesk](https://commercialtype.com/catalog/atlas) Bold.
- **Layout**: Asymmetric. Quote broken across coloured blocks. Attribution as part of the composition.
- **Palette**: Bold block colour, rotates per quote — ultra red (#E63946), cobalt blue (#1D4E89), lemon (#FFD60A), oxblood (#7A1F1F). White or black type chosen for contrast.
- **Use for**: Manifesto-style declarations, strong statements, polemical writing.
- **Reference**: [Swiss school posters](https://www.swissstyle.net/), [Soviet constructivism](https://en.wikipedia.org/wiki/Constructivism_(art)), [David Carson's editorial work](https://www.davidcarsondesign.com/).

### Preset 7 — Fragment

**Personality**: Deliberately broken. Marginalia. Asymmetric incompleteness.

- **Type**: Mixed sizes within one quote. Some words large, some small. [Times Now](https://commercialtype.com/catalog/times) or any contrasted serif works.
- **Layout**: Off-grid. Words placed deliberately on a 12-col grid with intentional gaps. Looks unfinished. Is finished.
- **Palette**: Neutral base (#F2F0EC) with one disruptive colour block (single saturated swatch positioned asymmetrically).
- **Use for**: Partial thoughts, marginalia, observations that don't resolve.
- **Reference**: [Berthold Type Foundry's specimens](https://www.bertholdtypes.com/), [Werkplaats Typografie student work](https://www.werkplaatstypografie.org/).

## Variable fonts strategy

Variable fonts unlock the motion-on-weight axis micro-interactions cheaply. Strongly preferred wherever a variable variant exists.

Suggested variable fonts to include:

- [Inter](https://rsms.me/inter/) — UI sans, fallback, weight + opsz axes
- [Source Serif 4](https://github.com/adobe-fonts/source-serif) — Literary preset, weight + opsz
- [Monaspace](https://github.com/githubnext/monaspace) — Technical preset, weight axis
- One Display weight (Sectra, Tiempos, or similar) for Epigram and Broadside

Cap the font payload at ~150KB total. Variable fonts make this achievable across all seven presets.

## Colour palette tokens

Each preset's palette is defined as a bundle of CSS custom properties. Mood selects the bundle. Example:

```css
[data-mood="epigram"] {
  --bg: #F8F6F2;
  --fg: #0E0E0C;
  --accent: #E8A33D;
}

[data-mood="literary"] {
  --bg: #F4ECE1;
  --fg: #1A1612;
  --accent: transparent;
}
```

Quote layouts reference `var(--bg)`, `var(--fg)`, `var(--accent)` only. No hardcoded colours in the layout CSS.

## Out of scope for the design system

- Per-quote palette overrides (deferred; revisit if a quote really needs it)
- Custom illustrations per quote (would break the system; the system *is* the design)
- Dark mode toggle (each preset has its own light/dark identity; no global toggle needed)
- Internationalisation typography (e.g., CJK fallbacks) — add when first non-Latin quote arrives

## Open questions to resolve during Phase 1

- Which display face for Epigram and Broadside — Sectra, Tiempos, GT America, or open-source equivalent?
- Hosted fonts (Google Fonts / Fontshare) or self-hosted woff2?
- Paper texture for Handwritten — SVG noise or static asset?
- Cursor gloom-lift on Cinematic — radial gradient via CSS or WebGL? CSS first; WebGL only if perf demands.

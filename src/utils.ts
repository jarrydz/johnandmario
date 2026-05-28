/**
 * Prefix a path with the configured `base` (e.g. `/johnandmario`).
 *
 * Astro automatically prefixes the <Image /> component and bundled assets with
 * `base`, but it does NOT rewrite plain <a href> values — so every internal
 * link must pass through this helper, otherwise links break on a GitHub Pages
 * project site served from a sub-path.
 */
export function withBase(path = '/'): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, ''); // '/johnandmario'
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${base}${clean}`;
}

/** Format a date as UK English long form, e.g. "26 April 2011". */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Strip the YYYY-MM-DD date prefix from a quote id to produce its URL slug.
 *
 * Filenames keep the date prefix (filesystem sort + uniqueness). URLs don't —
 * the date is filing metadata, not quote identity. See ADR 0013.
 *
 * Falls back to the unmodified id if no date prefix is present, so a quote
 * filename like `random-thought.md` still produces a valid URL.
 */
export function quoteSlug(id: string): string {
  return id.replace(/^\d{4}-\d{2}-\d{2}-/, '');
}

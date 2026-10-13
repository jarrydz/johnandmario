import { getImage } from 'astro:assets';
import { getCollection } from 'astro:content';

/**
 * A single image tile for the Look feed. Kept deliberately small — these are
 * serialised into static JSON chunks and into the first-page bootstrap, so
 * every field is paid for by every visitor.
 */
export interface LookItem {
  id: string; // post id, e.g. "2013-10-26-65108151373" → /posts/<id>
  key?: string; // R2 object key, served via the image Worker
  src?: string; // built local-asset URL, when the original is in the repo
  w?: number; // intrinsic width (caps srcset, sets aspect ratio)
  h?: number; // intrinsic height
  alt: string;
}

/**
 * How many tiles per chunk. This is the unit of both the first-page bootstrap
 * and each lazily-fetched JSON page, so it trades first-paint weight against
 * the number of fetches while scrolling. ~30 keeps each JSON file a few KB.
 */
export const LOOK_CHUNK = 30;

/**
 * The full, ordered Look feed: every post that carries an `r2_key` or a local
 * `image`, newest first. Shared by the index page (first chunk + bootstrap) and
 * the JSON endpoint (every chunk) so the two can never drift out of sync.
 */
export async function getLookItems(opts: { jz?: boolean } = {}): Promise<LookItem[]> {
  const posts = await getCollection('posts');
  const ordered = posts
    .filter((p) => p.data.r2_key || p.data.image)
    .filter((p) => (opts.jz ? p.data.jz === true : true)) // /look?jz → JZ's own photos
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());

  return Promise.all(
    ordered.map(async (p) => {
      let src: string | undefined;
      if (!p.data.r2_key && p.data.image) {
        const width = Math.min(p.data.image_width ?? p.data.image.width, 1600);
        const optimized = await getImage({ src: p.data.image, width });
        src = optimized.src;
      }
      return {
        id: p.id,
        key: p.data.r2_key,
        src,
        w: p.data.image_width ?? p.data.image?.width,
        h: p.data.image_height ?? p.data.image?.height,
        alt: p.data.image_alt ?? '',
      };
    }),
  );
}

/** Total number of chunks for a given item count (always at least 1). */
export function lookPageCount(total: number): number {
  return Math.max(1, Math.ceil(total / LOOK_CHUNK));
}

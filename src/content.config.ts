import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * The `posts` collection — one Markdown file per post in src/content/posts/.
 *
 * Uses Astro's glob loader (the Content Layer API). Each entry's `id` is derived
 * from its filename, e.g. `2011-04-26-first-post.md` -> `2011-04-26-first-post`,
 * which becomes the URL `/posts/2011-04-26-first-post`.
 *
 * Future-proofing for AI image search (out of scope now, but designed for it):
 * add fields such as `embedding`, `colours`, `objects`, or `caption_ai` here
 * later and they validate automatically, no layout changes required.
 */
const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: ({ image }) =>
    z
      .object({
        title: z.string().optional(),
        date: z.coerce.date(), // required; accepts an ISO date or datetime string
        tags: z.array(z.string()).optional(),
        // `image()` resolves the path (relative to the Markdown file) into an
        // ImageMetadata object so Astro can optimise it. Required for photo
        // posts — enforced by the refinement below.
        image: image().optional(), // local image, build-optimised by Astro
        // R2 object key for images served on the fly via the Cloudflare image
        // Worker (see image-worker/). Use this instead of `image` for posts
        // whose originals live in R2 rather than in the repo.
        r2_key: z.string().optional(),
        image_width: z.number().int().positive().optional(), // intrinsic px — prevents layout shift + upscaling
        image_height: z.number().int().positive().optional(),
        image_alt: z.string().optional(), // required whenever an image is present
        description: z.string().optional(),
        post_type: z.enum(['photo', 'text', 'quote', 'link']).default('photo'),
        tumblr_url: z.string().url().optional(), // original Tumblr permalink for migrated posts
        source: z.string().optional(), // original creator, when known
        source_url: z.string().url().optional(), // link to the original source, when known
      })
      // Photo posts must carry an image — either a local `image` or an `r2_key`.
      .refine((data) => data.post_type !== 'photo' || Boolean(data.image || data.r2_key), {
        message: 'Photo posts require an `image` or an `r2_key`.',
        path: ['r2_key'],
      })
      // Any post with an image must carry alt text (accessibility).
      .refine((data) => (!data.image && !data.r2_key) || Boolean(data.image_alt), {
        message: '`image_alt` is required whenever an image is present (accessibility).',
        path: ['image_alt'],
      }),
});

export const collections = { posts };

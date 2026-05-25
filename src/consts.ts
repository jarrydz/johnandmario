// Site-wide constants. Edit these to rebrand or update contact details.

export const SITE_TITLE = 'John & Mario';
export const SITE_DESCRIPTION =
  'A personal inspiration archive. Image-first curation in the Tumblr tradition.';

// Public contact address for the About page. Leave empty to hide the contact
// line entirely; set it to a real address to show a mailto link.
export const CONTACT_EMAIL = '';

export const GITHUB_REPO = 'https://github.com/jarrydz/johnandmario';

// How many posts appear on each page of the home feed.
export const POSTS_PER_PAGE = 10;

// Base URL of the Cloudflare Worker that serves resized images from R2.
// No trailing slash. Images are requested as
// `${IMAGE_CDN_BASE}/<r2_key>?w=<width>&f=<webp|avif|jpeg>&q=<quality>`.
export const IMAGE_CDN_BASE = 'https://johnandmario-images.jarrydz.workers.dev';

// Responsive widths the site requests. Must be a subset of the Worker's
// allowlist (see image-worker/src/index.js). RemoteImage caps these to each
// image's intrinsic width, so small originals are never upscaled.
export const IMAGE_WIDTHS = [320, 480, 640, 720, 1080, 1600];

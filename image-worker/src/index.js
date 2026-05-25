/**
 * John & Mario — on-the-fly image Worker.
 *
 * Request shape:
 *   GET /<r2-object-key>?w=<width>&f=<webp|avif|jpeg>&q=<1-100>
 *   e.g. /00001_4943938579.jpg?w=720&f=webp
 *
 * Flow: validate params -> check edge cache -> read original from R2 ->
 * transform with the Images binding -> cache -> return.
 *
 * Why the allowlists and cache matter: this Worker is public, and EVERY call to
 * the Images binding is a billable transform (the per-month de-dup that applies
 * to URL transforms is bypassed for the binding). Capping width/format to a
 * fixed set bounds how many unique transforms a caller can trigger, and the
 * Cache API ensures each (key + params) combo is transformed at most once, then
 * served from the edge cache thereafter.
 */

// Widths the site actually requests. Anything else is rejected, so a malicious
// caller can't spin up unlimited (billable) transforms with ?w=1,2,3,...
const ALLOWED_WIDTHS = new Set([320, 480, 640, 720, 960, 1080, 1280, 1600]);

const ALLOWED_FORMATS = {
  webp: 'image/webp',
  avif: 'image/avif',
  jpeg: 'image/jpeg',
};

export default {
  async fetch(request, env, ctx) {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method not allowed', { status: 405 });
    }

    const url = new URL(request.url);
    const key = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
    if (!key) {
      return new Response('Missing image key', { status: 400 });
    }

    // --- validate transform params ---
    const wParam = url.searchParams.get('w');
    const width = wParam ? Number(wParam) : undefined;
    if (width !== undefined && !ALLOWED_WIDTHS.has(width)) {
      return new Response('Unsupported width', { status: 400 });
    }

    const fParam = (url.searchParams.get('f') || 'webp').toLowerCase();
    const format = ALLOWED_FORMATS[fParam];
    if (!format) {
      return new Response('Unsupported format', { status: 400 });
    }

    let quality = Number(url.searchParams.get('q') || '80');
    if (!Number.isFinite(quality) || quality < 1 || quality > 100) {
      quality = 80;
    }

    // --- edge cache (keeps billable transforms to one per variant) ---
    const cache = caches.default;
    const cacheKey = new Request(url.toString(), { method: 'GET' });
    const cached = await cache.match(cacheKey);
    if (cached) return cached;

    // --- fetch original from R2 ---
    const object = await env.BUCKET.get(key);
    if (!object) {
      return new Response('Image not found', { status: 404 });
    }

    // --- transform ---
    let pipeline = env.IMAGES.input(object.body);
    if (width !== undefined) {
      pipeline = pipeline.transform({ width });
    }
    const result = await pipeline.output({ format, quality });

    const base = result.response();
    const headers = new Headers(base.headers);
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    headers.set('Vary', 'Accept');
    const response = new Response(base.body, { status: base.status, headers });

    // Store in the edge cache without delaying the response to the user.
    ctx.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  },
};

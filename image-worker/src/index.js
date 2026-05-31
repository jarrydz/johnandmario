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
 *
 * Resilience: the Images binding can fail at runtime — most commonly when the
 * monthly transform allowance is exhausted, at which point every call throws.
 * Rather than 500 (which renders as a broken/blank image on the site), we catch
 * the failure and serve the untransformed original from R2 so an image ALWAYS
 * appears. The browser decodes the real bytes regardless of the <source type>
 * hint, so the <picture> fallback chain still displays correctly. Fallback
 * responses are given a short TTL and are NOT written to the edge cache, so the
 * Worker automatically resumes serving real resized variants once the transform
 * engine recovers (e.g. when the monthly allowance resets).
 */

// Infer a sensible Content-Type for the original object when R2 didn't record
// one, so the fallback bytes are served with a decodable image type.
const EXT_CONTENT_TYPE = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
};

function originalContentType(object, key) {
  const recorded = object.httpMetadata && object.httpMetadata.contentType;
  if (recorded) return recorded;
  const ext = key.split('.').pop().toLowerCase();
  return EXT_CONTENT_TYPE[ext] || 'application/octet-stream';
}

// Widths the site actually requests. Anything else is rejected, so a malicious
// caller can't spin up unlimited (billable) transforms with ?w=1,2,3,...
const ALLOWED_WIDTHS = new Set([320, 480, 640, 720, 960, 1080, 1280, 1600]);

const ALLOWED_FORMATS = {
  webp: 'image/webp',
  avif: 'image/avif',
  jpeg: 'image/jpeg',
};

// Hotlink protection: only requests coming from the site itself may trigger a
// transform. Anyone embedding your images on another site — or a crawler /
// script hitting the URLs directly — gets a 403 and never spends a (billable)
// transform. Add your custom domain to this set when you set one up.
const ALLOWED_ORIGINS = new Set([
  'https://jarrydz.github.io',
  'http://localhost:4321',
  'http://localhost:4322',
]);

function refererAllowed(request) {
  const ref = request.headers.get('Referer');
  if (!ref) return false; // direct hits / no-referer crawlers are blocked
  try {
    return ALLOWED_ORIGINS.has(new URL(ref).origin);
  } catch {
    return false;
  }
}

export default {
  async fetch(request, env, ctx) {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method not allowed', { status: 405 });
    }

    // Reject anything not coming from an allowed origin BEFORE doing any work,
    // so blocked requests cost nothing (no R2 read, no transform).
    if (!refererAllowed(request)) {
      return new Response('Forbidden', { status: 403 });
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
    try {
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
    } catch (err) {
      // The transform engine is unavailable (most often: the monthly transform
      // allowance is exhausted, which makes every call throw). Serve the
      // untransformed original so the image still appears. We re-read the object
      // because its body stream was already consumed by IMAGES.input() above.
      const original = await env.BUCKET.get(key);
      if (!original) {
        return new Response('Image not found', { status: 404 });
      }
      const headers = new Headers();
      headers.set('Content-Type', originalContentType(original, key));
      // Short TTL only: don't pin the unoptimised original at the edge — once
      // the transform engine recovers, real resized variants resume.
      headers.set('Cache-Control', 'public, max-age=600');
      headers.set('X-Image-Fallback', 'original');
      return new Response(original.body, { status: 200, headers });
    }
  },
};

# John & Mario — image Worker

A Cloudflare Worker that serves resized, re-encoded images from an R2 bucket on
the fly. Originals live in R2; this Worker delivers WebP/AVIF variants at the
requested width, cached at Cloudflare's edge.

It is **separate** from the Astro site — its own deploy, on a `workers.dev` URL.
The GitHub Pages build ignores this folder.

## Request shape

```
GET /<r2-object-key>?w=<width>&f=<webp|avif|jpeg>&q=<1-100>
```

Example: `/00001_4943938579.jpg?w=720&f=webp`

Allowed widths: 320, 480, 640, 720, 960, 1080, 1280, 1600 (others return 400 —
this caps how many billable transforms a caller can trigger).

## One-time setup

1. Create an R2 bucket named `johnandmario-images` in the Cloudflare dashboard
   (R2 → Create bucket). If you use a different name, update `bucket_name` in
   `wrangler.toml`.
2. Install dependencies and log in:

   ```sh
   cd image-worker
   npm install
   npx wrangler login
   ```

## Deploy

```sh
npx wrangler deploy
```

Wrangler prints the live URL, e.g. `https://johnandmario-images.<you>.workers.dev`.

## Upload an image to R2

```sh
npx wrangler r2 object put johnandmario-images/00001_4943938579.jpg \
  --file ../original-blog-imgs/00001_4943938579.jpg \
  --content-type image/jpeg
```

## Cost notes

- Each call to the Images binding is one billable transform. The Worker caches
  every variant at the edge, so each (key + width + format) is transformed once.
- Free tier: 5,000 transforms/month. R2 storage and egress are free at this scale.

## Local testing

```sh
npx wrangler dev          # offline: supports width/height/rotate/format
npx wrangler dev --remote # full-fidelity, uses the real Images engine
```

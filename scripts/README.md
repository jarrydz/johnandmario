# Import tooling

One-off scripts to migrate the ~6,727-image archive into the site: AI-caption
each image, generate a markdown post, and upload the original to R2.

These run **locally on your Mac**, not in CI or the Worker.

## Prerequisites

```sh
cd scripts
npm install

# Store your Anthropic key once in the macOS login Keychain (from
# console.anthropic.com). You will be prompted to paste it; it is not echoed,
# not written to any file, and not a global shell export.
security add-generic-password -U -a "$USER" -s ANTHROPIC_API_KEY -w
```

`npm run caption` reads the key from the Keychain at run time, so it is only
present in that single process — never global, never on disk in plaintext.

You also need `wrangler` logged in (done already from the image-worker setup).

`data/index.json` (the metadata backbone, 6,727 records) is committed. The
original images are read from `../original-blog-imgs/` (git-ignored archive).

## The 50-image test first

```sh
npm run caption -- --sample --limit 50   # captions a spread across 2011–2013
npm run generate                          # writes 50 posts to src/content/posts/
npm run upload                            # uploads those 50 originals to R2
```

Then review: run the site (`cd .. && npm run dev`), check the captions read
well and the images load. Tune the prompt in `caption.mjs` if needed and
re-caption (delete the relevant lines from `data/captions.jsonl` first, since
captioning skips anything already done).

## Scaling to the full archive

Captioning is resumable — a crash or rate-limit loses nothing.

```sh
npm run caption                           # captions everything not yet done (~$10, a while)
npm run generate                          # regenerates all posts
```

**Upload via rclone, not wrangler**, for thousands of files. `wrangler r2
object put` spawns a process per file (hours); rclone syncs the folder in
minutes:

1. Create an R2 API token: Cloudflare dashboard → R2 → Manage API tokens →
   create one with Object Read & Write for `johnandmario-images`.
2. Configure rclone with an `S3 (Cloudflare R2)` remote using that token and
   your account's R2 endpoint (`https://<account-id>.r2.cloudflarestorage.com`).
3. Sync:

   ```sh
   rclone copy ../original-blog-imgs r2:johnandmario-images --transfers 32 --progress
   ```

Finally, delete the hand-written example post so it isn't a duplicate, then
commit and push:

```sh
rm ../src/content/posts/2011-04-26-first-post.md   # generator now covers this image
cd .. && git add -A && git commit -m "Import full image archive" && git push
```

> Note: `generate-posts.mjs` currently skips post ID `4943938579` (the example).
> Once you delete the example post, remove that guard so it's generated too.

## What each script does

| Script | Reads | Writes |
| --- | --- | --- |
| `caption.mjs` | `data/index.json`, `../original-blog-imgs/` | `data/captions.jsonl` |
| `generate-posts.mjs` | `data/index.json`, `data/captions.jsonl` | `../src/content/posts/*.md` |
| `upload.mjs` | `data/captions.jsonl`, `../original-blog-imgs/` | R2 bucket + `data/uploaded.log` |

## Cost

Captioning all 6,727 images with Claude Haiku 4.5 is roughly $10 (one-time).
R2 storage and the Worker stay within free tiers at this scale.

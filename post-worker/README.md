# Phone-posting Worker

Post a photo to John & Mario from your phone in one tap. The mobile counterpart
to `scripts/img.mjs`: an iOS Shortcut shares an image to this Worker, which
captions it, uploads the original to R2, and commits the markdown post to
GitHub — triggering the normal Pages deploy. Live in ~1–2 min.

```
[iPhone Share Sheet] → Shortcut (convert + resize) → POST → Worker
   → R2 put (new/<slug>.jpg) → Claude caption → GitHub commit → Pages deploy
```

**Design choice: publish-then-fix.** No approval step on the phone. A wrong
caption is just a markdown file you edit later from the Mac. Don't rebuild the
friction you removed.

The Shortcut resizes to ~1600px JPEG before sending, so there is no server-side
image processing — 1600 is the largest edge the site ever serves.

## What you build (one-time)

Three things only you can do — your accounts and your phone. The Worker code is
already written.

### 1. A GitHub token for the commit

[github.com → Settings → Developer settings → Fine-grained tokens → Generate](https://github.com/settings/tokens?type=beta)

- **Repository access:** Only select repositories → `jarrydz/johnandmario`.
- **Permissions:** Repository permissions → **Contents → Read and write**. (Metadata read is added automatically. Nothing else.)
- Generate, copy the `github_pat_…` value.

A fine-grained token scoped to one repo and one permission is least privilege —
if it leaks, the blast radius is this repo's contents, nothing more.

### 2. A shared POST token

This gates the endpoint so only your Shortcut can post. Generate one:

```sh
openssl rand -hex 24
```

Copy the output. You'll paste the same value into a Worker secret and the
Shortcut's header.

### 3. Set the three secrets and deploy

From this folder, on your Mac:

```sh
cd ~/Projects/code/play/johnandmario/post-worker
npm install
security find-generic-password -s ANTHROPIC_API_KEY -w | npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler secret put GITHUB_TOKEN
npx wrangler secret put POST_TOKEN
npx wrangler deploy
```

The Anthropic key pipes straight from your Keychain — never on screen. For
`GITHUB_TOKEN` and `POST_TOKEN`, paste the values from steps 1 and 2 when
prompted. `deploy` prints the Worker URL:
`https://johnandmario-post.<your-subdomain>.workers.dev` — keep it for the
Shortcut.

Sanity check (should say it expects a POST):

```sh
curl https://johnandmario-post.<your-subdomain>.workers.dev
```

## The iOS Shortcut

In the **Shortcuts** app, new shortcut named **Post to J&M**:

1. Tap the **(i)** → **Show in Share Sheet** → accept type **Images** only.
2. Add these actions in order:
   - **Receive** images from Share Sheet (the input).
   - **Convert Image** → **JPEG** (this handles iPhone HEIC photos).
   - **Resize Image** → Width **1600**, Height **Auto**.
   - **Get Contents of URL**:
     - URL: your deployed Worker URL.
     - Method: **POST**.
     - **Headers:** add `X-Post-Token` = the value from step 2.
     - **Request Body:** **File** → the Resized Image.
   - **Get Dictionary Value** → `url` from the Contents of URL.
   - **Show Notification** → that `url` (or just "Posted ✓").

Now: any photo → Share → **Post to J&M**. Done.

Optional — add tags, a source, or mark it as your own photo via the query
string, e.g. `…workers.dev/?tags=architecture,timber&source=Photographer%20Name`
or `…workers.dev/?jz=1` to set `jz: true`.

**Tip — a "my photo" Shortcut:** duplicate the Shortcut, name it
**Post to J&M (mine)**, and append `?jz=1` to its URL. Then your own shots get
tagged automatically; everything else uses the plain Shortcut.

## How it maps to `img.mjs`

| Step | `img.mjs` (Mac) | This Worker (phone) |
| --- | --- | --- |
| Dimensions | `sharp` | `jpegSize()` reads the JPEG markers |
| Upload | `wrangler --remote` | R2 binding `BUCKET.put` |
| Caption | Anthropic SDK | `fetch` to the Anthropic API (same prompt) |
| Write post | local file + `git push` | GitHub Contents API commit |
| Identity | your git config | `committer`/`author` = you (no extra contributor) |

Same R2 keys (`new/<slug>.jpg`), same frontmatter shape, same deploy. The commit
is authored as you, so it stays off the contributor panel — consistent with
[Git Contributor Hygiene](../../../vaults/play/setup-guides/git-contributor-hygiene.md).

## Security notes

- The endpoint is public but inert without `X-Post-Token`. Treat that token like
  a password. To rotate: re-run `wrangler secret put POST_TOKEN` and update the
  Shortcut header.
- `GITHUB_TOKEN` is scoped to one repo, Contents only. Rotate it from the same
  GitHub page if ever exposed.
- No request is logged with the image; the Worker holds nothing at rest.

## Files

- `wrangler.toml` — Worker name, R2 binding, non-secret vars (repo, branch, author).
- `src/index.js` — the Worker.
- Secrets live in Cloudflare, never in the repo.

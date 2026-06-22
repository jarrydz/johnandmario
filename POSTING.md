# Posting to John & Mario — Quick Reference

Your cheat-sheet for getting things onto the site. The technical detail lives in
`scripts/README.md` and `post-worker/README.md`; this is the day-to-day version.

The site has three sections:

- **Look** — photos. Post with one command.
- **Read** — quotes. Post with one command.
- **Act** — a fixed manifesto. Edit by hand (or ask in chat).

Everything publishes by committing to GitHub, which auto-deploys. Live in ~1–2 min.

---

## Day to day

| I want to… | Command |
| --- | --- |
| Post a photo | `jm ~/path/photo.jpg` |
| Post a photo I took myself | `jm ~/path/photo.jpg --jz` |
| Post a photo with extra tags | `jm ~/path/photo.jpg --tags architecture,timber` |
| Post a quote | `jm "The quote text." --by "Author"` |
| Post from my phone | Photos → Share → **Post to J&M** |
| Post my own photo from my phone | Photos → Share → **Post to J&M (mine)** |
| Tag an already-posted photo as mine | `jztag <post-url>` |
| Remove a post | see [Remove a post](#remove-a-post) |

`jm` works from **any** folder. It reads the argument: a file path posts a
photo (Look), text posts a quote (Read). Each shows a preview and asks before
publishing.

**Examples**

```
jm ~/Desktop/cabin.jpg --jz
jm "Nothing is a mistake. There's only make." --by "Sister Corita Kent"
jztag https://jarrydz.github.io/johnandmario/posts/2026-06-22-41ba5b75/
```

---

## Marking your own photography

A photo you took gets `jz: true` in its file — quiet metadata for now, ready to
show as a credit or a filtered view later. Three ways to set it, all identical:

- New photo, desktop: `jm photo.jpg --jz`
- New photo, phone: the **Post to J&M (mine)** Shortcut
- Already posted: `jztag <url>` (paste the post's URL or just its slug)

---

## Photo flags (`jm <photo>`)

| Flag | Effect |
| --- | --- |
| `--jz` | mark as your own photography |
| `--tags a,b,c` | extra tags on top of the AI ones |
| `--title "…"` | optional title |
| `--source "…"` / `--source-url <url>` | credit a found image's creator |
| `--no-push` | save it but don't publish yet |
| `--dry-run` | preview only — nothing uploaded or committed |

## Quote flags (`jm "text"`)

| Flag | Effect |
| --- | --- |
| `--by "…"` | attribution (defaults to `Unknown`) |
| `--source "…"` / `--year N` | the work it's from |
| `--mood <name>` | epigram (default) · literary · cinematic · handwritten · technical · broadside · fragment |
| `--tags a,b,c` | thematic tags |

---

## Remove a post

Get the slug from the post's URL (the bit after `/posts/`), then:

```
git -C ~/Projects/code/play/johnandmario rm src/content/posts/SLUG.md && git -C ~/Projects/code/play/johnandmario commit -m "Remove SLUG" && git -C ~/Projects/code/play/johnandmario push
```

Replace `SLUG` with e.g. `2026-06-22-41ba5b75`. The image stays in storage
(harmless and free); removing it too is rarely worth it.

---

## Act (the manifesto)

Act is a deliberately short, fixed list — not a feed. To add or change a rule,
edit the `rules` array in `src/pages/act.astro`, or just ask in chat and it gets
done. No tool, by design.

---

## Setup (once per Mac)

The `jm`, `cdjm`, and `jztag` helpers live in `~/.zshrc`. On a new machine,
re-add them:

```
cat >> ~/.zshrc <<'EOF'
alias cdjm='cd ~/Projects/code/play/johnandmario'
jm() {
  if [[ -f "$1" || "${1:l}" == *.(jpg|jpeg|png|gif|webp) ]]; then
    (cd ~/Projects/code/play/johnandmario && npm run img -- "$@")
  else
    (cd ~/Projects/code/play/johnandmario && npm run quote -- "$@")
  fi
}
jztag() {
  local s f r="$HOME/Projects/code/play/johnandmario"
  s="${1##*/posts/}"; s="${s%/}"; s="${s##*/}"
  f="$r/src/content/posts/$s.md"
  [ -f "$f" ] || { echo "no post: $s"; return 1; }
  grep -q '^jz: true' "$f" || perl -i -pe 's/^(post_type:.*)$/$1\njz: true/' "$f"
  git -C "$r" add "$f" && git -C "$r" commit -m "Tag $s as jz" && git -C "$r" push
}
EOF
source ~/.zshrc
```

The desktop tools need your Anthropic key in the macOS Keychain (already set):

```
security add-generic-password -U -a "$USER" -s ANTHROPIC_API_KEY -w
```

The phone Shortcut needs the `POST_TOKEN`. To rotate it (occasionally, or if it
leaks), from `post-worker/`:

```
TOKEN=$(openssl rand -hex 24)
printf '%s' "$TOKEN" | npx wrangler secret put POST_TOKEN
printf '%s' "$TOKEN" | pbcopy
```

…then paste the new value into the Shortcut's `X-Post-Token` header. Finish with
`unset TOKEN && pbcopy </dev/null`.

---

## How it works (one paragraph)

A post is a markdown file in `src/content/posts/` (photos) or
`src/content/quotes/` (quotes). The tools caption the photo with Claude, store
the original in Cloudflare R2, write the file, and push to GitHub — which builds
the static site and deploys it to GitHub Pages. The phone path does the same
inside a Cloudflare Worker. Nothing depends on Tumblr; you own all of it.

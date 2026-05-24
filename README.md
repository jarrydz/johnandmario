# John & Mario

A personal inspiration archive — image-first curation in the Tumblr tradition. A
rebuild of the 2011–2013 blog `johnandmario.tumblr.com` as a self-owned static
site, with no platform lock-in and no engagement loops.

Built with [Astro](https://astro.build/) and deployed to GitHub Pages.

- **Live site:** https://jarrydz.github.io/johnandmario/
- **Stack:** Astro static output, Markdown content collections, Astro's `<Image />` for responsive WebP/AVIF, GitHub Actions for deploy.

## A note on the images

This is a curation archive. The images were collected over many years and are
mostly not mine; original attribution was often not preserved. I don't claim
authorship. See the [/about](https://jarrydz.github.io/johnandmario/about) page
for the full disclosure and a contact address.

The `LICENSE` file (MIT) covers **the site code only** — not the images. There
is deliberately no content licence, because the images aren't mine to license.

## Run it locally

You need Node.js (installed via Homebrew is fine).

```sh
npm install      # first time only
npm run dev      # start the dev server at http://localhost:4321/johnandmario/
```

Other commands:

```sh
npm run build    # build the production site into dist/
npm run preview  # serve the built site locally to check it
```

> **Note on `base`:** the dev and preview URLs include `/johnandmario/` because
> the site is served from a sub-path on GitHub Pages. Visiting plain
> `localhost:4321/` will 404 — use the `/johnandmario/` path.

## Add a new post

1. Drop the image into `src/assets/images/`.
2. Create a Markdown file in `src/content/posts/`. Name it however you like;
   a `YYYY-MM-DD-slug.md` pattern keeps things tidy and sets the URL.
3. Add frontmatter. Minimum for a photo post:

```markdown
---
date: 2013-08-01T10:00:00+10:00
image: ../../assets/images/your-image.jpg
image_alt: "A short, factual description of the image for screen readers."
---

An optional caption in Markdown goes here.
```

That's it — `npm run dev` will pick it up, and the next push deploys it.

### Full frontmatter schema

Validated with Zod in `src/content.config.ts`. The build **fails** if a post
breaks these rules, which keeps the archive consistent.

| Field        | Type                                   | Required            | Notes                                            |
| ------------ | -------------------------------------- | ------------------- | ------------------------------------------------ |
| `date`       | datetime                               | yes                 | ISO date or datetime, e.g. `2013-08-01T10:00:00+10:00` |
| `image`      | path string                            | for photo posts     | relative to the `.md` file, e.g. `../../assets/images/x.jpg` |
| `image_alt`  | string                                 | whenever `image` set | accessibility — describe the image               |
| `post_type`  | `photo` \| `text` \| `quote` \| `link` | no (defaults `photo`) |                                                |
| `title`      | string                                 | no                  |                                                  |
| `tags`       | string array                           | no                  | e.g. `[architecture, interiors]`                 |
| `description`| string                                 | no                  | used for `<meta>` and the RSS summary            |
| `tumblr_url` | URL string                             | no                  | preserves the original Tumblr permalink          |
| `source`     | string                                 | no                  | original creator, when known                     |
| `source_url` | URL string                             | no                  | link to the original source, when known          |

When `source` or `source_url` is set, an attribution line renders automatically
in the post footer. When both are blank, nothing renders.

## Project structure

```
.
├── .github/workflows/deploy.yml   # GitHub Pages deploy (Astro official action)
├── astro.config.mjs               # site + base config, sitemap integration
├── src/
│   ├── assets/images/             # images referenced by posts (committed)
│   ├── components/                # Header, Footer, PostCard, Attribution, BaseHead
│   ├── content/posts/             # ← your Markdown posts live here
│   ├── content.config.ts          # content collection + Zod schema
│   ├── layouts/                   # BaseLayout, PostLayout
│   ├── pages/
│   │   ├── [...page].astro        # paginated home feed (reverse-chron)
│   │   ├── posts/[...id].astro    # individual post pages
│   │   ├── archive.astro          # thumbnail grid of all posts
│   │   ├── about.astro            # curation disclosure + contact
│   │   └── rss.xml.js             # RSS feed at /rss.xml
│   ├── styles/global.css          # the whole theme
│   ├── consts.ts                  # title, description, contact email, repo URL
│   └── utils.ts                   # base-path + date helpers
└── LICENSE                        # MIT — covers code only, not images
```

## Not in the repo

The full ~479 MB image archive (`original-blog-imgs/`) and its metadata index
(`blog-image-index.xlsx`) sit alongside the project locally as a staging area
for future bulk imports. They're git-ignored — only images you reference from a
post get committed.

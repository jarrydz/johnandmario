# Build a Personal Image Blog with Astro and GitHub Pages

## Project context

I'm rebuilding an old Tumblr blog from 2011–2013 (`johnandmario.tumblr.com`) as a self-owned static site. I've decided against recovering the original Tumblr account — I want full ownership of the infrastructure and URL on my own domain, with no platform lock-in and no algorithmic engagement loops.

What this blog is: a personal inspiration archive in the Tumblr tradition. Image-first curation, ~6,727 images collected over many years, mostly not mine and mostly without original attribution preserved. I do not claim authorship of these images. This is openly framed as curation, not ownership.

Visual style: early-2010s Tumblr photo blog. Image-first, reverse chronological, minimal chrome, single column. I want to start posting to it again on infrastructure I own.

I'm a Product Manager with limited formal engineering background but technically curious. I use Cursor and Claude Code regularly and am comfortable in the terminal. Don't talk down to me, but do explain non-obvious decisions you make as you go.

## Stack — already decided, do not re-evaluate

* Framework: [Astro](https://astro.build/) — for content-focused static site generation, built-in image optimisation, markdown-first content, and a clean upgrade path
* Hosting: GitHub Pages via GitHub Actions
* Repo: `github.com/jarrydz/johnandmario` — public repo, I will create the empty GitHub repo manually before you push
* Content format: Markdown files with frontmatter
* Domain: GitHub Pages default URL initially (`jarrydz.github.io/johnandmario/`). Custom domain comes later — do not configure now.

## Current state

* I have a local folder on my Mac with ~6,727 images (~500MB) extracted from the old Tumblr blog. Confirm the exact path with me before importing.
* I have an active GitHub account at `github.com/jarrydz` with SSH access already set up.
* Node.js is installed via Homebrew.
* I do not yet have an Astro project — create one fresh.

## What I need you to do

1. Scaffold a new Astro project in a sensible local directory using `npm create astro@latest`. Choose the blog starter template. Confirm the parent directory with me before creating.
2. Initialise a git repo and connect it to `github.com/jarrydz/johnandmario`. I will create the empty GitHub repo first — wait for my confirmation before pushing.
3. Set up GitHub Pages deployment via GitHub Actions using Astro's official deploy workflow ([reference](https://docs.astro.build/en/guides/deploy/github/)). Configure the `site` and `base` settings correctly for project-page hosting — URL will be `jarrydz.github.io/johnandmario/`.
4. Define an Astro content collection for posts with this frontmatter schema (use Zod for validation):
   * `title` (string, optional)
   * `date` (datetime, required)
   * `tags` (string array, optional)
   * `image` (path string, required for photo posts)
   * `image_alt` (string, required for accessibility)
   * `description` (string, optional)
   * `post_type` (enum: photo, text, quote, link)
   * `tumblr_url` (string, optional — preserves the original Tumblr post URL for migrated content)
   * `source` (string, optional — original creator name when known)
   * `source_url` (string, optional — link to original source when known)

   When `source` or `source_url` is populated, the post layout should auto-render a small attribution line in the post footer. When both are blank, no attribution renders.
5. Build a minimal Tumblr-style theme:
   * Single column, max-width ~720px, centred
   * Image-first layout: image fills the column width, caption underneath
   * Reverse chronological feed on the home page
   * Plain sans-serif typography (system font stack or Inter), generous white space
   * No header chrome beyond a simple title and link to an `/about` page
   * No comments, no share buttons, no social embeds
   * No infinite scroll — explicit pagination instead
6. Set up image handling:
   * Use Astro's `<Image />` component for automatic responsive `<picture>` generation, WebP/AVIF output, and lazy loading
   * Store images in `src/assets/images/` initially
   * Confirm the path of my 500MB image folder before bulk-importing
7. Create one example post referencing one of my migrated images to verify the full pipeline works (markdown → Astro build → GitHub Pages render).
8. Add an RSS feed at `/rss.xml` using Astro's official RSS package.
9. Add a sitemap for future SEO via `@astrojs/sitemap`.
10. Push, deploy, and confirm the live URL renders correctly with the example post visible.
11. Add an MIT licence for the code as `LICENSE` in the repo root. Use my name "Jarryd Z" as the copyright holder unless I confirm a different name.
12. Do not add a content licence file. This blog is a personal inspiration archive — the images are not mine to license. Instead, create a placeholder `/about` page with the following disclosure text (I can edit it later):

    > This is a personal inspiration archive. Images collected over many years from Tumblr and elsewhere. I do not claim authorship of these images. Where I know the original source it's credited. Where I don't, I'd genuinely like to — get in touch and I'll add the credit or take the image down.
13. Add a contact mechanism on the about page — a simple `mailto:` link works fine. Use a placeholder email and prompt me to swap it in.

## Design direction

Mimic the feel of an old Tumblr photo blog without copying any branded elements:

* Minimal navigation
* Image is the hero, text is secondary
* Reverse chronological dominant feed
* An `/archive` page listing all posts as a grid of thumbnails (Tumblr's `/archive` style)
* Footer with: RSS link, GitHub repo link, brief about link
* Mobile-responsive but desktop-first composition
* Aesthetic restraint over flash — closer to [Are.na](https://www.are.na/) or [Craig Mod's site](https://craigmod.com/) than modern marketing sites

## Out of scope — do not do these yet

* AI image-based search (planned for later — but design the data structure so it's easy to bolt on)
* Custom domain configuration
* Analytics of any kind
* Comments or any social/engagement features
* Bulk migration of all 500MB of images — only one example post for now to verify the pipeline
* Theme customisation beyond the minimal Tumblr-style baseline

## Definition of done

I should have:

* A working Astro project committed to `github.com/jarrydz/johnandmario`
* A live site at `https://jarrydz.github.io/johnandmario/` with at least one example image post visible
* An `MIT LICENSE` file in the repo root
* An `/about` page containing the curation disclosure text
* A clean folder structure I can drop more markdown posts into
* A `README.md` in the repo explaining the project structure, how to add a new post, and how to run the dev server locally
* A short summary from you covering:
   * What you set up
   * Any decisions you made that I didn't specify
   * What I should learn next about Astro
   * A rough plan for bulk-importing the remaining ~6,727 images

## How to work with me

* Confirm before bulk operations, especially before importing all 500MB of images
* If you hit a decision point I haven't covered, flag it explicitly with the trade-offs rather than guessing silently
* Use UK English in any text content you add to the site (README, about page, etc.)
* Prefer convention over configuration where the convention is sensible
* Short, sharp explanations beat long ones — I'll ask follow-ups if I need more detail

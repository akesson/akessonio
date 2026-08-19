# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Design:** `docs/DESIGN.md` holds the target design principles (calm, whitespace-led, discreet/short motion, sparing fluidity) and the design tokens. New/redesigned UI follows it; the current Hermit defaults predate it.
>
> **Voice:** `docs/VOICE.md` holds the tone-of-voice rules (concise, direct, humane, no BS — first person, conclusion first, owned opinions, wrong turns as content). All site prose and blog posts are measured against it.

This is **Henrik Åkesson's** personal website (https://akesson.io): a [Zola](https://www.getzola.org) static site built on a **vendored, customized Hermit theme**. The theme is copied directly into `templates/` + `sass/` and edited in place — there is no `themes/` directory and no `theme =` in `config.toml`, so all layout changes are made directly to the files here.

## Commands

The site builds with **zola-plus** (a zola fork adding the table directives — `scroll`, `expand`, `reflow`, `transpose`, measured widths), pinned in `mise.toml` (`"github:akesson/zola-plus"`). Plain `zola` still builds the site but silently drops every table directive — always build with `zola-plus`:

```bash
zola-plus serve     # local dev server with live reload (http://127.0.0.1:1111)
zola-plus build     # build static site into public/
zola-plus check     # validate content + check internal/external links
```

There is no test suite, linter, or JS build step — JS is hand-written in `static/js/` and served as-is; SCSS is compiled by Zola itself (`compile_sass = true`).

## Deployment (important)

Deploy is via GitHub Actions (`.github/workflows/main.yml`): `jdx/mise-action` installs the pinned zola-plus, `zola-plus build` produces `public/`, and `peaceiris/actions-gh-pages` pushes it to `gh-pages`:

- **Pushing to `main` builds AND deploys** to the `gh-pages` branch (production). There is no staging gate.
- Pushes to any other branch run a build-only check (no deploy).

Treat a push to `main` as a production release.

## Template architecture

`templates/index.html` is **both the homepage and the base layout**. Every other template `{% extends "index.html" %}` and overrides its blocks: `header`, `title`, `main`, `footer`, `js_footer`. The base renders the home "spotlight" (title/subtitle/social/nav) by default; child templates blank out `title` and replace `main`.

Template selection works two ways:

- **Default mapping**: sections render with `section.html`, pages with `page.html`, unless overridden.
- **Per-content override**: a `template = "..."` key in front-matter picks a specific template.

Current routing:

| Content | Template | Notes |
|---|---|---|
| `/` home = article list | `index.html` + `content/_index.md` (`section.html`, "Articles") | articles are **top-level** `content/*.md` files |
| Articles (e.g. `content/wordtree.md`) | `page.html` (default mapping) | prev/next via `post_nav()` macro, read-time; old `/blog/...` URLs kept via `aliases` |
| `content/projects/` | `projects.html` / `project.html` | set in front-matter; old `/opensource/...` URLs kept via `aliases` |
| `content/about/_index.md` | `description.html` | set in front-matter |

`macros.html` holds shared partials: `read_time()`, `social_icon()`, `icon()`, `tabstrip()` (the section nav strip, with `aria-current`), `back_link()`, `post_nav()`. Navigation is **not** duplicated across templates anymore — header blocks call the macros (e.g. `page.html` calls `back_link()`).

## Configuration-driven content

`config.toml` `[extra]` drives site chrome — edit here, not in templates:

- `hermit_social` — social links (`{name, link}`); `name` must match a branch in the `social_icon()` macro or it falls back to a generic link icon. (There is no `hermit_menu` anymore — section nav is the `tabstrip()` macro in `macros.html`.)
- `home_subtitle`, `footer_copyright`, `author.name`, `highlightjs.*`.

## Styling & assets

- SCSS entry is `sass/style.scss`, which `@import`s partials (`_predefined`, `_normalize`, `_syntax`, `_animate`, `_icons`, `_form`). Zola compiles it to `style.css`, referenced via `get_url(path="style.css")`.
- Static files live in `static/` and are copied verbatim — **not fingerprinted/hashed**, so edits to `static/js/*.js` can be masked by browser cache. Use `get_url(path="...", cachebust=true)` when cache invalidation matters.
- Reference any static/SCSS asset through `get_url(path=...)`, never hardcode paths.

## Rendering specifics

- **Math**: **Not supported.** KaTeX was removed (2026-06-14); there is no math renderer. Writing math delimiters (`$…$`, `$$…$$`, `\(…\)`, `\[…\]`) in content is **rejected by `npm run check:math`** (`scripts/check-no-math.mjs`, also a CI step in `.github/workflows/main.yml`) so it can't silently render as literal text. **To enable math**, add **MathML** to Zola: Zola 0.22 has no native math and no plugins, so run a build-time converter (**Temml** via Node, or the `latex2mathml` Rust crate) as a **post-build pass over `public/`** — the CI build is a plain `zola-plus build` step, so the pass slots in between build and deploy — native MathML then renders with zero runtime JS/CSS/CDN. Then delete the guard.
- **Code highlighting**: Zola's built-in `highlight_code = true` is on. There is also an *optional* highlight.js + badge/clipboard path gated behind `config.extra.highlightjs.enable` (currently `false`).
- **Tags/taxonomies: intentionally none.** The `tags` taxonomy was removed (2026-06-14) — at ~10–20 articles a tag system adds no navigation value and produces thin one-entry per-tag pages/feeds. `config.toml` keeps the commented Zola example showing how to re-add. Revisit only at ~40+ posts, or when content forms distinct clusters of 5+ posts each.

## Content authoring conventions

- **Articles are top-level** `content/<slug>.md` files with `date` set; the root section (`content/_index.md`, "Articles", `sort_by = "date"`) lists them. Subsections (`content/projects/`) are directories with an `_index.md`.
- **Writing an article? Use the `write-article` skill** — it encodes the workflow (voice pass against `docs/VOICE.md`, front-matter, `blog-tables`, math guard, build check).
- **Drafts carry `draft = true` and are never pushed until promoted.** Articles are drafted here (only place rendering can be validated: `zola-plus serve --drafts`); Zola keeps drafts out of production builds, and the pre-push hook (`scripts/pre-push-no-drafts.sh` → install as `.git/hooks/pre-push`) blocks pushing a tree that still contains one — the repo source is public. Promotion = removing `draft = true` + final `date`. Research/positioning for launch articles lives in the private `../outreach` repo.
- `docs/VOICE.md` is the canonical voice doc for **all** of Henrik's outreach copy (blog, HN, reddit, newsletters); the `../outreach` repo reads it cross-repo and keeps no copy.
- Standalone informational pages use `template = "description.html"` (currently only `content/about/_index.md`).
- Shortcodes would live in `templates/shortcodes/`, invoked from Markdown as `{{ name() }}` — but that directory is **currently empty** (no shortcodes defined yet).

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Design:** `DESIGN.md` holds the target design principles (calm, whitespace-led, discreet/short motion, sparing fluidity) and the design tokens. New/redesigned UI follows it; the current Hermit defaults predate it.

This is the **Human Solutions** website (https://human.solutions): a [Zola](https://www.getzola.org) static site built on a **vendored, customized Hermit theme**. The theme is copied directly into `templates/` + `sass/` and edited in place — there is no `themes/` directory and no `theme =` in `config.toml`, so all layout changes are made directly to the files here.

## Commands

```bash
zola serve     # local dev server with live reload (http://127.0.0.1:1111)
zola build     # build static site into public/
zola check     # validate content + check internal/external links
```

There is no test suite, linter, or JS build step — JS is hand-written in `static/js/` and served as-is; SCSS is compiled by Zola itself (`compile_sass = true`).

## Deployment (important)

Deploy is via GitHub Actions (`.github/workflows/main.yml`, using `shalzz/zola-deploy-action`):

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
| `/` home | `index.html` | base layout, rendered directly |
| `content/blog/` (`_index.md`, posts) | `section.html` / `page.html` | defaults; posts get prev/next + read-time. **Currently no posts** — only the `_index.md` exists, so `/blog` renders an empty list |
| `content/opensource/` | `opensource.html` / `opensource_page.html` | set explicitly in front-matter; two project pages (`cargo_leptos.md`, `reactive_signals.md`) |
| `content/about.md` | `description.html` | the only standalone page, set in front-matter |
| tags taxonomy | `tags/list.html` (all terms), `tags/single.html` (one tag) | `tags` is the only taxonomy, RSS enabled |

> **Current content inventory** (so the table above stays honest): `content/about.md`, `content/blog/_index.md` (no posts), `content/opensource/_index.md` + `cargo_leptos.md` + `reactive_signals.md`. The `hermit_menu` nav links to `/opensource`, `/blog`, `/about` — all resolve, but `/blog` is empty.

`macros.html` holds shared partials: `render_social_icons()`, `footer()`, `read_time()`. The social-icon macro is a large `if/elif` chain keyed on the icon `name` string.

### Known maintenance smell

The header `<nav>` + mobile menu markup is **duplicated verbatim** across `section.html`, `page.html`, `opensource.html`, `opensource_page.html`, `description.html`, `tags/list.html`, and `tags/single.html` (because each overrides the `header` block). Changing site navigation means editing all of them. If touching the header, prefer extracting it into a `macros.html` macro and calling it from each `header` block.

## Configuration-driven content

`config.toml` `[extra]` drives site chrome — edit here, not in templates:

- `hermit_menu` — main nav items (`{link, name}`); rendered in every header block.
- `hermit_social` — social links (`{name, link}`); `name` must match a branch in the `render_social_icons()` macro or it falls back to a generic link icon.
- `home_subtitle`, `footer_copyright`, `author.name`, `highlightjs.*`.

## Styling & assets

- SCSS entry is `sass/style.scss`, which `@import`s partials (`_predefined`, `_normalize`, `_syntax`, `_animate`, `_icons`, `_form`). Zola compiles it to `style.css`, referenced via `get_url(path="style.css")`.
- Static files live in `static/` and are copied verbatim — **not fingerprinted/hashed**, so edits to `static/js/*.js` can be masked by browser cache. Use `get_url(path="...", cachebust=true)` when cache invalidation matters.
- Reference any static/SCSS asset through `get_url(path=...)`, never hardcode paths.

## Rendering specifics

- **Math**: KaTeX is loaded from CDN in the base template on every page (auto-render with `$`/`$$`/`\(\)`/`\[\]` delimiters).
- **Code highlighting**: Zola's built-in `highlight_code = true` is on. There is also an *optional* highlight.js + badge/clipboard path gated behind `config.extra.highlightjs.enable` (currently `false`).

## Content authoring conventions

- Sections are directories under `content/` with an `_index.md` (`sort_by = "date"` is used for listed sections).
- A page joins a listed section by being a `.md` file in that directory with `date` set; `section.html` and the opensource list group pages by year.
- Standalone informational pages use `template = "description.html"` (currently only `about.md`).
- Shortcodes would live in `templates/shortcodes/`, invoked from Markdown as `{{ name() }}` — but that directory is **currently empty** (no shortcodes defined yet).

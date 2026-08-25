---
name: write-article
description: Write or revise a blog article for akesson.io in Henrik's established voice. Use this whenever Henrik asks to write, draft, or edit an article, blog post, or site prose — including "write about <project>", "turn these notes into a post", or a topic plus a repo link — even if he doesn't say "article" explicitly.
---

# Writing an article for akesson.io

Articles are published under Henrik's name, in first person. The single most important rule: **never fabricate his experience.** The voice (`docs/VOICE.md`) leans on personal stories, wrong turns, and feelings — those must come from his input, the repo's git history, or this conversation. If the draft needs a first-person anecdote you don't have, leave a bracketed gap (`[TODO Henrik: how long did this actually take?]`) or ask — never invent one. A made-up "I spent two hours on this" is exactly the BS the voice forbids. This includes *embellishing* a real event: if the note says "I lost time to a stale binary," the draft may not add the debugging steps or thought process Henrik went through — narrated inner experience is fabrication too, even when the event is real.

## Input

Expect: a topic or angle, a pointer to a repo/code, and optionally personal notes (how he feels about it, the process he went through). The notes are the most valuable part — they're the only legitimate source for §6-style wrong-turn stories and emotional texture. Mine them fully before writing. If no notes are given, mine the repo's git history and issues for the real story instead.

Go **straight to a full draft** — no outline-approval step. Henrik reacts to real prose.

## Drafts: `draft = true`, local-only until promoted

Every article starts as a **draft**: `content/<slug>.md` with `draft = true` in front-matter. Drafting happens here (not in `../outreach`) because rendering can only be validated here — preview with `zola-plus serve --drafts`. Two mechanisms keep unfinished work out of the public eye, since this repo is public and pushing `main` deploys:

1. **Zola excludes drafts from normal builds** — CI runs a plain `zola-plus build`, so a draft can never deploy, even if pushed by mistake.
2. **Unpromoted drafts are never pushed** (the *source* is public too). The pre-push hook (`scripts/pre-push-no-drafts.sh`, installed as `.git/hooks/pre-push`) blocks any push whose tree contains `draft = true`. Keep drafts uncommitted or on a local-only branch.

**Promotion** = remove `draft = true` and set the final `date`. Only promote when Henrik says the article is ready to ship.

For launch/promotional articles, the research, positioning, and launch plan live in `../outreach/projects/<name>/` — mine them as input. The draft itself still lives here.

## Before writing, read

1. `docs/VOICE.md` — the rules the draft is measured against. Non-negotiable.
2. The most recent article in `content/*.md` (currently `wordtree.md`) — live reference for title style, front-matter, and how the voice sounds in practice.
3. The code being written about. Get facts, names, and numbers right by reading them, not remembering them. A claimed benchmark or line count that's wrong undermines the whole "no BS" contract.

## File conventions

Articles are top-level files: `content/<slug>.md` (short kebab-case slug). The root section (`content/_index.md`, "Articles") lists them by date.

```toml
+++
title = "..."          # concrete and a little wry, sentence case — see existing titles
date = 2026-07-28      # today, YYYY-MM-DD (final date set at promotion)
description = "..."    # one honest sentence for the listing; no marketing adjectives
draft = true           # every article starts as a draft — removed only at promotion
+++
```

Add `[extra]` keys only when needed: `responsive_tables = true` when the article has tables. (Don't override the word count — zola-plus ≥ 1.1.0 counts prose only, skipping code blocks, raw HTML/SVG, link targets and shortcode calls.)

**No math notation** — the site has no math renderer and `scripts/check-no-math.mjs` rejects `$…$`/`\(…\)` delimiters in CI. Write it out in words or code.

**Shortcode/Tera syntax in prose breaks the build** — Zola evaluates `{{ … }}` and `{% … %}` in markdown even inside backticks, so an article that *mentions* shortcode syntax (e.g. one about Zola itself) hard-fails on the unknown shortcode. Escape with Zola's comment form: `{{/* name() */}}` and `{%/* tag */%}` render as the literal syntax.

## After drafting, in order

1. **Voice pass.** Reread the draft against `docs/VOICE.md` rule by rule — especially the never-list (throat-clearing, marketing adjectives, "simply/just", manufactured enthusiasm, buried conclusions). Fix what fails. This pass is separate from drafting on purpose: you can't proofread a voice while producing it.
2. **Tables?** Run the `blog-tables` skill to measure and write the width directives. Required before any article with tables ships.
3. **Guards + build.** `npm run check:math` and `zola-plus build` (plain `zola` silently drops table directives). Both must pass.
4. **Hand over, don't ship.** Present the draft location and any `[TODO Henrik: …]` gaps. Do not commit, and never push to `main` unprompted — pushing to `main` deploys to production.

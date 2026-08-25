+++
title = "One trie, three jobs, zero benchmarks won"
date = 2026-06-06
description = "A compact word-list trie that loses every benchmark to a specialist — and why I shipped it anyway."
aliases = ["/blog/wordtree/"]
[extra]
# Inline SVG figures inflate Zola's word_count (it counts rendered markup), which
# would skew read-time. This is the true prose count; remove it to fall back to auto.
words = 2576
# Table directives below are measured by the blog-tables skill (re-run it after
# editing any table). No-ops under vanilla zola; CI builds with zola-plus, which
# renders them.
responsive_tables = true
+++

*I dusted off an old project of mine and, with the help of AI, freshened it up
and made some improvements. This article is written with the help of AI too, but
it's my project, my design, and I can explain every line.*

I just open-sourced [wordtree](https://github.com/akesson/wordtree), a compact
trie for word lists. First of all, here is what it is *not*: it
is not the fastest at anything. I benchmarked it against a specialist crate for
each job it does, and each specialist beat it in its own domain. Exact
lookup is slower than a `HashMap`. The file is three times larger than an FST.
Spelling correction is an order of magnitude slower than symspell.

So why did I do it? Because I needed it! A structure that loses every micro-benchmark can
still be the right dependency.

The whole comparative study is reproducible — every number below comes from
[comparisons/REPORT.md](https://github.com/akesson/wordtree/blob/main/comparisons/REPORT.md), regenerable with four `cargo`
commands against the word lists bundled in the repo.

## Three jobs

wordtree came out of a translation app that needed three things from one big
word list, all at once, on devices where startup time and memory both mattered:

1. **A browsable index.** Group the words into folders (~100 per folder) so a UI
   can page through them. `path_of("apricot")` returns the folder path.
2. **Exact lookup.** Resolve a word to the index of its expression in
   `O(word length)`. `index_of("apple")` → `Some(1)`.
3. **Typo-tolerant autocomplete.** Frequency-ranked, as-you-type suggestions that
   *both* extend a prefix (`"ap"` → `apple`, `apply`) *and* fix a single typo —
   substitution, transposition, insertion, or deletion at Damerau-Levenshtein
   distance ≤ 1 (`"aple"` → `apple`). `suggestions("aple", …)`.

Each of those jobs has a specialist crate that does it better. What almost
nothing does is all three from *one* structure, from one file that loads with
zero parsing. That last constraint is the whole story, so I'll start there.

## The structure: 8 bytes a node

The tree is a width-first array of fixed-size nodes: a node is immediately
followed by all its siblings, so "next sibling" is the next slot and "first
child" is one 24-bit index.

<figure>
<svg viewBox="0 0 544 356" role="img" aria-label="A trie for ape, apple and apply drawn above the flat width-first array that stores it. A parent reaches its first child by one forward offset, and sibling nodes occupy contiguous array slots." style="display:block;margin:0 auto;width:100%;height:auto;max-width:600px;font-family:inherit">
<title>Logical trie versus its flat node array</title>
<defs><marker id="wt-fc-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6 z" fill="var(--accent,#91bce6)"/></marker></defs>
<text x="20" y="20" fill="currentColor" font-size="13" opacity="0.6">logical trie</text>
<text x="20" y="210" fill="currentColor" font-size="13" opacity="0.6">flat node array · width-first</text>
<g stroke="currentColor" stroke-opacity="0.45" stroke-width="1.5" fill="none">
<line x1="52" y1="95" x2="110" y2="95"/>
<line x1="110" y1="95" x2="175" y2="95"/>
<line x1="175" y1="95" x2="240" y2="55"/>
<line x1="175" y1="95" x2="240" y2="135"/>
<line x1="240" y1="135" x2="305" y2="135"/>
<line x1="305" y1="135" x2="370" y2="105"/>
<line x1="305" y1="135" x2="370" y2="165"/>
</g>
<rect x="38" y="88" width="14" height="14" transform="rotate(45 45 95)" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.45"/>
<g font-size="15" text-anchor="middle">
<circle cx="110" cy="95" r="15" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-opacity="0.6"/><text x="110" y="100" fill="currentColor">a</text>
<circle cx="175" cy="95" r="15" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-opacity="0.6"/><text x="175" y="100" fill="currentColor">p</text>
<circle cx="240" cy="55" r="15" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-opacity="0.6"/><text x="240" y="60" fill="currentColor">e</text>
<circle cx="240" cy="135" r="15" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-opacity="0.6"/><text x="240" y="140" fill="currentColor">p</text>
<circle cx="305" cy="135" r="15" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-opacity="0.6"/><text x="305" y="140" fill="currentColor">l</text>
<circle cx="370" cy="105" r="15" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-opacity="0.6"/><text x="370" y="110" fill="currentColor">e</text>
<circle cx="370" cy="165" r="15" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-opacity="0.6"/><text x="370" y="170" fill="currentColor">y</text>
</g>
<g font-size="12" fill="currentColor" opacity="0.5" font-style="italic">
<text x="240" y="34" text-anchor="middle">ape</text>
<text x="392" y="109">apple</text>
<text x="392" y="169">apply</text>
</g>
<g>
<rect x="70" y="236" width="60" height="46" rx="3" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.6"/>
<rect x="134" y="236" width="60" height="46" rx="3" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.6"/>
<rect x="198" y="236" width="60" height="46" rx="3" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.6"/>
<rect x="262" y="236" width="60" height="46" rx="3" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.6"/>
<rect x="326" y="236" width="60" height="46" rx="3" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.6"/>
<rect x="390" y="236" width="60" height="46" rx="3" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.6"/>
<rect x="454" y="236" width="60" height="46" rx="3" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.6"/>
</g>
<g font-size="18" text-anchor="middle" fill="currentColor">
<text x="100" y="265">a</text><text x="164" y="265">p</text><text x="228" y="265">e</text><text x="292" y="265">p</text><text x="356" y="265">l</text><text x="420" y="265">e</text><text x="484" y="265">y</text>
</g>
<g font-size="12" text-anchor="middle" fill="currentColor" opacity="0.45">
<text x="100" y="296">0</text><text x="164" y="296">1</text><text x="228" y="296">2</text><text x="292" y="296">3</text><text x="356" y="296">4</text><text x="420" y="296">5</text><text x="484" y="296">6</text>
</g>
<g stroke="var(--accent,#91bce6)" stroke-width="1.5" fill="none">
<path d="M100 234 Q132 210 164 234" marker-end="url(#wt-fc-arrow)"/>
<path d="M164 234 Q196 210 228 234" marker-end="url(#wt-fc-arrow)"/>
<path d="M292 234 Q324 210 356 234" marker-end="url(#wt-fc-arrow)"/>
<path d="M356 234 Q388 210 420 234" marker-end="url(#wt-fc-arrow)"/>
</g>
<text x="356" y="205" text-anchor="middle" fill="var(--accent,#91bce6)" font-size="12" font-family="monospace">first_child_pos</text>
<g stroke="currentColor" stroke-opacity="0.5" fill="none">
<path d="M198 312 V306 H322 V312"/>
<path d="M390 312 V306 H514 V312"/>
</g>
<text x="260" y="326" text-anchor="middle" fill="currentColor" font-size="12" opacity="0.7">contiguous siblings</text>
<text x="452" y="326" text-anchor="middle" fill="currentColor" font-size="12" opacity="0.5">siblings</text>
</svg>
<p>The same nodes, linearised. A parent reaches its children with one forward <code>first_child_pos</code> jump; the children then sit in adjacent slots, so walking siblings is just stepping forward until the <code>is_last_sibling</code> flag ends the run.</p>
</figure>

Each node is exactly 8 bytes:

<!-- reflow: 37rem width 48rem -->

| field                  | bits | role                                                       |
| ---------------------- | ---- | ---------------------------------------------------------- |
| `first_child_pos`      | 24   | array index of the first child                             |
| `node_char`            | 24   | UTF-32 codepoint (low 3 bytes)                             |
| `is_folder`            | 1    | drives the browsable index                                 |
| `is_last_sibling`      | 1    | terminates a sibling run                                   |
| `max_child_percentile` | 10   | best frequency in the subtree — drives top-k pruning       |
| (spare)                | 4    |                                                            |

<figure>
<svg viewBox="0 0 720 188" role="img" aria-label="The 64-bit, 8-byte node record split into fields: a 24-bit first-child position, a 24-bit character codepoint, a 1-bit is_folder flag, a 1-bit is_last_sibling flag, a 10-bit max_child_percentile, and 4 spare bits." style="display:block;margin:0 auto;width:100%;height:auto;max-width:720px;font-family:inherit">
<title>The 8-byte node bit layout</title>
<text x="40" y="28" fill="currentColor" font-size="13" opacity="0.6">one node record</text>
<g stroke="currentColor" stroke-opacity="0.12" stroke-width="1">
<line x1="120" y1="78" x2="120" y2="138"/>
<line x1="200" y1="78" x2="200" y2="138"/>
<line x1="360" y1="78" x2="360" y2="138"/>
<line x1="440" y1="78" x2="440" y2="138"/>
<line x1="600" y1="78" x2="600" y2="138"/>
</g>
<g stroke="currentColor" stroke-opacity="0.6" stroke-width="1">
<rect x="40" y="78" width="240" height="60" fill="currentColor" fill-opacity="0.07"/>
<rect x="280" y="78" width="240" height="60" fill="currentColor" fill-opacity="0.07"/>
<rect x="520" y="78" width="10" height="60" fill="currentColor" fill-opacity="0.07"/>
<rect x="530" y="78" width="10" height="60" fill="currentColor" fill-opacity="0.07"/>
<rect x="540" y="78" width="100" height="60" fill="var(--accent,#91bce6)" fill-opacity="0.20" stroke="var(--accent,#91bce6)"/>
<rect x="640" y="78" width="40" height="60" fill="currentColor" fill-opacity="0.04"/>
</g>
<g text-anchor="middle" fill="currentColor">
<text x="160" y="104" font-size="13" font-family="monospace">first_child_pos</text>
<text x="160" y="121" font-size="12" opacity="0.6">24 bits</text>
<text x="400" y="104" font-size="13" font-family="monospace">node_char</text>
<text x="400" y="121" font-size="12" opacity="0.6">24 bits</text>
<text x="590" y="98" font-size="12" font-family="monospace">max_child</text>
<text x="590" y="112" font-size="12" font-family="monospace">percentile</text>
<text x="590" y="126" font-size="12" opacity="0.7">10 bits</text>
<text x="660" y="104" font-size="12" font-family="monospace">spare</text>
<text x="660" y="121" font-size="12" opacity="0.55">4 b</text>
</g>
<g stroke="currentColor" stroke-opacity="0.5">
<line x1="535" y1="78" x2="476" y2="48"/>
<line x1="525" y1="78" x2="452" y2="64"/>
</g>
<g fill="currentColor" font-size="12" font-family="monospace">
<text x="472" y="46" text-anchor="end">is_last_sibling · 1</text>
<text x="448" y="62" text-anchor="end">is_folder · 1</text>
</g>
<g stroke="currentColor" stroke-opacity="0.5">
<line x1="40" y1="138" x2="40" y2="152"/>
<line x1="120" y1="138" x2="120" y2="148"/>
<line x1="200" y1="138" x2="200" y2="148"/>
<line x1="280" y1="138" x2="280" y2="152"/>
<line x1="360" y1="138" x2="360" y2="148"/>
<line x1="440" y1="138" x2="440" y2="148"/>
<line x1="520" y1="138" x2="520" y2="152"/>
<line x1="600" y1="138" x2="600" y2="148"/>
<line x1="680" y1="138" x2="680" y2="152"/>
</g>
<text x="360" y="172" text-anchor="middle" fill="currentColor" font-size="12" opacity="0.7">8 bytes · 64 bits</text>
</svg>
<p>Everything a node needs in 8 bytes. <code>max_child_percentile</code> (highlighted) earns its 10 inline bits because the suggestion walk reads it on <em>every</em> node to prune subtrees; the per-word data only a quarter of nodes need lives off-node instead.</p>
</figure>

Why fixed 8-byte records and not a tidy struct? Because the on-disk format *is*
the in-memory format. The tree serialises with [`rkyv`](https://rkyv.org), and an
`ArchivedTree` is queried directly out of an `mmap`: no parse, no rebuild, no
pointer fix-up. Loading a 21 MiB English dictionary is an `mmap` call. For
English, `live heap == serialized == 21.11 MiB`: the bytes you store are the bytes
you query.

That `max_child_percentile` field earns its 10 inline bits because it is read on
*every* node during a suggestion walk. It records the highest word frequency
anywhere in the subtree below a node, which is exactly the lower bound a
[pruning-radix-trie](https://seekstorm.com/blog/pruning-radix-trie/)
(Wolf Garbe's design, which wordtree's pruning is modelled on) needs: if a
subtree's best possible frequency can't beat the current top-k, skip the whole
subtree. Top-k autocomplete then touches a tiny fraction of the tree.

### Pushing the sparse data off-node

A word needs two more values: its frequency (`percentile`, 0–1000) and the
24-bit index of its expression. But only ~28% of nodes actually *end* a word;
the rest are interior characters. Storing
those 5 bytes inline would waste them on roughly three out of four nodes.

So they live in side tables instead, all part of the same zero-copy image:

<!-- reflow: 37rem width 42rem -->

| table        | size                 | role                                              |
| ------------ | -------------------- | ------------------------------------------------- |
| `word_bits`  | 1 bit / node         | is this node the end of a word?                   |
| `rank_index` | 1 × u32 / 64 nodes   | cumulative word count → `rank(node)` in O(1)      |
| `values`     | 5 bytes / **word**   | the `(percentile, expr_index)` pair               |

The trick is the classic succinct-structure move: a word node at position `i`
finds its value at `values[rank(i)]`, where `rank(i)` is the number of word-nodes
before it. The `word_bits` bitvector plus the cumulative `rank_index` answer that
rank query in O(1): popcount the partial 64-bit word, add the precomputed prefix
sum. The bit probe sits on the hot descent path; the rank query only fires when a
value is actually consumed (an exact lookup, or a suggestion you decided to keep).

Moving those 5 bytes off-node took the node from 12 bytes to 8, which on English
trimmed the structure from ~26.5 MiB to ~21.1 MiB (about 20%) with no loss of
function. It also made exact lookup ~10–20% *faster*, because more siblings now
fit in a cache line and `index_of` scans siblings linearly. I don't often get
smaller and faster out of the same change.

## Edit distance that rides down the trie

The third job is the interesting one. How do you find every word within
Damerau-Levenshtein distance 1 of a typo, frequency-ranked, without scanning the
dictionary? (A brute-force DL≤1 scan over English takes ~90–100 ms, far too slow
for as-you-type.)

The answer is to compute the edit distance *incrementally as you walk the trie*.
Each node carries one dynamic-programming row recording the edit distance between
the query and the word spelled by the path from the root to that node. The row at
a node is computed from its parent's row (and, for transposition, its
grandparent's). Conceptually, for a query of length `n`, the row holds

```
row[j] = edit_distance(query[0..j], word spelled to this node)
```

and two quantities matter:

- `row[n]` is the distance from the *whole* query to this node's word. If the node
  ends a word and `row[n] ≤ K`, it's a correction.
- `min(row)` is the distance to the closest *prefix*, a lower bound on every word
  in the subtree below. Once `min(row) > K`, the entire subtree is pruned.

So the walk descends at most `K` levels past the query length and, in practice,
visits well under 1% of the tree (0.3% on English, 0.8% on Swedish, measured
over generated single-edit typos). The same walk also collects the nodes that
the completion sweep extends from, so one call returns corrections and
completions together.

### The bug that made me rewrite it

I didn't start here. The first version used a hand-rolled 4-window state machine
that tracked a few edit positions as it descended. It looked fine and passed my
hand-written tests, and it was wrong.

What exposed it was building the comparison harness, specifically a recall
table broken down by edit *kind*. Substitution and transposition: fine.
Deletion: ~6–10% recall. Insertion: **0%**. The state machine, run over a
*branching* trie rather than a single string, mis-scored mid-word insertions and
deletions and pruned the correct word away before it was ever reached. My
autocomplete had been silently dropping every insertion typo and I had no idea
until a table told me. If you want one reason to build a comparison harness
before trusting your own tests, that's mine.

The DP-row-over-trie version replaced it and corrects all four single-edit kinds
at 100% (more on that below).

### The band: why each node costs three bytes, not `n`

A full row of `n + 1` values per node would make every node cost O(query length).
But you don't need the full row. `row[j]` is at least `|j − depth|` — you need
that many indels just to reconcile the length difference between a depth-`depth`
prefix and a `j`-character query prefix — so any cell with `|j − depth| > K` is
already `> K` and can never be a kept correction nor lower a surviving minimum.

Only the `2K + 1` cells in a diagonal **band** around `j = depth` can ever matter.
At the default `K = 1` that's **three cells**, stored as a fixed `[u8; 3]`.

Concretely: the query is `cart`, the walk is descending root → `c` → `ca` →
`cat`, and each row is that node's `[u8; 3]`. The typo is an inserted `r` — the
kind the state machine used to drop.

<figure>
<svg viewBox="0 0 620 330" role="img" aria-label="The edit-distance grid for the query cart against the trie path root, c, ca, cat. Rows are trie nodes, columns are query prefixes. Only the diagonal band of cells with absolute difference of j and depth at most one is computed; each row's three band cells hold real values, ending in a one at the terminal node cat, which is at most K so cat is kept. The out-of-band cells, shown faded, are all two or more and are never computed. The optimal alignment path stays inside the band; its single insertion moves it one cell to the right." style="display:block;margin:0 auto;width:100%;height:auto;max-width:640px;font-family:inherit">
<title>The band on a real query: cart against the path to cat</title>
<defs><marker id="band-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="var(--accent,#91bce6)"/></marker></defs>
<text x="265" y="34" text-anchor="middle" fill="currentColor" font-size="13" opacity="0.7">query  cart   (j →)</text>
<g text-anchor="middle" fill="currentColor" font-size="11" opacity="0.5">
<text x="173" y="54">0</text><text x="219" y="54">1</text><text x="265" y="54">2</text><text x="311" y="54">3</text><text x="357" y="54">4</text>
</g>
<g text-anchor="middle" fill="currentColor" font-size="14" font-family="monospace">
<text x="173" y="72" opacity="0.5">ε</text><text x="219" y="72">c</text><text x="265" y="72">a</text><text x="311" y="72">r</text><text x="357" y="72">t</text>
</g>
<text x="66" y="172" text-anchor="middle" fill="currentColor" font-size="13" opacity="0.7" transform="rotate(-90 66 172)">trie node  (depth ↓)</text>
<g text-anchor="end" fill="currentColor" font-size="13" font-family="monospace">
<text x="138" y="108" opacity="0.6">root</text><text x="138" y="154">c</text><text x="138" y="200">ca</text><text x="138" y="246">cat</text>
</g>
<g fill="var(--accent,#91bce6)" fill-opacity="0.12">
<rect x="196" y="80" width="46" height="46"/>
<rect x="150" y="126" width="46" height="46"/><rect x="242" y="126" width="46" height="46"/>
<rect x="196" y="172" width="46" height="46"/><rect x="288" y="172" width="46" height="46"/>
<rect x="242" y="218" width="46" height="46"/><rect x="334" y="218" width="46" height="46"/>
</g>
<g fill="var(--accent,#91bce6)" fill-opacity="0.28">
<rect x="150" y="80" width="46" height="46"/><rect x="196" y="126" width="46" height="46"/><rect x="242" y="172" width="46" height="46"/><rect x="288" y="218" width="46" height="46"/>
</g>
<g stroke="currentColor" stroke-opacity="0.13" fill="none">
<line x1="150" y1="80" x2="380" y2="80"/><line x1="150" y1="126" x2="380" y2="126"/><line x1="150" y1="172" x2="380" y2="172"/><line x1="150" y1="218" x2="380" y2="218"/><line x1="150" y1="264" x2="380" y2="264"/>
<line x1="150" y1="80" x2="150" y2="264"/><line x1="196" y1="80" x2="196" y2="264"/><line x1="242" y1="80" x2="242" y2="264"/><line x1="288" y1="80" x2="288" y2="264"/><line x1="334" y1="80" x2="334" y2="264"/><line x1="380" y1="80" x2="380" y2="264"/>
</g>
<g text-anchor="middle" fill="currentColor" font-size="14" font-family="monospace">
<text x="173" y="108">0</text><text x="219" y="108">1</text><text x="265" y="108" opacity="0.3">2</text><text x="311" y="108" opacity="0.3">3</text><text x="357" y="108" opacity="0.3">4</text>
<text x="173" y="154">1</text><text x="219" y="154">0</text><text x="265" y="154">1</text><text x="311" y="154" opacity="0.3">2</text><text x="357" y="154" opacity="0.3">3</text>
<text x="173" y="200" opacity="0.3">2</text><text x="219" y="200">1</text><text x="265" y="200">0</text><text x="311" y="200">1</text><text x="357" y="200" opacity="0.3">2</text>
<text x="173" y="246" opacity="0.3">3</text><text x="219" y="246" opacity="0.3">2</text><text x="265" y="246">1</text><text x="311" y="246">1</text><text x="357" y="246">1</text>
</g>
<g stroke="var(--accent,#91bce6)" stroke-width="2" fill="none">
<line x1="184" y1="114" x2="206" y2="136" marker-end="url(#band-arrow)"/>
<line x1="230" y1="160" x2="252" y2="182" marker-end="url(#band-arrow)"/>
<line x1="280" y1="195" x2="296" y2="195" marker-end="url(#band-arrow)"/>
<line x1="322" y1="206" x2="344" y2="228" marker-end="url(#band-arrow)"/>
</g>
<rect x="242" y="218" width="138" height="46" rx="4" fill="none" stroke="var(--accent,#91bce6)" stroke-width="1.6"/>
<line x1="380" y1="241" x2="404" y2="241" stroke="var(--accent,#91bce6)" stroke-opacity="0.6"/>
<text x="410" y="238" fill="currentColor" font-size="12" font-family="monospace" opacity="0.85">[u8; 3]</text>
<text x="410" y="254" fill="currentColor" font-size="12" opacity="0.6">node cat's band row</text>
<text x="410" y="270" fill="currentColor" font-size="12" opacity="0.6">last cell 1 ≤ K → keep cat</text>
<rect x="410" y="92" width="12" height="12" fill="var(--accent,#91bce6)" fill-opacity="0.28"/>
<text x="428" y="103" fill="currentColor" font-size="12" opacity="0.7">diagonal  j = depth</text>
<rect x="410" y="116" width="12" height="12" fill="var(--accent,#91bce6)" fill-opacity="0.12"/>
<text x="428" y="127" fill="currentColor" font-size="12" opacity="0.7">band  |j − depth| ≤ 1</text>
<rect x="410" y="140" width="12" height="12" fill="none" stroke="currentColor" stroke-opacity="0.3"/>
<text x="428" y="151" fill="currentColor" font-size="12" opacity="0.7">out of band: ≥ 2, never computed</text>
<line x1="410" y1="176" x2="424" y2="176" stroke="var(--accent,#91bce6)" stroke-width="2"/>
<text x="428" y="180" fill="currentColor" font-size="12" opacity="0.7">alignment: c, a, insert r, t</text>
<text x="265" y="306" text-anchor="middle" fill="currentColor" font-size="12" opacity="0.65">the one insertion shifts the path a single cell right — it can never leave a K = 1 band</text>
</svg>
<p>Every value the search acts on is inside the band, computed exactly: node <code>cat</code>'s <code>[u8; 3]</code> ends in <code>1 ≤ K</code>, so <code>cat</code> is kept. The faded cells are what a full <em>n</em>-wide row would also compute — all <code>≥ 2</code>, none able to change a keep-or-prune decision — so they are skipped, and a node costs three bytes instead of <em>O(n)</em>.</p>
</figure>

Shifting to band-local coordinates turns every DP neighbour into a *constant*
offset, so the recurrence carries no per-cell column arithmetic at all:

```
cur[o] = min(prev[o+1] + 1,     // deletion       (word longer than query)
             prev[o]   + cost,   // match / substitution
             cur[o-1]  + 1,      // insertion      (word shorter than query)
             pp[o]     + 1)      // transposition  (grandparent row)
```

By Ukkonen's banding argument (Robert Jacobson has a [readable
walkthrough](https://www.robertjacobson.dev/posts/2024-12-02-edit-distance-optimizations/#limited-distance-variant-the-banded-algorithm)),
the optimal alignment to any cell whose true distance is ≤ K stays inside the
band. So every value the search actually acts on is computed exactly, and **the
kept corrections, their order, and the exact set of visited nodes are
bit-identical to a full-row walk.** Out-of-band cells may be over-estimated, but
they stay `> K`, so no keep/prune decision changes. Banding changes only the
per-node cost, O(K) instead of O(n), which is why longer queries gain the most: a
14-character fuzzy query runs ~80% faster than the full-row walk; short typos
roughly halve.

(One Rust wrinkle: stable Rust can't size `[u8; 2*K + 1]` from a
`K` parameter, so the band *width* `W` is the const generic and `K = (W − 1) / 2`
is derived. Want distance-2 suggestions? Instantiate the search with `W = 5`.)

## Losing every axis, on purpose

Now the benchmarks. I picked the best specialist crate for each job and ran them
on the same word lists — [fst](https://crates.io/crates/fst) (BurntSushi's FSA),
[symspell](https://crates.io/crates/symspell), Wolf Garbe's
[pruning_radix_trie](https://crates.io/crates/pruning_radix_trie),
[boomphf](https://crates.io/crates/boomphf) (minimal perfect hash), and plain
`HashMap`/`Vec` baselines. A correctness gate asserts every engine resolves a
word to the *same* expression index before any timing is trusted.

**Exact lookup (nanoseconds).** `wordtree` is the slowest of the bunch; it
linearly scans each node's siblings.

<!-- scroll: width 36rem -->

| case (en)            | wordtree | fst  | boomphf | hashmap  |
| -------------------- | -------: | ---: | ------: | -------: |
| short `on`           |     74.3 | 15.3 |    14.1 | **8.1**  |
| long `alphanumerical`|    112.0 |107.4 |    25.9 | **8.7**  |

`HashMap` wins outright at ~8 ns, flat. wordtree is ~9–13× slower. All are tens
of nanoseconds in absolute terms, which is fine, but exact lookup is not a reason
to pick wordtree.

**Size.** The FST is the clear winner: it minimises shared prefixes *and*
suffixes (DAWG-like), doing exact lookup *and* spelling correction in ~3× less
space than wordtree does anything.

<!-- scroll: sticky 6rem width 24rem -->

| engine (en)  | live heap | serialized |
| ------------ | --------: | ---------: |
| fst          |  10.0 MiB |   6.7 MiB  |
| **wordtree** | 21.1 MiB  | 21.1 MiB   |
| sorted-vec   | 25.1 MiB  |     —      |
| boomphf      | 33.9 MiB  |     —      |
| hashmap      | 38.7 MiB  |     —      |
| symspell     | 300.4 MiB |     —      |

So: wordtree is the **smallest of the naive key-storing structures**, but still
~3× *larger* than an FSA. Its "size-optimised" claim holds against a naive trie,
not against fst. (Also, wordtree's *build* peaks at ~224 MiB to produce 21 MiB,
about 11×, which matters if you generate trees on a constrained device.)

**Spelling correction.** symspell is in another league on latency.

<!-- scroll: sticky 6rem width 36rem -->

| case (en)      | wordtree | symspell  | fst-lev | brute force |
| -------------- | -------: | --------: | ------: | ----------: |
| sub `abxut`    |  46.2 µs | **1.5 µs**| 132.6 µs|  102.6 ms   |
| del `abut`     |  49.3 µs | **8.4 µs**| 129.6 µs|   91.5 ms   |

symspell does a handful of hash lookups against a precomputed delete-dictionary;
wordtree walks the trie. It's ~25–31× slower than symspell on a substitution
typo and ~6–10× slower on a deletion. (It is ~2.6–3.1× *faster* than fst's
Levenshtein automaton, and corrects transpositions that fst misses entirely,
but symspell is the one to beat, and it wins.)

**Autocomplete.** Closest race. The combined `suggestions()` call runs the
edit-distance walk every time, so it's the wrong thing to race against a pure
completer (~43 µs). The autocomplete-only `completions()` call skips the walk:

<!-- scroll: sticky 6rem width 30rem -->

| case (en)   | wordtree `completions()` | pruning-trie |
| ----------- | -----------------------: | -----------: |
| `co`        |                   3.1 µs |  **1.2 µs**  |

Roughly 2–4× on English and 1–2.5× on Swedish, widening with the prefix's
fan-out: the pruning trie stays flat at ~1–2 µs whatever the prefix, while
`completions()` scales with how many descendants it sweeps. wordtree is
slightly *ahead* on quality (recall@5 80% vs 74% on English, 96% vs 93% on
Swedish), but on the latency axis, the one being raced, it's still a loss.

So on all four axes (lookup speed, size, correction latency, autocomplete
latency) a specialist wins on its home turf. Hence the title.

## The one place it doesn't lose: doing all of it from one file

Here's the part the per-axis tables hide. Every alternative above does *one* job
(boomphf, symspell, pruning-trie) or *two* (fst: lookup + correction). Picking
specialists means assembling three or four structures, three or four files, three
or four load paths, and `HashMap`/symspell can't be memory-mapped at all, so they
rebuild at startup.

wordtree folds all three jobs into one structure that loads by `mmap` with no
parse or build step, and returns a deliberately short, frequency-ranked,
single-edit-tolerant list. On correction quality it matches symspell:

<!-- scroll: width 48rem -->

| correction recall by edit kind (en) | substitute | transpose | delete | insert |
| ----------------------------------- | ---------: | --------: | -----: | -----: |
| wordtree                            |       100% |      100% |   100% |   100% |
| symspell                            |       100% |      100% |   100% |   100% |
| fst-lev                             |       100% |    **0%** |   100% |   100% |

(fst's `Levenshtein` is plain Levenshtein: a transposition costs 2, so it misses
every transposed typo at distance 1.) By default wordtree returns a small
frequency-capped top-k rather than the exhaustive DL≤1 set symspell gives you,
the right trade for an as-you-type box. For a batch spell-checker,
`corrections_with(q, f, Caps::uniform(n))` lifts the cap and returns the complete
set, at 100% of the brute-force oracle.

## When to use it (and when not)

- Need **only one** of these jobs, or the lowest latency, or the smallest file?
  Use the specialist. fst for lookup + fuzzy in minimal space; symspell for
  exhaustive correction; pruning_radix_trie for pure autocomplete; a `HashMap`
  for raw lookup speed.
- Need a **browsable index + frequency + typo-tolerant autocomplete from one
  mmap-able file**, with a short ranked suggestion list and no startup cost? Then
  one 21 MiB file you `mmap` and query three ways is a reasonable single
  dependency, which is the spot wordtree was built for.

The repo is a snapshot extracted from a private project to accompany this
post, not a crate I'm asking you to depend on. But the comparison harness is real
and reproducible, the edit-distance walk is worth reading, and the lesson is one
I keep relearning: benchmark against the specialists, expect to lose, and find
out whether the thing you're actually optimising for (here, three jobs in one
zero-copy file) is even on the axis you're measuring. Usually it isn't.

---

*Reproduce everything:*

```sh
cargo run -p comparisons --bin quality --release   # quality tables
cargo run -p comparisons --bin size    --release   # size + RAM
cargo bench -p comparisons                         # latency
cargo test  -p comparisons                         # correctness gate
```

*Numbers are from one Apple M-series machine; treat them as ratios, not
absolutes. Word lists are derived from PanLex and Wiktionary (en 638,545 words,
sv 113,220).*

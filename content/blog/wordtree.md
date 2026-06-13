+++
title = "One trie, three jobs, zero benchmarks won"
date = 2026-06-06
[taxonomies]
tags = ["rust", "data-structures"]
[extra]
# Inline SVG figures inflate Zola's word_count (it counts rendered markup), which
# would skew read-time. This is the true prose count; remove it to fall back to auto.
words = 2576
+++

I just open-sourced [wordtree](https://github.com/akesson/wordtree), a compact
trie for word lists. Before I tell you what it does, here is what it is *not*: it
is not the fastest at anything. I benchmarked it against a specialist crate for
each job it does, and on every head-to-head axis a specialist beat it. Exact
lookup is slower than a `HashMap`. The file is three times larger than an FST.
Spelling correction is an order of magnitude slower than symspell.

I shipped it anyway, and I'd reach for it again. This post is about why a data
structure that loses every micro-benchmark can still be the right dependency —
and about the two genuinely fun pieces of engineering inside it: an
edit-distance computation that rides *down the trie* in a fixed three-byte
window, and an 8-byte node that pushes everything else off to the side.

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
nothing does is all three from *one* structure — and, crucially, from one file
that loads with zero parsing. That last constraint is the whole story, so let me
start there.

## The structure: 8 bytes a node, and not a byte more

The tree is a width-first array of fixed-size nodes: a node is immediately
followed by all its siblings, so "next sibling" is just the next slot and "first
child" is one 24-bit offset.

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

| field                  | bits | role                                                       |
| ---------------------- | ---- | ---------------------------------------------------------- |
| `first_child_pos`      | 24   | relative position of the first child                       |
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
`ArchivedTree` is queried directly out of an `mmap` — no parse, no rebuild, no
pointer fix-up. Loading a 21 MiB English dictionary is an `mmap` call. For
English, `live heap == serialized == 21.11 MiB`: the bytes you store are the bytes
you query.

That `max_child_percentile` field earns its 10 inline bits because it is read on
*every* node during a suggestion walk. It records the highest word frequency
anywhere in the subtree below a node, which is exactly the lower bound a
[pruning-radix-trie](https://towardsdatascience.com/the-pruning-radix-trie-a-radix-trie-on-steroids-412807f77abc)
(Wolf Garbe's design, which wordtree's pruning is modelled on) needs: if a
subtree's best possible frequency can't beat the current top-k, skip the whole
subtree. Top-k autocomplete then touches a tiny fraction of the tree.

### Pushing the sparse data off-node

Here is the first optimisation I'm happy with. A word needs two more values: its
frequency (`percentile`, 0–1000) and the 24-bit index of its expression. But only
~28% of nodes actually *end* a word — the rest are interior characters. Storing
those 5 bytes inline would waste them on roughly three out of four nodes.

So they live in side tables instead, all part of the same zero-copy image:

| table        | size                 | role                                              |
| ------------ | -------------------- | ------------------------------------------------- |
| `word_bits`  | 1 bit / node         | is this node the end of a word?                   |
| `rank_index` | 1 × u32 / 64 nodes   | cumulative word count → `rank(node)` in O(1)      |
| `values`     | 5 bytes / **word**   | the `(percentile, expr_index)` pair               |

The trick is the classic succinct-structure move: a word node at position `i`
finds its value at `values[rank(i)]`, where `rank(i)` is the number of word-nodes
before it. The `word_bits` bitvector plus the cumulative `rank_index` answer that
rank query in O(1) — popcount the partial 64-bit word, add the precomputed prefix
sum. The bit probe sits on the hot descent path; the rank query only fires when a
value is actually consumed (an exact lookup, or a suggestion you decided to keep).

Moving those 5 bytes off-node took the node from 12 bytes to 8, which on English
trimmed the structure from ~26.5 MiB to ~21.1 MiB — about 20% — with no loss of
function. It also made exact lookup ~10–20% *faster*, because more siblings now
fit in a cache line and `index_of` scans siblings linearly. Smaller and faster
from the same change is rare enough to enjoy.

## The fun part: edit distance that rides down the trie

The third job is the interesting one. How do you find every word within
Damerau-Levenshtein distance 1 of a typo, frequency-ranked, without scanning the
dictionary? (A brute-force DL≤1 scan over English takes ~90 ms — far too slow for
as-you-type.)

The answer is to compute the edit distance *incrementally as you walk the trie*.
Each node carries one dynamic-programming row recording the edit distance between
the query and the word spelled by the path from the root to that node. The row at
a node is computed from its parent's row (and, for transposition, its
grandparent's). Conceptually, for a query of length `n`, the row holds

```
row[j] = edit_distance(query[0..j], word spelled to this node)
```

and two quantities drive everything:

- `row[n]` is the distance from the *whole* query to this node's word. If the node
  ends a word and `row[n] ≤ K`, it's a correction.
- `min(row)` is the distance to the closest *prefix* — a lower bound on every word
  in the subtree below. Once `min(row) > K`, the entire subtree is pruned.

So the walk descends at most `K` levels past the query length and, in practice,
visits ~2–3% of the tree. One traversal does autocomplete and correction at the
same time.

### The bug that made me rewrite it

I didn't start here. The first version used a hand-rolled 4-window state machine
that tracked a few edit positions as it descended. It looked fine. It passed my
hand-written tests. It was wrong.

What exposed it was building the comparison harness — specifically, a recall
table broken down by edit *kind*. Substitution and transposition: fine.
Deletion: ~6–10% recall. Insertion: **0%**. The state machine, run over a
*branching* trie rather than a single string, mis-scored mid-word insertions and
deletions and pruned the correct word away before it was ever reached. My
autocomplete had been silently dropping every insertion typo and I had no idea
until a table told me. That is the entire argument for building the benchmark
harness, in one anecdote.

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

<figure>
<svg viewBox="0 0 620 440" role="img" aria-label="A dynamic-programming grid of query index against trie depth. Only the three-cell diagonal band, where the absolute difference of j and depth is at most K equals one, is computed and stored as a u8 array of length three. All cells outside the band are guaranteed greater than K and are never visited." style="display:block;margin:0 auto;width:100%;height:auto;max-width:640px;font-family:inherit">
<title>The diagonal band: three cells per row</title>
<text x="281" y="38" text-anchor="middle" fill="currentColor" font-size="13" opacity="0.7">query index  j →</text>
<g text-anchor="middle" fill="currentColor" font-size="12" opacity="0.6">
<text x="143" y="60">0</text><text x="189" y="60">1</text><text x="235" y="60">2</text><text x="281" y="60">3</text><text x="327" y="60">4</text><text x="373" y="60">5</text><text x="419" y="60">6</text>
</g>
<text x="92" y="231" text-anchor="middle" fill="currentColor" font-size="13" opacity="0.7" transform="rotate(-90 92 231)">trie depth  d ↓</text>
<g text-anchor="end" fill="currentColor" font-size="12" opacity="0.6">
<text x="108" y="101">0</text><text x="108" y="147">1</text><text x="108" y="193">2</text><text x="108" y="239">3</text><text x="108" y="285">4</text><text x="108" y="331">5</text><text x="108" y="377">6</text>
</g>
<g fill="var(--accent,#91bce6)" fill-opacity="0.12">
<rect x="166" y="70" width="46" height="46"/>
<rect x="120" y="116" width="46" height="46"/><rect x="212" y="116" width="46" height="46"/>
<rect x="166" y="162" width="46" height="46"/><rect x="258" y="162" width="46" height="46"/>
<rect x="212" y="208" width="46" height="46"/><rect x="304" y="208" width="46" height="46"/>
<rect x="258" y="254" width="46" height="46"/><rect x="350" y="254" width="46" height="46"/>
<rect x="304" y="300" width="46" height="46"/><rect x="396" y="300" width="46" height="46"/>
<rect x="350" y="346" width="46" height="46"/>
</g>
<g fill="var(--accent,#91bce6)" fill-opacity="0.28">
<rect x="120" y="70" width="46" height="46"/><rect x="166" y="116" width="46" height="46"/><rect x="212" y="162" width="46" height="46"/><rect x="258" y="208" width="46" height="46"/><rect x="304" y="254" width="46" height="46"/><rect x="350" y="300" width="46" height="46"/><rect x="396" y="346" width="46" height="46"/>
</g>
<g stroke="currentColor" stroke-opacity="0.13" fill="none">
<line x1="120" y1="70" x2="442" y2="70"/><line x1="120" y1="116" x2="442" y2="116"/><line x1="120" y1="162" x2="442" y2="162"/><line x1="120" y1="208" x2="442" y2="208"/><line x1="120" y1="254" x2="442" y2="254"/><line x1="120" y1="300" x2="442" y2="300"/><line x1="120" y1="346" x2="442" y2="346"/><line x1="120" y1="392" x2="442" y2="392"/>
<line x1="120" y1="70" x2="120" y2="392"/><line x1="166" y1="70" x2="166" y2="392"/><line x1="212" y1="70" x2="212" y2="392"/><line x1="258" y1="70" x2="258" y2="392"/><line x1="304" y1="70" x2="304" y2="392"/><line x1="350" y1="70" x2="350" y2="392"/><line x1="396" y1="70" x2="396" y2="392"/><line x1="442" y1="70" x2="442" y2="392"/>
</g>
<line x1="143" y1="93" x2="419" y2="369" stroke="var(--accent,#91bce6)" stroke-opacity="0.5" stroke-width="1.5" stroke-dasharray="3 4"/>
<rect x="212" y="208" width="138" height="46" rx="4" fill="none" stroke="var(--accent,#91bce6)" stroke-width="1.6"/>
<g text-anchor="middle" fill="var(--accent,#91bce6)" font-size="13" font-family="monospace">
<text x="235" y="236">0</text><text x="281" y="236">1</text><text x="327" y="236">2</text>
</g>
<line x1="350" y1="231" x2="430" y2="231" stroke="var(--accent,#91bce6)" stroke-opacity="0.6"/>
<text x="436" y="228" fill="currentColor" font-size="12" font-family="monospace" opacity="0.85">[u8; 3]</text>
<text x="436" y="244" fill="currentColor" font-size="12" opacity="0.6">one band row</text>
<text x="128" y="286" fill="currentColor" font-size="12" opacity="0.7">out of band</text>
<text x="128" y="303" fill="currentColor" font-size="12" font-family="monospace" opacity="0.7">|j − d| &gt; K</text>
<text x="281" y="422" text-anchor="middle" fill="currentColor" font-size="12" opacity="0.65">only the 2K + 1 = 3 band cells per row are computed</text>
</svg>
<p>For a query of length <em>n</em>, a full row would cost <em>O(n)</em> per node. But any cell with <code>|j − depth| &gt; K</code> is already <code>&gt; K</code>, so only the <code>2K + 1</code> band cells can change a keep-or-prune decision — three at <code>K = 1</code>, carried as a <code>[u8; 3]</code> that rides the diagonal.</p>
</figure>

Shifting to band-local coordinates turns every DP neighbour into a *constant*
offset, so the recurrence carries no per-cell column arithmetic at all:

```
cur[o] = min(prev[o+1] + 1,     // deletion       (word longer than query)
             prev[o]   + cost,   // match / substitution
             cur[o-1]  + 1,      // insertion      (word shorter than query)
             pp[o]     + 1)      // transposition  (grandparent row)
```

By Ukkonen's banding argument, the optimal alignment to any cell whose true
distance is ≤ K stays inside the band. So every value the search actually acts on
is computed exactly, and **the kept corrections, their order, and the exact set of
visited nodes are bit-identical to a full-row walk.** Out-of-band cells may be
over-estimated, but they stay `> K`, so no keep/prune decision changes. Banding
changes only the per-node cost — O(K) instead of O(n) — which is why longer
queries gain the most: a 14-character fuzzy query runs ~80% faster than the
full-row walk; short typos roughly halve.

(One Rust wrinkle worth a footnote: stable Rust can't size `[u8; 2*K + 1]` from a
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

**Exact lookup (nanoseconds).** `wordtree` is the slowest of the bunch — it
linearly scans each node's siblings.

| case (en)            | wordtree | fst  | boomphf | hashmap  |
| -------------------- | -------: | ---: | ------: | -------: |
| short `on`           |     72.0 | 15.3 |    13.5 | **7.5**  |
| long `alphanumerical`|    108.9 | 94.4 |    25.7 | **8.6**  |

`HashMap` wins outright at ~8 ns, flat. wordtree is ~8–13× slower. All are tens
of nanoseconds in absolute terms — fine — but exact lookup is not a reason to pick
wordtree.

**Size.** The FST is the clear winner: it minimises shared prefixes *and*
suffixes (DAWG-like), doing exact lookup *and* spelling correction in ~3× less
space than wordtree does anything.

| engine (en)  | live heap | serialized |
| ------------ | --------: | ---------: |
| fst          |  10.0 MiB |   6.7 MiB  |
| **wordtree** | 21.1 MiB  | 21.1 MiB   |
| sorted-vec   | 25.1 MiB  |     —      |
| boomphf      | 33.9 MiB  |     —      |
| hashmap      | 38.7 MiB  |     —      |
| symspell     | 300.4 MiB |     —      |

So the honest framing: wordtree is the **smallest of the naive key-storing
structures**, but still ~3× *larger* than an FSA. Its "size-optimised" claim holds
against a naive trie, not against fst. (And one more honesty note: wordtree's
*build* peaks at ~224 MiB to produce 21 MiB — ~11× — which matters if you generate
trees on a constrained device.)

**Spelling correction.** symspell is in another league on latency.

| case (en)      | wordtree | symspell  | fst-lev | brute force |
| -------------- | -------: | --------: | ------: | ----------: |
| sub `abxut`    |  44.0 µs | **1.4 µs**| 122.6 µs|   95.1 ms   |
| del `abut`     |  48.7 µs | **8.0 µs**| 124.3 µs|   86.4 ms   |

symspell does a handful of hash lookups against a precomputed delete-dictionary;
wordtree walks the trie. It's ~25–31× slower than symspell. (It is ~2.5–3.2×
*faster* than fst's Levenshtein automaton, and corrects transpositions that
fst misses entirely — but symspell is the one to beat, and it wins.)

**Autocomplete.** Closest race. The combined `suggestions()` call runs the
edit-distance walk every time, so it's the wrong thing to race against a pure
completer (~43 µs). The autocomplete-only `completions()` call skips the walk:

| case (en)   | wordtree `completions()` | pruning-trie |
| ----------- | -----------------------: | -----------: |
| `co`        |                   2.5 µs |  **1.2 µs**  |

Within ~2× on English, ~1.2× on Swedish. The pruning trie also tracks the
frequency oracle a bit better (recall@5 93% vs 85% on Swedish). Close, but still
a loss.

So: across the four jobs, on each job's home axis, a specialist wins. The title
isn't false modesty.

## The one place it doesn't lose: doing all of it from one file

Here's the part the per-axis tables hide. Every alternative above does *one* job
(boomphf, symspell, pruning-trie) or *two* (fst: lookup + correction). Picking
specialists means assembling three or four structures, three or four files, three
or four load paths — and `HashMap`/symspell can't be memory-mapped at all, so they
rebuild at startup.

wordtree folds all three jobs into one structure that loads by `mmap` with no
parse or build step, and returns a deliberately short, frequency-ranked,
single-edit-tolerant list. It even matches symspell's *quality* where it counts:

| correction recall by edit kind (en) | substitute | transpose | delete | insert |
| ----------------------------------- | ---------: | --------: | -----: | -----: |
| wordtree                            |       100% |      100% |   100% |   100% |
| symspell                            |       100% |      100% |   100% |   100% |
| fst-lev                             |       100% |    **0%** |   100% |   100% |

(fst's `Levenshtein` is plain Levenshtein — a transposition costs 2, so it misses
every transposed typo at distance 1.) wordtree returns a small frequency-capped
top-k rather than the exhaustive DL≤1 set symspell gives you, which is the right
trade for an as-you-type box and the wrong one for a batch spell-checker.

## When to use it (and when not)

I'll be blunt, because the benchmarks are:

- Need **just one** of these jobs, or the lowest latency, or the smallest file?
  Use the specialist. fst for lookup + fuzzy in minimal space; symspell for
  exhaustive correction; pruning_radix_trie for pure autocomplete; a `HashMap`
  for raw lookup speed.
- Need a **browsable index + frequency + typo-tolerant autocomplete from one
  mmap-able file**, with a short ranked suggestion list and no startup cost? Then
  one 21 MiB file you `mmap` and query three ways is a reasonable single
  dependency — which is exactly the spot wordtree was built for.

The repo is an unmaintained showcase — a snapshot extracted to accompany this
post, not a crate I'm asking you to depend on. But the comparison harness is real
and reproducible, the edit-distance walk is genuinely nice, and the broader lesson
is the one I keep relearning: **benchmark against the specialists, expect to lose,
and find out whether the thing you're actually optimising for — here, three jobs
in one zero-copy file — is even on the axis you're measuring.** Usually it isn't.

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

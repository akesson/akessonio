+++
title = "One trie, three jobs, zero benchmarks won"
date = 2026-06-06
[taxonomies]
tags = ["rust", "data-structures"]
[extra]
toc = true
+++

I just open-sourced [`wordtree`](https://github.com/akesson/wordtree), a compact
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
[`comparisons/REPORT.md`](https://github.com/akesson/wordtree/blob/main/comparisons/REPORT.md), regenerable with four `cargo`
commands against the word lists bundled in the repo.

## Three jobs

`wordtree` came out of a translation app that needed three things from one big
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
child" is one 24-bit offset. Each node is exactly 8 bytes:

| field                  | bits | role                                                       |
| ---------------------- | ---- | ---------------------------------------------------------- |
| `first_child_pos`      | 24   | relative position of the first child                       |
| `node_char`            | 24   | UTF-32 codepoint (low 3 bytes)                             |
| `is_folder`            | 1    | drives the browsable index                                 |
| `is_last_sibling`      | 1    | terminates a sibling run                                   |
| `max_child_percentile` | 10   | best frequency in the subtree — drives top-k pruning       |
| (spare)                | 4    |                                                            |

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

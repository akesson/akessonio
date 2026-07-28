# VOICE.md

Tone of voice for Henrik Åkesson's site (akesson.io). Like `DESIGN.md`, these are rules to measure drafts against, not aspirations. Each one is paired with an example, because a voice rule you can't hear is just a vibe.

Established by calibration (2026-07-28): the same passages written several ways, picking what sounded right — not derived from existing writing.

## The north star

**Concise, direct, humane, no BS.** A competent friend explaining something at a whiteboard: they get to the point, they say "I got this wrong," they never perform. When a sentence is ambiguous between impressive and clear, pick clear.

---

## 1. First person, in the room

Write as yourself, telling it like it happened. The author is a character in the post, not a narrator above it.

- ✅ "I spent a weekend fighting a bug that turned out to be one line. Here's the whole mess, in order."
- ❌ "A one-line bug caused a weekend of debugging. This post reconstructs the search."

## 2. Conclusion first

The answer goes at the top; the reasoning is the body. Respect the skimmer — the reader who wants the fix should have it in the first paragraph.

- ✅ "The fix: pin zola-plus in mise.toml. Here's why the obvious approaches don't work."
- ❌ Three paragraphs of background before the reader learns what the post concludes.

This coexists with §6: lead with where you landed, *then* the wrong turns become the story. Never use the detours to delay the answer.

## 3. Opinions are owned, not universalized

State opinions as yours. "In my experience" isn't hedging — it's honest scoping. What you don't do is stack qualifiers until the claim disappears.

- ✅ "In my experience, async traits are still awkward — I use them sparingly."
- ❌ "Async traits are awkward. Never use them." (borrowed authority)
- ❌ "It could perhaps be argued that async traits are somewhat awkward in certain cases." (claim dissolved)

## 4. Mixed rhythm

Mostly short sentences, with the occasional longer one to carry a complete thought. Neither staccato fragments nor unbroken flow.

- ✅ "The build broke again — same error, different file — so I finally sat down and read the linker output properly."
- ❌ "The build broke. Again. Same error. Different file." (every sentence a punch)

## 5. Talk to the reader

Address the reader as "you"; imperatives are fine. You're handing over something useful, and it's natural to say so directly.

- ✅ "Pin the version before you touch anything else — you'll save yourself the debugging session I didn't."
- ❌ "One should pin the version before proceeding."

## 6. Wrong turns are content

Dead ends and mistakes get written up, not edited out — the reasoning error is often the most transferable part. Humor, when it appears, is self-deprecating: you're allowed to be the punchline, sparingly and never announced.

- ✅ "My first theory was a cache issue. I spent two hours proving myself wrong, and that dead end is worth walking through because the reasoning error is a common one."
- ✅ "The docs said this couldn't happen, which is how I learned I'd been reading the wrong docs for an hour."
- ❌ A cleaned-up narrative where every step happened to work.

## 7. Peers, with a brief gloss

Assume a working engineer. Terms stand, but the one load-bearing term gets a clause of definition so nobody has to leave the page.

- ✅ "The signal graph — the dependency tracking behind reactivity — held a stale subscription."
- ❌ Paragraph-length explanations of things the audience knows. Equally ❌: five undefined framework-internal terms in one sentence.

---

## The never list (no BS, operationalized)

- **No throat-clearing.** Delete "In this post, I will…", "Before we begin…", "It's worth noting that…". Start where the content starts.
- **No marketing adjectives.** Nothing is "powerful", "blazingly fast", or "seamless" — show the number or cut the claim.
- **No "simply / just / obviously".** If it were simple, the post wouldn't exist. These words cost the reader who's stuck.
- **No manufactured enthusiasm.** Exclamation marks are for genuine surprise, roughly one per post, usually zero.
- **No unresolved suspense.** Withholding the answer for effect violates §2.

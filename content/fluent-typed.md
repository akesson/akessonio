+++
title = "If it builds, it works (and it's translated)"
date = 2026-11-08
description = "fluent-typed turns Fluent translations into typed Rust functions, so a missing translation or a misspelled key fails the build. What that guarantees, and what it doesn't."
+++

*"Translated" here means every message your code calls exists in every
language, with the variables your code passes. It doesn't mean the translation
is any good. The compiler can't read French.*

*I created fluent-typed in 2024 and have maintained it since. Recently I have used some AI assistance, but with great care and attention to quality. This
article had AI assistance as well. The design and opinions are mine.*

[fluent-typed](https://github.com/akesson/fluent-typed) is a build-time code
generator for [Fluent](https://projectfluent.org) translations. It turns every
message into a typed Rust method. Once your strings are methods, the compiler
checks them the same way it checks the rest of your code. A misspelled key, a
wrong argument type, or a message that one language forgot to translate fails
the build. A message nobody calls any more becomes a dead-code warning.

## Why I built it

I try to push "if it builds, it works" as far as it goes, with as much as
possible checked at build time. Two things mattered most to me: finding
translation strings nobody uses any more, and guaranteeing that a
translation is complete, so a French user never silently gets English.

## The problem with string keys

Plain Fluent looks messages up by string at runtime:

```rust
let msg = bundle.get_message("helo"); // None, at runtime, in production
```

Rust's "if it builds, it works" has never been a literal promise. What it means
in practice is that whole classes of mistakes can't reach a running program.
String keys opt your translations out of that. The typo above compiles, ships,
and shows up as a blank label or a fallback string in whichever language nobody
tested.

## How it works

You write messages in `.ftl` files, one folder per language:

```ftl
# locales/en/main.ftl
# $name (String) - the user's name
hello = Hello { $name }

unread-messages = { $count ->
    [one] You have one message
   *[other] You have { $count } messages
}
```

One call in `build.rs` reads `locales/`, and writes `src/l10n.rs` with a method
per message:

```rust
// build.rs
use fluent_typed::{build_from_locales_folder, BuildOptions};

fn main() -> std::process::ExitCode {
    build_from_locales_folder(BuildOptions::default())
}
```

The generated method for `hello` looks like this:

```rust
pub fn msg_hello<F0: AsRef<str>>(&self, name: F0) -> String
```

The argument type comes from the `(String)` comment. `$count` becomes a number
without a comment, because it selects between plural variants. In your code it
reads like any other method call:

```rust
let strs = L10n::Fr.load();
strs.msg_hello("Sam");        // "Bonjour Sam"
strs.msg_unread_messages(3);  // "Vous avez 3 messages"
```

The real strings have Unicode isolation marks around `Sam` and `3`, so a
right-to-left name can't scramble the sentence around it. You can turn that off.

The generated file is plain Rust that you commit. You can read it, and your
editor gives you autocomplete and go-to-definition on every message.

## What the build catches

**A typo in the key.** It's a method that doesn't exist, so it's an ordinary
compile error, and rustc suggests the right name:

```text
error[E0599]: no method named `msg_chekout` found for struct `L10nLanguage`
help: there is a method `msg_checkout` with a similar name
```

**The wrong argument type.** `$name` is a `String`, so passing a number fails:

```text
error[E0277]: the trait bound `{integer}: AsRef<str>` is not satisfied
  |     strs.msg_hello(42)
```

**A message missing in one language.** This is the "and it's translated" part.
fluent-typed generates a method only for a message that exists in *every*
locale. Delete `checkout` from the French file and the method disappears, so
every call to it stops compiling. The build script tells you why, with the file
and line:

```text
warning: locales/en/main.ftl:9: message 'checkout' is not generated
  — it is missing from locale(s): fr
error[E0599]: no method named `msg_checkout` found for struct `L10nLanguage`
```

**A translation that uses the wrong variable.** If the French message says
`{ $nom }` where English says `{ $name }`, the message isn't generated either.
The warning points at the French line:

```text
warning: locales/fr/main.ftl:1: message 'hello' is not generated
  — the 'fr' translation uses $nom, which the default locale's
  message (locales/en/main.ftl:2) doesn't have, so the accessor
  never passes it
```

**A message you no longer use.** The generated methods are ordinary code, so
rustc's dead-code lint finds the stale ones:

```text
warning: method `msg_checkout` is never used
```

This only works if the generated module isn't part of your crate's public API.
A public method always counts as used.

## Links inside a sentence

Some strings need a link or an icon in the middle. Splitting the sentence into
three messages breaks as soon as a language puts the link somewhere else. In
fluent-typed you mark a term or variable as `(Element)`:

```ftl
# locales/en/main.ftl
# $count (Number) - how many messages were deleted
# -privacy-link (Element) - link text the app wraps in a link
deleted = { $count } messages deleted, see { -privacy-link }.
-privacy-link = our privacy policy

# locales/fr/main.ftl
deleted = Voir { -privacy-link } : { $count } messages supprimés.
-privacy-link = notre politique de confidentialité
```

The method returns a struct instead of a `String`, with the translated text
split at the element:

```rust
pub struct Deleted {
    pub s0: String,
    pub privacy_link: String,
    pub s1: String,
}

let d = strs.msg_deleted(3);
format!(r#"{}<a href="/privacy">{}</a>{}"#, d.s0, d.privacy_link, d.s1)
```

In English the link ends the sentence and in French it comes first, with the
same rendering code. Plurals and variables are already resolved inside the
pieces.

The elements are part of the check. If the French translation drops the link,
the method isn't generated:

```text
warning: locales/fr/main.ftl:10: message 'deleted' is not generated
  — the 'fr' translation has the (Element) markers [], but the
  default locale's message (locales/en/main.ftl:13) has
  [-privacy-link] in that order
```

There's one limit. With two or more elements, every language has to use them
in the same order. A French translation that swaps two links is rejected the
same way.

## What it doesn't catch

- **Translation quality.** If the French file says `checkout = Checkout`, it
  builds. Copying the English text into another language passes every check.
- **Types in other languages.** Argument types come from the default locale's
  comments only. Translators never have to write them, and other locales only
  need the same variable *names*.
- **Untyped variables.** A variable with no type comment, no `NUMBER()` and no
  plural selector accepts any string or number. `LintLevel::Strict` in
  `build.rs` makes that a build error.

There's a linter for mistakes in the type comments themselves, such as
`(Numbr)` or a comment for a variable the message doesn't use. By default
those are cargo warnings. Mistakes in non-default locales stay warnings at every
level, because those files belong to translators and shouldn't break your build.

## Translations the build never saw

Sometimes the `.ftl` arrives after the binary: a language added after release,
a translator's file in CI, or hot reloading while you work on copy. For those,
`L10nLanguage::new_external` checks the file against the message list compiled
into your binary before it loads it:

```rust
let bytes = std::fs::read("locales/pl.ftl")?;
let pl = L10nLanguage::new_external("pl", bytes)?;
pl.msg_hello("Ala");
```

A file with a missing message, a wrong variable name or a broken reference is
rejected with an error listing every problem, instead of panicking later inside
a method. Here's a Polish file with one message and the wrong variable:

```text
The .ftl content does not satisfy the compiled message contract:
  message 'hello' references unknown variable '$nom'
  message 'unread-messages' is missing
  message 'checkout' is missing
```

It's the same code that checks each locale at build time. It can't
check argument types at runtime, and doesn't need to, because the method
signatures already fixed what your code passes.

## Compared to `fl!`

[`i18n-embed-fl`](https://crates.io/crates/i18n-embed-fl)'s `fl!` macro checks
message ids and argument names, but only against the fallback language. In a
small demo, a message missing from the French file compiled and showed English
text. A wrong variable name compiled and printed `Bonjour {$nom}` as literal
text. `fl!` also returns a plain `String`, so it has no equivalent of
`(Element)`. In return, it needs no build script and has a much larger user base.

## Try it

The [README](https://github.com/akesson/fluent-typed) covers setup, and the
guides cover embedding or compressing translations, loading one language at a
time in a WASM client, picking a language from an `Accept-Language` header, and
putting links or icons in the middle of a sentence. The minimum Rust version is
1.88. It's pre-1.0, so read the changelog before upgrading.

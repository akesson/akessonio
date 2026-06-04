+++
title="cargo-leptos"
description="[released] The Leptos official build tool with parallel building of the server binary and the WASM frontend."
date = 2018-09-29T11:36:33+08:00
draft = false
template = "opensource_page.html"
[extra]
toc=true
+++

[GitHub](https://github.com/leptos-rs/cargo-leptos), [Crates](https://crates.io/crates/cargo-leptos)

Status: Released and currently refactored to improve Path handling.

cargo-leptos was created and is being maintained and developed by the founder of Human Solutions.
It is part of the [leptos-rs](https://github.com/leptos-rs) GitHub organisation.

Refactorings:

- Path handling, especially on Windows is a major source of bugs and limitations.
  Will use [x-path](/opensource/xpath) to solve those issues.
- Remove reliance on changing the current working directory, which is a global
  environment variable and thus creates problems for testing.

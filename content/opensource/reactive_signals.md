+++
title="reactive-signals"
description="[preview] Highly performant reactive signals in scopes organised in a tree structure."
date = 2018-09-29T11:36:33+08:00
draft = false
template = "opensource_page.html"
[extra]
toc=true
+++

[GitHub](https://github.com/human-solutions/reactive-signals) [crates.io](https://crates.io/crates/reactive-signals) [docs.rs](https://docs.rs/reactive-signals)

reactive-signals is a dx-first scope-based fine-grained reactive system. It is based on the excellent ideas in leptos_reactive
but is written from scratch to provide the simplest API and mental model possible for developers. See [docs.rs](https://docs.rs/reactive-signals)
for much more information.

Status: [fund raising](https://opencollective.com/human-solutions/projects/reactive-signals) for achieving a production-level featureset and quality:

- [attached data](https://docs.rs/reactive-signals/0.1.0-alpha.3/reactive_signals/struct.Scope.html#typed-attached-data) for Scopes
- [async signals](https://docs.rs/reactive-signals/0.1.0-alpha.3/reactive_signals/macro.signal.html#example-of-async-functional-reactive-signals)
- full test-coverage
- push-pull updates
- tokio tracing instrumentation

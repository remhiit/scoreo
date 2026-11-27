---
title: Synchronous XHR for Google Drive calls
decision: GoogleDriveClient uses XMLHttpRequest in synchronous mode, keeping the MVI handlers synchronous and avoiding a coroutine runtime.
status: Superseded by ADR-0011
date: 2026-06-23
sources: commit c43ccc4
---

## Context

In the Kotlin/JS app, asynchronous calls required `kotlinx-coroutines-core-js` and `suspend`
handlers. Drive calls were fast (under 500 ms) and few.

## Decision

`GoogleDriveClient` calls `XMLHttpRequest.open(method, url, false)`: linear control flow, no
callbacks or Promise chains, synchronous handlers. Accepted limits: deprecated (console warning),
blocks the main thread during a call, not usable from a Web Worker. Planned exit: move to
`window.fetch()` + coroutines once latency became a problem.

## Consequences

- Superseded the same day by ADR-0011 (asynchronous `fetch`).

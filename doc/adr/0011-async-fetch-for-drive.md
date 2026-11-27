---
title: fetch + async/await for Google Drive
decision: GoogleDriveClient uses window.fetch with native async/await, and every CloudSyncRepository method returns a Promise.
status: Accepted
date: 2026-06-23
supersedes: ADR-0010
sources: commit ea28f02 (Kotlin coroutines); commit 1e8de5b, PR #50 (native async/await)
---

## Context

Synchronous XHR (ADR-0010) froze the UI during network calls and is deprecated by browsers.

## Decision

- `GoogleDriveClient` wraps Drive REST calls with `window.fetch()`; no third-party HTTP library.
- `CloudSyncRepository` (port): every method returns a `Promise`; `SyncUseCase` has an `async`
  method per operation.
- The UI stays a plain component: the async work lives in the reducer module's `submit*` helpers,
  which call the use case and dispatch the result.
- Drive v3 splits its API across two base URLs: metadata calls on
  `https://www.googleapis.com/drive/v3/files`, any request carrying file content on
  `https://www.googleapis.com/upload/drive/v3/files`.

## Consequences

- No main-thread blocking, standard browser APIs only.
- After the React rewrite, native `Promise`/`async`/`await` replaced Kotlin coroutines; no runtime
  needed.

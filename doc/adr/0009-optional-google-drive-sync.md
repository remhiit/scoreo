---
title: Optional cloud sync through Google Drive
decision: Cloud sync is an optional adapter that stores a single scoreo-data.json in the user's Drive App Data folder; without an OAuth client id the app runs without sync.
status: Accepted
date: 2026-06-16
sources: commit 52cef57 (origin of the decision not found beyond it)
---

## Context

Local-first storage (ADR-0003) loses everything with the device and cannot be shared between a
phone and a laptop. There is no backend to sync through.

## Decision

- A `CloudSyncRepository` port, implemented by `GoogleDriveSyncAdapter` (`infrastructure/google/`),
  using the Drive v3 REST API and Google Identity Services' OAuth Token Model.
- One file, `scoreo-data.json`, in the invisible App Data folder (`appDataFolder`): players, game
  types and matches. Sync compares data by content.
- Sync is optional: the sync use case is `undefined` whenever no Google OAuth client id is
  configured (`VITE_GOOGLE_CLIENT_ID`), and the app runs fully without it.

## Consequences

- Several app versions may read the same data through Drive: backward compatibility and the
  coexistence of versions are part of every schema change (ADR-0004).
- Later refinements: debounced auto-sync after every local write (`AutoSyncCoordinator`,
  `DataChangeNotifier`), the token kept in memory (ADR-0018).

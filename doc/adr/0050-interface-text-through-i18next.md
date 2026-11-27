---
title: Interface text goes through i18next, English as the reference
decision: Every text a player reads in the host's components comes from the i18next dictionaries (en as the reference and fallback, fr with the same key shape) through t(), the language is persisted by i18n.ts alone, and domain, application and reducer code stays untranslated.
status: Accepted
date: 2026-11-27
sources: commit 97b9d5e, PR #276 (decision applied 2026-08-10); recorded here by issue #690
---

## Context

Internationalisation was introduced on 2026-08-10 (commit 97b9d5e, PR #276) and its rules were only
written in `doc/technical/architecture.md` § i18n. Issue #690 removes that file. Nothing in the code
or in a test stops a new component from hard-coding an English string, or a component from writing
the language to `localStorage` itself, so the rule had to survive as an ADR. It is dated the day it
is recorded, so that ADR numbers keep their date order; the decision itself is older.

## Decision

- Every text a player reads in a host component comes from the dictionaries,
  `apps/scoreo/src/i18n/locales/en.json` and `fr.json`, through `useTranslation()`'s `t()` (or
  `i18next.t()` outside a component). No visible string is hard-coded in JSX.
- `en` is the reference and the fallback; `fr` carries the same keys. A new key is added to both.
  Counts use i18next's plural forms (`_one`/`_other`), never string concatenation.
- The language is persisted only by `apps/scoreo/src/i18n/i18n.ts` (`scoreo_lang`, read first, then
  the browser's language, else `en`); a component changes it with `i18n.changeLanguage()` and never
  touches `localStorage` for it.
- Domain, application and reducer code stays framework-agnostic and untranslated (domain error
  messages, enum labels in `shared-domain`); the screen translates what it shows.
- A module's strings join Scoreo's i18next instance when its chunk loads (ADR-0031).

## Consequences

- A screen or component that adds visible text adds its keys to both dictionaries in the same PR.
- Adding a language is a new dictionary with the same key shape plus an entry in the language
  picker, with no change to the components.

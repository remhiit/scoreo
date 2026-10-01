# Scoreo design — Claude Design export (temporary reference)

The visual target the host screens are being moved onto, exported from Claude
Design on 2026-09-30. It is a **reference, not code**: the implementation is
[`packages/design-system/`](../../packages/design-system/README.md), and the host
screens compose it. Delete this folder once every screen has been migrated.

| File | What it shows |
|---|---|
| `Scoreo Atomic Design.dc.html` | Tokens → atoms → molecules → organisms → templates → pages, with the usage rule of each component |
| `Scoreo Screens.dc.html` | The 25 target screens, empty and populated states |
| `Scoreo Écrans × Atomic.dc.html` | Each screen decomposed into the components it uses, plus the reverse index |
| `design/tokens.css`, `design/components.js` | The prototype's own copy of the tokens and base components (identical tokens to `packages/design-system/src/tokens/`) |
| `support.js` | Runtime needed to open the `.dc.html` files in a browser |
| `github.md` | The export's link to this repository |

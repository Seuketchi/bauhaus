# design

## What it does

`design` is the method every visual job follows. It holds the stance, the list of generic defaults a piece must not fall into, the plan-then-check pass that catches a default before it is drawn, the rule that the project's own rules win, and a small checker that computes the numbers.

The checker, `check.mjs`, is a dependency-free Node script with eight commands: `contrast` computes the WCAG 2.2 ratio of two colours; `design` checks a project's `DESIGN.md`; `tokens` checks a token file and its modes; `document-css` writes the six document properties from it; `trends` checks the dated trends file; `brief` checks the brief for a piece; `email` lints an HTML email; `tells` runs the 29 rows of `TELLS.md` on a piece.

It also owns the rules for driving the three ArtCraft command-line apps (`ARTCRAFT.md`), the formats of `DESIGN.md`, the token file and the brief (`DESIGN-MD.md`), the tells (`TELLS.md`) and the trends (`TRENDS.md`).

## When to reach for it

- Before any visual piece: a brand, an email, a logo, an app or web screen. Read it, write the brief file and the token plan, and only then build.
- When a colour pair needs a number, not an opinion: `check.mjs contrast`.
- When a project needs a `DESIGN.md` or a token file checked, or a brand needs the six document properties for a PDF.
- When a finished piece must be checked for the banned defaults: `check.mjs tells`.
- When a trend is proposed: look it up in `TRENDS.md`. A trend is used only when the brief asks, and only when it is on trial.

Skip it for words alone (document text and email copy), which it leaves to whoever writes them.

## Common questions

**Whose rules win?** The project's own, then the brief, then `DESIGN.md`, then this method, then optional references. When a brief contradicts a project rule, the method stops, names the rule and the brief line, and asks the owner.

**What does a failing `tells` run mean?** Exit 1 means at least one default was found that the brief did not earn. Exit 2 means the brief cites fewer reference rows than it needs. Exit 3 means a check could not run, for example a render row with no render or a grid row with no grid in the brand data. A check that cannot run is a failure, never a pass. The first line is `PASS: no tells` or starts with `FAIL`.

**Can a brief keep a default?** Yes, by naming it under **Tells earned** with a reason. A tell named with no reason is refused.

**Why does the ratio not round up?** WCAG does not round up. A pair at 4.4999 is shown as 4.4999, never as 4.5, so a failing pair never reads as a pass.

**What about a colour in a wide-gamut space?** A ratio needs `srgb` components or a hex. A colour with neither says "cannot compute", and no ratio is guessed.

**Are the 29 checks proven?** No. Every row is `proposed, not run` until the checks have been run on real files and each false positive is fixed or listed.

## It's working if

- A `DESIGN.md` for a project passes `check.mjs design`, its token file passes `check.mjs tokens`, and every colour pair in it has a computed ratio at or above its threshold.
- A piece starts from a brief that passes `check.mjs brief` and cites at least three reference rows, or states a lower minimum with a reason.
- `check.mjs tells` on a finished piece gives `PASS: no tells`, with a render and the brand's data supplied, and exits 1 on a piece that carries a default the brief did not earn.
- No piece in the project falls into a ban in `TELLS.md` without a dated reason in the brief or in `DESIGN.md` under **Not to do**.
- The project's own rules were read first, and a conflict with the brief was named and not resolved silently.

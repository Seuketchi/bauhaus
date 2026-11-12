# design

## What it does

`design` is the method every visual job follows. It holds the stance, the list of generic defaults a piece must not fall into, the plan-then-check pass that catches a default before it is drawn, the rule that the project's own rules win, and a small checker that computes the numbers.

The checker, `check.mjs`, is a dependency-free Node script with these commands: `contrast` computes the WCAG 2.2 ratio of two colours (it exits 0 on a failing pair unless `--min` is passed); `design` checks a project's `DESIGN.md`; `tokens` checks a token file and its modes; `document-css` writes the six document properties from it; `trends` checks the dated trends file; `brief` checks the brief for a piece, which has eleven sections; `research` checks the research file for a piece; `email` lints an HTML email; `tells` runs the 29 rows of `TELLS.md` on a piece.

It also owns the intake, the five questions put to the owner once before a brief is written, the research step (`RESEARCH.md`), the rules for driving the command-line apps (`ARTCRAFT.md`), the formats of `DESIGN.md`, the token file and the brief (`DESIGN-MD.md`), the tells (`TELLS.md`) and the trends (`TRENDS.md`).

## When to reach for it

- Before any visual piece: a brand, an email, a logo, an app or web screen. Read it, run the intake when no complete brief exists, write the brief file and the token plan, and only then build.
- When a piece needs the facts of its job and a look read from finished work of the same kind: the research step writes `research.md`, checked by `check.mjs research`.
- When a colour pair needs a number, not an opinion: `check.mjs contrast <fg> <bg> --min 4.5`.
- When a project needs a `DESIGN.md` or a token file checked, or a brand needs the six document properties for a PDF.
- When a finished piece must be checked for the banned defaults: `check.mjs tells`.
- When a trend is proposed: look it up in `TRENDS.md`. A trend is used only when the brief asks, and only when it is on trial.

Skip it for the words of a document, which it leaves to whoever writes them. The words of a piece made here come from the writer's file.

## Common questions

**Whose rules win?** The project's own, then the brief, then `DESIGN.md`, then this method, then optional references. When a brief contradicts a project rule, the method stops, names the rule and the brief line, and asks the owner.

**What does a failing `tells` run mean?** Exit 1 means at least one default was found that the brief did not earn. Exit 2 means the brief cites fewer reference rows than it needs. Exit 3 means a check could not run, for example a render row with no render or a grid row with no grid in the brand data. A check that cannot run is a failure, never a pass. The first line is `PASS: no tells` or starts with `FAIL`.

**Can a brief keep a default?** Yes, by naming it under **Tells earned** with a reason. A tell named with no reason is refused.

**Why does the ratio not round up?** WCAG does not round up. A pair at 4.4999 is shown as 4.4999, never as 4.5, so a failing pair never reads as a pass.

**What about a colour in a wide-gamut space?** A ratio needs a hex, `srgb` components, or `oklab` or `oklch` components. An `oklab` or `oklch` colour with no hex is computed, and a hex beside it wins. One that falls outside the sRGB gamut says "cannot compute" and is never clipped, so no ratio is guessed. Any other space (display-p3, for one) with no hex says "cannot compute".

**Does a small job need the eleven-section brief?** No. One piece, or a set of one kind, for a brand that already exists starts from a one-page proposal (`PROPOSAL.md`): scope, deliverables, words, three examples, rounds, usage and what is left out. The owner sees it before anything is made, unless away. A new identity is never small, and the owner can say small or full. `check.mjs proposal` checks it, and `tells` takes it in place of a brief.

**Who approves a piece?** Only the owner. The brief or proposal, the comp and the final files are signed off by the owner's word and locked by their hashes in `approvals.md` (`SIGN-OFF.md`). Later feedback is a change request, counted against the rounds; past them it waits for the owner. `check.mjs approvals` fails when a locked file changed with no request that reopens it.

**Who does the research, and can it read Pinterest?** The lead gathers the job's facts before the brief; the designer who takes the piece studies finished work of its kind before building, starting from the craft's row of places to look in `RESEARCH.md`. Pinterest and Google Images keep automated readers out, so they are read only in the owner's own browser, with the owner there and signed in, one page at a time. No downloader or other way round the block is used.

**Are the 29 checks proven?** Partly. 18 rows have run on three real files. The other 11 stay `proposed, not run`, with fixtures in the tests only, until a real file has their subject. `TELLS.md` marks each row.

## It's working if

- A `DESIGN.md` for a project passes `check.mjs design`, its token file passes `check.mjs tokens`, and every colour pair in it has a computed ratio at or above its threshold.
- A piece starts from a brief that passes `check.mjs brief` with all eleven sections and cites at least three reference rows, or states a lower minimum with a reason.
- The research file for a piece passes `check.mjs research`, and every rule it takes from a source rests on a source marked `opened`.
- `check.mjs tells` on a finished piece gives `PASS: no tells`, with a render and the brand's data supplied, and exits 1 on a piece that carries a default the brief did not earn.
- No piece in the project falls into a ban in `TELLS.md` without a dated reason in the brief or in `DESIGN.md` under **Not to do**.
- The project's own rules were read first, and a conflict with the brief was named and not resolved silently.
- The intake asked for the copy, past pieces, brand kit and mood pictures in its one message, and the brief names each move taken from a reference picture and the picture it came from.

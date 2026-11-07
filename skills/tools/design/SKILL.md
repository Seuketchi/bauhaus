---
name: design
description: The design method: the stance, the banned defaults, a plan checked against the brief, the precedence rule (the project's rules win), and the checks for colour, DESIGN.md, token files, trends and briefs. Use before any visual piece, and to run the checks.
---

# Design

The method every visual job follows. A piece is styled from a brief and the project's own rules, not from the defaults generated work falls into. The numbers are checked by `check.mjs` in this folder; taste is held by the plan and the bans below.

## Precedence

One list. When two items disagree, the lower number wins.

1. The project's own checked-in rules and gates.
2. The brief for this task.
3. `DESIGN.md` at the project root.
4. The defaults and bans in this skill.
5. Optional references, which are suggestions.

A brief that contradicts a project rule is not obeyed silently: stop, name the rule (file and heading) and the brief line, and ask the owner which one yields.

## Before you draw

- Read `DESIGN.md` first. If the project has none, say in one line that there is no `DESIGN.md` yet and go on from the brief. Only `brand` creates one.
- Find the project's own rules (a `CLAUDE.md` or `AGENTS.md`, files on UI idioms or themes, a design gate). They rank first.
- Write a brief file for the piece before any work: audience, job, tone, what it must not look like, surface, the references it cites, and the tells it earns, each with a reason. The format is in `DESIGN-MD.md`. Check it with `check.mjs brief`.
- Cite at least three reference rows and say which rule you took from each, so a ban never stands alone. A brief may state a lower minimum with a reason; the floor is one. A rule rests only on a reference that was opened.

## The token plan

Before anything is built, write a plan and revise it against the brief:

- 4 to 6 named colours, as hex values with a role each.
- Type roles: a face, a size and a weight for each role, with a fallback stack.
- A layout sketch in text: the grid, the order of the parts, the one thing that leads.

Then read the plan once against the brief and the bans. Change anything that is a default and cannot say why it is there. Build only after that.

## The bans

Generated work falls into a small set of looks. Each is a default, not a crime: a brief that names one with a reason earns it, and the brand's token file can name a font, a colour or a value. Each ban has a row in `TELLS.md`, which holds the check, and `check.mjs tells` runs the rows. This list names them and does not restate the rows.

- **Tracked-caps kickers** (T12): small uppercase labels with wide letter-spacing above a heading.
- **Hero titles** (T4, T17): a centred hero over three equal boxes, or a big number over a small label.
- **Dot meta lines** (T13): items joined by a middle dot.
- **Side bars** (T8): a thick coloured stripe on one edge of a card, list item or alert.
- **Tinted cards** (T5): the same rounded, shadowed box repeated down the page.
- **Cream, serif and terracotta** (T18): a warm paper background with a high-contrast serif and one earthy accent.
- **Near-black with one acid accent** (T18): a dark page with a single saturated colour doing all the work.
- **Broadsheet hairlines** (T29): hairline rules and zero radius everywhere, with dense columns.
- **Identical rounded cards** (T5, T6): one radius and one soft shadow on every surface.
- **Template chrome** (T14, T19): WORD, dash, fragment labels, and a tinted near-black standing in for black.

## Colour

- Text needs 4.5:1 against its background, and large text and interface parts need 3:1 (WCAG 2.2, SC 1.4.3 and SC 1.4.11).
- A colour's reading depends on what sits beside it. Check each pair in place, in the render, as well as by ratio: a pair that passes alone can fail beside a stronger neighbour.
- Never estimate. `check.mjs contrast <fg> <bg>` computes the ratio, never shows a failing pair as passing, and refuses a colour name, a short hex of the wrong length or a colour with alpha. A colour in another colour space is used through its hex.
- Colour pairs in `DESIGN.md` are role paths. The ratio is computed from the token file and never written by hand.

## The checks

Run them from this folder with `node check.mjs <command>`.

| Command | Checks |
| --- | --- |
| `contrast <fg> <bg>` | The WCAG 2.2 ratio, with text, large text and interface verdicts. |
| `design <DESIGN.md>` | The front matter, the 11 sections in order, the entries and dates, the pairs, the trends in use and the change log. |
| `tokens <file.tokens> [mode files]` | The token file and, for modes, that the paths match. |
| `document-css <file.tokens>` | Writes the six document properties as CSS custom properties. |
| `trends <TRENDS.md> --as-of <date>` | Every entry has its fields, a valid status and a review-by date not past. |
| `brief <brief.md>` | The brief has its sections, its tells have reasons, and its reference minimum is allowed. |
| `email <file.html> [--limits <LIMITS.md>]` | Alt text, a real button, live text, a container of at most 640 px, the tells a script can see, and the limits table when one is given. |
| `tells <piece> --brief <brief.md> [--brand <tokens>] [--render <png>]` | The rows of `TELLS.md`. Exit 0 no tell, 1 a tell, 2 too few reference rows, 3 a check could not run. The first line is `PASS: no tells` or `FAIL: ...`. |

A pass is never approval. The checks prove numbers and written rules; the critique pass and the owner's reviewer rule on the rest.

## Trends

`TRENDS.md` is the one dated file of trends. A trend is applied only when the brief asks for it and its status is `Trial`; the accessibility floor outranks it. `DESIGN.md` records only the entry's name, the date reviewed and the brief line.

## ArtCraft

`ARTCRAFT.md` holds the rules for driving the three command-line apps: which binaries are never run, the roots every call takes, and the commands each job uses.

## Hand over

Say which files you made, which checks you ran and their result, and what you did not check. Leave the words (document text, email copy) to the person who writes them.

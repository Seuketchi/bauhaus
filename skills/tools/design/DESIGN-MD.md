# The formats: DESIGN.md, the token file and the brief

`check.mjs` checks all three. This file says what each one holds. Run the checker on every file the method writes or changes.

## DESIGN.md

`DESIGN.md` sits at the root of the project being designed, not in this package. Every job reads it first. It records decisions and points at the token file; it copies no token value. A changed decision replaces its entry, and git keeps the old one. A section a project already has that this format does not know is kept as written and never rewritten.

### Front matter

```yaml
---
project: <name>
design-md: 1
tokens: design.tokens        # path to the token file, from this file
tokens-format: dtcg-2025.10
rules-win:                   # project rules that outrank this file
  - <path>#<heading>
---
```

All five keys are required. `rules-win` may be an empty list.

### The 11 sections, in this order

The checker reads the `##` headings and their order.

| # | Section | Holds |
| --- | --- | --- |
| 1 | Brand and references | The brand, the references and the constraints that rank first, with links. The brief comes before every system. |
| 2 | Foundations as roles | Colour, type, spacing, shape, motion and elevation, each named by role and each an entry with its reason. The mark (file, clear space, minimum size in px) is an entry here. |
| 3 | Token source | The path to the token file, the tier names, the naming rules and the modes. It copies none of the values. A note for email, which needs its own inline values because clients invert colours unpredictably. The mapping of the six document properties to token paths. |
| 4 | Components and patterns in use | Each with a status, and what replaced anything deprecated. |
| 5 | Content and voice | The voice rules, or a pointer to the project's own style guide. The words themselves are not written here. |
| 6 | Accessibility floor | The standard in force (WCAG 2.2), the ratios, the target size, reduced motion and reduced transparency, and the colour pairs to check. |
| 7 | Platform conformance | The platform and which platform material applies. A platform's own material is conformance here, not a trend. |
| 8 | Trends in use | The trend's name, the date it was reviewed, and the sentence in the brief that asked for it. Nothing else. |
| 9 | Decisions and evidence | Dated decisions that are not foundations entries, each with its research, test or critique note. |
| 10 | Change log | Dated entries, newest first. |
| 11 | Not to do | Patterns the project has rejected, and why, on top of the package's banned list. A recorded exception to a tell is a dated entry here. |

### Entries

A decision entry is a `###` heading under section 2 or 9:

```
### Text colour
Semantic text on surface.

**Why:** It reads at a high ratio on every surface.
**Rejected:** Pure black, which glares on white.
**Decided:** 2026-11-01
```

`**Decided:**` is a real date (`YYYY-MM-DD`) and is required. A component is a `###` heading under section 4 with `**Status:** Trial`, `Stable` or `Deprecated`.

A colour pair in section 6 is a list item `- <kind>: <role path> on <role path>`. The kind is `text` (4.5:1, SC 1.4.3), `large` (3:1, SC 1.4.3) or `ui` (3:1, SC 1.4.11). Write role paths from the token file, never values. The checker computes the ratio. A ratio may follow as `= 4.61`, and it must equal the computed one.

A trend in section 8 is a list item `- <name> | reviewed <date> | brief: <sentence>`. The name must be an entry of `TRENDS.md` that is not `Retired` and, when `--as-of` is given, not past its review-by date.

Section 10 is a list of `- <date>: <change>`, newest first.

## The token file

A project file beside `DESIGN.md`, with the extension `.tokens`. The format is the Design Tokens Community Group Format Module 2025.10, a Final Community Group Report of 2025-10-28. It is not a W3C Standard and is not on the Standards Track, so the version is pinned in the front matter and a later version is a decision.

- A token is an object with a required `$value` and an optional `$type`. A group's `$type` is inherited. An alias is the full path, `{primitive.color.brand}`.
- The top-level groups are `primitive` (raw values), `semantic` (every value an alias to a primitive), `component` (every value an alias to a semantic token) and `document`. `grid`, `type` and `space` hold raw data and are not tiers.
- A colour is an object with `colorSpace` and `components`, and an optional `hex`. A ratio needs a `hex`, `srgb` components, or `oklab` or `oklch` components, and a `hex` beside components wins. An `oklab` or `oklch` colour with no `hex` gets a computed ratio when it falls inside the sRGB gamut; outside it the check fails with "cannot compute" and does not clip the colour. Any other colour space with no `hex` fails with "cannot compute", so no ratio is guessed.
- `document` holds the six properties the document styles already read: `accent`, `ink`, `muted`, `line`, `tint`, `font`, each an alias to a semantic token. `check.mjs document-css` writes them as the custom properties `--accent`, `--ink`, `--muted`, `--line`, `--tint` and `--font`.
- `grid` holds `columns`, `gutter` and `margin`. `type` holds the step sizes as dimensions. `space` holds the spacing scale. The tells `T20` and `T21` read them, and cannot run without them.
- Each mode (dark, high contrast) is its own file with the same token paths. `check.mjs tokens light.tokens dark.tokens` asserts that the paths match.
- Email takes inline hex values from the same file and never relies on a mode.

## The brief

One file per piece, written before any work. Eleven sections, each non-empty:

```
## Audience
## Job
## Tone
## Must not look like
## Surface
## Intake
## Idea
## Insight
## Story
## Research
## References
## Tells earned          (optional)
```

- **Intake** holds the owner's answers to the five questions in `SKILL.md`, word for word, or `not answered`. An answer taken from a file says where: `from DESIGN.md section 1`.
- **Idea** is the one idea in a sentence, then a line `Two words: <word> <word>`: the idea cut to exactly two words, kept as the test for every later choice.
- **Insight** is the one fact about the audience or the product that the idea comes from, with the research row it rests on.
- **Story** is who it is about, then 3 to 5 beats. Each beat is `- Beat n: <what is shown> | carried by: <picture, crop, order or copy>`. A piece that needs no story, such as a logo mark, writes `Story: none. Reason: <why>` and no beats. Idea, Insight and the two words stay required.
- **Research** gives the path of `research.md` and the register used, and what the piece departs from.
- **References** lists the rows the piece cites: `- <id>: <the rule taken from it>`. A piece cites at least three. A brief may lower the number by adding `Minimum: <n>. Reason: <why>`. The floor is one, and a minimum below three needs a reason.
- **Tells earned** lists a tell the brief chooses, with the reason: `- T12: The brand uses tracked caps for its logotype.` A tell named with no reason is not earned, and the brief is refused.
- The brief wins over a default. It does not outrank the project's own rules.
- A six-section brief written to the old shape fails `check.mjs brief` until it is brought up to date, and the message names the sections it lacks.
- A complete brief means all eleven sections are there and non-empty.

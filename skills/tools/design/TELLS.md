# Tells

The generic defaults a piece must not fall into, one row each. `check.mjs tells` runs the rows; the method in `SKILL.md` names the bans and points here.

A tell is a default, not a crime. A row passes when the brief names the choice with a reason (a line under **Tells earned**), or, for the rows that say so, when the brand's token file names it. A tell the brief does not name fails the piece.

Types: `file` reads the piece's source, `text` reads its words, `render` reads a PNG of the piece that is passed with `--render`. A `render` row with no render cannot run, and a row that cannot run is a failure (exit 3), never a pass.

Status: the checks were run on three real pieces made with the ArtCraft command-line apps: a logo mark (`.svg`), an HTML email built around a FigCraft image, and a web page built around a FigCraft image. Each had its own brief and the brand's token file, and each was rendered to a PNG (an `.svg` by headless Chrome). No row exited 3 on any of them.

A row counts as run only when a piece held something for it to read. A row that says `ran on 3 real files, no hit` raised no false positive on those files. That does not show that it catches the tell on real output, because none of the three carried the tell. Only T12 and T24 were seen to flag, on a seeded email.

A row whose subject was in none of the three pieces stays `proposed, not run`: it has fixtures in the tests and nothing more. The word list of T26 rests on search summaries and stays marked inferred, and T27 stays a warning.

| Id | Tell | Check | Type | Source | Status |
| --- | --- | --- | --- | --- | --- |
| T1 | Default font with no reason | List each `font-family`; fail if the first family is Inter, Roboto, Arial or system-ui and the brand's token file does not name it | file | frontend-design; designer blogs | ran on 3 real files, no hit |
| T2 | Indigo-to-purple or blue-to-purple gradient | Fail if a `linear-gradient` has two stops with hue 240 to 290, unless the brand palette has such a hue | file | frontend-design; designer blogs | proposed, not run |
| T3 | Gradient text | Fail on `background-clip: text` in a rule that sets a gradient | file | craft-floor | proposed, not run |
| T4 | Centred hero over three equal cards | Render: a centred, narrow first band, then a row of three boxes of equal width and height | render | frontend-design | ran on 3 real files, no hit |
| T5 | Identical cards everywhere | Fail when one class with a radius and a shadow is used by three or more elements | file | frontend-design; craft-floor | proposed, not run |
| T6 | One radius and one soft shadow on everything | Fail when more than five rules share the only radius and the only shadow in the piece | file | frontend-design | proposed, not run |
| T7 | Ghost card: a 1px border under a wide soft shadow | Fail when one rule has a `1px` border and a shadow blur of 12px or more (file check; the look can also be seen in a render) | file | craft-floor | proposed, not run |
| T8 | Coloured side stripe | Fail on `border-left` or `border-right` wider than 1px with a colour | file | craft-floor | proposed, not run |
| T9 | Hard offset shadow | Fail on a `box-shadow` with zero blur and a nonzero offset, unless the brief names it | file | craft-floor | proposed, not run |
| T10 | Glass or blur as decoration | Fail on `backdrop-filter` | file | craft-floor | proposed, not run |
| T11 | Emoji or glyph as icon | Fail on an emoji or arrow character in the visible text | file | craft-floor; ui-ux-pro-max | ran on 3 real files, no hit |
| T12 | Tracked-caps eyebrow | Fail on an element above a heading whose rule has `text-transform: uppercase` and letter-spacing of 0.08em or more | file | frontend-design; craft-floor | ran on 3 real files, no hit; flagged a seeded email |
| T13 | Dot-joined meta line | Fail on text that matches three items joined by a middle dot | file | frontend-design | ran on 3 real files, no hit |
| T14 | Label of the form WORD, dash, fragment | Fail on a short text of 40 characters or fewer that starts with a capitalised word and a spaced dash | file | frontend-design | ran on 3 real files, no hit |
| T15 | Numbered markers on a list that is no sequence | Fail on two or more labels such as 01 and 02, unless the brief names a sequence | file | frontend-design; craft-floor | ran on 3 real files, no hit |
| T16 | One accented word in a headline | Fail on a heading of several words with a single word set apart in `em`, `strong`, `i`, `b` or `span` | file | frontend-design | ran on 3 real files, no hit |
| T17 | Hero with a big number and a small label | Render: in the first bands, a wide-set numeral at least three times the height of the caption under it | render | frontend-design | ran on 3 real files, no hit |
| T18 | Cream, serif and terracotta; or near-black with one acid accent | Render: the page background and the accent colour, sampled from the pixels, against both palettes; the brand palette overrides | render | frontend-design | ran on 3 real files, no hit |
| T19 | Tinted near-black standing in for black | Fail on #0b0b0b or #111 used directly as a text or surface colour, unless the brand's token file names that value | file | frontend-design | ran on 3 real files, no hit |
| T20 | No grid | Render: the left edges of text and image blocks against the brand's grid data; fail on more than six distinct edges. Needs the brand's grid; without it, exit 3 | render | frontend-design; craft-floor | ran on 3 real files; 2 false positives, fixed (see below) |
| T21 | No type scale | Fail when a font size is not in the brand's type steps. Needs the brand's type data; without it, exit 3 | file | frontend-design; craft-floor | ran on 3 real files, no hit |
| T22 | Identical entrance on every section | Fail when one animation name is used by three or more rules, or one animated class by three or more elements; hover and focus rules are excluded | file | frontend-design; ui-ux-pro-max | proposed, not run |
| T23 | Monospace as costume | Fail on a monospace family in a rule whose selector is not code, pre, kbd, samp, var or a data class | file | craft-floor | ran on 3 real files, no hit |
| T24 | Accessibility floor | Fail on a text and background pair in one rule under 4.5:1, text under 12px, or `outline: none` with no replacement. The ratio is the one `check.mjs contrast` computes | file | craft-floor; ui-ux-pro-max; WCAG 2.2 | ran on 3 real files, no hit; flagged a seeded email |
| T25 | Placeholder or filler copy | Fail on Lorem, Your text, Click here, or a button labelled Submit | text | frontend-design | ran on 3 real files, no hit |
| T26 | Buzzword and rhythm copy | Fail on empower, unlock, seamless, robust or leverage, on more than one em dash per 150 words, or on a not just, but pattern. The word list is inferred: it rests on search summaries of pages that were not opened | text | frontend-design; word list inferred | ran on 3 real files, no hit; word list inferred |
| T27 | Copy states no specific detail (a warning, never a failure) | Warn on a paragraph of 12 words or more with no number and no name. A person judges it | text | frontend-design | ran on 3 real files; 1 warning, judged fair; stays a warning |
| T28 | Stock-sketch SVG or stripe pattern as illustration | Fail on `feTurbulence` or `repeating-linear-gradient` | file | craft-floor | proposed, not run |

## False positives

Found when the rows ran on the three real pieces, which are kept outside this repository. Each was fixed in `check.mjs`, with a test, or is listed here.

- **T20, `email.html`** (a 600 px email centred in a 640 px render) and **`landing.html`** (a 960 px page centred in a 1024 px render): the row measured the left edges against a grid laid across the whole render, so a centred container read as off the grid ("5 of 6 blocks", "12 of 12 blocks"). Fixed: when the content is centred in a wider render, the grid is laid across the content's own width, and the container's edge counts as a grid line. Content that is not centred is still measured against the render.
- **T27, `email.html`**: the warning fired on the line "If a book arrives damaged, reply to this email and we will send another." It has no number and no name, which is what the row looks for. A person reads it as a plain policy line. A warning, as designed; not fixed.
- **T20 on a broken image** (the seeded email, before its image path was fixed): the placeholder icon of a missing image counted as a block and read as off the grid. This is a true finding about a broken piece and is not changed.

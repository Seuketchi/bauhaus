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
- Run the intake (below) when no complete brief file exists, and keep the owner's answers word for word.
- Write a brief file for the piece before any work: audience, job, tone, what it must not look like, surface, Intake, Idea, Insight, Story and Research, the references it cites, and the tells it earns, each with a reason. Intake and Research are filled before the writer; Idea, Insight and Story are the writer's. The format is in `DESIGN-MD.md`. Check it with `check.mjs brief`.
- Run the research step in `RESEARCH.md`: the lead runs it before the brief is final (the job's facts), and the designer who takes the piece runs it again before craft (the piece's visual research, from the craft's row of places to look). Write `research.md` beside the brief, and check it with `check.mjs research` once the piece's research is in.
- Cite at least three reference rows and say which rule you took from each, so a ban never stands alone. A brief may state a lower minimum with a reason; the floor is one. A rule rests only on a reference that was opened.

## A small job

A small job is one piece, or a set of one kind (three sizes of one banner), for a brand that already exists. A new identity or a logo is never small. When the owner says small or full, that wins over this test.

A small job starts from a one-page proposal, `PROPOSAL.md`, which stands in for the brief: scope, deliverables, words, three examples, rounds, usage and what is not included. The intake questions are not asked; what the ask leaves out is written `not given`.

- The lead writes the proposal, shows the owner the page and waits for go. When the owner is away, the lead marks it `owner away`, goes on, and puts the proposal at the head of the hand-over.
- The words the ask gives are used as given. The writer is called only for a line that is missing, and writes that line alone.
- The designer opens three examples from the craft's row of places to look in `RESEARCH.md`, adds them to the proposal, checks it with `check.mjs proposal`, and builds.
- The proposal takes the place of `research.md` and `words.md` wherever a job asks for them. Everything else holds: the project's rules, `DESIGN.md`, the bans and the checks.

## The intake

The questions live here, once. The lead gets them by calling `design`, and a character never copies them. They come from the questions studios put to a client: who are you and where are you going, and who it is for, what is special and how it should feel.

1. Who are you? (the brand, the product, the person behind it)
2. Where are you going? (what this piece is for, and what should happen after someone sees it)
3. Who is it for?
4. How should it feel?
5. What is special? (if you had one sentence, what would it be)

- **Ask for the material in the same message.** The copy, any past pieces, a brand kit, the pictures that set the mood, and the photographs or people the piece may use. Nothing starts on assumed copy, and a brief made before the mood pictures arrive is made again when they do. Each missing item is named once, plainly, with what it blocks.
- **Ask once.** Put every open question in one message. Do not ask a question the request, `DESIGN.md` or an earlier brief already answers; write where the answer came from, for example `from DESIGN.md section 1`.
- **Keep the owner's words.** The brief's `Intake` section holds each answer as given, not tidied.
- **An unanswered question is written down as unanswered.** The brief says `not answered`, the research step treats it as open, and nobody fills it by guess.
- **The writer does not ask again.** The writer reads `Intake` and works from it. If something is still missing, the writer lists it as open and the lead asks, once more, in one message.
- **Skip the intake** when the owner has named the designer and a complete brief file already exists. A complete brief has all eleven sections, or an `Intake` that says which file it comes from.
- **A conflict with a project rule still stops and asks,** as the precedence section says.

## Pictures from the owner

A picture the owner sends as a reference is read as an image, not summarised from its caption.

- **Name the moves.** For each picture, write the concrete moves it shows in the brief's `Research`: a shape, a material, a light, a type treatment, a colour pairing. A move is taken only when it is named, with the picture it came from.
- **Moves, not marks.** Take the move and leave the mark: a script on a thick plate is a move, a company's own logo or wordmark is a mark. The piece never copies a logo, a character or a product's look one to one.
- **A later picture can overturn an earlier choice.** Say which choice it overturns and change the brief, not only the piece.
- **A picture that does not open, or arrives blank, is reported** at once, and nothing is drawn from it.
- **Each round says what changed** and which picture or which word of the owner's asked for it, so the owner can push one move further without re-reading the whole piece.

When the owner is shown options, one of them takes the owner's existing work further rather than replacing it.

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
- Never estimate. `check.mjs contrast <fg> <bg>` computes the ratio, never shows a failing pair as passing (it prints `fail`), but exits 0 on a failing pair unless `--min` is passed: pass `--min 4.5` for text and `--min 3` for an interface part, and the exit is 1 when the pair is under it. It refuses a colour name, a short hex of the wrong length or a colour with alpha. A colour in another colour space is used through its hex.
- Colour pairs in `DESIGN.md` are role paths. The ratio is computed from the token file and never written by hand.

## A site or a set

When the work is more than one page, or emails that follow a site:

- Make the brand kit first: logo, colour roles, type with email fallbacks, buttons, the signature parts and the imagery rules. Every later page and email is built from it.
- Hold each new page to the colour density of the page the owner accepted. A page that is mostly white beside an accepted page that is mostly colour reads as another brand.
- Write each colour's role (`**Use:**` in `DESIGN.md`). A colour kept to text and buttons that fills a whole band changes the brand's tone.
- Signature parts (the closing card, the footer, the nav) are locked once accepted and stay the same on every page. Mark them with `data-part` and run `parts-set`.
- Vary the layout device between neighbouring sections: a split, then a grid, then a full-bleed picture. The same device three times in a row reads as a template.
- One signature device per page at most (a ribbon, a large numeral), and it carries copy the owner already has.
- Use the owner's real photographs. Generated pictures beside real ones read as a template; when the real ones run out, ask for more.
- The first call to action sits right under the headline, on every page.
- Offer the interaction layer with the first build: hover, reveal on scroll and the menu, each with a reduced-motion version.

## Sign-off

Only the owner signs off. A stage is approved and locked at three points: the brief (or a small job's proposal), the comp and the final files. The craft pass is not a sign-off, and no one but the owner calls a piece approved. When the owner is away, the stage stays unsigned. Each sign-off is recorded with the owner's words and each locked file's hash in `approvals.md`, in the shape `SIGN-OFF.md` gives. Feedback after a sign-off is a change request: logged, counted against the rounds, and past them extra work that waits for the owner. A locked file changes only under a change request that reopens its stage, and `check.mjs approvals` holds that.

## The library

A designer improves with use. `LIBRARY.md` holds what each job leaves behind: a file per craft and the owner's taste notes in `~/.bauhaus/library/`, used on every project, and a `library.md` beside `DESIGN.md` for the project's own approved work and lessons, which never leave that project's own folder for another client. The designer reads its library before research and starts from it, but at least half the sources stay new to the job. The lead files the job into the library at the final sign-off, and writes a taste note whenever the owner states one. The library ranks at level 5, below the project's rules, the brief and `DESIGN.md`.

## When rounds go nowhere

After two rounds of polish, or two tools, that the owner rejects, stop. Name the root cause in one line (missing material, a wrong brief, a tool that cannot do it), then offer two or three directions or ask for the material. A third round of the same kind is not made.

## The checks

Run them from this folder with `node check.mjs <command>`.

| Command | Checks |
| --- | --- |
| `contrast <fg> <bg> --min <ratio>` | The WCAG 2.2 ratio, with text, large text and interface verdicts. Exits 0 on a failing pair unless `--min` is passed. |
| `design <DESIGN.md>` | The front matter, the 11 sections in order, the entries and dates, the pairs, the trends in use and the change log. |
| `tokens <file.tokens> [mode files]` | The token file and, for modes, that the paths match. |
| `document-css <file.tokens>` | Writes the six document properties as CSS custom properties. |
| `trends <TRENDS.md> --as-of <date>` | Every entry has its fields, a valid status and a review-by date not past. |
| `brief <brief.md>` | The brief has all eleven sections, a two-word idea, a story of 3 to 5 beats (or none, with a reason), its tells have reasons, and its reference minimum is allowed. |
| `proposal <proposal.md>` | The small job's one page: its date and approval line, the sections in order, a deliverable, words from the owner or the writer, three opened examples each with the move taken, a number of rounds, and no more than one page. |
| `approvals <approvals.md>` | Every locked file matches the hash of its latest sign-off unless a change request reopens its stage; the owner's words are quoted; each request's go-ahead fits its round against `Rounds:`. |
| `hash <file>...` | Prints each file's SHA-256 for a sign-off row. |
| `library <file>` | A craft file, the taste notes or a project library: dates, examples with a URL kept once and the move taken, a global lesson seen in two projects, a lesson waiting in two projects promoted, taste notes quoted. |
| `research <research.md>` | The research file has its date and client line, the seven parts in order, every source marked opened or summary only, the eight fields in every source note, and the not-that table. |
| `email <file.html> [--limits <LIMITS.md>]` | Alt text, a real button, live text, a container of at most 640 px, the tells a script can see, and the limits table when one is given. |
| `parts-set <page.html>...` | Every `data-part` the pages share is the same in each: one closing card, one footer, one nav. |
| `roles <piece.html> --design <DESIGN.md>` | No band is filled with a colour whose `**Use:**` leaves out `block` and `ground`, also through a CSS variable. |
| `tells <piece> --brief <brief.md or proposal.md> [--brand <tokens>] [--render <png>]` | The rows of `TELLS.md`. Exit 0 no tell, 1 a tell, 2 too few reference rows, 3 a check could not run. The first line is `PASS: no tells` or `FAIL: ...`. |

A pass is never approval. The checks prove numbers and written rules; the critique pass and the owner's reviewer rule on the rest.

## Trends

`TRENDS.md` is the one dated file of trends. A trend is applied only when the brief asks for it and its status is `Trial`; the accessibility floor outranks it. `DESIGN.md` records only the entry's name, the date reviewed and the brief line.

## Research

`RESEARCH.md` holds the research step: ten rules for reading sources, the seven parts of a piece's visual research and the shape of `research.md`. The registers it starts from are in each job's `REGISTERS.md`. Research ranks as an optional reference.

## ArtCraft

`ARTCRAFT.md` holds the rules for driving the command-line apps: which binaries are never run, the roots every call takes, and the commands each job uses.

## Hand over

Say which files you made, which checks you ran and their result, and what you did not check. Leave the words (document text, email copy) to the person who writes them.

# bauhaus: a design package (spec)

Status: built. Drafted for the owner's confirmation on 2026-11-07; the jobs and characters it names are in the package as of 2026-11-08. Every open question is closed. No money flow is involved, so there are no money invariants.

Governing inputs, read for this spec: `notes/donna/harvey-design-package-picks.md` (harvey's picks), `designer-package-research.md` (rachel), `designer-package-stocktake.md` (mike), the suits repo at `f7c015f` (layout, tests, CLAUDE.md rules, `check-skills`), `design-systems-trends-research.md`, `references-research.md` and `notes/design-package/theme-options.md` (rachel and a second researcher), and the ui-ux-pro-max 2.13.0 install. Facts are tagged VERIFIED (read or run by me today, with the source), or UNVERIFIED (with the fastest check).

The owner's words, verbatim, are the authority:

- "designer basically is a master one in both science and art. an architect that understand aesthetic and structure. a film director that knows angles much like a cinematographer. a graphic designer that can design anything branding, email design, basically anything"
- "but maybe its a different package like suits"
- "and they interact using artcraft"
- "include uiux"

## Problem Statement

The owner works on many kinds of visual work: a brand, an HTML email, a logo, an app screen, a web page. No one owns "the look" across them. Donna builds documents and PDFs but not identity or HTML email. The app's own rules cover the app's screens but nothing else. ui-ux-pro-max is a general lookup that knows nothing of the owner's project rules, and it has nothing for email, print or brand beyond a few rows. So each piece is styled from scratch, with the generic defaults that generated output falls into (tracked-caps kickers, hero titles, identical tinted cards, cream and serif), and a second piece of the same brand does not match the first.

The owner also wants one designer who is "a master in both science and art": the science (contrast, type metrics, client limits, grids) checked by numbers, the art (taste, restraint, composition) held by a method that names the defaults and bans them. The architect and the film director in the owner's description each need a source pass before any skill text is written for them, and the video tooling is not installed.

## Solution

A separate plugin, `bauhaus`, in its own repo beside suits. It holds one method, four jobs and three characters:

- **The method** (`design`): the stance, the named bans, a plan-then-critique pass, the precedence rule (project rules win), the `DESIGN.md` context file, a small deterministic checker (contrast, `DESIGN.md` and token-file lint, trends review dates, email lint), and the one reference for driving ArtCraft headless.
- **The jobs:** `brand` (identity: colour, type, mark, writes `DESIGN.md`), `email` (HTML email with client limits), `screens` (app and web screens), `critique` (the craft pass on a finished piece).
- **The characters:** three ordinary skills that call the jobs by name. **Walter Gropius** is the lead: he frames the brief, hands work to the others, and runs the craft pass on pieces he did not make. **Herbert Bayer** is the graphic designer (brand, logos, email, critique). **Marcel Breuer** is the UI/UX designer (screens, critique); whether it is Breuer or Josef Albers is open question 19. The colour science (contrast, how a colour reads beside another) is part of the method and is credited to **Josef Albers** in the README cast table and the ADR only, unless he takes UI/UX.

A piece follows one flow: grill, research, concept and story, craft, critique. The lead asks the owner the intake questions once, in one message, and keeps the answers word for word in the brief. A research step then reads finished work of the same kind and the facts of the job, and ends in `research.md`. **David Ogilvy** is the writer: he owns the one idea, the insight, the story and the words of the pieces made here, through his own tool, `concept`. The designers then take the words from the writer's `words.md` and lay the piece out; an email starts as a whole-page comp the owner sees before any HTML is built. The brief grows five required sections for this: Intake, Idea, Insight, Story and Research.

The owner talks to a character, the character reads `DESIGN.md` and the project's own rules, drives the installed command-line apps by file path, and hands back files. Suits is unchanged. The writer owns the words of the pieces made here; donna keeps long documents and the PDF build. The designer owns layout and look, and louis reviews against the rules and the numbers.

The architect is specified in section 3 (MIE, MAS and PLN): **Ludwig Mies van der Rohe** is the space designer, with two jobs, `massing` in SolidCraft (3D) and `plans` in CADCraft (2D). The shot and motion designer is specified in the same section (MN, SHO, STO and MOT): **László Moholy-Nagy** has three jobs, `shots` in FilmCraft (the shot list as a table and markers), `storyboard` in FigCraft then FilmCraft (framing panels and a rough animatic) and `motion` in EffectCraft (an animated title or graphic). The work is a plan and a draft, not a cut: no film is made, no shot is taken and no footage is cut. A still photograph is the photographer's job: **Walter Peterhans** has one job, `develop` in LightCraft (a photograph developed or prepared after capture), specified in the same section (PH and DEV).

## User Stories

1. As the owner, I want one designer I can brief for a brand, an email, a logo or a screen, so that I do not restyle from scratch each time.
2. As the owner, I want the designer to read my project's design rules before it draws anything, so that it never contradicts rules my team already enforces.
3. As the owner, I want a project's own rules to beat the designer's taste, so that the app's design gate never fails because of a designer.
4. As the owner, I want a conflict between my brief and the project's rules named, not silently resolved, so that I decide which one yields.
5. As the owner, I want a `DESIGN.md` at the root of each project I design, so that every later piece of that project starts from the same decisions.
6. As the owner, I want each decision in `DESIGN.md` to carry its reason, what it rejected and a date, so that I can change one without reopening the rest.
7. As the owner, I want every colour pair in `DESIGN.md` to carry its computed contrast ratio, so that accessibility is a number, not an opinion.
8. As the owner, I want a brand's colours, type and mark in one file, so that donna's PDF build can take the same tokens.
9. As the owner, I want a logo as an SVG generated by VectorCraft, so that it is reproducible from a saved step script.
10. As the owner, I want a specimen sheet (palette, type, mark at sizes) as a PNG, so that I can see the brand on one page.
11. As the owner, I want an HTML email with live text, a real button and alt text, so that it reads with images blocked.
12. As the owner, I want the email's image assets made in FigCraft and named in the email, so that nothing is a stray file.
13. As the owner, I want the email's client limits listed with a test date and a source for each row, so that I know which limits may have moved.
14. As the owner, I want the email to say it was not tested in Outlook for Windows until it has been, so that no one assumes it was.
15. As the owner, I want app and web screens specified with their empty, loading, loaded and error states, so that a builder has the whole screen, not one happy path.
16. As the owner, I want each screen to list the project rules it applied, by file and heading, so that a reviewer can check it.
17. As the owner, I want screen frames exported as PNGs at the project's target size, so that I can look at them before anyone builds.
18. As the owner, I want a critique of any finished piece, run by a different session than the one that made it, so that the maker does not mark its own work.
19. As the owner, I want a critique that is clearly a craft pass and not a sign-off, so that louis's review and the rules still decide.
20. As the owner, I want the critique to run the numbers first (contrast, banned tells, PDF checks) and then look at the render, so that taste is judged on a checked base.
21. As the owner, I want the named generic defaults banned in every piece, so that output does not look machine-made.
22. As the owner, I want the designer to write a token plan and revise it against the brief before building, so that a default is caught before it is drawn.
23. As the owner, I want each designer described by craft and written in a plain professional register, so that no skill imitates a real person's voice, quotes them, or leaks a persona into documents, emails or pull requests.
24. As the owner, I want suits untouched, so that nothing that works today changes.
25. As donna, I want the document tokens I already read (`--accent`, `--ink`, `--muted`, `--line`, `--tint`, `--font`) in `DESIGN.md`, so that a brand restyles my PDFs without moving files.
26. As the writer, I want the designer to take the words from my file (`words.md`) and write none, so that the idea and the words stay in one hand. Donna keeps long documents and the PDF build.
27. As louis, I want the banned tells, contrast numbers and email limits as checkable lines, so that I can review a piece against them.
28. As a builder, I want a screen spec with states, strings, targets and rules applied, so that I can build it test-first.
29. As a maintainer, I want one command that checks every skill is listed, documented and calls only what exists, so that the package cannot rot quietly.
30. As a maintainer, I want the ArtCraft rules in one place (never start the GUI, never call the launcher, pass the roots), so that no session blocks the machine or updates an app.
31. As a maintainer, I want the headless fixture test to skip cleanly where ArtCraft is not installed, so that CI is green on a plain runner and the local gate still proves the hand-off.
32. As the owner, I want the architect and the shot and motion designer built from the source passes already done, on rows I could open, so that no skill text is written from titles I could not open.
32a. As the owner, I want the storyboard to draw the beats of the brief's `Story` and never invent a story, so that two files do not own the story.
33. As the owner, I want the intake to ask my open questions once, in one message, and have my answers kept in my own words in the brief, so that nobody asks me twice or tidies what I said.
34. As the owner, I want every piece to have one idea that can be said in two words, found in a fact from the research, so that the piece is not a pile of rules followed.
35. As the owner, I want the story of a piece in three to five beats, each saying what carries it, so that it reads from the pictures, crops and order before it reads from the copy.
36. As the owner, I want an email shown to me as a whole-page comp before any HTML is built, so that I can change the look while it is cheap to change.

## Implementation Decisions

### 1. Package, names and boundaries

- Separate repo `bauhaus` at `/home/tan/projects/bauhaus`, private on GitHub under `Seuketchi` like suits. Its own `plugin.json` and `marketplace.json`, MIT, no `version` (the plugin host versions it by commit; the same choice suits made). Install with the same two commands as suits. Not tried (UNVERIFIED); each plugin has its own marketplace, so whether one marketplace may hold two plugins does not matter.
- Suits is unchanged: no file in suits names bauhaus. Any outside planning tool that maps roles to bauhaus's skills does so outside both repos; how such a tool binds a role to a `bauhaus:<skill>` name is UNVERIFIED (the owner confirms).
- Calls are always namespaced: `/bauhaus:design`, not `/design`. ui-ux-pro-max already ships skills named `design` and `brand`, and a bare name is ambiguous (louis writes `/suits:code-review` for the same reason).
- No call into suits in the first scope (no `/suits:` anywhere). The link may run one way later (a designer calling `/suits:code-review` breaks nothing), as a new decision. Louis reviews bauhaus's work from outside.
- Characters call bauhaus tools and nothing else, with one allowed exception (see section 6). Shared reference lives in the tool that owns it. Characters never copy tool text and never link across skill folders. These are suits's rules, adopted by choice, and the check enforces them.
- **Real people.** The cast is real historical people (section 4). Their names are used as names only. No skill imitates a person's voice, quotes them as speaking, or attributes a claim to them; each is described by craft, and every sample line is plain professional register about the work. Tests scan character files for a cast name followed by a speech verb and for the avoided topics listed in section 4.
- The package keeps suits's text rules: no mention of how the work is planned or built, who builds it, or any team size in skill text; English only; conventional commits, no attribution lines.

### 2. Precedence (one list, in `design`, stated the same way everywhere)

1. The project's own checked-in rules and gates (for the asenso app: `ui-idioms.md`, `theme-system.md`, `make design-gate`).
2. The brief for this task.
3. `DESIGN.md` at the project root.
4. bauhaus's defaults and bans.
5. Optional references (ui-ux-pro-max), which are suggestions.

A brief that contradicts a project rule is not obeyed silently: the designer stops, names the rule (file and heading) and the brief line, and asks the owner. The same rule donna's letterhead states ("the project's design system always wins over a style"); harvey cited it as DOCS.md:24 and I did not re-read that line today.

### 3. Skills, jobs and acceptance criteria

Every criterion has a check type: **[T]** an automated test in the repo, **[R]** a headless ArtCraft or Chrome run (local), **[J]** judged by the critique pass and one louis review against this spec. A phrase test proves a rule is written down; it does not prove the generating tool obeys it. The acceptance run (section 9) is what shows behaviour.

**`design` (tool, the method). Owns `ARTCRAFT.md`, `DESIGN-MD.md`, `check.mjs`.**

- D1 [T] It names the bans as a list: the five suits tells (tracked-caps kickers, hero titles, dot meta lines, side bars, tinted cards) and five clusters of generic output from Anthropic's frontend-design skill (cream with serif and terracotta; near-black with one acid accent; broadsheet hairlines; identical rounded cards; template chrome). Source facts are rachel's, found at head `ca45fc4`; the licence of that repo's skills is UNVERIFIED, so the wording is ours and nothing is copied.
- D2 [T][J] It requires a token plan (4 to 6 named colours, type roles, a layout sketch in text) written and revised against the brief before anything is built.
- D3 [T] It states the precedence list of section 2 and the stop-and-name rule.
- D4 [T] It reads `DESIGN.md` first when one exists, and says in one line when none exists. Only `brand` creates one.
- D5 [T] `ARTCRAFT.md` lists the forbidden binaries (`figcraft`, `vectorcraft`, `pdfcraft` without `-cli`, and `artcraft-launcher`) and the rule that every `figcraft-cli` call takes both roots.
- D6 [T] `check.mjs contrast <fg> <bg>` returns the WCAG 2.2 ratio: `#000000` on `#ffffff` is 21:1, `#767676` on `#ffffff` is 4.54:1 (passes 4.5), `#777777` on `#ffffff` is 4.48:1 (fails). Text needs 4.5:1 (SC 1.4.3), large text and UI parts 3:1 (SC 1.4.3, 1.4.11). Source: WCAG 2.2, W3C Recommendation 12 December 2024.
- D7 [T] `check.mjs design <DESIGN.md>` accepts a valid fixture and rejects each of: a missing front-matter key, one of the 11 sections missing or out of order (section 5), a decision entry missing its **Decided** date, a component with a status other than `Trial`, `Stable` or `Deprecated`, an accessibility pair that does not resolve to two colours in the token file, a computed ratio below its threshold, a change log not in newest-first order, and a `Trends in use` entry that points at a `Retired` entry, an overdue entry or no entry (section 11).
- D10 [T] `check.mjs tokens <file.tokens>` accepts a valid DTCG 2025.10 fixture and rejects each of: a token with no `$value`, an alias to a missing token, an alias cycle, a colour with no `colorSpace` or `components`, a semantic token that is not an alias to a primitive, a component token that is not an alias to a semantic token, a `document` group missing any of the six properties, and mode files whose token paths differ.
- D11 [T] `check.mjs document-css <file.tokens>` writes the six custom properties (`--accent`, `--ink`, `--muted`, `--line`, `--tint`, `--font`) from the `document` group, resolving aliases, and fails if any cannot be resolved.
- D12 [T] `check.mjs trends <TRENDS.md> --as-of <date>` fails an entry that lacks one of its eight fields, has a status other than `Watch`, `Trial` or `Retired`, or is past its review-by date on that date (section 11).
- D8 [T] `check.mjs email <file.html>`: see E2.
- D9 [T] D1's bans are the 29 tells of `TELLS.md` (section 10), not a separate list; the method points at that one file. A tell passes only when the piece's brief or the brand data names the choice.
- D13 [T] Replaced by BRF1, which keeps everything D13 rejected: a brief missing audience, job, tone, must-not-look-like, surface or references, or one that names a tell id not in `TELLS.md` (section 10).
- D14 [T] The colour rules of `design` cite WCAG 2.2 (opened) and say a colour's reading depends on its neighbours, so pairs are checked in place as well as by ratio. They cite no lending-only book (section 10).

- D16 [T] `check.mjs research <research.md>` accepts a valid file and rejects each of: the head lines `Date:` and `Client:` missing, a section of P1 to P7 missing or out of order, a P1 source row with no `opened` or `summary only`, fewer than 6 sources or fewer than 2 makers, a P2 entry with an empty field of its eight, a P4 that is neither the not-that table nor `no earlier piece`, a P7 that cites no source, and a missing `Not checked` or `Open` section. It cannot judge whether a look was read correctly; the reviewer does that.
- D17 [T] `check.mjs` computes a ratio for an `oklab` or `oklch` colour with no `hex`, by the Oklab definition: white is (1, 0, 0) and maps to `#ffffff`, black to `#000000`, the sRGB primaries and 20 colours round-trip through `oklch` and `oklab` to themselves, and a `hex` beside the components wins. An `oklab` or `oklch` colour outside the sRGB gamut fails with "cannot compute" and is not clipped, because a clipped colour is not the colour the token names. Any other colour space with no `hex` still fails with "cannot compute". This reverses the earlier rule that an `oklch` colour with no hex fails (section 5).
- D18 [T] A colour entry may carry `**Use:**`, a list of `text`, `button`, `accent`, `block` and `ground`, with the `**Token:**` it applies to; `check.mjs design` fails an unknown use and a use with no token. `check.mjs roles <piece.html> --design <DESIGN.md>` fails a band (a section, header, footer, main, article, aside or body, or a box at least 160 px tall or with at least 48 px of padding) whose background resolves, also through a CSS variable, to a colour whose use leaves out `block` and `ground`.
- D19 [T] A component may carry `**Part:** <name>`, a `data-part` name in lowercase, digits and hyphens. `check.mjs parts-set <a.html> <b.html> ...` holds the pages of a site to the rule E9 holds an email set to.
- D20 [T][J] `SKILL.md` has a section for a site or a set (brand kit first, colour density held to the accepted page, colour roles, locked signature parts, varied layout devices, one signature device carrying existing copy, real photographs, the first call to action under the headline, interactions with reduced motion offered with the first build) and a section for rounds that go nowhere (after two rejected rounds of polish or tools: stop, name the root cause, offer directions or ask for the material).

**Intake, in `design` and `gropius`.**

- I1 [T] All open questions go in one message, and a question the request, `DESIGN.md` or an earlier brief already answers is not asked; the brief says where the answer came from.
- I2 [T] The brief's `Intake` holds each answer as given, not tidied.
- I3 [T] An unanswered question is written down as `not answered`, the research step treats it as open, and nobody fills it by guess.
- I4 [T] The writer does not ask again: the writer reads `Intake` and lists what is still missing, and `gropius` asks once more, in one message.
- I5 [T] The grill is skipped when the owner has named the designer and a complete brief file already exists.
- I6 [T] A conflict with a project rule still stops and asks (section 2).
- I7 [T] The intake asks, in the same message, for the material: the copy, past pieces, a brand kit, the mood pictures and the photographs or people the piece may use. A brief made before the mood pictures arrive is made again when they do.
- I8 [J] Each reference picture is read as an image; the brief's `Research` names each move taken and the picture it came from. A move is taken, a mark (a logo, a character, a product's look) is not. A picture that does not open is reported. A set of options includes one that takes the owner's existing work further, and each round says what changed and what asked for it.

**The brief and the research step, in `design`.**

- BRF1 [T] `check.mjs brief` accepts a valid brief with the eleven sections (Audience, Job, Tone, Must not look like, Surface, Intake, Idea, Insight, Story, Research, References) and rejects one missing any of them, a `Two words:` line that does not have exactly two words, a `Story` with fewer than 3 or more than 5 beats, a beat with no `carried by`, and an `Idea` or `Insight` left empty. It names the missing sections. Everything D13 rejected it still rejects.
- BRF2 [T] A piece that needs no story (a logo mark) may write `Story: none. Reason: <why>` and no beats. Idea, Insight and the two words stay required.
- BRF3 [T] A brief written to the old six-section shape fails until it is brought up to date; `tells` exits 3 on it. No brief file is kept in the repo, so nothing in the repo breaks.
- RES1 [T] `check.mjs research` as D16.
- RES2 [T] `RESEARCH.md` states the rules R1 to R10, the template P1 to P7 and the ranking line (a register is level 5, an optional reference below the brief and `DESIGN.md`), and names no other package.
- RES3 [T] No file under `skills/` contains `/suits:` or the name of the researcher of the other package; the second check is new in `check-skills`.
- RES4 [T] Each `REGISTERS.md` has, for every register, a date, a review-by date, the Layout, Type, Colour, Story and CTA headings and at least one source URL. `check-skills` takes `--as-of <date>` (default today, the only clock read) and warns on an overdue register; the warning never fails the check.
- RES5 [T] Each job's `SKILL.md` (`email`, `screens`, `brand`) names its own `REGISTERS.md`, the same test the repo runs for `REFERENCES.md`.
- RES6 [J] The acceptance run (section 9, step 12) shows the step reads a picture before writing a rule from it.
- RES7 [T] (added 2026-11-12) `RESEARCH.md` gives the piece layer (P1 to P7) to the designer who takes the piece, and keeps the job layer with the lead. A `Where to look` table names, for each craft, the places open to a fetch and the places to read only in the owner's browser, split by each site's `robots.txt` as read on a stated date; Pinterest and Google Images are in every row, because the owner named them and both close their search pages to automated readers. R6 forbids any other way in (a downloader, a mirror, a changed client name). `The owner's browser` sets the one exception: asked first, the owner signs in, no password is asked for or typed, one page at a time, no feed scroll, board save or batch download, only the P1 pictures kept, the row marked `owner's browser`, and a gap with its substitute when the owner is away or says no. Decided by the owner over third-party downloaders, which go round the block and can get the owner's account shut.
- RES8 [T] (added 2026-11-12) Each designer's `/bauhaus:design` trigger includes a piece with no visual research yet and names the designer's craft rows of `Where to look`, and every craft row belongs to a designer; the lead's trigger runs only the job layer. Whether the designer reads the pictures well stays a judgement for the reviewer (RES6).

**`concept` (tool, the writer's). Owns `REFERENCES.md`.** Its rows WR1 to WR5 are opened sources only, and no cast name appears in them.

- W1 [T] The writer owns the idea, insight, story and words of the pieces made in this package.
- W2 [T] The idea comes from a fact found in the research, never from the writer's taste alone.
- W3 [T] The idea passes the two-words test: if it cannot be cut to two words, it is not yet one idea.
- W4 [T] The story is 3 to 5 beats and each says what carries it; it reads from the pictures, crops and order before it reads from the copy.
- W5 [T] A formula does not replace an idea: a line defended only because it follows the rules fails.
- W6 [T][J] Plain words: the way people speak, short words, short sentences, no jargon, read aloud and then edited.
- W7 [T] The words say plainly what the reader should do.
- W8 [T] No spec, date, figure or performance claim in the words unless a research row backs it.
- W9 [T] The designer may send a line back when it does not fit the picture; the writer changes the line and does not argue the layout.
- W10 [T] The words are a file, not slots: `words.md` has the columns Slot, Words and Research row, with the slot ids the designer's layout uses; the designer places the words and writes none.

**`ogilvy` (character). The writer.**

- WRT1 [T] Same section, register and attribution tests as GRO1 and the CAST1 scan. The character file describes the craft only: no biography, no year, no words put in his mouth.
- WRT2 [T] Calls only `/bauhaus:concept`. Trigger, stated as a fact about the task: the piece has no idea, insight, story or words yet.
- WRT3 [T] States the boundary: the writer owns the words of the pieces made here; donna keeps long documents and the PDF build. Routing: `gropius` hands the brief to the writer (`handed to ogilvy`), and the writer hands `words.md` to the designer.

**Comp-first email, in `email`.**

- CMP1 [T] An email starts as a whole-page comp in FigCraft, 600 px wide, and is built as HTML with live text only after the owner has seen it.
- CMP2 [T] The owner sees the comp before the HTML is built. This is a gate.
- CMP3 [T] The comp's type, sizes and button are the spec for the HTML. The built HTML uses a 600 px container (it passes E2's 640 limit), live text and a real button, and its render is set beside the comp at the same width.
- CMP4 [T] The lint (E2) and the tells check run on the HTML, never on the comp. A comp is looked at by eye, with contrast pairs checked one by one; there is no comp mode in `check.mjs`.
- CMP5 [T] A tells run that exits 3 on a comp is reported as `not run`, never as a pass (the rule of C7).
- CMP6 [T] The email's output set is `comp.figcraft`, `comp.png`, `research.md`, then `email.html`, its assets and the two renders; `words.md` takes the place of blank slots.
- CMP7 [T] A picture is used at the size it was supplied, and not enlarged past the ceiling the research recorded for it.
- CMP-A [R] A comp exports at 600 px wide and the built HTML's container is 600 px; both render.
- CMP-B [T] `email/SKILL.md` states CMP1 to CMP7 and still says "not tested in Outlook for Windows" (E5, unchanged).
- CMP-C [J] The critique reads the built email against the comp and reports a move that was lost.

**`brand` (tool). Identity: colour, type, mark. Writes `DESIGN.md`.**

- B1 [T][R] Output is a `DESIGN.md` that passes D7 and a token file that passes D10, with the mark (file, clear space, minimum size) as a foundations entry, type roles with a fallback stack, and the `document` group of D11 filled. The `DESIGN.md` references the token file and copies no value from it.
- B2 [R] The logo is generated by `vectorcraft-cli run` and the step command is saved beside it, so the SVG can be regenerated. A hand-written SVG fails the criterion. Check: the saved command re-runs and writes a file with the same byte length (or the differences are listed).
- B3 [R][T] The SVG parses as XML, has a `viewBox`, is at most 20 KB, and `vectorcraft-cli info` reads it with no import warnings.
- B4 [T] Every text-on-background pair listed in `DESIGN.md` section 6 resolves in the token file and has a ratio computed by `check.mjs`, at least 4.5:1 for text and 3:1 for UI parts and large text.
- B5 [R] A specimen sheet (palette, type roles, the mark at three sizes) is built with `figcraft-cli run` and rendered with `render` to a PNG.
- B6 [J] When a `DESIGN.md` already exists, `brand` changes only the entries the brief names, and a changed entry gets a new `Decided` date and replaces the old entry (git keeps the old one).
- B7 [T] Names and taglines come from the writer's file (`words.md`). `brand` writes none itself, and a brief that supplies the words is passed on unchanged.

**`email` (tool). HTML email layout and look.**

- E1 [R][J] Output set: `comp.figcraft`, `comp.png`, `research.md`, then `email.html`, its image assets as PNGs, and a render of the HTML at 640 and 375 pixel widths. The words come from `words.md`, the writer's file, and the output set gains the comp (CMP6); the designer places each line in its slot and writes none.
- E2 [T] `check.mjs email` fails on: an `<img>` with no `alt`; a call to action that is only an image (an `<a>` whose only child is an `<img>`); no live text in the body; a layout container wider than 640 px; any pattern in `LIMITS.md`'s blocking rows (for example `display:grid`); any banned tell from D1 that is machine-detectable.
- E3 [T] `LIMITS.md` is a table of: feature, a regex the lint applies, client, support, test date, source URL. A row without a date or a URL fails the repo check. The skill says rows move and must be re-read from caniemail at write time, with the date of that reading in the hand-over. Rachel's rows (Outlook for Windows: no `background-image`, no `display:grid`; Gmail: no `prefers-color-scheme`) are the seed, with the 2023 test dates she named. I did not re-read caniemail today.
- E4 [T] Every colour pair in the email passes D6.
- E5 [T] The hand-over says "not tested in Outlook for Windows" until a real test exists. Which rendering engine Outlook for Windows uses today has no primary source (rachel), so the skill says so and cites caniemail.
- E6 [J] Dark mode: the skill states that Gmail recolours on its own and the sender's `prefers-color-scheme` does not reach it (inferred by rachel from caniemail), so legibility must not depend on it; images carry no background that fails on a dark client.
- E8 [T] `check.mjs email --words <words.md>` fails a line on the page that is not in `words.md`, a line out of the order of `words.md`, and a line of `words.md` left off the page. Text inside an element marked `data-part` is the brand's and is not read. With no `--words` the output says the words were not read.
- E9 [T] `check.mjs email-set <a.html> <b.html> ...` fails a `data-part` that is missing from one email of the set, or whose markup differs from the first email's once its text is taken out, and fails a set with no marked part.
- E10 [J] The email copies the locked parts from section 4 of the `DESIGN.md` and redraws none; a project with no `DESIGN.md` gets one from `brand` first. `critique` reads a generated photograph for its action, its register, a machine look and its match with the persona, and says whether the grade or a new image fixes each finding.
- E7 [R] The HTML renders headless in Chrome (`google-chrome --headless=new --screenshot` under `timeout 60`, because Chrome is not an ArtCraft app) to a PNG at both widths. A real Outlook for Windows test is not available here.

**`screens` (tool). App and web screens.**

- S1 [T][J] First step: find and read the project's own rules (a `CLAUDE.md` or `AGENTS.md`, `docs` files on UI idioms or themes, a design gate in the build file, `DESIGN.md`). The output starts with `Rules applied:` as a list of `file:heading`, or `No project rules found`.
- S2 [T] It states the precedence list of section 2.
- S3 [R][J] Deliverable: a screen spec (purpose; entry and exit; states: empty, loading, loaded, error; components; every string on screen; accessibility notes; rules applied) and one PNG per state from `figcraft-cli` at the project's target size. It writes no app code.
- S4 [T] The checklist carries WCAG 2.2 targets: pointer targets at least 24 by 24 CSS pixels (SC 2.5.8, Level AA, new in 2.2; text read at w3.org today), contrast per D6, reflow at 320 CSS pixels (SC 1.4.10, rachel's read). Where a project rule is stricter (a 44 point target), the project rule wins. The other 2.2 criteria it lists (focus not obscured, dragging movements, accessible authentication) are to be quoted from w3.org at write time; I did not read them.
- S5 [J] If a project rule says states keep the same dimensions (the asenso idiom "State Consistency Across Async States"), the spec names the reserved dimension once and every state uses it. This is the example the acceptance run uses.
- S6 [T] Optional lookup: when ui-ux-pro-max is installed, the skill may name `/ui-ux-pro-max:ui-ux-pro-max` once, as a lookup for style, palette or type ideas, never required, never above project rules, and says its output is a suggestion. It copies none of that package's data.
- S7 [T] UI strings on a screen are specified in the project's own shape (its l10n rules win). Document-length text stays donna's; the words of a piece made here come from the writer's file, and a screen's strings follow the project's l10n shape. See open question 5.

**`handoff` (tool). Finished pages to Figma and to a developer. Owns `figma.mjs`, `extract.js`, `runtime.js`, `bundle.mjs`.** Added 2026-11-10 from the Omii website project (owner's decision).

- H1 [T] `figma.mjs build` turns a page layout into Scripter scripts that run with no error against a stand-in for the Figma plugin API, and `figma.mjs check` fails a script that throws. The images are inside the scripts; nothing is dragged in.
- H2 [T] The converter skips an element that does not render (0 by 0), keeps text that sits bare in a flex box beside an icon, turns a border on one side into a line, copies an SVG group's stroke and fill onto each shape, sets a dotted or dashed stroke again after import, and places text on a path as one layer per letter.
- H3 [T][R] `figma.mjs extract` reads a page in headless Chrome with the page's own scripts left out, and removes its temporary files.
- H4 [T] Every script wraps its body in `async function main()` and says in its first lines to paste into a new Scripter script. A script run twice leaves one copy of its part.
- H5 [T] `bundle.mjs` writes one HTML file with a tab per page, each image inlined once, the page links switching tabs, a Desktop / Mobile switch and an Interactions tab read from `interactions.md`.
- H6 [J] The scripts go to the owner one at a time, with a screenshot asked for after the first part of each frame; a missing part is fixed in the converter, not by hand in the file.

**`critique` (tool). The craft pass on a finished piece.**

- C1 [T] Input: the piece's path, the brief, and `DESIGN.md` if any. The piece types are `.html`, `.png`, `.pdf`, `.figcraft`.
- C2 [R][T] It runs the deterministic checks first: contrast pairs (D6), banned tells, `check.mjs email` for an email, `pdfcraft-cli check` and `audit` for a PDF. It then renders the piece to PNG (`figcraft-cli render`, `pdfcraft-cli render`, or headless Chrome) and reads the image.
- C3 [T] It runs only on a piece this session did not make; its first line names the maker as given. If it was made here, it says so and stops.
- C4 [T] Findings are ranked, at most 12, each with a location, the brief line or rule it breaks, and a fix. It uses `fix` and `consider`, not louis's BLOCKER vocabulary.
- C5 [T] It edits nothing it reviews. It states it is a craft pass and not a sign-off, and that louis rules against the rules and the numbers.
- C6 [J] On a piece with a seeded defect (a failing contrast pair, an image-only button, a tracked-caps kicker), it reports each seeded defect.
- C7 [T][R] `check.mjs tells <piece> --brief <brief> [--brand <tokens>]` runs the file checks, then the render checks, and exits non-zero on any tell in `design/TELLS.md` (section 10) that the brief or the brand data does not name. Exit codes: 0 no tell; 1 at least one tell; 2 the piece cites fewer than three reference rows; 3 a check could not run (for example no brand grid, so T20 cannot be computed, which counts as a failure, never a pass). T27 is a warning and never changes the exit code. The report's first line is `FAIL: <n> tells` or `PASS: no tells`. A pass is never read as approval (C5).
- C8 [T][J] It fails a piece that cites no reference row (exit 2), reads the craft's `REFERENCES.md` before judging taste, cites the row a finding rests on, and runs a side-by-side of the render against one chosen reference row (a reviewer step the script cannot do).
- C9 [T] Copy tells (T25 to T27) are reported as findings for the writer to fix, because the words are the writer's; T25 and T26 still count toward the exit code and T27 stays a warning. Critique also judges the piece against the brief's `Idea` and `Story` and reports a lost move of the comp (CMP-C).

**`gropius` (character). The lead.**

- GRO1 [T] Has **When to call** (default is not to call; one trigger per tool, stated as a fact), **Hard rules**, **Hand over** and **Voice** sections. The **Voice** section says the register is plain professional, that no real person's voice is imitated and that no words are attributed to anyone, and carries one sample line of at most 30 words about the work.
- GRO2 [T] Calls only `/bauhaus:design` and `/bauhaus:critique`. Triggers: `design` when no brief file exists for the piece; `critique` when a finished piece exists that this session did not make.
- GRO3 [T] States that no piece starts without a brief file (section 10), that the precedence list of section 2 applies, and that work is handed to `bayer` (brand, logos, email) or `breuer` (app and web screens) with the brief and `DESIGN.md`. He makes no piece himself.
- GRO4 [T] Names no build process, no tool of it and no team size, and attributes no words to a real person.

**`bayer` (character). The graphic designer: brand, logos, email, critique.**

- BAY1 [T] Same section, register and attribution tests as GRO1.
- BAY2 [T] Calls only `/bauhaus:design`, `/bauhaus:brand`, `/bauhaus:email`, `/bauhaus:ground`, `/bauhaus:critique`. Triggers: `design` when no brief file exists for the piece; `brand` when the brief asks for an identity or no `DESIGN.md` exists; `email` when the piece is an HTML email; `ground` when the brief names a ground or a dither; `critique` when a finished piece exists that this session did not make.
- BAY3 [T] States the split: the writer owns the words of the pieces made here and donna keeps long documents and the PDF build; this character owns layout and look; louis reviews. App screens go to `breuer`.
- BAY4 [T] Names no build process, no tool of it and no team size.

**`breuer` (character). The UI/UX designer: app and web screens.** (Or `albers`, open question 19; the criteria do not change.)

- BRE1 [T] Same section, register and attribution tests as GRO1.
- BRE2 [T] Calls only `/bauhaus:design`, `/bauhaus:screens`, `/bauhaus:critique`. Triggers: `design` when no brief file exists for the piece; `screens` when the task is an app or web screen; `critique` when a finished screen exists that this session did not make.
- BRE3 [T] States that the project's rules and its design gate come first, and that it writes no app code.
- CAST1 [T] The scan over all character files and docs pages: none contains a cast name followed by a speech verb ("said", "wrote", "believed", "argued", "taught that"); none quotes a sentence; none contains any of the avoided topics (section 4, voice rule).

**`mies` (character). The space designer: form, plans and structure.**

- MIE1 [T] Same section, register and attribution tests as GRO1, and the CAST1 scan.
- MIE2 [T] Calls only `/bauhaus:design`, `/bauhaus:massing`, `/bauhaus:plans`, `/bauhaus:critique`. Triggers, each a fact about the task: `design` when no brief file exists for the piece; `massing` when the task is the form or volume of a building or space; `plans` when the task is a floor plan, a section or a sheet; `critique` when a finished piece exists that this session did not make.
- MIE3 [T] States that the job is space, not page layout: page grids, type and screens stay with `design`, `brand` and `screens`, so there is no second owner of a grid. A structural grid on a plan is a layout of columns and spans and is not the `grid` group of a token file.
- MIE4 [T] The hand-over of every piece carries the line: "This is a design study, not an engineered design. It has no structural calculation and no code check." The test fails a hand-over without it, and fails any sentence that says a piece is engineered, load-bearing, proven or code-compliant without denying it.
- MIE5 [T] Routing: `gropius` hands space work to `mies`.
- Sample line: "The study has a 12 by 8 metre plan and three closed bodies. It is a design study, not an engineered design, and no code is checked."

**`massing` (tool, SolidCraft). Form and volume in 3D.** Produces `massing.json` (the script, the source of truth), `massing.sc`, `massing.step`, `massing-iso.png`, `massing.measure.json`, `massing.sh` and, when a plan is wanted, `massing-plan.dxf`.

- MAS1 [R] `solidcraft-cli run massing.json --out massing.step --save massing.sc` exits 0 under `timeout 20`, and the STEP file starts `ISO-10303-21;`.
- MAS2 [R][T] `eval` reports every body `closed: true`; a body that is not closed is a failure, not a note. The hand-over's footprint, height and volume equal `eval`'s, and the volume is labelled as the sum of the bodies, so overlaps count twice.
- MAS3 [R] Running `massing.json` again into a fresh directory gives the same `total.volume_mm3`. The script, not the model file, is what is saved and handed on.
- MAS4 [T] Every `solid.*` step names its body with `body_name`, not `name`. A body named `Body1` fails.
- MAS5 [R] `snapshot --view iso` writes a PNG at the stated size, and the file is read as an image before the hand-over claims it shows the study.
- MAS6 [R] The plan DXF is written only with a parallel camera (`"pitch":1.5707963`, `"fov":0`), and `cadcraft-cli info` opens it. A parallel top view shows the roof outline, so a plan comes from `plans`, not from this DXF.
- MAS7 [T] Confinement: every `--out`, `--save`, `--json-out` and every `path` in the script is absolute and under the output directory; no `--allow-any-path`, no `mcp`.
- MAS8 [J] Craft rules, each citing an opened row of `REFERENCES.md`: proportions stated as ratios of the plan, and a body named for what it is with the material not disguised. A rule that rests on no opened row is not written.
- MAS9 [T] The hand-over has the MIE4 line and the unit (millimetres), and says what the study does not have: no floors, stairs, openings or structure unless the script made them.

**`plans` (tool, CADCraft). Plans, sections and sheets in 2D.** Produces `plan.dxf`, `plan.pdf`, `plan.svg`, `plan.png`, `plan.sh` and `structure.md`.

- PLN1 [R] `cadcraft-cli run --metric … --save plan.dxf --export plan.pdf` exits 0 under `timeout 20`; `convert` makes the SVG and the PNG; there is exactly one `--export` per run.
- PLN2 [R][T] `cadcraft-cli info plan.dxf` lists layers for walls, dimensions and notes, and the hand-over names them.
- PLN3 [R][T] The drawing declares metric units and the hand-over states the unit. A drawing with no unit fails.
- PLN4 [R][J] Every overall dimension is present, a `dimstyle` that sets the text height is in the saved command, and the dimension text is legible on the PNG at the sheet size. Legibility is judged by reading the render.
- PLN5 [R] `pdfcraft-cli check plan.pdf` prints `checked 1 files: {"ok": 1}`.
- PLN6 [J] The structure note names a grid or module, the spans, a load path and the material, each citing an opened row, and states that the load path is an analogy for the layout, the skill's own design and not a source claim.
- PLN7 [T] The MIE4 line is in the hand-over and on the sheet as a `text` entity in the title block.
- PLN8 [T] Confinement as MAS7, plus `CADCRAFT_CONFIG_DIR` set under the output directory.
- PLN9 [T] `critique` takes the PNG or the PDF; the SVG and the DXF it does not (C1). The hand-over says so, and `critique` is not widened.

**`moholy-nagy` (character). The shot and motion designer.**

- MN1 [T] Same section, register and attribution tests as GRO1, the CAST1 scan, and the two name tests: the name is written in full, and no other first name is used.
- MN2 [T] Calls only `/bauhaus:design`, `/bauhaus:shots`, `/bauhaus:storyboard`, `/bauhaus:motion`, `/bauhaus:critique`. Triggers, each a fact about the task: `design` when no brief file exists; `shots` when the task is the shots of a film or a sequence; `storyboard` when the task is the frames of a film in order, or an animatic; `motion` when the task is an animated title, graphic or effect; `critique` when a finished frame exists that this session did not make.
- MN3 [T] States the boundary with the photographer: a still photograph goes to `peterhans`, named in prose only; the shot list holds light only as a note column.
- MN4 [T] Claims no film made, no shot taken and no footage cut. Every hand-over says it is a plan and a draft, not a cut.
- MN5 [T] The SKILL.md has a `## Stance` of three to six lines in the third person, paraphrased and with no quote, placed after Hard rules and Hand over and before Voice.
- MN6 [T] Routing: `gropius` hands film and motion work to `moholy-nagy` after the writer, with the brief, the words file and `DESIGN.md`.
- Sample line: "The shot list has twelve rows in three scenes, each scene with its axis named. Two rows break the axis and are flagged for the owner."

**`shots` (tool, FilmCraft). The shot list.** Produces `shots.md` (the table), `shots-base.jsonl` and `shots.jsonl` (FilmCraft steps), `shots.fcproj`, `shots.edl`, `shots.otio`, `frames/f<nn>.png` and `shots.sh`. The table is this package's own form, marked inferred: its columns are `No`, `Size`, `Angle`, `Movement`, `Lens`, `Subject`, `Sec` and `Note`. `Sec` is the planned length of a shot in seconds, which the markers need to know where each shot starts.

- SHO1 [T] Every size is one of ELS, LS, FS, MWS, MS, MCU, CU and ECU, and every shot number is unique and runs from 1 with no gap, across scenes.
- SHO2 [T] Each scene states its axis in one line, and a row that crosses it says `crosses the axis` in its note and is listed in the hand-over.
- SHO3 [R][T] `filmcraft-cli … run` of the two step files exits 0 with `"ok":true` on every line, and the exported EDL has one `* LOC:` line named `S<nn> <size>` for each row. The markers sit on a placeholder matte as long as the list, because an empty sequence exports no marker.
- SHO4 [T] The marker comment holds the angle and the movement, and each marker starts at the sum of the lengths before it, so the table and the project agree. A change to one without the other fails the round-trip test.
- SHO5 [R] A frame at each shot start renders with `render --seconds S --out f.png`; where media is offline `render` exits 1, the hand-over lists it and `--allow-offline` is never passed.
- SHO6 [T] Hand-over: shot list and markers, not a cut; the media used and whether any is offline; and that `critique` takes the PNG frames and no Markdown or EDL. The OTIO file is written and not read, and the hand-over says so.
- SHO7 [J] Each craft rule cites an opened `secondary` row (shot sizes, camera angles, moving the camera, the 180-degree rule, continuity). No lighting rule is written, because the opened Lighting page covers equipment, not setups; light is only a note column.

**`storyboard` (tool, FigCraft then FilmCraft). The frames and the animatic.** Its input is the shot list and the brief's `Story` beats: the panels draw the shots, the beats say what each scene shows, and the tool never invents a story. Produces `storyboard.json`, `storyboard.figcraft`, `frames/S<nn>.png`, `storyboard.fcproj`, `animatic.jsonl`, `animatic.gif` and `storyboard.sh`.

- STO1 [R] One top-level frame per shot named `S<nn>`, made with `figcraft-cli run` (`frame.create` with `props.fill`, `text.create` with `parent` the frame id), roots and `--no-system-fonts` set, exported with `export -o frames/ --format png`.
- STO2 [T] The number of frames equals the number of rows in `shots.md`, and the names match.
- STO3 [T] One aspect ratio is stated once and every frame uses it.
- STO4 [R] `filmcraft-cli import` of the frames and `run animatic.jsonl` exit 0; `inspect sequence` shows one clip per frame in order.
- STO5 [R] Each still is placed on its own with its `duration` in seconds, because `items` with a `duration` is refused, and `inspect sequence` shows each clip as long as the `Sec` column times the frame rate.
- STO6 [T] Hand-over: framing panels, not drawings, and not a cut. `critique` takes the PNG frames.
- STO7 [J] Continuity: panels of one scene keep the screen direction of the scene's axis (opened rows on the 180-degree rule and continuity).
- STO8 [T] The brief's `Story` beats are the input: every beat is carried by at least one panel and named in the hand-over, a panel with no beat is listed, and a brief with `Story: none` gets panels from the shot list alone with the reason stated.

**`motion` (tool, EffectCraft). An animated title or graphic.** Produces `motion.json`, `motion.ecproj`, `motion.sh`, `poster.png`, `motion.gif` and the side file `.motion.ecproj.lock`.

- MOT1 [R] The project is built by `effectcraft-cli --empty --json --save-as motion.ecproj run --commands motion.json`, every `set` carries `--save` (a `set` without it is lost), and `get` at the midpoint returns two keys.
- MOT2 [R] `render-frame --comp C --time T --out poster.png` writes a PNG at the composition size; `render --format gif` writes an animation. The poster is always made: it is the reduced-motion version.
- MOT3 [T] The brief states whether a reduced-motion variant is needed; the poster frame is delivered either way (the accessibility floor outranks a trend).
- MOT4 [T] Every text-on-background pair in the poster passes `check.mjs contrast` (4.5:1 for text, 3:1 for large text).
- MOT5 [T] Never `effectcraft-cli script`, `--eval`, an expression field or `mcp`: the saved commands are scanned. Confinement as MAS7.
- MOT6 [J] Timing and move rules cite opened film rows, not a motion-graphics source, because none was opened.
- MOT7 [T] The `Minimum:` line in the brief for a `motion` piece is 2, with the reason `no motion source opened; two secondary film rows`.

**The stance, in each character file** (amendment section 8; ADR 0003).

- STN1 [T] Every character except one listed in `STANCE_LATER` has a `## Stance` section of 3 to 6 lines. `STANCE_LATER` holds `breuer` with the reason, and shrinks as stances are written. A character missing from the cast does not break the test.
- STN2 [T] The `Stance` text passes the same scans as the rest of the file: a cast name beside a speech verb, a quoted sentence, an avoided topic, a persona, biography words, build words, a number of people, and also no first person, no attributing verb, no place and no year.
- STN3 [T] The `Voice` section stays and still carries exactly one sample line of at most 30 words; the `Stance` carries none.
- STN4 [T] The `Stance` section comes after `Hard rules` and `Hand over` and before `Voice`, and is inside none of them.
- STN5 [J] The owner reads a sample of each character's answer and says whether the stance shows. No test can judge that.

**`peterhans` (character). The photographer.**

- PH1 [T] Same section, register and attribution tests as GRO1, the CAST1 scan, and the two name tests: the name is written in full where a first name is used, and no image of anyone's work and no `Lucia` appears anywhere. Calls only `/bauhaus:design`, `/bauhaus:develop`, `/bauhaus:critique`. Triggers, each a fact about the task: `design` when no brief file exists; `develop` when the task is a photograph to develop or prepare; `critique` when a finished image exists that this session did not make.
- PH2 [T] The SKILL.md has a `## Stance` of three to six lines in the third person, written as a method sheet: paraphrased, no quote, no first person, and no place or date, placed after Hard rules and Hand over and before Voice.
- PH3 [T] Takes the brief's `Story` beats as the input of `develop` and invents no story. Routing: `gropius` hands a photograph to `peterhans` after the writer, with the brief, the words file and `DESIGN.md`, and `ogilvy` hands it on the same way.
- Sample line: "The exposure moved 0.5 stop and the temperature stays at 6500. The developed file and the command that made it are in the output folder."

**`develop` (tool, LightCraft). The photograph.** Produces `developed.jpg`, `preview.png`, `develop.sh`, `controls.json` and the side folders `library/` and `xdg/`. LightCraft acts after capture: aperture, shutter speed and ISO are not controls in it, so capture advice is a note and never a step.

- DEV1 [R] `lightcraft-cli render <in> -o <out> --set C=V --size N` exits 0 and writes an image of the stated long edge (run 24).
- DEV2 [R] The library flow `run --library DIR --import F develop.auto develop.set … app.export path=… longEdge=N` returns `"ok":true` on each line with `DIR` inside the output directory, and both exports (the JPG and the PNG preview) come from the one develop, so the preview carries the crop (run 25).
- DEV3 [T] Every control and value the job sets is in the `develop.controls` catalogue and inside its `min` and `max`. The app refuses an unknown id but clamps an out-of-range value without an error, so the job checks the range itself and refuses a value outside it before the run (run 26).
- DEV4 [R] The source photograph is never changed: its hash is the same after the run, the output path differs from the input, and `format=original` is never used. Measured: `--import` writes no sidecar beside the source.
- DEV5 [T] `develop.auto` runs before the manual `develop.set` steps, because it replaces an earlier set.
- DEV6 [R] The job writes a PNG preview of at most 2000 pixels, because `critique` takes `.png` and not `.jpg` (C1).
- DEV7 [T] Never `merge`, `denoise-serve`, `snapshot`, `mcp`, `--connect` or `--bridge`; confinement as MAS7, with the settings, data and cache directories under the output directory.
- DEV8 [J] Each craft rule cites a row of `develop/REFERENCES.md` that is `opened` and `secondary`. The rules are limited to exposure in stops, the direction, hardness and pattern of light, colour temperature in kelvin, composition, a tone curve, and crop and straighten. No rule on product or tabletop lighting setups: no source for one was opened.
- DEV9 [T] The sample line of `peterhans` is at most 30 words about the work, with no biography, no image and no quote.
- DEV10 [T] The brief's `Minimum:` line for `develop` is 2 only with one of the two stated reasons (an editing brief; a still-life or tabletop brief), and 3 otherwise.

**`ground` (tool). Grounds and dither as files.** Owns `REFERENCES.md`, `ground.mjs`, `dither.mjs` and `raster.mjs`. It is the first tool that ships its own generator code (ADR 0004). Produces a PNG, or an SVG for a dither and an ASCII tile, and `ground.sh`, the commands that made them.

- GND1 [T] The dither methods follow their definitions: the Bayer map is built by recursion (the 4 by 4 map is checked by hand, the 8 by 8 map holds 0 to 63 once, a side that is not a power of two is refused), Floyd–Steinberg sends 7, 3, 5 and 1 over 16 and Atkinson one eighth to each of six neighbours (so a quarter of the error is dropped and darks come out darker and lights lighter). Every pixel is an index into a palette of 2 to 256 colours, and the nearest colour is found in linear light (the split between black and white falls at 188, not 128).
- GND2 [T] The grounds: a linear gradient and a mesh gradient are mixed in Oklab, so blue to yellow does not pass through grey; the blur field, seeded grain (zero mean shift, about a third of the amount as spread, in blocks of a chosen size), halftone (coverage falls as the field lightens) and the ASCII tile (an SVG in the generic `monospace` family, each row spread over its columns) are each tested on fixtures made in code. A ground is written as a PNG only. A dither is a PNG or an SVG, and an ASCII tile an SVG or a PNG.
- GND3 [T] Colours come only from the token file: the command line refuses a hex colour, names a token path that is not in the file, reads an `oklch` token as its computed colour and refuses one outside the sRGB gamut.
- GND4 [T] The same input and method give byte-identical files, for every dither method, every ground and the SVG. The seeded generator is defined in `raster.mjs` and is tested for its mean, spread and period.
- GND5 [R] An ASCII tile is drawn to a PNG of the field's size by headless Chrome under `timeout 60`, the PNG is written again by the script, and a second run gives the same bytes. It skips where Chrome is not installed, and `npm run test:artcraft` fails instead.
- GND6 [T] The defaults of section 2 hold: the tool is not called by default; colour stops come only from the token file; a mesh or blur ground is refused unless `--brief` names mesh, blur or aurora; grain and stripes are a PNG and never `feTurbulence`; for email the ground is a PNG at final size.
- GND7 [T] Provenance: `REFERENCES.md` states each method's public definition, whether the primary source or only an encyclopedia page was opened, and the date; the OKLab constants with their sources, licences and date opened; that no text or pseudocode is pasted; that no code from jp2a, libcaca, ImageMagick or FFmpeg is used and none is a dependency; that no palette preset, sample image or font ships; and that fixtures are made in code. A test fails on any binary file or `data:` URI in the folder, on an import other than Node's own modules and the folder's own files, and on a dependency in `package.json`.
- GND8 [T] No text of the tool, its docs page or its decision names another product as the model or says the tool is a copy of one, and none calls into suits.

### 4. Characters (theme: Bauhaus)

**From `notes/design-package/theme-options.md` (rachel, 2026-11-07).** The owner chose the theme and approved the cast. The package and repo are `bauhaus`, at `/home/tan/projects/bauhaus`. The cast are real historical people who are dead; their names are used as names only (section 1). Facts below are rachel's, from English Wikipedia pages, which she calls a lead and not a primary source: tag **found (secondary)**, and I did not re-read the pages. Whether any estate or foundation restricts the use of a name was not checked.

| Person | Role | Found (secondary) | Fit, as rachel tagged it |
| --- | --- | --- | --- |
| Walter Gropius, 1883 to 1969 | Lead; frames the brief, hands off, runs the craft pass | Founded the Bauhaus in Weimar on 1 April 1919 and directed it to 1928; architect; the school's aim was to combine the crafts and the fine arts | Good. "Technology" standing in for "science" is inferred |
| Herbert Bayer, 1900 to 1985 | Graphic designer: brand, logos, email | Directed printing and advertising at the school; an all-lowercase sans-serif for most of its publications; a Universal Typeface proposal that was never cast; the ARCO logo and corporate branding; design chair at a packaging company | Strong for brand and logos. Email is inferred from his printed-matter work |
| Marcel Breuer, 1902 to 1981 | UI/UX: app and web screens | Headed the carpentry shop; tubular-steel furniture; later large buildings | An analogy only: objects built for the body. "Design for use" is not on the page, so the fit is inferred |
| Josef Albers, 1888 to 1976 | The colour science inside `design`; or UI/UX (open question 19) | Taught the preliminary course; wrote *Interaction of Color* (1963), colour studied by experiment | Strong for colour. As UI/UX, inferred |
| László Moholy-Nagy, 1895 to 1946 | Shot and motion designer: shots, storyboards and animated titles | Photograms; light-based work; films including a silent black-and-white short of about 5 to 6.5 minutes | Strong on light. The role is by craft: the film rows are secondary pages, and the fit to a role is inferred |
| Walter Peterhans | Photographer: a photograph developed or prepared | Taught photography at the school from 1929 (secondary: two biography pages agree on the year) | Strong on the craft of the still image. The fit to a role is inferred; the name only is used, and nothing else about the person is kept |
| Ludwig Mies van der Rohe, 1886 to 1969 | Space designer: form, plans and structure | Architect: space, form and structure | Strong |
| David Ogilvy, 1911 to 1999 | Writer: the idea, insight, story and words of the pieces made here | Found in the research notes (`creative-group-research.md`, part 1b) and the owner's pick; his method rows are in `concept/REFERENCES.md`, each from an opened source | Good. The craft is a written method for words; he is not a person of the school (see the theme change below) |

- **Theme change (ADR 0002).** The writer is the one cast member who is not a person of the school: the cast stops being only people of the Bauhaus. `docs/adr/0002-the-writer-and-the-cast.md` records the theme change and the reason, and the README cast table gains the row. The statement that the cast are dead stays true, and the rule for him is the rule for every character: craft only, no biography, no year and no words put in his mouth.
- **Paraphrase, never quote.** Gropius gave a lecture at the 1923 Weimar exhibition on art and technology as a new unity (secondary: seen in search results, English wording varies, full text not opened). No file in the package quotes it or puts words in his mouth; where it is mentioned, it is mentioned as a paraphrase only. The same holds for every cast member.
- **Skills are described by craft** (grid, light, colour, structure, the brief, the screen), not by biography. No skill text, docs page or test asserts a biographical fact; this table is the rationale for the casting, and sits only in this spec and the ADR.
- **The voice rule.** The register is plain and professional everywhere. A voice would be an imitation of a real person, so none is attempted: suits's **Voice** section is kept for its safe part (a plain sample line, the register rule, speaks only to the owner) and drops the persona. **No character file, docs page or sample line mentions** the closing of the school under political pressure, anyone's exile or emigration, the 1937 exhibition of "Degenerate Art", Bayer's 1936 brochure, any illness (including Moholy-Nagy's) or any death date. A test scans for the words (CAST1).
- **The stance.** A stance is a short plain description of what a person's craft puts first, what it asks and what it refuses: three to six lines in a `## Stance` section of the character's `SKILL.md`, after `Hard rules` and `Hand over` and before `Voice`, in the third person and in our words, each line resting on an opened research row listed in ADR `0003`. It is not a voice: it says what the craft does and never how anyone sounded, and the `Voice` section keeps the plain professional register and one sample line. The avoided topics above apply to a stance unchanged. `breuer` has none until a text of his own is opened.
- Sample lines (30 words or fewer, plain, about the work):
  - Gropius: "The brief file is missing. Write it first: audience, job, tone, and what this piece must not look like."
  - Bayer: "The email has live text and a real button, and every pair passes 4.5:1. One tell remains: a tracked-caps label above the headline."
  - Breuer: "The screen has four states with one reserved height. Rules applied: three, listed by file and heading."
  - Mies: "The study has a 12 by 8 metre plan and three closed bodies. It is a design study, not an engineered design, and no code is checked."
  - Moholy-Nagy: "The shot list has twelve rows in three scenes, each scene with its axis named. Two rows break the axis and are flagged for the owner."
  - Peterhans: "The exposure moved 0.5 stop and the temperature stays at 6500. The developed file and the command that made it are in the output folder."
- **Moholy-Nagy** is specified in section 3, on the opened Wikibooks and Wikipedia pages on shot sizes, camera angles, moving the camera, the 180-degree rule and continuity, all secondary. The film canon (Mascelli, Katz) is lending-only and stays pointers. **Mies** is specified in section 3, on Vitruvius and Ruskin, which are free and were opened; Ching and Alexander stay pointers.

- **Name.** `bauhaus` has no exact plugin clash in the local catalogues or one web search (rachel; one search is not exhaustive). Two near-name plugins exist (`bauhaus-digital`, which designs interfaces and slides with a Bauhaus basic course, and `bauhaus-code`), an unrelated npm package named `bauhaus`, and a German hardware retailer holds the trademark (weakly sourced; the registers were not searched). Goods differ and the plugin is private with no releases, which lowers the risk. Open question 20.

### 5. The `DESIGN.md` format

**From `design-systems-trends-research.md`, Part 1 (how eight public systems are built) and Part 4 (what a project's DESIGN.md should hold). Part 4 is the researcher's inference and says "the package owner decides the final list"; this section is that decision, for the owner to confirm.** The eight systems read were Material 3, Apple's guidelines, Carbon, Polaris, Primer, Atlassian, GOV.UK and Spectrum. For Material 3 and the Apple guideline pages the researcher could read only page titles, so nothing here rests on their body text.

`DESIGN.md` sits at the root of the project being designed, not in the package. Every job reads it first. It records decisions and points at the token file; it does not copy token values.

Five habits recur across the systems and are borrowed (the researcher's inference): role-based tokens in tiers, status labels on components, a dated change log, evidence kept beside the guidance, and a stated accessibility floor. The entry shape (the pick, **Why**, **Rejected**, **Decided**) is kept from the `plating` skill's `TEMPLATE.md` (read in full): exact values, a changed decision replaces its entry, git keeps the old one. Nothing is copied from `plating`, nothing depends on it, and sections a `DESIGN.md` written by `plating` has that this format does not know are preserved and never rewritten.

**Front matter**

```yaml
---
project: <name>
design-md: 1
tokens: design.tokens        # path to the token file
tokens-format: dtcg-2025.10
rules-win:                   # project rules that outrank this file
  - <path>#<heading>
---
```

**The 11 sections, in this order** (the linter checks the headings and their order):

| # | Section | Holds |
| --- | --- | --- |
| 1 | Brand and references | The brand, the references and the constraints that rank first, with links. The brief comes before every system. |
| 2 | Foundations as roles | Colour, type, spacing, shape, motion and elevation or material, each named by role, each an entry with its reason. The mark (file, clear space, minimum size in px) is a foundations entry. |
| 3 | Token source | Path to the token file; the tier names (primitive, semantic, component); naming rules; the modes and their files. References the file and copies none of its values. A note for email, which needs its own inline values because clients invert colours unpredictably. The mapping of donna's six document properties to token paths. |
| 4 | Components and patterns in use | Each with a status (`Trial`, `Stable`, `Deprecated`) and what replaced anything deprecated. Email, screens and print surfaces are patterns listed here. |
| 5 | Content and voice | The voice rules, or a pointer to the project's own style guide. Carbon and GOV.UK both defer to an outside guide. The words themselves are the writer's for the pieces made here, and donna's for documents. |
| 6 | Accessibility floor | The standard in force (WCAG 2.2), the contrast ratios, the tap-target size, reduced motion and reduced transparency, and the colour pairs to check, written as role paths, never as values. |
| 7 | Platform conformance | iOS, Android or web, and which platform material applies. A platform's own material is conformance here, not a trend. |
| 8 | Trends in use | The entry name from the trends file (section 11), the date it was reviewed, and the sentence in the brief that asked for it. Nothing else. |
| 9 | Decisions and evidence | Dated decisions that are not foundations entries, each with its research, test or critique note. |
| 10 | Change log | Dated entries, newest first. |
| 11 | Not to do | Patterns the project has rejected, and why, on top of the package's banned list. |

**The token file** is a project file, beside `DESIGN.md`, not a file of this package.

- Format: the Design Tokens Community Group Format Module 2025.10, a Final Community Group Report dated 2025-10-28 (found by the researcher at w3.org). Files use the `.tokens` extension. A token is an object with a required `$value` and optional `$type` and `$description`; groups nest; aliases are written `{group.token}`. **It is not a W3C Standard and not on the Standards Track,** its status text contradicts itself, and its FAQ says the spec is still evolving. The format version is therefore pinned in the front matter (`tokens-format`), and a later version is a deliberate change, not a drift.
- Tiers, by top-level group: `primitive` (raw values, may be named by hue), `semantic` (named by role, such as text, surface, border, accent; every value an alias to a primitive), `component` (every value an alias to a semantic token). Carbon, Spectrum, Atlassian and Primer tier and name by role in the same way (researcher's inference).
- A `document` group holds the six properties donna's three styles already read (`--accent`, `--ink`, `--muted`, `--line`, `--tint`, `--font`), each an alias to a semantic token. `check.mjs document-css` writes them as CSS custom properties, so a brand restyles a PDF through the property names donna reads and no file moves between repos. This generator is new work and is open question 12.
- Colour: the DTCG colour value is an object with `colorSpace` and `components` (14 spaces are listed, including srgb, oklch and display-p3), with an optional `hex`. For a contrast computation the file must give a `hex`, `srgb` components, or `oklab` or `oklch` components (a `hex` beside components wins). An `oklab` or `oklch` colour with no `hex` gets a computed ratio, by the Oklab definition, when it falls inside the sRGB gamut; outside it the check fails with "cannot compute" and the colour is not clipped, because a clipped colour is not the colour the token names. Another colour space with no `hex` fails the check with "cannot compute", so no ratio is ever guessed.
- Modes: the format module has no modes; the Resolver module does, and its report contradicts itself on its own version string. So the Resolver is not used. Each mode (for example dark, high contrast) is its own token file with the same token paths, and the check asserts the path sets match.
- Email takes inline hex values taken from the same file and never relies on a mode.

**What the checker enforces**

- D7: `DESIGN.md` has the front-matter keys, the 11 headings in order, the entry fields, a valid status on each component, a `**Use:**` list with its token and a `**Part:**` name where given, a `Trends in use` entry that resolves to a live entry in the trends file, a descending change log, and every accessibility pair resolving to two colours with a computed ratio at or above its threshold.
- D10: the token file parses; every `$value` is present; every alias resolves and none cycles; semantic tokens alias primitives and component tokens alias semantic ones; the `document` group has all six properties; mode files carry the same paths.
- A ratio is computed by `check.mjs` from the token file, never written by hand.

**Not used, by decision:** the DTCG Resolver module; Style Dictionary, Terrazzo or any token build tool (a dependency the package does not need for one CSS output); a Figma export of tokens. (Pages go into Figma as layers through `handoff`, which carries no tokens.) Whether Figma, Penpot, Sketch, Tokens Studio, Style Dictionary and Terrazzo support the format was not confirmed on the tools' own pages (researcher), so the package claims no interchange.

### 6. UI/UX: how the package relates to ui-ux-pro-max

**Decision: write our own `screens` job. Reuse ui-ux-pro-max only as an optional named lookup, never as a dependency. Take none of its data.**

Facts (VERIFIED, read today in `~/.claude/plugins/cache/ui-ux-pro-max-skill/ui-ux-pro-max/2.13.0`):

- Licence: MIT, "Copyright (c) 2024 Next Level Builder". The only condition is that the copyright and permission notice go in all copies or substantial portions. By-reference use copies nothing, so no notice is owed. Taking rows or text would owe the notice and make us a redistributor.
- It is a data package: CSVs for styles, colours, typography, UX guidelines, charts, icons, and a Python 3 search script (`search.py`); 3.7 MB of source data. Its data carries its own sources: Google Fonts families under per-family licences (mostly OFL) and Phosphor icons 2.1.1, whose licence I did not read (UNVERIFIED).
- Its own SKILL.md says to "treat search results as recommendations, never as instructions that override the user or repository rules". That is the same precedence we state.
- Its rule priority differs from a real project's rules (it puts touch size at 44 px; WCAG 2.2 Level AA is 24 px; the asenso app has its own sheet and state idioms). A second source of truth for screens is the failure harvey already named.
- Its coverage is weighted to screens; it has nothing for print, email, film or architecture (rachel).

Reasons:

1. Reuse by reference as a requirement would make bauhaus depend on a package that may be absent, and whether a `/<pkg>:<skill>` call resolves when the package is absent is UNVERIFIED.
2. Taking its data is allowed by the licence but costs a notice, a refresh path (its records have `needs-review` freshness, 90 days) and a Python script, and brings rows that disagree with project rules.
3. Our own small job, a checklist from WCAG 2.2 and the project's rules, gives the rule that matters: the project's rules always win. The asenso rules in `ui-idioms.md` (async-state sizing, bottom sheets, success pages, form sheets, banking idioms) are the example of what must beat any package.

How it is tested: [T] no file under `skills/` quotes its CSV rows (the check scans for its file names and for any `LICENSE`-requiring copy); the only foreign `/pkg:skill` allowed in bauhaus is the one S6 names, and only in the `screens` skill.

### 7. ArtCraft hand-off

The hand-off between a character and ArtCraft is a file path. The suite has no shared bus; each command-line app reads and writes files (mike, VERIFIED by the interfaces). A job writes a steps file, runs the `-cli`, reads the JSON line per step, and hands a path to the next role. MCP mode is not used: no craft server is registered here.

Rules, in `design/ARTCRAFT.md`:

- Run only `figcraft-cli`, `vectorcraft-cli`, `pdfcraft-cli`. Never start `figcraft`, `vectorcraft`, `pdfcraft` (no `-cli`): they block. Never call `artcraft-launcher`, not even `--help` (it self-updated the launcher from 0.6.1 to 0.14.1, per mike).
- Wrap every call in `timeout 20` for checks and a longer bound for a real build.
- Write only to the project's output directory, `/tmp`, or the scratch directory.
- Use `--no-system-fonts` on every `figcraft-cli` call that renders, so a render matches on every machine.
- Run only the `-cli` of each app, and add `solidcraft-cli`, `cadcraft-cli`, `filmcraft-cli` and `effectcraft-cli`. The names without `-cli` (`solidcraft`, `cadcraft`, `filmcraft`, `effectcraft`, `lightcraft`) are never started, beside the three above and `artcraft-launcher`.
- SolidCraft is an independent app (its package says so) that the owner uses alongside the ArtCraft suite; it is not made by ArtCraft.
- `solidcraft-cli` and `cadcraft-cli` have no root flag outside `mcp`. Confinement is by absolute output paths under the output directory, settings and data directories set inside it (`CADCRAFT_CONFIG_DIR` and the `XDG_*` variables), the saved command beside each artifact, and a scan test of the saved command and of every `path` inside the script's JSON. One `cadcraft-cli run` writes one `--export`; more formats come from `convert`.
- Each row of the commands table and each verified run carries an app version and the date.

Commands each job uses, and the proof (all runs below were made today from the scratch directory under `timeout 20`; the GUI binaries were never started):

| Job | `figcraft-cli` | `vectorcraft-cli` | `pdfcraft-cli` | Other |
| --- | --- | --- | --- | --- |
| `brand` | `run steps.json --out x.figcraft`, `render x.figcraft -o x.png` | `run --cmd file.new --params J --cmd shape.rectangle --params J --export logo.svg`, `info logo.svg` | none | none |
| `email` | `run`, `render` (with `--scale`, from `--help`, not run), `export -o assets/ --format png` (from `--help`, not run) | none | none | `google-chrome --headless=new --screenshot` for the HTML |
| `screens` | `run` with `frame.create {preset}` (`frame.presets` lists them, not run), `render` | none | none | none |
| `critique` | `render` | none | `info`, `render`, `check`, `audit` | headless Chrome for HTML |
| `design` | none | none | none | `check.mjs` (Node) |
| `massing` | none | none | none | `solidcraft-cli run massing.json --out x.step --save x.sc`, `eval x.sc --json-out m.json`, `snapshot x.sc --out x.png --view iso`, and the script step `file.export_view_dxf` with a parallel camera (solidcraft-cli 0.30.1, run 2026-11-07) |
| `plans` | none | none | `check`, `info` on the PDF (pdfcraft-cli 0.11.0, run 2026-11-07) | `cadcraft-cli run --metric --cmd … --save x.dxf --export x.pdf`, `convert x.dxf x.svg`, `convert x.dxf x.png`, `info x.dxf` (cadcraft-cli 0.18.0, run 2026-11-07) |
| `shots` | none | none | none | `filmcraft-cli run shots-base.jsonl`, then `run shots.jsonl` (`timeline.place`, `markers.add`, `file.exportEdl`, `file.exportOtio`), `inspect sequence`, `render --seconds S --out f.png` (filmcraft-cli 0.18.0, run 2026-11-07) |
| `storyboard` | `run storyboard.json --out x.figcraft`, `export x.figcraft -o frames/ --format png`, both with `--no-system-fonts` and both roots (figcraft-cli 0.16.0, run 2026-11-07) | none | none | `filmcraft-cli import`, `run animatic.jsonl` (one `timeline.place` per still, with its own `duration`; `file.exportMedia` as a GIF), `inspect sequence` (filmcraft-cli 0.18.0, run 2026-11-07) |
| `motion` | none | none | none | `effectcraft-cli --empty --json --save-as x.ecproj run --commands motion.json`, `--project x.ecproj --save set …`, `get …`, `render-frame`, `render --format gif` (effectcraft-cli 0.22.0, run 2026-11-07) |
| `ground` | none | none | none | `node ground.mjs <command>` (Node only); for an ASCII tile as a PNG, `timeout 60 google-chrome --headless=new --screenshot`, called by the script (Google Chrome 156.0.8078.47, run 2026-11-07) |

Verified runs (each wrote only under the scratch directory):

1. `figcraft-cli run steps.json --out hero.figcraft --no-system-fonts --automation-read-root R --automation-write-root W` with two steps (`frame.create` 600 by 300 with `props.fill`, `text.create`) printed `{"command":"frame.create","ok":true,"result":{"id":2},"step":0}`, the same for step 1, and `wrote hero.figcraft`. Then `render hero.figcraft -o hero.png` (roots set) wrote a 600 by 300 PNG, 10,360 bytes; the image shows the navy frame and white text, so `props.fill` works. Then `export hero.figcraft -o hero.pdf --format pdf` (roots set) wrote the PDF.
2. `vectorcraft-cli run --cmd file.new --params '{"width":256,"height":256,"units":"Pixels","backgroundContents":"white"}' --cmd shape.rectangle --params '{...,"radius":24}' --export mark.svg` printed one JSON result per step and wrote a valid 483-byte SVG with a `viewBox`. **`run` rejects the root flags:** `unknown run option '--automation-write-root'` (exit 1); `convert` rejected them the same way. Only `mcp --headless` accepts them, and MCP is not used. See open question 3.
3. `pdfcraft-cli` on the PDF from run 1: `info` printed the JSON summary (1 page, 600 by 300 pt, creator FigCraft, untagged, no PDF/A or PDF/UA); `check ... --json out.json` printed `checked 1 files: {"ok": 1}` (exit 0); `audit` printed `{"count":0,...,"findings":[]}` (exit 0); `render --page 1 --dpi 72` wrote a 600 by 300 PNG. None of these took a root flag. `pdfcraft-cli run` takes `--root` and its tool `doc_open` takes `path` (`file=` was refused), so a `run --script` must use the schemas from `pdfcraft-cli tools`.
4. Headless Chrome on a one-table HTML fixture: `google-chrome --headless=new --no-sandbox --disable-gpu --user-data-dir=P --screenshot=t.png --window-size=640,200 file://...` wrote a 640 by 200 PNG under `timeout 20`.

Runs 15 to 23 are in `ARTCRAFT.md` too: the FilmCraft shot list with its markers and its EDL, the markers on a placeholder matte (an empty sequence exports no marker), the FigCraft panels, the per-still durations of the animatic (a `duration` with `items` is refused), and the EffectCraft project, its keys, its poster, its GIF and its lock file. Runs 6 to 14 are in `ARTCRAFT.md`: the SolidCraft model, `eval`, `snapshot` and the plan view (the DXF needs `"fov":0`, and any other camera is refused as invalid), and the CADCraft plan, its single `--export`, `convert`, the PDF check and the dimension text, which is not legible with the default dimension style at building scale.

Not verified, and so not relied on: `figcraft-cli export` to PNG with `--scale`; the `frame.presets` names; `solidcraft-cli render`, `fuzz` and `bench-*`; any `mcp`; CADCraft `hatch`, layouts and `mview`; whether a GitHub runner can install any of these apps. FilmCraft and EffectCraft (0.18.0 and 0.22.0) are used by the film and motion jobs only for the commands above; video export, `script`, `--eval` and `mcp` are not run.

### 8. The file tree and the file budget

**Harvey's budget of at most 14 files does not hold, and it did not hold before UI/UX.** His tally (manifests 2, README and CLAUDE.md 2, check script and test 2, method 1, character 1, commands 3, template 1, spare 2) leaves out what the suits layout requires of every skill: a docs page with four sections, and the bucket READMEs that list each skill. Counting those, the first release without UI/UX is already about 31 files, and with UI/UX, its character, the references and tells files and the trends file the owner has since asked for, 41. Recommendation: keep the cap at 14 per pull request and split the release into four pull requests, one ticket each. If the owner prefers harvey's original shape, the alternative is to cut the suits conventions (one `docs/skills.md` for all pages, one skills list in the README), which makes the package unlike suits; I do not recommend it. Open question 1.

The full tree (87 files, with the space designer, the writer, the stance record, the shot and motion designer, the photographer and the ground tool):

```
bauhaus/
  .claude-plugin/plugin.json
  .claude-plugin/marketplace.json
  .github/workflows/ci.yml
  .gitignore
  LICENSE
  README.md
  CLAUDE.md
  package.json
  scripts/check-skills.mjs
  specs/design-package.md
  docs/adr/0001-bauhaus-is-a-separate-package.md
  docs/adr/0002-the-writer-and-the-cast.md
  docs/adr/0003-a-stance-in-place-of-a-voice.md
  docs/adr/0004-tools-may-ship-generator-code.md
  skills/characters/README.md
  skills/characters/gropius/SKILL.md
  skills/characters/bayer/SKILL.md
  skills/characters/breuer/SKILL.md
  skills/characters/mies/SKILL.md
  skills/characters/ogilvy/SKILL.md
  skills/characters/moholy-nagy/SKILL.md
  skills/characters/peterhans/SKILL.md
  skills/tools/README.md
  skills/tools/design/SKILL.md
  skills/tools/design/ARTCRAFT.md
  skills/tools/design/DESIGN-MD.md
  skills/tools/design/TELLS.md
  skills/tools/design/TRENDS.md
  skills/tools/design/RESEARCH.md
  skills/tools/design/check.mjs
  skills/tools/brand/SKILL.md
  skills/tools/brand/REFERENCES.md
  skills/tools/brand/REGISTERS.md
  skills/tools/email/SKILL.md
  skills/tools/email/LIMITS.md
  skills/tools/email/REFERENCES.md
  skills/tools/email/REGISTERS.md
  skills/tools/screens/SKILL.md
  skills/tools/screens/REFERENCES.md
  skills/tools/screens/REGISTERS.md
  skills/tools/concept/SKILL.md
  skills/tools/concept/REFERENCES.md
  skills/tools/massing/SKILL.md
  skills/tools/massing/REFERENCES.md
  skills/tools/plans/SKILL.md
  skills/tools/plans/REFERENCES.md
  skills/tools/shots/SKILL.md
  skills/tools/shots/REFERENCES.md
  skills/tools/storyboard/SKILL.md
  skills/tools/storyboard/REFERENCES.md
  skills/tools/motion/SKILL.md
  skills/tools/motion/REFERENCES.md
  skills/tools/develop/SKILL.md
  skills/tools/develop/REFERENCES.md
  skills/tools/handoff/SKILL.md
  skills/tools/handoff/figma.mjs
  skills/tools/handoff/extract.js
  skills/tools/handoff/runtime.js
  skills/tools/handoff/bundle.mjs
  skills/tools/ground/SKILL.md
  skills/tools/ground/REFERENCES.md
  skills/tools/ground/ground.mjs
  skills/tools/ground/dither.mjs
  skills/tools/ground/raster.mjs
  skills/tools/critique/SKILL.md
  docs/characters/gropius.md
  docs/characters/bayer.md
  docs/characters/breuer.md
  docs/tools/design.md
  docs/tools/brand.md
  docs/tools/email.md
  docs/tools/screens.md
  docs/tools/handoff.md
  docs/characters/mies.md
  docs/characters/ogilvy.md
  docs/characters/moholy-nagy.md
  docs/tools/massing.md
  docs/tools/plans.md
  docs/tools/shots.md
  docs/tools/storyboard.md
  docs/tools/motion.md
  docs/characters/peterhans.md
  docs/tools/develop.md
  docs/tools/ground.md
  docs/tools/concept.md
  docs/tools/critique.md
  test/check-skills.test.mjs
  test/characters.test.mjs
  test/design.test.mjs
  test/artcraft.test.mjs
  test/film.test.mjs
  test/film-lib.mjs
  test/ground.test.mjs
  test/handoff.test.mjs
```

Split (each at most 14 files; a later PR also edits files from an earlier one, which does not add to its count). PR 3 is at the cap exactly. `gropius` is in PR 3, not PR 2, because he calls `critique`, and a character may only call a skill that exists:

| PR | Holds | New files |
| --- | --- | --- |
| 1. Skeleton and checks (the first PR) | manifests (2), CI, `.gitignore`, `LICENSE`, `README.md`, `CLAUDE.md`, `package.json`, `check-skills.mjs`, the ADR, the two bucket READMEs, `test/check-skills.test.mjs` | 13 |
| 2. The method | `design/` (SKILL, ARTCRAFT, DESIGN-MD, TELLS, TRENDS, check.mjs), `docs/tools/design.md`, `test/design.test.mjs`, `test/artcraft.test.mjs` | 9 |
| 3. The graphic designer and the lead | `brand` and its REFERENCES, `email` with LIMITS and REFERENCES, `critique`, `bayer`, `gropius`, the docs pages of `brand`, `email`, `critique`, `bayer` and `gropius`, `test/characters.test.mjs` | 14 |
| 4. UI/UX | `screens` and its REFERENCES, `breuer`, their two docs pages | 5 |
| 5. The space designer | `mies`, `massing` and `plans` with their REFERENCES, and their three docs pages | 8 |
| 6. The writer and the flow | `ogilvy`, `concept` with its REFERENCES, `RESEARCH.md`, the three `REGISTERS.md`, ADR 0002, and the docs pages of `ogilvy` and `concept` | 10 |
| 7. The stance | `## Stance` in `gropius`, `bayer`, `mies` and `ogilvy`, ADR `0003` with the row table, the voice-rule paragraph, STN1 to STN5, and one line in the READMEs and four docs pages | 1 |
| 8. The shot and motion designer | `moholy-nagy`, `shots`, `storyboard` and `motion` with their REFERENCES, and their four docs pages, and `test/film.test.mjs` and `test/film-lib.mjs`, the rules of the film tools as functions over strings and their tests | 13 |
| 9. The photographer | `peterhans`, `develop` with its REFERENCES, and their two docs pages | 5 |
| 10. Grounds and dither | `ground` with its `REFERENCES.md`, `ground.mjs`, `dither.mjs` and `raster.mjs`, its docs page, `test/ground.test.mjs` and ADR `0004`; edits to `bayer` and its docs page, the READMEs, `plugin.json`, `ARTCRAFT.md`, `check.mjs` (D17) and this spec | 8 |

PR 1 has no skill. Whether `claude plugin validate` accepts `"skills": []` is UNVERIFIED (the check runs it). If it refuses, `design/SKILL.md` and its docs page move into PR 1, which makes 15 and trips the cap, so the fallback is to ship PR 1 with `design` and drop the ADR to PR 2.

### 9. Done when (the acceptance run, once the four PRs are merged)

Given one real small brief from one of the owner's projects (the asenso app has rules to test against; its files are read, never edited):

1. `npm run check-skills` and `npm test` pass in CI; `claude plugin validate` passes.
2. `npm run test:artcraft` passes locally with the command-line apps installed that its tests call (the fixture run asserts a PNG, an SVG and a PDF come out, a STEP file and its closed bodies, a plan DXF and a plan PDF that `pdfcraft-cli check` reads as ok).
3. `bayer` produces, with the roots set and no hand-written asset: a `DESIGN.md` that passes D7 with its token file passing D10, one HTML email with its image assets and both renders, and one logo SVG whose saved command regenerates it.
4. The email passes `check.mjs email`, contrast at 4.5:1 for text and 3:1 for UI parts, live text for the message and the call to action, alt text on every image.
5. `breuer` produces a screen spec and one PNG per state for one asenso screen, starting with `Rules applied:` listing `file:heading` entries that exist, and honouring the async-state sizing idiom (S5).
6. `critique`, run by a session other than the maker, reports every seeded defect (C6) and edits nothing.
7. Louis reviews each PR against this spec once, with one re-review at most, and checks every piece against `TELLS.md` (section 10). An auditor maps the work to AC ids D1 to D14, B1 to B7, E1 to E7, S1 to S7, C1 to C9, GRO1 to GRO4, BAY1 to BAY4, BRE1 to BRE3, CAST1; a violated criterion or an unrequested change keeps the PR in draft.
8. Each piece in steps 3 and 5 started from a brief file that passes D13 and cites at least three reference rows. `critique` exits 0 and reports `PASS: no tells` on each, exits 1 on a seeded piece that carries one tell of each kind the checklist lists, and exits 2 on a seeded piece that cites no reference.
9. The 29 checks of `TELLS.md` have been run on three real ArtCraft-built files, and every false positive is either fixed or listed in the file (the research proposed the checks and did not run them).
10. `design/TRENDS.md` holds the 9 seed entries of section 11 and `check.mjs trends` passes on it. A tenth, "Email shaped for automated inbox summaries", was dropped because it had no opened source.
11. `mies` produces, with no hand-written asset: for one real small brief, a `massing.json` run into a STEP file whose bodies are all closed with the volume stated as the sum of the bodies, and a plan whose PDF passes `pdfcraft-cli check`, whose dimension text is legible on the PNG and whose hand-over carries the design-study line. Each is run by a session that did not build it.
12. The flow, on one small brief with no `DESIGN.md`, in a category that has a register and a second that has none: `gropius` asks the five questions in one message, once, and the answers appear unedited in the brief's `Intake`; `research.md` exists, passes `check.mjs research` and cites a picture opened as an image for every register rule it uses (for the category with no register it writes one first and says so); the brief passes `check.mjs brief` with all eleven sections; the writer produces `Idea`, `Insight`, `Story` and `words.md` without asking anything `Intake` already answered, and `words.md` holds no claim without a research row; the email starts as a 600 px comp that the owner sees first, and the built HTML passes `check.mjs email` and renders beside it; `critique`, run by a session that did not make the piece, reports a seeded lost move and a seeded copy tell as the writer's.
13. `moholy-nagy` produces, with no hand-written asset: for one real small brief, a shot list whose EDL has one marker line for each row, a storyboard with one PNG for each shot taken from the brief's `Story` beats, with an animatic whose clips are as long as the table says, and an animated title with its keys read back, its poster and its GIF. Each is run by a session that did not build it, and each hand-over says it is a plan and a draft, not a cut.
14. `peterhans` produces, with no hand-written asset: for one real photograph, a developed JPG and a PNG preview from one library run, every control checked against `develop.controls`, the source hash unchanged and no sidecar beside it, and a hand-over that lists the values the app took. Run by a session that did not build it.

### 10. References and the machine-made look

**From `references-research.md` (rachel, 2026-11-07). Every check in it is a proposal that was not run; none of the 29 has been tested for false positives.** The planner's numbering called this section 5; it is section 10 here. The proposed encoding is the researcher's inference, and this section is my decision on it, for the owner to confirm.

What the research found: the canon that can be opened now is the Vignelli Canon (a Wayback copy), the NASA Graphics Standards Manual (title and page count only), WCAG 2.2, Apple's guideline data, caniemail, Really Good Emails and Vitruvius. Every other book on the list (Müller-Brockmann, Albers, Bringhurst, Rand, Ching, Alexander, Mascelli, Katz) is lending-only at the Internet Archive. The 29 tells come from three primary sources (Anthropic's frontend-design, Impeccable's craft floor, ui-ux-pro-max) and two designer blogs; copy tells rest on one primary source.

Two cautions from the sources, both kept: a tell is a default, not a crime, and a brief that names it earns it; and banning one look pushes the generating tool to its next most probable look (found only in a search summary, so inferred), which is why bans are paired with positive references.

**1. Each piece starts from a brief file.**

- One file per piece, in the project, written before any work: audience, job, tone, **what it must not look like**, surface, the references it will cite (item 2), and the tells it earns by name with a reason (for example `T12: the brand uses tracked caps for a logotype`). The format lives in `design/DESIGN-MD.md`; `check.mjs brief` (D13) enforces it.
- The brief wins over a default and does not outrank the project's rules (section 2). It is distinct from `DESIGN.md`, the project's standing decisions.

**2. Each craft gets a `REFERENCES.md`.** One in each job's folder (`brand` for identity, `email`, `screens`); the architecture and film crafts add theirs when they ship. A row holds: an id, the work, the edition, a page or plate pointer, **the single rule it gives, paraphrased in one line**, whether it was opened, and access (`free` with a link, or `lending`).

- **Lending-only books are pointers only: no copied text.** Rights are not free. A pointer is the title, edition, page or plate and a one-line paraphrase.
- A row carries `read: opened` or `read: not opened`. The research's "teaches" lines for the lending books are inferred from titles, and none were opened, so those rows are `not opened`. A `SKILL.md` rule may rest only on an `opened` row. Seed rows with `opened` status: the Vignelli Canon (Wayback copy, 49 pages), WCAG 2.2, the Apple HIG Buttons data (44 by 44 pt hit region), caniemail and Vitruvius (Gutenberg 20239). The NASA manual was opened for title and page count only, so it is `not opened` until a rule is read from it.
- **A deliverable cites at least three rows and says which rule it took from each.** That is the positive check, so a ban never stands alone.
- Tests: [T] each row has every field and a valid `read` and access value; [T] no `SKILL.md` rule cites a `not opened` row; [T] each job's `SKILL.md` names its own references file; [T] no row's rule line exceeds one line, which keeps a copied passage out.

**3. The brand's grid, type scale, palette and spacing scale are data,** kept in the project's token file (section 5), not in prose: a `grid` group (columns, gutter, margin), a `type` group (the ratio or step list and the body measure), a `space` group (the spacing scale) and the palette. `check.mjs tells` reads them for T20 and T21. With no such data, T20 and T21 cannot run and the check exits 3 (a failure), unless the brief names the choice.

**4. `TELLS.md` holds the 29 checkable tells** (`design/TELLS.md`). One row each: id, tell, check, check type (`file`, `render` or `text`), source and `status: proposed, not run`. A tell passes only when the brief or the brand data names the choice. The 29, from the research:

| Ids | Tells | Type |
| --- | --- | --- |
| T1 to T3 | default font with no reason; indigo-to-purple gradient; gradient text | file |
| T4 | centred hero over three equal cards | render |
| T5 to T7 | identical cards everywhere; one radius and one soft shadow on everything; ghost card (a 1 px border under a wide soft shadow) | file (the look can also be seen in a render) |
| T8 to T14 | coloured side stripe; hard offset shadow; glass or blur as decoration; emoji or glyph as icon; tracked-caps eyebrow; dot-joined meta line; "WORD, dash, fragment" label | file |
| T15, T16 | numbered markers on non-sequences; one accented word in a headline | file or render, set when the row is written |
| T17, T18 | hero big number with a small label; cream, serif and terracotta, or near-black with one acid accent | render |
| T19 | tinted near-black standing in for black | file |
| T20 | no grid | render, against the brand data |
| T21 | no type scale | file, against the brand data |
| T22 to T24 | identical entrance on every section; mono as costume; the accessibility floor (contrast 4.5:1 and 3:1, targets of at least 24 CSS px and 44 pt on iOS, visible focus, text of at least 12 px) | file or render, set when the row is written |
| T25 to T27 | placeholder copy; buzzword and rhythm copy; copy with no specific detail (**T27 is a warning, not a failure**) | text |
| T28 | stock-sketch SVG or stripe pattern as illustration | file |
| T29 | broadsheet hairlines: hairline rules, no rounded corner, dense columns | file |

- T26's wordlist rests on search summaries of blog pages the researcher did not open, so the row is marked inferred.
- T24 repeats the numbers of D6 and E4 on purpose; one check function serves all three.
- Impeccable's detector (62 rules, Apache-2.0, a `NOTICE.md` at its root) was not read in full. Decision: write our own checks and read its rule list for ideas only; nothing is copied (open question 16).
- Tests: [T] each of the 29 rows has a check, a type, a source and a status; [T] each `file` and `text` row has a fixture the check flags and one it passes, in `test/design.test.mjs`; [R] each `render` row has a fixture run locally with ArtCraft and Chrome (not in CI, as in seam 3 of the testing decisions).

**5. `critique` fails a piece on any tell the brief does not name, and fails a piece that cites no reference.** The contract is C7 to C9. The script covers `file` and `text` tells and, given a render, the `render` tells; "feels like a template" needs a person, so the side-by-side against one chosen reference row stays a reviewer step (C8). **Louis checks against the same file:** his done test for a design piece gains `Dn: no tell in TELLS.md. Check: check.mjs tells <piece> --brief <brief>. Expect: exit 0` and `Dm: the piece cites at least three rows of REFERENCES.md. Check: the brief's references list. Expect: three or more, each id present`. He does not judge taste (picks 6). A tell that survives critique and louis is a blocker, and he cites the `TELLS.md` row.

**How studios avoid the look, as the research found it.** The documented process is in two skills: frontend-design (write a token plan, review it against the brief, change anything that is a default, build, critique) and canvas-design (name a visual philosophy before drawing); Impeccable keeps `PRODUCT.md` and `DESIGN.md` that every command reads first. No primary account of a studio's own practice (moodboard, side-by-side) was found; the Vignelli Canon's headings on discipline and appropriateness are the nearest primary text. So the plan-then-critique pass (D2) and the side-by-side (C8) are documented in skills, and the claim about studios stays inferred.

**What the canon means for scope.** Only Vitruvius is openable for architecture, and film has only secondary pages; Ching, Alexander, Mascelli and Katz are lending-only, and so is Müller-Brockmann for grids. The architect ships on Vitruvius and Ruskin, which are free and were opened; Ching and Alexander stay pointers. The shot and motion designer ships on opened Wikibooks and Wikipedia pages, which are secondary, and the film books stay pointers (open question 15). `brand`'s grid rules rest on opened rows only until a book is opened.

### 11. Trends

**From `design-systems-trends-research.md`, Part 3 (how the package should treat trends) and Part 2 (the trends, 2025–2026). The researcher's verdict is that the owner's starting rule holds, with three changes; all three are adopted below.** The evidence is thin outside platform owners: Liquid Glass, Material 3 Expressive, collapsing navigation, in-tool keyframe motion and instruction-driven design are well sourced, while the branding and email trends rest mostly on one studio's listing and one vendor's blog. No source the researcher read calls any visual style "machine-made"; only NN/g's survey respondents call generated output "slop". So trends give the package no tells; the tells come from `references-research.md` (section 10).

The rule:

1. **References and the brief come first.** A trend is a level-5 reference at most (section 2), never above the project's rules or the brief. Closed: four pull requests of at most 14 new files each, with suits's docs-page and bucket-README rules kept. The limit is in `CLAUDE.md`.
2. **A trend is applied only when the brief asks for it,** and then only if its status is `Trial`. It is never a default. Following a trend by default is itself a candidate tell.
3. **Each trend has a status and a review-by date** (change 1). Statuses: `Watch` (recorded, not applied), `Trial` (may be applied when the brief asks), `Retired` (never applied). The pattern is GOV.UK's Trial and Stable and Atlassian's phases. A `Watch` entry becomes `Trial` only by the owner's decision, which is my reading of the researcher's rule. Review before each use and at least every six months (the researcher's inference; six months is GOV.UK's trial window, not a figure for trends). Closed: accepted. `ARTCRAFT.md` gives every vectorcraft step an absolute output path under the output directory, and `test/artcraft.test.mjs` runs it with no root flag.
4. **Platform-native material is conformance, not a trend** (change 2). An iOS 26 app gets Liquid Glass by default and an Android app gets Material 3; both are recorded in section 7 of `DESIGN.md`. The trends file covers choices beyond the platform default, and so carries no platform default. Closed: `npm test` skips cleanly when an app is missing; `npm run test:artcraft` fails instead and is the local gate before a pull request is marked ready (`test/artcraft.test.mjs`).
5. **The accessibility floor outranks any trend** (change 3). A trend that breaks 4.5:1 for small text or 3:1 for large text and graphics, or the user's reduce-motion or reduce-transparency settings, is rejected, not weighed. The ratios are Carbon's and Shopify's stated floor (found by the researcher); they match WCAG 2.2 SC 1.4.3 and 1.4.11. The Apple guideline wording on reduced motion and reduced transparency was not found (the page was unreadable), so it is read in a browser before it is quoted.
6. **One dated file, `design/TRENDS.md`,** owned by `design`. A project's `DESIGN.md` holds only the entry name, the date reviewed and the brief line (section 5, row 8). Entry fields: name, what it is, originator and date, source URLs, counter-evidence, project types it suits, status, review-by date. Closed: no `/suits:` call. ADR 0001 and `CLAUDE.md` record it, and `check-skills` enforces it.
7. **A trend is never written from a page that could not be read.** An entry that rests on Material 3 or the Apple guideline body text is not written until that page is read in a browser. Press and search snippets are never evidence. Closed: the email hand-over says "not tested in Outlook for Windows" (`skills/tools/email/SKILL.md`). Revisit when a real Outlook client can be tested.

Nine seed entries, all `Watch`, each with its counter-evidence and its one-source warnings kept (the dates and sources are the researcher's; the review-by date is set when the file is written):

| Entry | Originator and date | Counter-evidence kept in the entry |
| --- | --- | --- |
| Translucent Liquid Glass materials | Apple, 2025-06-09 | NN/g (Budiu, 2025-10-10): text over images illegible, smaller tap targets, moving controls. Poor for dense text, forms and data. |
| Expressive physics-based motion and morphing shape | Google, Material 3 Expressive, May 2025 | Google's own caveat: it can hurt usability; not for banking or payment flows. |
| Navigation chrome that collapses on scroll | Apple, iOS 26, 2025-06-09 | NN/g: hurts predictability. |
| Bold type and colour inside expressive systems | Google (Dezeen, 2025-05-28); Apple numeral width and weight | Evidence is partial. |
| Keyframe motion authored in the design tool | Figma Config 2026, 2026-06-24 | Not found. |
| Instruction- and automation-driven design | Figma, 2026; NN/g survey 2026-10-23 (n=521) | 54% cite output quality as a barrier; respondents say "slop". Production UI needs human review. |
| Bespoke type and motion identities | Pentagram's work listing, 2026 | One studio's listing, not a trend report. |
| Maximal, surreal imagery | Adobe Creative Trends 2026, 2026-01-08 | Adobe sells stock and Firefly against it. |
| Brand systems built to flex for generated output | Pentagram, Figma, undated | Undated sources. |

Not seeded, with the reason: "Email shaped for automated inbox summaries" (Litmus and Validity blog, 2026-05-08) was dropped, because it rests on one vendor blog and no source was opened; dark-mode email is the `email` job's rule (E6), not a trend; sender verification (BIMI, SPF, DKIM, DMARC) is not design; accessibility as a measured practice is the floor in rule 5; "Vernacular and local specificity" rests on two studio pages and is added only when a brief asks. Trends the researcher looked for and did not find a source for are not entered.

Tests:

- [T] Each entry has all eight fields, a status of `Watch`, `Trial` or `Retired`, at least one source URL and a counter-evidence line (a trend with none is not listed).
- [T] `check.mjs trends --as-of <date>` reports an entry past its review-by date, and the `DESIGN.md` linter (D7) fails a `Trends in use` entry that points at a `Retired` entry, at an entry past review-by, or at an entry that does not exist. The date is an argument, so no test depends on the day it is run. The repo check runs without a date and warns on overdue entries; it does not fail on them, so a calendar day cannot turn CI red.
- [T] No `Trends in use` entry lacks a brief line.
- [T] A fixture token pair that fails 4.5:1 or 3:1 is rejected whatever trend is named for it.
- [J] `critique` names a trend as the reason for a finding only when its entry exists in `TRENDS.md`, and reports an applied trend that is not in `DESIGN.md` section 8.

The file count rises by one (`design/TRENDS.md`), which moves PR 2 to 9 files. The earlier idea of trend entries inside each job's `REFERENCES.md` is dropped: the owner's rule is one dated file.

## Testing Decisions

- A good test checks behaviour a person can see: a script's output for known input, a file that must exist, a command's exit status. It does not check how the code is written.
- **Seam 1 (highest): `npm run check-skills`.** The same shape as suits's script: every skill has a `SKILL.md` whose name is its folder, a description, an entry in `plugin.json`, a line in its bucket README, a docs page with the four sections (What it does, When to reach for it, Common questions, It's working if), characters have Voice and When to call, relative links resolve, and `claude plugin validate` passes. bauhaus adds: every `/pkg:skill` call is `/bauhaus:` except the one S6 allows; no `/suits:` call; no ui-ux-pro-max data. `test/check-skills.test.mjs` builds good and bad skill trees in a temporary directory and asserts the script names each problem, so there are no fixture files in the repo.
- **Seam 2: `check.mjs`.** `test/design.test.mjs` runs it on known inputs: the contrast pairs of D6, valid and invalid `DESIGN.md`, token-file, trends and `document-css` cases of D7, D10, D11 and D12, good and bad email fragments of E2, a `LIMITS.md` row with no date or URL, valid and invalid briefs (BRF1, which replaces D13), valid and invalid research files (D16), the 29 tell fixtures and the exit codes 0 to 3 of `check.mjs tells` (C7).
- **Seam 3: the headless ArtCraft run.** `test/artcraft.test.mjs` runs the verified commands of section 7 against a temporary directory and asserts a PNG (dimensions), an SVG (`viewBox`) and a PDF (`pdfcraft-cli check` status `ok`). It skips with a printed reason when a CLI is not on `PATH`, because a plain CI runner does not have ArtCraft (whether it can is UNVERIFIED). `npm run test:artcraft` fails instead of skipping, and is the local gate before a PR is marked ready. It also runs the film, storyboard and motion commands, and the rules around them live in `test/film-lib.mjs` as functions over strings. Every call is under `timeout 20`. A test never starts a GUI binary or the launcher.
- **Seam 4: character contracts.** `test/characters.test.mjs` ports the suits character tests (sections present, "default is not to call", calls resolve and are in `plugin.json`, no build-process words, a sample line of 30 words or fewer, a plain register for anything written for others), and adds the GRO, BAY, BRE, MIE, MN, SHO, STO, MOT and CAST1 criteria as phrase assertions, including the scan for a cast name followed by a speech verb and for the avoided topics of section 4, and the writer's scans: the writer calls only `concept`, no skill file names the other package's researcher, and `words.md` has the columns the designer's slots use. `scripts/check-skills.mjs` also reads every `REGISTERS.md` (RES4, RES5).
- **What the tests do not prove:** that the generating tool obeys a written rule. Phrase tests prove the rule is written. Behaviour is shown by the acceptance run (section 9), the critique pass and the louis review.
- Prior art: suits's `scripts/check-skills.mjs`, `test/characters/characters.test.mjs`, and `test/donna/check.test.mjs` (a script tested on temporary input); `node --test` with no dependencies.
- Order: test first. Each PR's tests are written before its files and fail for the right reason first.

## Out of Scope

- A film canon beyond the opened pages. Mascelli and Katz (film) are lending-only and stay pointers: no craft rule rests on a book that was not opened, and lighting setups and motion-graphics rules are not written.
- Video, and any command-line app beyond FigCraft, VectorCraft, PdfCraft, SolidCraft, CADCraft, FilmCraft and EffectCraft. A cut of footage is never made; whether DesignCraft has a command-line is UNVERIFIED.
- A `print` command. Donna's PDF build stays hers; the lead designer's output reaches it through the token file's `document` group.
- The DTCG Resolver module, any token build tool (Style Dictionary, Terrazzo), a Figma token export, and any claim of interchange with another tool.
- Any change to suits, to donna's files, or to the asenso app. No file moves between repos.
- App code. The UI/UX designer specifies; the builders build under the project's gates.
- MCP mode for any craft server; Python or data files; publishing the repo beyond a private GitHub repo.
- A design reviewer character. Louis reviews; `critique` is the craft pass.

## Further Notes

### Open questions

Each carries my recommendation.

1. **harvey.** The 14-file budget cannot hold (section 8). Recommend: 14 files per pull request, four pull requests, four tickets, each built test-first, the spec confirmed first. The alternative is to drop suits's docs-page and bucket-README rules for bauhaus.
2. **owner.** Done: the theme and the cast are chosen (Bauhaus; Gropius, Bayer, Breuer, with Albers inside the method, Mies van der Rohe as the space designer and Moholy-Nagy as the shot and motion designer). Nothing is asked here; see questions 19 and 20 for the two choices left.
3. **harvey.** `vectorcraft-cli run` accepts no root flags, so the confinement harvey asked for holds only for `figcraft-cli`. Recommend: accept it, give every vectorcraft step an absolute output path under the output directory, and add a test that scans the saved command for any other path. The alternative is `vectorcraft-cli mcp --headless` with roots, which brings MCP into scope.
4. **harvey.** The headless fixture cannot run in CI unless a GitHub runner can install the three ArtCraft packages (UNVERIFIED). Recommend: skip cleanly in CI, fail locally through `npm run test:artcraft`, and make that command a condition for marking a PR ready.
5. **harvey.** Who owns the strings on an app screen. Recommend: the UI/UX designer specifies them in the project's l10n shape, because a screen cannot be judged without them and the project's l10n rules win; donna keeps document text and email copy. Harvey's split said "donna keeps the words", written for documents. Closed: The writer owns the words of the pieces made here; donna keeps long documents and the PDF build. Screen strings stay in the project's own l10n shape (S7).
6. **harvey.** No `/suits:` calls in the first scope, and later a one-way link (a designer calling `/suits:code-review`) only by a new decision. Recommend: keep it closed now; louis reviews from outside.
7. **harvey.** The Outlook for Windows rendering engine has no primary source. Recommend: ship with the "not tested in Outlook for Windows" line in every email hand-over and re-read caniemail at write time; revisit when the owner has a real Outlook client to test.
8. **harvey.** Whether `claude plugin validate` accepts an empty `skills` list (PR 1) and a plugin that has no `version`. Recommend: the first ticket checks both before anything else, with the fallback of section 8. Whether one `DESIGN.md` may be read from a project that uses `plating` is answered above (it fits, with the preserved extra sections). Closed: the plugin has no `version`, and `claude plugin validate` runs and passes in CI.
9. **harvey.** How an outside planning tool binds a role to `bauhaus:gropius`, `bauhaus:bayer` and `bauhaus:breuer`. UNVERIFIED; the owner confirms. No bauhaus file names that tool or its roles. Closed: not needed (2026-11-08). No outside planning tool is in use, and no bauhaus file names one; adopting one later is a new decision in `docs/adr/`.

10. **harvey.** What "fails on any tell" means for a tell only a person can see. Recommend: `critique` reports it as a failure with the check that found it, so the first line is binary; the owner can overrule a single row in `DESIGN.md` under Bans (a recorded exception, with a date), not silently. Alternative: judged tells advise only, which weakens the owner's aim that output not look machine-made. Closed: a judged tell fails like any other. A recorded exception is a dated entry under **Not to do** in `DESIGN.md`, and `critique` reports that tell as earned.
11. **harvey.** All three research files have landed and sections 4, 5, 10 and 11 follow them. Recommend: PR 1 may start once the owner confirms this spec; nothing else blocks it. Closed: PR 1 merged (`8a37b51`), and the later pull requests followed.
12. **harvey.** `check.mjs document-css` (D11) is new work the research did not ask for: it is how a token file reaches donna's six CSS properties without a build tool or a file moving. Recommend: build it (about one function), since otherwise the brand-to-PDF link is by hand. Alternative: leave the six properties as a table in `DESIGN.md` for donna to copy, which breaks the "no hand-written asset" bar. Closed: built as `check.mjs document-css`.
13. **harvey.** The DTCG format is a Community Group Report, not a W3C Standard, and its status text contradicts itself. Recommend: adopt 2025.10 pinned in the front matter, and treat a version change as a decision. Alternative: a simpler own JSON shape, which gives up the format Carbon has moved to (release v11.119.0, 2026-10-21, per the researcher). Closed: adopted and pinned as `tokens-format: dtcg-2025.10` in the `DESIGN.md` front matter.
14. **owner.** Whether a trend is ever applied without the brief asking. Recommend: never; `Trial` status plus a brief line is the only way in. Alternative: allow a project to list a standing trend in `DESIGN.md`, which this spec treats as following a trend by default. Closed: as recommended. `TRENDS.md` applies a trend only when the brief asks and its status is `Trial`; an entry moves to `Trial` only by the owner's decision.
15. **owner.** The architecture and film canon is lending-only apart from Vitruvius. Recommend: the owner supplies the books or a library account (Ching, Alexander, Mascelli, Katz, and Müller-Brockmann for grids) when the later crafts are wanted; the architect and the shot and motion designer do not wait for them. Answered: the owner does not supply them, and they stay pointers.
16. **harvey.** Own the 29 checks, or reuse Impeccable's detector (62 rules, Apache-2.0). Recommend: own, reading its rule list for ideas only, since the detector and our files are unread against each other. Also run the 29 checks on three real files before PR 3 is marked ready, since none has been run (acceptance step 9). Closed: owned, in `check.mjs` (T1 to T29). 18 rows have run on three real files; the other 11 stay `proposed, not run`, with fixtures only, until a real file has their subject (`TELLS.md`).
17. **harvey.** A piece that cites fewer than three reference rows fails (exit 2). Recommend: keep, because bans alone move the look; allow a brief to name a smaller number with a reason (a logo mark needs fewer rows than a brand). Closed: kept. Exit 2 below three rows; a brief may state a lower minimum with a reason, and the floor is one (`design`).
18. **harvey.** Copy tells (T25 to T27) concern the words but fail a designer's piece. Recommend: critique reports them as the writer's to fix and still counts T25 and T26 in the exit code; T27 stays a warning. Closed: as recommended (`critique`).
19. **harvey.** UI/UX: Breuer (an analogy only: objects built for the body) or Albers (rachel's pick: a direct craft, with colour then living inside the method)? Recommend Breuer for UI/UX and Albers inside `design`. Reason: colour contrast serves every job (brand, email, screens), so it belongs in the shared method; making Albers the UI/UX character would tie it to one job and leave the shared check with no home. Breuer was the owner's assignment, and the fit is an analogy, so no skill text relies on the biography. The file count is the same either way. Closed: Breuer is the UI/UX designer and Albers sits inside `design` (README cast).
20. **harvey.** The name `bauhaus`: keep or rename? It has no exact plugin clash (one web search), two near-name plugins, an unrelated npm package, and a German hardware retailer's trademark (weakly sourced; the DPMA, EUIPO and USPTO registers were not searched). Recommend: keep it, because the repo is private with no releases and the goods differ; keep the name in only the manifests and the ADR so a rename is one change; run a register search before any public release. Fallback names (`dessau`, `weimar`) were not checked. Closed: the owner keeps the name (2026-11-08). The name stays in only the manifests and the ADR, and a register search (DPMA, EUIPO, USPTO) comes before any public release.
21. **owner.** The picks on the writer and the flow, Q1 to Q9 and O10 of the creative-group amendment. Closed: Q1 the writer is Ogilvy, with ADR 0002 for the theme change; Q2 he has his own tool, `concept`, with a `REFERENCES.md`; Q3 three `REGISTERS.md` files ship as text, with no pictures and the studio kept for reference left out; Q4 the five new brief sections are required and old-shape briefs fail; Q5 the stance is a later PR; Q6 comps are checked by eye, with no comp mode in `check.mjs`; Q7 the words boundary of open question 5; Q8 the Voice tests are unchanged; Q9 one PR; O10 critique also judges the piece against the brief's `Idea` and `Story`.

### Risks

- The cast are real people with painful histories. The voice rule and CAST1 keep every file to craft and plain register; a miss would be a published sentence about a real person.
- The email limits move; the skill re-reads them each time, and the hand-over records the date.
- The persona must not reach anything written for other people (the "machine-made look" suits already bans). The register test covers it.
- The trends evidence is thin outside platform owners, and the Material 3 and Apple guideline body text was unreadable to the researcher. Seed entries carry their weaknesses, and no entry is written from a page that could not be read.
- The DTCG format may change; the version is pinned.
- Verification still outstanding before build: the three UNVERIFIED items above plus the WCAG 2.2 criteria S4 leaves to write time.

### Cost

Effort is one builder's work per pull request, plus the source pass already done for the film rows. No money is spent, and nothing leaves the machine until the owner publishes.

### Requirement sources

No OpenProject work package, issue or QA test case exists for this package. The requirement is the owner's four quoted statements, harvey's picks (section 1, 3 and 7 of his note, plus the owner's "include uiux"), and this spec once the owner confirms it.

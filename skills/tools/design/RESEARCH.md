# The research step

The step that comes after the intake and before the craft. It gathers the facts of the job, then studies finished work of the same kind as the piece, and it ends in one file, `research.md`, beside the brief. `check.mjs research <research.md>` checks the file's shape. It cannot judge whether a look was read correctly: the reviewer does that.

Research is evidence for the brief, not a rule above it. A register or a reference is a level 5 item in the precedence list of `SKILL.md`, an optional reference that is a suggestion. The brief, `DESIGN.md` and the project's own rules outrank it. When a brand's `DESIGN.md` has already decided a choice, a register does not override it.

## Two layers

- **The job layer, once, before the brief is final.** Who the audience is, what the category looks like, what the owner already has, what is known and what is not. It asks for one reference that shows the world the idea lives in, and not only for craft rules.
- **The piece layer, after the brief and before craft.** The visual research for this kind of piece, in the parts P1 to P7 below.

## The rules

- **R1. Primary source first.** Read the maker's own page, the document or the thing itself. A write-up of a source is a lead, not evidence.
- **R2. Mark every row `opened` or `summary only`.** A rule in the brief or in a skill rests only on an `opened` row. This covers research rows as well as `REFERENCES.md`.
- **R3. Say what was not checked.** `research.md` ends with a list of what was not read and why.
- **R4. Never invent a source, a quote or a number.** What cannot be confirmed goes under `could not verify`.
- **R5. Offer a side question; do not follow it.** A side question goes into the `Open` list for the lead to put to the owner.
- **R6. Respect the site.** Read `robots.txt` first. If it keeps automated readers out, or the site answers with a block page, record the gap and stop. Send a plain client name, never a person's address. Do not look for another way in.
- **R7. A reference that cannot be had is a gap, and the substitute is named.** A retailer's email is not the brand's own. Say what was used instead and what it cannot show.
- **R8. Number the sources and keep the picture.** The pictures are for study only. They stay in the project's notes folder and are not placed in a piece.
- **R9. Collect references for the idea as well as for the rules.** One reference shows the world the idea lives in.
- **R10. The file is short and dated.** `research.md` carries its date and the client name used for any fetch, or `none` when nothing was fetched.

How the step fetches a page is not fixed by this package: use whatever fetch you have in the session, read `robots.txt` first, and write down which one was used.

## The file

`research.md` starts with two lines, then the sections in this order.

```
# Research: <piece>

Date: <YYYY-MM-DD>
Client: <the name sent with a fetch, or none>

## Job facts
## P1. Sources
## P2. Source notes
## P3. Register
## P4. Not that
## P5. Gaps and substitutes
## P6. What the supplied pictures can carry
## P7. Output to craft
## Not checked
## Open
```

Job facts are the audience, the category, the owner's existing material and the competitors, each with the row it comes from.

## The template for a piece

- **P1. The sources.** A table of finished work of the same kind, each opened as an image: `| # | Maker | URL | Fetched | Read |`, with `Read` either `opened` or `summary only`. At least 6 sources from at least 2 makers, and no line lowers that.
- **P2. One entry per source**, headed `### <number>`, with these eight fields, none empty:
  - **Alignment:** how the parts line up.
  - **Type:** style, case and sizes.
  - **Colour and rhythm:** the colours, and how the blocks alternate.
  - **Subject:** how the product or subject is shown, in crop, scale and overlap.
  - **Button:** its style.
  - **Spacing:** approximate numbers read off the picture.
  - **Reads as:** what makes it read as this category and not its neighbour.
  - **How it tells:** how it tells something, in what is cropped, what overlaps and what colour carries a moment.
- **P3. The register.** The category's look as a short list of rules taken from P2. Use the register in the tool's `REGISTERS.md` when one exists and add what this piece's sources show. If none exists for the category, write one first and mark it as new.
- **P4. The not-that table.** The earlier piece of the same job, its moves in one column and, in the next, the sources that reject each move: `| Earlier move | Rejected by |`. With no earlier piece, write `no earlier piece`.
- **P5. Gaps and substitutes** (rule R7).
- **P6. What the supplied pictures can carry.** For each picture the owner supplied: its size in pixels, the biggest size it can be shown at 1:1, what is in it (overlapping subjects, a baked label, a rough cut edge, a white ground) and which beats it rules out. Show this to the owner before the comp, with the line "Better pictures change this".
- **P7. Output to craft.** One paragraph, "this piece will look like...", that cites the sources it takes from as `source 1`, `source 3`.

A register is a starting point, not a template. The brief names the register it used and what it departs from.

## What it is for

The brief's `Research` section gives the path of `research.md` and the register used. The writer reads the job facts for the insight, and the designer reads P3 and P7.

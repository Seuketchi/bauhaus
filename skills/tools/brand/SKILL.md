---
name: brand
description: Brand identity: colour, type and a mark, written as a DESIGN.md and a token file that pass the checks, with the logo made by VectorCraft and a specimen sheet made by FigCraft. Use when the brief asks for an identity or the project has no DESIGN.md.
---

# Brand

Identity work: the colours, the type roles and the mark of one project, written down once so every later piece starts from the same decisions. Follow the `design` method first: its precedence list, its bans and its checks. The references for this craft are in `REFERENCES.md` in this folder, and the register of an identity sheet, read from real brand manuals, is in `REGISTERS.md`.

Only `brand` creates a `DESIGN.md`. Every other job reads it.

## Before you start

- Read the `DESIGN.md` of the project if there is one, and the project's own rules. They outrank the brief.
- Write the brief file for the piece with the format in `design`, and cite at least three rows of `REFERENCES.md` in it, with the rule taken from each. Cite only rows marked `opened`.
- Start from the register in `REGISTERS.md` and add what the piece's own research shows. The register is a starting point and not a template: the brief names the register used and what the identity departs from.
- Write the token plan the `design` method asks for, and revise it against the brief before anything is built.

## What to make

1. **A token file** beside the `DESIGN.md`, in the format in `design`. Primitive colours, semantic colours that alias them, the type roles with a fallback stack, and the `grid`, `type` and `space` data the tells check against. Fill the `document` group, so the same brand can restyle a PDF. Check it: `node skills/tools/design/check.mjs tokens design.tokens`.
2. **A `DESIGN.md`** that references the token file and copies no value from it. Its foundations name the mark as an entry with the file, the clear space and the minimum size in px, and the type roles with their fallback stack. Check it: `node skills/tools/design/check.mjs design DESIGN.md`. The checker is named by its path from the plugin root; give the project's files by path.
3. **The mark**, made by VectorCraft (below).
4. **A specimen sheet** made by FigCraft (below).

Set up the identity so it can be applied the same way from the first piece to the last (row V1), choose from what this client and this problem need and not from a favourite style (row V2), and keep the number of type families very small, carrying the hierarchy in scale and size (row V3).

## Colour

- Every pair listed in section 6 of the `DESIGN.md` is a pair of role paths. The ratio is computed by `check.mjs` from the token file and is never written by hand: at least 4.5:1 for text and 3:1 for interface parts and large text (row W1).
- Check a single pair with `node skills/tools/design/check.mjs contrast <fg> <bg> --min 4.5` (`--min 3` for a mark or other interface part). Without `--min` a failing pair still exits 0. A pair at 4.4999:1 fails and is shown as 4.4999.
- A colour reads against its neighbours, so look at the pairs in the specimen sheet as well as in the numbers.

## The mark

The logo is made by `vectorcraft-cli run`. Save the step command beside the file, so the mark can be made again. A hand-written SVG fails this step.

```
timeout 20 vectorcraft-cli run --cmd file.new --params '{"width":256,"height":256,"units":"Pixels","backgroundContents":"white"}' --cmd shape.rectangle --params '{"x":32,"y":32,"width":192,"height":192,"radius":24}' --export /project/design/mark.svg
```

- Give every step an absolute output path under the project's output directory. `vectorcraft-cli run` takes no root flags.
- Keep the exact command in a text file beside the SVG. Run it again and compare: the file has the same byte length, or the differences are listed.
- The SVG parses as XML, has a `viewBox`, is at most 20 KB, and `vectorcraft-cli info` reads it with no import warning:

```
timeout 20 vectorcraft-cli info /project/design/mark.svg
```

- Test the mark at its minimum size before settling the minimum (row V4).

## The specimen sheet

A palette, the type roles, and the mark at three sizes on one page, built with `figcraft-cli run` and rendered to a PNG. Write the steps file first, then:

```
timeout 60 figcraft-cli run /project/design/specimen-steps.json --out /project/design/specimen.figcraft --no-system-fonts --automation-read-root /project --automation-write-root /project/design
timeout 20 figcraft-cli render /project/design/specimen.figcraft -o /project/design/specimen.png --no-system-fonts --automation-read-root /project --automation-write-root /project/design
```

The rules for driving the three command-line apps are in the `design` tool's `ARTCRAFT.md`: read them before the first call.

## When a DESIGN.md already exists

Change only the entries the brief names. A changed entry gets a new **Decided** date and replaces the old entry, since git keeps the old one. Leave every other entry, and any section this format does not know, as it is. Add a dated line to the change log.

## Words

Names and taglines come from the writer's `words.md`. Write none of its own. Long documents belong to donna.

## Hand over

Say which files were made, the path of the saved mark command, which checks ran and their result (`check.mjs tokens`, `check.mjs design`, the byte-length comparison, `vectorcraft-cli info`), the pairs and their computed ratios, the rows of `REFERENCES.md` the brief cites, and what was not checked. A pass is not approval: the craft pass and the reviewer rule on the rest.

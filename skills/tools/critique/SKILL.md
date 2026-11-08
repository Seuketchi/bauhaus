---
name: critique
description: The craft pass on a finished piece: the numbers first, then a render, then a ranked list of at most 12 findings. Edits nothing and is not a sign-off. Use when a finished piece exists that this session did not make.
---

# Critique

The craft pass on a finished piece. It checks the numbers, looks at a render, and reports what to fix. It is a craft pass and not a sign-off: louis rules against the rules and the numbers, and a pass here is never read as approval.

## Input

The piece's path, the brief for it, and the project's `DESIGN.md` if there is one. A piece is an `.html` or `.svg` file, a `.png`, a `.pdf` or a `.figcraft` file.

## Who made it

Run only on a piece this session did not make. "This session" is this conversation: a piece made in it was made here. The first line names the maker as given. If the piece was made here, say so and stop.

## Order of work

1. **Read the craft's `REFERENCES.md`** before judging taste: `brand` for an identity, `email` for an email. The report cites the row each finding rests on, and only a row marked `opened` supports a rule.
2. **Run the checks that need no eye.** The checker is named by its path from the plugin root; give the files by path.
   - Every colour pair: `node skills/tools/design/check.mjs contrast <fg> <bg> --min 4.5` (`--min 3` for an interface part). Without `--min` a failing pair still exits 0.
   - The tells: `node skills/tools/design/check.mjs tells <piece> --brief <brief> --brand <tokens> --render <png>`.
   - An email as well: `node skills/tools/design/check.mjs email <file.html> --limits skills/tools/email/LIMITS.md`.
   - A PDF: `pdfcraft-cli check` and `pdfcraft-cli audit`.
3. **Render the piece.**
4. **Read the image**, then set it beside one chosen row of the craft's `REFERENCES.md`: a side-by-side, which only a reviewer can do.
5. **Judge the piece against the brief's `Idea` and `Story`.** Does the piece keep the idea's two words as its test, and does each story beat show up, carried by what the beat says carries it? This is judged by looking, listed as judged, and has no new exit code. Read a built email against its comp, and report a move that was lost between them.

```
timeout 20 figcraft-cli render /project/out/piece.figcraft -o /project/out/piece.png --no-system-fonts --automation-read-root /project --automation-write-root /project/out
timeout 20 pdfcraft-cli check /project/out/piece.pdf --json /project/out/check.json
timeout 20 pdfcraft-cli audit /project/out/piece.pdf
timeout 20 pdfcraft-cli render /project/out/piece.pdf --page 1 --dpi 72 --out /project/out/page.png
timeout 20 google-chrome --headless=new --no-sandbox --disable-gpu --user-data-dir=/tmp/critique-chrome --screenshot=/project/out/piece.png --window-size=640,900 file:///project/out/piece.html
```

With no `google-chrome`, render the HTML with Firefox instead, after `mkdir -p /tmp/critique-firefox`: `timeout 20 firefox --headless --no-remote --profile /tmp/critique-firefox --screenshot /project/out/piece.png --window-size=640,900 file:///project/out/piece.html`.

The rules for driving the command-line apps are in the `design` tool's `ARTCRAFT.md`.

## What the tells check can read

`check.mjs tells` reads `.html` and `.svg` pieces only. For a `.png`, a `.pdf` or a `.figcraft` file, say which checks could not run. A check that could not run is exit 3, never a pass. Name the file the check needs.

## The report

- **The first line is the script's own:** `PASS: no tells` or `FAIL: <n> tells`, or the line for exit 2 or exit 3. A reviewer's taste never writes the verdict.
- **Tells found by looking** are listed beneath it and labelled as judged, so they are never mistaken for a script result.
- **A recorded exception** is a dated entry in the `DESIGN.md` under **Not to do**. A tell with one is reported as earned.
- **At most 12 findings**, ranked, each with its location, the brief line or rule it breaks, the row of the craft's `REFERENCES.md` it rests on, and a fix. Rank them `fix` or `consider`.
- A brief that cites no reference row, or fewer than it needs, is exit 2: the piece fails.
- **Copy tells** T25 to T27 are the writer's to fix, because the words are the writer's. T25 and T26 still count toward the exit code. T27 is a warning.
- **A trend** is named as the reason for a finding only when its entry exists in `TRENDS.md`. Report an applied trend that is missing from section 8 of the `DESIGN.md`.

## Hard rules

- Edits nothing it reviews. Findings go back to the author.
- Says it is a craft pass and not a sign-off, and that louis rules.
- Cites a source for a finding: a brief line, a rule or a row. A worry with none stays out.

## Hand over

The report above, then `Checked:` and `Not checked:` lines, so a pass says what it certifies.

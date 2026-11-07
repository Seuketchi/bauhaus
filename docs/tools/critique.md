# critique

## What it does

`critique` is the craft pass on a finished piece. It runs the checks that need no eye first (colour pairs, the tells in `TELLS.md`, the email lint for an email, `pdfcraft-cli check` and `audit` for a PDF), renders the piece, reads the image and sets it beside one chosen reference row. It then reports at most 12 findings, ranked `fix` or `consider`, each with its location, the brief line or rule it breaks, the reference row it rests on and a fix.

The first line of the report is the script's own: `PASS: no tells` or a `FAIL` line. Tells found by looking are listed beneath it and labelled as judged, so a reviewer's taste never writes the verdict.

It also judges the piece against the brief's `Idea` and `Story`: whether the two words still govern the piece and whether each beat is carried by what the brief says carries it. That is judged by looking and has no exit code of its own. A built email is read against its comp, and a move that was lost is reported.

It edits nothing. It is a craft pass and not a sign-off: louis rules against the rules and the numbers.

## When to reach for it

- A finished piece exists that this session did not make.

Skip it for a piece made in the same session. The report says so on its first line and stops.

## Common questions

**What does it do with a PNG, a PDF or a `.figcraft` file?** `check.mjs tells` reads `.html` and `.svg` pieces only. For the other types the report says which checks could not run. A check that could not run counts as a failure, never as a pass.

**Who fixes copy tells?** The writer. Placeholder copy and buzzword copy are reported as findings for them, and both still count toward the exit code. A copy line with no specific detail is only a warning.

**Can a tell be kept?** Yes, as a dated entry in the `DESIGN.md` under **Not to do**, or by the brief naming it with a reason.

**When is a trend a reason for a finding?** Only when its entry exists in `TRENDS.md`. An applied trend that is missing from section 8 of the `DESIGN.md` is reported.

## It's working if

- The first line names the maker and the verdict comes from the script.
- Every finding names a location, a source and a fix, and the list is no longer than 12.
- The piece under review is unchanged afterwards.
- Checks that could not run are named, and none is passed silently.

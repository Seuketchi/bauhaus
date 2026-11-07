# Driving ArtCraft from a job

The hand-off between a character and ArtCraft is a file path. There is no shared bus: each command-line app reads and writes files. A job writes a steps file, runs the `-cli`, reads the JSON line printed per step, and hands a path to the next job. MCP mode is not used.

## Rules

- Run only `figcraft-cli`, `vectorcraft-cli` and `pdfcraft-cli`.
- Never start `figcraft`, `vectorcraft` or `pdfcraft` (the names without `-cli`): they open a window and block the session.
- Never call `artcraft-launcher`, not even with `--help`. It updated the launcher from 0.6.1 to 0.14.1 when it was called once.
- Wrap every call in `timeout 20` for checks, and in a longer bound for a real build.
- Write only to the project's output directory, `/tmp` or the scratch directory.
- Every `figcraft-cli` call takes both roots: `--automation-read-root <dir> --automation-write-root <dir>`.
- Add `--no-system-fonts` to every `figcraft-cli` call that renders, so a render matches on every machine.
- `vectorcraft-cli run` takes no root flags: it answers `unknown run option` and exits 1. Give every step an absolute output path under the output directory, and save the step command beside the file so the SVG can be made again.
- `pdfcraft-cli info`, `check`, `audit` and `render` take no root flag. `pdfcraft-cli run` takes `--root`, and its tool `doc_open` takes `path`: use the schemas that `pdfcraft-cli tools` prints.

## Commands each job uses

| Job | `figcraft-cli` | `vectorcraft-cli` | `pdfcraft-cli` | Other |
| --- | --- | --- | --- | --- |
| `brand` | `run steps.json --out x.figcraft`, `render x.figcraft -o x.png` | `run --cmd file.new --params J --cmd shape.rectangle --params J --export logo.svg`, `info logo.svg` | none | none |
| `email` | `run`, `render` (with `--scale`, from `--help`, not run), `export -o assets/ --format png` (run 2026-11-07) | none | none | `google-chrome --headless=new --screenshot` for the HTML |
| `screens` | `run` with `frame.create {preset}` (`frame.presets` run 2026-11-07, to read the preset sizes), `export --node NAME --format png` | none | none | none |
| `critique` | `render` | none | `info`, `render`, `check`, `audit` | headless Chrome for HTML |
| `design` | none | none | none | `check.mjs` (Node) |

## Verified runs

Each wrote only under a scratch directory, with `timeout 20`, and no window was opened.

1. `figcraft-cli run steps.json --out hero.figcraft --no-system-fonts` and both roots, with two steps (`frame.create` 600 by 300 with `props.fill`, `text.create`), printed one JSON line per step and `wrote hero.figcraft`. `render hero.figcraft -o hero.png` wrote a 600 by 300 PNG. `export hero.figcraft -o hero.pdf --format pdf` wrote the PDF.
2. `vectorcraft-cli run --cmd file.new --params '{"width":256,"height":256,"units":"Pixels","backgroundContents":"white"}' --cmd shape.rectangle --params '{...,"radius":24}' --export mark.svg` printed one JSON result per step and wrote a valid SVG with a `viewBox`.
3. `pdfcraft-cli` on that PDF: `info` printed a JSON summary, `check ... --json out.json` printed `checked 1 files: {"ok": 1}`, `audit` printed no findings, `render --page 1 --dpi 72` wrote a PNG.
4. Headless Chrome on a one-table HTML file wrote a PNG at the window size, under `timeout 20`.
5. `figcraft-cli export hero.figcraft -o assets/ --format png --no-system-fonts` and both roots, run 2026-11-07 on the file of run 1, wrote `assets/hero.png`, a 600 by 300 PNG: one file per top-level frame, named for the frame.

`test/artcraft.test.mjs` repeats runs 1 to 3 and 5 against a temporary directory. `npm run test:artcraft` fails when a command-line app is missing, and `npm test` skips with the reason printed.

## Not run, so not relied on

`figcraft-cli export` to PNG with `--scale`; whether FilmCraft, EffectCraft or DesignCraft have a `-cli` (they are not installed); whether a hosted runner can install the three packages.

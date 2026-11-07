# Driving the command-line apps from a job

The hand-off between a character and an app is a file path. There is no shared bus: each command-line app reads and writes files. A job writes a steps file or a script, runs the `-cli`, reads what it prints, and hands a path to the next job. MCP mode is not used.

SolidCraft is an independent app (its package says so) that the owner uses alongside the ArtCraft suite; it is not made by ArtCraft.

## Rules

- Run only the `-cli` binaries: `figcraft-cli`, `vectorcraft-cli`, `pdfcraft-cli`, `solidcraft-cli` and `cadcraft-cli`.
- Never start `figcraft`, `vectorcraft`, `pdfcraft`, `solidcraft`, `cadcraft`, `filmcraft`, `effectcraft` or `lightcraft` (the names without `-cli`): they open a window and block the session.
- Never call `artcraft-launcher`, not even with `--help`. It updated the launcher from 0.6.1 to 0.14.1 when it was called once, and it installs apps.
- Wrap every call in `timeout 20` for checks, and in a longer bound for a real build.
- Write only to the project's output directory, `/tmp` or the scratch directory.
- Every `figcraft-cli` call takes both roots: `--automation-read-root <dir> --automation-write-root <dir>`.
- Add `--no-system-fonts` to every `figcraft-cli` call that renders, so a render matches on every machine.
- `vectorcraft-cli run` takes no root flags: it answers `unknown run option` and exits 1. Give every step an absolute output path under the output directory, and save the step command beside the file so the SVG can be made again.
- `pdfcraft-cli info`, `check`, `audit` and `render` take no root flag. `pdfcraft-cli run` takes `--root`, and its tool `doc_open` takes `path`: use the schemas that `pdfcraft-cli tools` prints.
- `solidcraft-cli`, `cadcraft-cli`, and the apps that follow them, have no root flag on `run`, `exec`, `render`, `set`, `convert` or `snapshot`. The root and path flags in their `--help` are on `mcp` only (`solidcraft-cli mcp --allow-path`, `effectcraft-cli mcp --automation-*-root`), and MCP is not used. Confinement is by four things: every output path is absolute and under the output directory; the settings and data directories are set inside it (`CADCRAFT_CONFIG_DIR`, filmcraft's `--data-dir`, and `XDG_DATA_HOME`, `XDG_CONFIG_HOME` and `XDG_CACHE_HOME`); the saved command sits beside each artifact; and a scan test reads the saved command and every `path`, `file` or `out` value inside a script's JSON, and fails any that is relative or outside the output directory. A `path` can hide in the script, where the command line does not show it.
- Never `effectcraft-cli script` or `--eval` (they run JavaScript), never `mcp`, `--connect` or `--bridge` (they drive a running window), never `solidcraft-cli fuzz` or `bench-*`, and never `lightcraft-cli denoise-serve` or `merge` (`merge` writes next to its input).
- Side files are expected and listed: `.<name>.ecproj.lock` beside an opened EffectCraft project, `catalog.*` and `view.json` in a LightCraft library, FilmCraft's `.fcproj` on `--save-as`. A job's output directory holds them, and the hand-over lists any source file it did not write into.
- One `cadcraft-cli run` writes one `--export`: a second is refused with exit 2. More formats come from `convert` (`cadcraft-cli convert x.dxf x.svg`).
- Each row of the commands table and each verified run carries an app version and the date.

## Commands each job uses

| Job | `figcraft-cli` | `vectorcraft-cli` | `pdfcraft-cli` | `solidcraft-cli` | `cadcraft-cli` | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `brand` | `run steps.json --out x.figcraft`, `render x.figcraft -o x.png` | `run --cmd file.new --params J --cmd shape.rectangle --params J --export logo.svg`, `info logo.svg` | none | none | none | none |
| `email` | `run`, `render` (with `--scale`, from `--help`, not run), `export -o assets/ --format png` (run 2026-11-07) | none | none | none | none | `google-chrome --headless=new --screenshot` for the HTML |
| `screens` | `run` with `frame.create {preset}` (`frame.presets` run 2026-11-07, to read the preset sizes), `export --node NAME --format png` | none | none | none | none | none |
| `critique` | `render` | none | `info`, `render`, `check`, `audit` | none | none | headless Chrome for HTML |
| `design` | none | none | none | none | none | `check.mjs` (Node) |
| `massing` | none | none | none | `solidcraft-cli run massing.json --results --out x.step --save x.sc --json-out r.json`, `solidcraft-cli eval x.sc --json-out m.json`, `solidcraft-cli snapshot x.sc --out x.png --view iso`, script step `file.export_view_dxf` with a parallel camera (runs 6 to 9, solidcraft-cli 0.30.1, 2026-11-07) | `cadcraft-cli info x.dxf` on the DXF (run 10, cadcraft-cli 0.18.0, 2026-11-07) | none |
| `plans` | none | none | `pdfcraft-cli check` and `info` on the PDF (run 13, pdfcraft-cli 0.11.0, 2026-11-07) | none | `cadcraft-cli run --metric --cmd … --save x.dxf --export x.pdf`, `cadcraft-cli convert x.dxf x.svg`, `cadcraft-cli convert x.dxf x.png`, `cadcraft-cli info x.dxf` (runs 11, 12 and 14, cadcraft-cli 0.18.0, 2026-11-07) | none |

## Verified runs

Each wrote only under a scratch directory, with `timeout 20`, and no window was opened.

1. `figcraft-cli run steps.json --out hero.figcraft --no-system-fonts` and both roots, with two steps (`frame.create` 600 by 300 with `props.fill`, `text.create`), printed one JSON line per step and `wrote hero.figcraft`. `render hero.figcraft -o hero.png` wrote a 600 by 300 PNG. `export hero.figcraft -o hero.pdf --format pdf` wrote the PDF.
2. `vectorcraft-cli run --cmd file.new --params '{"width":256,"height":256,"units":"Pixels","backgroundContents":"white"}' --cmd shape.rectangle --params '{...,"radius":24}' --export mark.svg` printed one JSON result per step and wrote a valid SVG with a `viewBox`.
3. `pdfcraft-cli` on that PDF: `info` printed a JSON summary, `check ... --json out.json` printed `checked 1 files: {"ok": 1}`, `audit` printed no findings, `render --page 1 --dpi 72` wrote a PNG.
4. Headless Chrome on a one-table HTML file wrote a PNG at the window size, under `timeout 20`.
5. `figcraft-cli export hero.figcraft -o assets/ --format png --no-system-fonts` and both roots, run 2026-11-07 on the file of run 1, wrote `assets/hero.png`, a 600 by 300 PNG: one file per top-level frame, named for the frame.
6. `solidcraft-cli run massing.json --results --out massing.step --save massing.sc --json-out massing.run.json`, solidcraft-cli 0.30.1, 2026-11-07, with a `file.new`, four `solid.box` steps each named with `body_name`, and an `inspect.measure`: exit 0, four bodies created, and `massing.step` starts `ISO-10303-21;`.
7. `solidcraft-cli eval massing.sc --json-out massing.measure.json`, solidcraft-cli 0.30.1, 2026-11-07, on the model of run 6: exit 0, every body `closed: true`, the slab `volume_mm3` 28800000000.0 with bbox max `[12000.0, 8000.0, 300.0]`, and `total.volume_mm3` 58350000000, the sum of the four bodies. The two walls overlap by 200 by 200 by 3000 mm, so the total counts that overlap twice. The same script run into a fresh directory gave the same total. With `name` in place of `body_name` the bodies are `Body1` to `Body4`: `name` names the feature.
8. `solidcraft-cli snapshot massing.sc --out massing-iso.png --view iso --width 800 --height 500`, solidcraft-cli 0.30.1, 2026-11-07: exit 0, an 800 by 500 PNG, and read as an image it shows the slab, a wall and the roof plane.
9. A script with `file.export_view_dxf`, solidcraft-cli 0.30.1, 2026-11-07: with no `fov`, or with `"fov":60`, it exits 1 with `invalid parameters for file.export_view_dxf: invalid camera`. With `"pitch":1.5707963` and `"fov":0` it wrote `massing-plan.dxf`, 3,926 bytes. The `path` is inside the script, so a command-line scan does not see it.
10. `cadcraft-cli info massing-plan.dxf`, cadcraft-cli 0.18.0, 2026-11-07, on the DXF of run 9: exit 0, `"counts": {"Line": 4}`. It is the roof outline only, because a parallel top view hides what is below the roof.
11. `cadcraft-cli run --metric` with `units {"lunits":2,"luprec":0}`, three `layer.new` (`WALLS`, `DIMS`, `NOTES`), a `rectang`, a `dimstyle`, two `dimlinear` and two `text` commands, `--save plan.dxf --export plan.pdf`, cadcraft-cli 0.18.0, 2026-11-07: exit 0, one JSON line per command, and both files written. `cadcraft-cli info plan.dxf` counted `Dimension` 2, `Polyline` 1 and `Text` 2, and listed the three layers.
12. Two `--export` in one `cadcraft-cli run`, cadcraft-cli 0.18.0, 2026-11-07: exit 2, `the argument '--export <OUT.png>' cannot be used multiple times`. `cadcraft-cli convert plan.dxf plan.svg` and `convert plan.dxf plan.png` both exit 0. The PNG is 2400 by 1600. The SVG has a `viewBox` and no `<text>` element, because the text is drawn as strokes.
13. `pdfcraft-cli check plan.pdf`, pdfcraft-cli 0.11.0, 2026-11-07, on the PDF of run 11: `checked 1 files: {"ok": 1}`, exit 0. `info` reports the creator `CADCraft` and a first page of 841.89 by 595.28 pt, an A4 landscape sheet.
14. Dimension text on the PNG of a 12,000 mm plan, cadcraft-cli 0.18.0, 2026-11-07, read as an image: with the default dimstyle the dimension is drawn as a few dots, with no text and no arrows. With `dimstyle {"name":"Standard","current":true,"DIMSCALE":1,"DIMTXT":350,"DIMASZ":250,"DIMEXE":150,"DIMEXO":100,"DIMDEC":0}` the text reads `12000` and `8000`, and the arrows are drawn. Legibility is looked at on the render and is not something a command guarantees.

`test/artcraft.test.mjs` repeats runs 1 to 3 and 5 to 13 against a temporary directory, each test needing only the apps it calls. Run 14 is read by eye. Runs 1 to 5 were made on older versions; `npm run test:artcraft` repeated runs 1 to 3 and 5 on 2026-11-07 on figcraft-cli 0.16.0, vectorcraft-cli 0.22.0 and pdfcraft-cli 0.11.0, and passed. `npm run test:artcraft` fails when a command-line app a test needs is missing, and `npm test` skips that test with the reason printed.

## Not run, so not relied on

`figcraft-cli export` to PNG with `--scale`; `solidcraft-cli render` (a path-traced render that has not been run or timed), `fuzz` and `bench-*`; any `mcp`; CADCraft `hatch`, layouts and `mview`; whether a hosted runner can install any of these apps. FilmCraft 0.18.0 and EffectCraft 0.22.0 are installed and answer `--version`, and LightCraft 0.19.0 does too; none of the three has a row here yet, because no job uses them.

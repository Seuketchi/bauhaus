# plans

## What it does

`plans` draws a floor plan, a section or a sheet in CADCraft, in metric units. The drawing declares its unit, keeps its content on the layers `WALLS`, `DIMS` and `NOTES`, and carries the overall dimensions the brief lists. A `dimstyle` sets the dimension text height and the arrow size for the sheet, because at building scale the default text is drawn too small to read.

One `cadcraft-cli run` writes the DXF and one `--export`, the PDF. The SVG and the PNG come from `cadcraft-cli convert`. `cadcraft-cli info` lists the layers and the counts, and `pdfcraft-cli check` checks the PDF. The command is saved in `plan.sh`, and the settings directory is set to a folder inside the output directory.

The PNG is read before the hand-over says the dimension text is legible. The title block carries the design-study line as a text entity.

`structure.md` is a short note that names a grid or module, the spans, a load path and the material, each resting on an opened row of `REFERENCES.md`. The load path is an analogy for the layout, the skill's own design and not a source claim.

The rules for driving the command-line apps are in the `design` tool's `ARTCRAFT.md`. `critique` takes the PNG or the PDF, not the SVG or the DXF.

Every hand-over says: this is a design study, not an engineered design. It has no structural calculation and no code check.

## When to reach for it

- The task is a floor plan, a section or a sheet.
- A volume study from `massing` needs a plan with walls, dimensions and labels.

Skip it for the form and volume of a building (use `massing`), for page layout, brand, email and screens, and for anything that needs a structural calculation.

## Common questions

**Why is there one PDF export and a separate convert?** `cadcraft-cli run` takes one `--export`. A second one is refused, so the other formats come from `convert`.

**Is the load path a structural result?** No. It is drawn as an analogy for the layout. Nothing is calculated, and the hand-over says so.

**What is a structural grid here?** A layout of columns and spans on the plan. It is not the grid of a token file, and this tool writes no token file.

**Why does it read the PNG?** The dimension lines can be drawn while their text is too small to see. Only the image shows it.

## It's working if

- `plan.dxf`, `plan.pdf`, `plan.svg`, `plan.png`, `plan.sh` and `structure.md` exist and every one is listed in the hand-over.
- `cadcraft-cli info` shows the three layers, a dimension count at least the number the brief lists and a text entity for the title block.
- `pdfcraft-cli check` prints `checked 1 files: {"ok": 1}`.
- The dimension text is legible on the PNG at the sheet size.
- The hand-over states the unit and carries the design-study line.

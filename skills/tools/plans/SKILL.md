---
name: plans
description: A floor plan, a section or a sheet as a CADCraft drawing in metric units, with layers, overall dimensions, a PDF, an SVG and a PNG, and a short note on its structure. Use when the task is a floor plan, a section or a sheet.
---

# Plans

A floor plan, a section or a sheet, drawn in CADCraft. Follow the `design` method first: its precedence list, its bans and its checks. The references for this craft are in `REFERENCES.md` in this folder, and the rules for driving the command-line apps are in the `design` tool's `ARTCRAFT.md`.

The job is space on a sheet. It draws what the brief lists and writes no token file and no `DESIGN.md`. A structural grid here is a layout of columns and spans on a plan; it is not the `grid` group of a token file, and page grids stay with `design`, `brand` and `screens`.

## Before you draw

- Write the brief file for the sheet with the format in `design`, and cite rows of `REFERENCES.md`, only rows marked `opened`. For this job the brief states `Minimum: 2` and `Reason: two primary works`, because two opened rows fit and no more were read. The CADCraft row is a tool row: cite it for mechanics, never for a craft rule.
- The brief lists the overall dimensions to draw, the rooms to label and the unit. The unit is millimetres, stated in the brief and in the hand-over. If a size is missing, ask and never guess.
- The output directory is `/project/study` in the examples below. Every path in a command is absolute and under it, and the settings directory is set to a folder inside it.

## What to make

In the output directory:

- `plan.dxf`, the drawing, and `plan.pdf`, `plan.svg` and `plan.png`, its exports.
- `plan.sh`, the command that made the drawing, so the sheet can be made again.
- `structure.md`, the structure note (below).

### The drawing

The drawing declares metric units, with `units {"lunits":2,"luprec":0}`, and keeps what it draws on layers named for it: `WALLS`, `DIMS` and `NOTES`. The overall dimensions are `dimlinear` entities on `DIMS`. A `dimstyle` sets the text height and the arrow size for the sheet: at building scale the default dimension text is drawn so small that it cannot be read, and `DIMSCALE` alone leaves it small. Set `DIMTXT`, `DIMASZ` and `DIMDEC`, and read the PNG to see that it worked.

Room labels are `text` entities on `NOTES` with a height chosen for the sheet. A title block is a `text` entity too, and it carries the line in the hand-over below, so the sheet says what it is.

```sh
timeout 20 env CADCRAFT_CONFIG_DIR=/project/study/cfg XDG_DATA_HOME=/project/study/xdg/data XDG_CONFIG_HOME=/project/study/xdg/config XDG_CACHE_HOME=/project/study/xdg/cache cadcraft-cli run --metric \
  --cmd 'units {"lunits":2,"luprec":0}' \
  --cmd 'layer.new {"name":"WALLS","color":"white","lineweight":0.5}' \
  --cmd 'layer.new {"name":"DIMS","color":"cyan"}' \
  --cmd 'layer.new {"name":"NOTES","color":"green"}' \
  --cmd 'layer.set {"name":"WALLS","current":true}' \
  --cmd 'rectang {"p1":[0,0],"p2":[12000,8000]}' \
  --cmd 'layer.set {"name":"DIMS","current":true}' \
  --cmd 'dimstyle {"name":"Standard","current":true,"DIMSCALE":1,"DIMTXT":350,"DIMASZ":250,"DIMEXE":150,"DIMEXO":100,"DIMDEC":0}' \
  --cmd 'dimlinear {"p1":[0,0],"p2":[12000,0],"at":[6000,-1500]}' \
  --cmd 'dimlinear {"p1":[0,0],"p2":[0,8000],"at":[-1500,4000]}' \
  --cmd 'layer.set {"name":"NOTES","current":true}' \
  --cmd 'text {"at":[6000,4000],"text":"HALL","height":300,"justify":"MC"}' \
  --cmd 'text {"at":[0,-3000],"text":"This is a design study, not an engineered design. It has no structural calculation and no code check.","height":200,"justify":"BL"}' \
  --save /project/study/plan.dxf --export /project/study/plan.pdf
timeout 20 env CADCRAFT_CONFIG_DIR=/project/study/cfg cadcraft-cli convert /project/study/plan.dxf /project/study/plan.svg
timeout 20 env CADCRAFT_CONFIG_DIR=/project/study/cfg cadcraft-cli convert /project/study/plan.dxf /project/study/plan.png
timeout 20 env CADCRAFT_CONFIG_DIR=/project/study/cfg cadcraft-cli info /project/study/plan.dxf
timeout 20 pdfcraft-cli check /project/study/plan.pdf
```

One `--export` per `cadcraft-cli run`: a second one is refused. The other formats come from `cadcraft-cli convert`. The SVG draws its text as strokes, so a text search in it finds nothing.

### What to check

- `cadcraft-cli info` lists the layers `WALLS`, `DIMS` and `NOTES`, and a dimension count at least the number the brief lists. The hand-over names the layers.
- `pdfcraft-cli check` prints `checked 1 files: {"ok": 1}`.
- Read the PNG. The dimension text and the labels are legible at the sheet size, and the title block line is on the sheet. A plan whose dimensions are drawn and unreadable fails.
- A drawing with no unit fails.

### The structure note

`structure.md` is short and names four things, each citing an opened row:

1. A grid or module, and the dimension it is built from: the parts of the plan agree with the whole through it (row VP1).
2. The spans: each span as a number, and where it is longest.
3. A load path, drawn as an analogy for the layout: where weight would reach the ground if the plan were built, and where the layout makes that long. The load path is an analogy for the layout, the skill's own design, not a source claim, and it is never a statement that anything has been calculated.
4. The material, shown plainly: a wall is drawn as the material it is, and no surface is drawn to pass for another (row RP1). A permanent load or a live load is not given a number here.

## Hand over

First line: the verdict with its command and result, for example `plan.dxf drawn, three layers, two dimensions, PDF checked, a design study`. Then the files made: `plan.dxf`, `plan.pdf`, `plan.svg`, `plan.png`, `plan.sh` and `structure.md`, each by path. Every file listed exists and every file that exists is listed.

Then the unit (millimetres), the layers by name, the dimension count as `cadcraft-cli info` printed it, that the PNG was read and the dimension text was legible, and what was not checked.

`/bauhaus:critique` takes the PNG or the PDF, not the SVG or the DXF.

This is a design study, not an engineered design. It has no structural calculation and no code check.

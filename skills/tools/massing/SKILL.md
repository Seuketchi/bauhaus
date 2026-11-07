---
name: massing
description: The form and volume of a building or space as a SolidCraft model: a saved script, a closed-body check, an isometric image and the figures, handed on as a design study. Use when the task is the form or volume of a building or space.
---

# Massing

The form and volume of a building or space, built as a few named solid bodies in SolidCraft. Follow the `design` method first: its precedence list, its bans and its checks. The references for this craft are in `REFERENCES.md` in this folder, and the rules for driving the command-line apps are in the `design` tool's `ARTCRAFT.md`.

The job is space. It makes a study of volume and proportion, not a page layout, and it writes no token file and no `DESIGN.md`.

## Before you build

- Write the brief file for the piece with the format in `design`, and cite rows of `REFERENCES.md`, only rows marked `opened`. For this job the brief states `Minimum: 2` and `Reason: two primary works`, because two opened rows fit and no more were read.
- The unit is millimetres, stated in the brief and in the hand-over. The footprint, the height and the proportions come from the brief or the owner. If none is given, ask and never guess.
- The output directory is `/project/study` in the examples below. Every path in a command and in the script is absolute and under it.

## What to make

In the output directory:

- `massing.json` is the script and the source of truth: what is saved and handed on is the script, not the model file.
- `massing.sc`, the model, `massing.step`, the STEP export, and `massing.run.json`, what the run printed.
- `massing.measure.json`, what `eval` printed.
- `massing-iso.png`, the isometric image.
- `massing.sh`, the commands that made them, so the study can be made again.
- `massing-plan.dxf`, only when a plan is wanted (below).

### The script

Every `solid.*` step names its body with `body_name`. A `name` names the feature and the body stays `Body1`, so a body named `Body1` fails. Name each body for what it is: `slab`, `wall-west`, `roof-plane`.

```json
[
  {"command": "file.new", "params": {"name": "pavilion"}},
  {"command": "solid.box", "params": {"length": 12000, "width": 8000, "height": 300, "corner": [0, 0, 0], "body_name": "slab"}},
  {"command": "solid.box", "params": {"length": 200, "width": 8000, "height": 3000, "corner": [0, 0, 300], "body_name": "wall-west"}},
  {"command": "solid.box", "params": {"length": 13000, "width": 9000, "height": 150, "corner": [-500, -500, 3300], "body_name": "roof-plane"}},
  {"command": "inspect.measure", "params": {}}
]
```

State the proportions as ratios of the plan, with the module named: for the study above, a plan of 12,000 by 8,000 is 3 to 2, and a wall of 3,000 is a quarter of the long side (row VM1). Name each body for what it is and do not disguise the material: a body stands for one material and a surface is not made to pass for another (row RM1).

### The commands

```sh
timeout 20 env XDG_DATA_HOME=/project/study/xdg/data XDG_CONFIG_HOME=/project/study/xdg/config XDG_CACHE_HOME=/project/study/xdg/cache solidcraft-cli run /project/study/massing.json --results --out /project/study/massing.step --save /project/study/massing.sc --json-out /project/study/massing.run.json
timeout 20 env XDG_DATA_HOME=/project/study/xdg/data XDG_CONFIG_HOME=/project/study/xdg/config XDG_CACHE_HOME=/project/study/xdg/cache solidcraft-cli eval /project/study/massing.sc --json-out /project/study/massing.measure.json
timeout 20 env XDG_DATA_HOME=/project/study/xdg/data XDG_CONFIG_HOME=/project/study/xdg/config XDG_CACHE_HOME=/project/study/xdg/cache solidcraft-cli snapshot /project/study/massing.sc --out /project/study/massing-iso.png --view iso --width 800 --height 500
```

The STEP file starts `ISO-10303-21;`. Run `massing.json` again into a fresh directory and the total volume is the same: that is how the script, and not the model file, is shown to be the source.

Read each result before the hand-over uses it:

- `eval` reports every body `closed: true`. A body that is not closed is a failure, not a note: fix the script and run again.
- Read the image before the hand-over says it shows the study. A body that is missing, floating or the wrong size is fixed first.
- Use no `--allow-any-path`, no `mcp` and no path outside the output directory, in the command or in a `path` inside the script. A `path` in the script is scanned like a `--out`.

### A plan view

A plan DXF is written only with a parallel camera: `"fov": 0` and a pitch of `1.5707963`, which looks straight down. Any other pitch or a field of view is refused as an invalid camera.

Add this step to the end of the script:

```json
[
  {"command": "file.export_view_dxf", "params": {"camera": {"target": [6000, 4000, 0], "yaw": 0, "pitch": 1.5707963, "distance": 30000, "fov": 0}, "path": "/project/study/massing-plan.dxf"}}
]
```

A parallel top view hides what lies under the roof, so the DXF shows the roof outline only. Because of that, a plan comes from `/bauhaus:plans`, not from this DXF; the DXF is the file handed over to it.

## Hand over

First line: the verdict with its command and result, for example `massing.json run, three bodies, all closed, a design study`. Then the paths of the files made, and the figures as `eval` printed them, each with its unit in millimetres:

- the footprint and the height;
- the volume, which is the sum of the bodies, so overlaps count twice (give each overlap found);
- each body by name with its closed state.

Say that re-running the script into a fresh directory gives the same total. Say what the study does not have: no floors, stairs, openings or structure unless the script made them. Say that the image was read, and what was not checked.

This is a design study, not an engineered design. It has no structural calculation and no code check.

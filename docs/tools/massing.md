# massing

## What it does

`massing` studies the form and volume of a building or a space as a few named solid bodies in SolidCraft. It writes the brief file first, with the unit (millimetres) and the proportions stated as ratios of the plan, and then builds the study from a script.

The script, `massing.json`, is the source of truth: it is what is saved and handed on. Every `solid.*` step names its body with `body_name`, because a `name` names the feature and the body stays `Body1`. The run writes `massing.sc` and `massing.step`, `eval` writes `massing.measure.json`, and `snapshot` writes `massing-iso.png`. The commands are saved in `massing.sh`.

Every body must be closed: a body that is not is a failure, not a note. The hand-over gives the footprint, the height and the volume as `eval` printed them, in millimetres. The volume is the sum of the bodies, so overlaps count twice, and the hand-over lists the overlaps it found. Running the script again into a fresh directory gives the same total.

A plan DXF is written only with a parallel camera (`"fov": 0`, looking straight down). A parallel top view shows the roof outline only, so a plan comes from `plans`, not from this DXF.

Its craft rules rest on two opened rows in `REFERENCES.md`, and the two lending books are pointers that are not cited. The rules for driving the command-line apps are in the `design` tool's `ARTCRAFT.md`. `solidcraft-cli render` is not used.

Every hand-over says: this is a design study, not an engineered design. It has no structural calculation and no code check. It also says the study has no floors, stairs, openings or structure unless the script made them.

## When to reach for it

- The task is the form or volume of a building or a space.
- A plan needs a volume study to start from.

Skip it for a floor plan with dimensions (use `plans`), for brand, email and screens, and for anything that needs a structural calculation.

## Common questions

**Why is the volume a sum?** `eval` adds the volumes of the bodies. Where two bodies overlap, the overlap is counted twice, and the hand-over says so.

**Why `body_name` and not `name`?** In SolidCraft a `name` names the feature. The body keeps the name `Body1` and the study cannot be read.

**Why is the DXF only a roof outline?** A plan view is a parallel top view, and the roof hides what lies under it. A plan with walls and dimensions is made by `plans`.

**Why is `render` not used?** It is a path-traced render that has not been run and timed here, so it is not relied on. `snapshot` is the one image path.

## It's working if

- `massing.json`, `massing.sc`, `massing.step`, `massing.measure.json`, `massing-iso.png` and `massing.sh` exist and every one is listed in the hand-over.
- The STEP file starts `ISO-10303-21;` and every body is closed and named for what it is.
- Every figure in the hand-over equals what `eval` printed, in millimetres.
- The image was read before the hand-over said it shows the study.
- The hand-over carries the design-study line.

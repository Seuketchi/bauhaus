# develop

## What it does

`develop` develops or prepares a photograph in LightCraft from a command line. It writes `developed.jpg`, a `preview.png` of at most 2000 pixels on the long edge, `develop.sh` with the commands that made them, and `controls.json` with the catalogue the values were checked against.

A single file is developed with `lightcraft-cli render`, and a develop that needs a crop or the app's own estimate runs in a library inside the output directory. `develop.auto` runs first, because it replaces an earlier `develop.set`, and the manual steps follow it.

Every control and value comes from `develop.controls`. An unknown control is refused by the app, but an out-of-range value is clamped without an error, so the job compares every value to its `min` and `max` before the run.

The source photograph is never changed. Its hash is taken before and after, the output path differs from the input, and `format=original` is never used. The library, the settings and a shader cache sit inside the output directory and are listed as side files.

The craft rules are limited to exposure in stops, the direction, hardness and pattern of light, colour temperature in kelvin, composition, a tone curve, and crop and straighten. Each cites an opened row of `REFERENCES.md`, and every row is a Wikibooks or Wikipedia page, so every one is secondary. There is no rule on product or tabletop lighting setups, because no source for one was opened.

The rules for driving the command-line apps are in the `design` tool's `ARTCRAFT.md`. `critique` takes the PNG preview, not the JPG.

## When to reach for it

- The task is a photograph to develop or prepare.
- A photograph needs a JPG at a stated long edge and a PNG preview for review.

Skip it for making a photograph, for brand, email and screens, for plans and models, and for the words that go with a picture.

## Common questions

**Why does it check the values itself?** The app clamps a value outside its range and reports nothing, so a hand-over could claim a stronger change than the file has.

**Why does `develop.auto` come first?** It replaces an earlier `develop.set`. A set made after it holds.

**Does it write next to the original?** No. The hash is the same before and after, and no sidecar is written beside the source.

**Why is there a PNG as well as a JPG?** `critique` takes a PNG and not a JPG, so the craft pass reads the preview.

## It's working if

- `developed.jpg`, `preview.png`, `develop.sh` and `controls.json` exist and every one is listed in the hand-over.
- Every line the app printed is `"ok":true`, and the long edge equals what the app printed.
- Every value set is inside its `min` and `max` in `controls.json`.
- The hash of the source is the same before and after, and no sidecar sits beside it.

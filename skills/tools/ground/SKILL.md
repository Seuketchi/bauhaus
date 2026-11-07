---
name: ground
description: Grounds and dither as files: a picture reduced to a few token colours with an ordered, Floyd–Steinberg or Atkinson dither, and a gradient, mesh, blur, grain, halftone or text-picture ground, as PNG or SVG. Use when a piece needs a made ground or a few-colour image and the brief names it.
---

# Ground

A ground is the surface behind a piece, and a dither is a picture reduced to a few colours. This tool makes both as files, from the scripts in this folder: Node only, no dependency and no outside asset. Follow the `design` method first: its precedence list, its bans and its checks. Where each method comes from is in `REFERENCES.md` in this folder, and the rules for driving other apps are in the `design` tool's `ARTCRAFT.md`.

No source about the craft of grounds was opened, so no craft rule is written here. This tool makes the file the brief asks for, and which ground suits a piece is the brief's call and the designer's.

## Defaults

- **Not called by default.** A piece gets a ground or a dither only when the brief or the brand data names one.
- **Colour stops come only from the token file.** Every colour is a token path such as `semantic.color.accent`. The script refuses a hex colour and a path that is not in the file, and an `oklab` or `oklch` token outside the sRGB gamut, which it does not clip.
- **A mesh, a blur field or an aurora only when the brief names it.** The `design` tells already ban glass and blur as decoration and an unrequested purple gradient. The `mesh` and `blur` commands take `--brief <brief.md>` and refuse to run unless it says mesh, blur or aurora.
- **Grain and stripes are a PNG, never a filter.** A ground is written as a PNG, so no `feTurbulence` and no repeating gradient enters a piece. Grain is seeded noise on lightness, set with `--grain`, `--seed` and `--grain-size`.
- **For email the ground is a PNG at final size.** Make it at the width the email uses, with `--size`, and place it as an image. A CSS background does not reach every email client.
- **Text over a ground is checked.** Run the contrast check of `design` between the text colour and the lightest and the darkest colour of the ground, and read the render. Say in the hand-over which was done.

## Before you make

- A brief file in the format in `design`, which names the ground or the dither and the colours it uses as token paths. If no token file exists, `brand` writes one first.
- The size in pixels, from the brief or the owner. If none gives it, ask and never guess.
- The output directory, for example `/project/ground`. Every path in a command is under it.

## Commands

All of them run as `node skills/tools/ground/ground.mjs <command> …`, take the token file with `--tokens`, and write one file with `--out`. A ground is a PNG; a dither is a PNG or an SVG; an ASCII tile is an SVG or a PNG.

```sh
node skills/tools/ground/ground.mjs linear --tokens /project/design.tokens --stops semantic.color.ink,semantic.color.accent,semantic.color.paper --size 1200x630 --angle 60 --grain 0.04 --seed 7 --out /project/ground/ground.png
node skills/tools/ground/ground.mjs mesh --tokens /project/design.tokens --points "0.1,0.15,semantic.color.accent;0.85,0.2,semantic.color.ink;0.5,0.95,semantic.color.paper" --size 1200x630 --brief /project/brief.md --out /project/ground/mesh.png
node skills/tools/ground/ground.mjs blur --tokens /project/design.tokens --base semantic.color.ink --blobs "0.3,0.4,0.25,semantic.color.accent;0.8,0.7,0.2,semantic.color.paper,0.6" --size 1200x630 --brief /project/brief.md --out /project/ground/blur.png
node skills/tools/ground/ground.mjs grain --in /project/ground/ground.png --amount 0.05 --seed 3 --grain-size 2 --out /project/ground/ground-grain.png
node skills/tools/ground/ground.mjs halftone --tokens /project/design.tokens --in /project/ground/ground.png --ink semantic.color.ink --paper semantic.color.paper --cell 12 --angle 45 --out /project/ground/halftone.png
node skills/tools/ground/ground.mjs ascii --tokens /project/design.tokens --in /project/ground/ground.png --bg semantic.color.ink --fg semantic.color.paper --cell 10 --out /project/ground/ascii.png
node skills/tools/ground/ground.mjs dither --tokens /project/design.tokens --in /project/ground/source.png --method atkinson --palette semantic.color.ink,semantic.color.paper --scale 2 --out /project/ground/dither.svg
```

What each one does:

- `linear`: a gradient along a line, `--angle` in degrees with 0 running to the right and 90 downward, the stops spread evenly and mixed in Oklab, not in sRGB, so blue to yellow does not pass through grey.
- `mesh`: points `x,y,P` with x and y from 0 to 1, each pixel mixing every point's colour in Oklab by one over its distance to the power `--power` (2.5 by default).
- `blur`: soft blobs `x,y,r,P[,strength]` over a base colour, r a fraction of the width, mixed in Oklab.
- `grain`: seeded noise added to Oklab lightness, so the shift is even across hues and the average does not move. The same seed gives the same grain.
- `halftone`: one dot to each cell of a grid turned by `--angle`, bigger where the field is darker, ink on paper.
- `ascii`: one character to each cell, chosen by the lightness of the field from a ramp of ten ASCII characters, dense where the field is dark. It is SVG text in the generic `monospace` family, and no font is bundled. A PNG is drawn by headless Chrome under `timeout 60`, and the script writes the PNG itself, so the same input gives the same bytes. Without Chrome, write the `.svg`.
- `dither`: the picture reduced to the palette, the nearest colour found in linear light. `--method` is `bayer2`, `bayer4` or `bayer8` (an ordered map built by recursion), `fs` (Floyd–Steinberg, 7, 3, 5 and 1 over 16), `atkinson` (one eighth to six neighbours, so a quarter of the error is dropped and darks and lights come out harder) or `none` (the nearest colour and no dither). `--scale` repeats each pixel, for a coarse look. An ordered method moves a pixel by the average gap between the palette's levels, and `--spread` overrides it. The palette has 2 to 256 colours, all of them token paths.

The result is the same every time: the same input, method and options give byte-identical files. Save the commands that made the files as `ground.sh` beside them, so the piece can be made again.

## Checks before the hand-over

- Read each file as an image: its size is the size asked for and the colours are the token colours.
- A ground or tile behind text: the contrast check of `design` between the text and the lightest and darkest colour of the ground, at 4.5:1 for text and 3:1 for large text and interface parts.
- Nothing in the output folder is a binary file other than the PNG that was asked for, and no SVG carries a filter.

## Hand over

First line: the verdict with its command and result, for example `ground.png made, 1200 by 630, three token stops, grain 0.04 seed 7, contrast read at the lightest and darkest stop`. Then the paths of the files made, the commands in `ground.sh`, the token paths used, the seed and every option, and what was not checked, for example text over a ground checked by eye only. A pass is not approval: the craft pass and louis rule on the rest.

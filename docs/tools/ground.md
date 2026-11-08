# ground

## What it does

`ground` makes the surface behind a piece, and a picture reduced to a few colours, as a file. It is a set of Node scripts in the tool's folder, with no dependency and no outside asset.

- **Grounds:** a linear gradient and a mesh gradient mixed in Oklab, a blur field, seeded grain, halftone dots, and an ASCII tile drawn as text. A ground is a PNG.
- **Dither:** a picture reduced to a palette of two to 256 colours by an ordered map (2, 4 or 8 on a side, built by recursion), by Floyd–Steinberg or by Atkinson, with the nearest colour found in linear light. The result is a PNG or an SVG.

Every colour is a token path from the project's token file. A hex colour is refused, so a ground never brings a colour the brand does not have. The tool is not called by default, a mesh or blur ground is made only when the brief names one, and grain or stripes are a PNG and never a filter. For email the ground is a PNG at the final size.

The same input, method and options give byte-identical files. Where each method comes from, and the licence read for the colour constants, is in `REFERENCES.md`; no code, palette, image or font comes from another product, and a test fails on any binary file or `data:` URI in the folder.

## When to reach for it

- The brief names a ground: a gradient, a mesh, a blur field, grain, halftone or a text-picture.
- The brief names a dither: a picture or a ground in a few colours, for a coarse or printed look.
- An email needs a background image at its final size.

Skip it when the brief names neither, for a photograph (use `develop`), and for a logo or mark (use `brand`).

## Common questions

**Why will it not take `#ff00ff`?** Colour stops come only from the token file. Add the colour to the token file first, through `brand`, if the brand should have it.

**Why does a mesh need a brief?** The method bans glass and blur as decoration and an unrequested gradient. The `mesh` and `blur` commands run only when `--brief` points at a file that says mesh, blur or aurora.

**Why is a ground never an SVG?** A grain or stripe made as an SVG filter or a repeating gradient trips the checks for the machine-made look. A PNG at the final size is plain and works in an email.

**Why mix in Oklab?** Mixing in sRGB makes some pairs, such as blue and yellow, pass through grey. Oklab keeps the lightness of the steps even.

**What if Chrome is not installed?** An ASCII tile can be written as an SVG with no Chrome. Only the PNG of the tile needs it.

**An `oklch` token with no hex?** It is computed to sRGB. If it falls outside the sRGB gamut the script says so and stops; it does not clip the colour.

## It's working if

- The file exists at the size asked for, and read as an image it shows the token colours.
- Running the same command again gives the same bytes.
- No stop, palette entry or text colour is a hex that is not in the token file.
- Text over a ground passes the contrast check against the lightest and darkest colour of the ground, or the hand-over says it was read by eye.
- `ground.sh` beside the files holds the commands that made them.

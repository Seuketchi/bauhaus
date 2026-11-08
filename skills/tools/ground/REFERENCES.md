# Ground references

Where the numbers and methods of this tool come from. The code in this folder is written from each public definition below. No text or pseudocode is pasted from any page, and no code from any other program is used.

Conduct of the source pass: public pages only, no account, no sign-in and no licence taken for any product. Each host's `robots.txt` was read first and respected, and every request sent the User-Agent `bauhaus-research/1.0 (read-only)`, a few seconds apart. All pages were opened on 2026-11-07.

An encyclopedia page is marked `secondary`: it states the method, and the primary paper was not opened. Those pages are licensed CC BY-SA, so nothing is quoted from them; a number or a matrix is a fact and the sentence around it is not taken.

| Id | Method | Public definition | What is taken | Read |
| --- | --- | --- | --- | --- |
| GR1 | Floyd–Steinberg error diffusion | Floyd–Steinberg dithering (Wikipedia), secondary, opened 2026-11-07, revision of 2026-11-01. https://en.wikipedia.org/wiki/Floyd%E2%80%93Steinberg_dithering | The error of a pixel goes to four neighbours in scan order, left to right and top to bottom: 7, 3, 5 and 1 over 16, to the right, below-left, below and below-right. Nothing else: the loop is our own. | opened |
| GR2 | Atkinson error diffusion | Atkinson dithering (Wikipedia), secondary, opened 2026-11-07, revision of 2026-05-04. https://en.wikipedia.org/wiki/Atkinson_dithering | One eighth of the error goes to each of six neighbours: two to the right, three on the next row (left, centre, right) and one two rows down. That is six eighths, so a quarter of the error is dropped. | opened |
| GR3 | Ordered (Bayer) dither | Ordered dithering (Wikipedia), secondary, opened 2026-11-07, revision of 2026-10-31. https://en.wikipedia.org/wiki/Ordered_dithering | A threshold map whose side is a power of two is built by recursion from the 1 by 1 map: each step lays four copies, one as 4M, one as 4M+2, one as 4M+3 and one as 4M+1. The page notes that a map should be normalised; ours is centred on zero, `(index + 0.5) / side² − 0.5`, and scaled by a spread, so the average brightness of the result is not shifted. | opened |
| GR4 | OKLab and OKLCH | CSS Color Module Level 4 (W3C Candidate Recommendation Draft of 3 November 2026), the sections that define Oklab and OKLCH, opened 2026-11-07, https://www.w3.org/TR/css-color-4/ ; and Björn Ottosson, A perceptual color space for image processing (2020, matrices updated 2021-01-25), opened 2026-11-07, https://bottosson.github.io/posts/oklab/ | The two matrices from linear sRGB to Oklab and back, the cube-root step, and the polar form `C = √(a²+b²)`, `h = atan2(b, a)`. The constants in `raster.mjs` and in the design tool's `check.mjs` are the numbers of Ottosson's post (the 2021 update); CSS Color 4 gives the same matrices through XYZ at 64-bit precision, and the two agree to well under one 8-bit step. Licence read: the post says its code is public domain, and also MIT if public domain is not wanted; the W3C document carries the W3C permissive document licence. Only numbers are taken. Checks: white maps to (1, 0, 0) and black to (0, 0, 0); the primaries agree with the CSS XYZ route; a round trip of 8-bit colours through Oklab and OKLCH returns the same colour. Those anchor and round-trip checks are in `test/ground.test.mjs` and `test/design.test.mjs`. | opened |
| GR5 | sRGB transfer function | CSS Color Module Level 4, the sRGB conversion functions, opened 2026-11-07, https://www.w3.org/TR/css-color-4/ | Linear to encoded: 12.92 times the value up to 0.0031308, else 1.055 times the value to the power 1/2.4, less 0.055. Encoded to linear: divide by 12.92 up to 0.04045, else the inverse power. | opened |
| GR6 | Mixing in Oklab | CSS Color Module Level 4, the interpolation sections (Oklab is a rectangular coordinate model, so its three coordinates mix one by one), opened 2026-11-07 | A linear or mesh gradient mixes colours in Oklab coordinates, not in sRGB. The mesh weights, the Gaussian blobs of the blur field and the grain are our own formulas, not a definition taken from a page. | opened |

## What is our own

- The seeded random generator is defined in `raster.mjs` from a counter, an odd step and a mix of shifts and multiplications chosen here, and it is not copied or pasted from any source or a cryptographic generator. A test checks its mean and spread, and that the same seed gives the same numbers.
- Halftone is our own geometry: a grid turned by an angle, one dot per cell, the dot radius set by the lightness of the field under the cell centre. Halftone (Wikipedia, secondary, opened 2026-11-07) was read for one fact, that a screen is turned to an angle; no screen, dot shape or table of angles is copied.
- ASCII is our own: one character per cell, chosen from our own ten-character ramp by the lightness of the field. It is written as SVG text and drawn to a PNG by headless Chrome, as the email tool does for HTML.
- The grain adds seeded noise to Oklab lightness. The linear gradient projects each pixel on the gradient's axis. The mesh gradient weights each point by one over its distance to a power.

## What is not used

- No code from jp2a, libcaca, ImageMagick or FFmpeg is used, and none is a dependency. They were looked at as programs that do similar work, to know they exist, and no source of theirs was read or ported.
- No library is a dependency: the code imports Node's own modules and files of this folder, and a test fails on anything else.
- No palette preset, sample image or font ships. Colours come from the project's token file. The ASCII tile names only the generic `monospace` family, and no font file is bundled; a brand font comes from the brand's own licence.
- Test fixtures are made in code (a lit sphere and a grey ramp), never a photograph.
- Every file in this folder is `.md`, `.mjs` or `.json`, with no binary file and no `data:` URI. A test fails on either.

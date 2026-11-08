# Tools may ship generator code, and nothing ships from another product

Date: 2026-11-07

## Context

Until now a tool of this package has been a recipe and a checker: it tells a session how to drive an installed command-line app, and `check.mjs` in `design` is the one script that computes a number. The owner asked for the same capabilities that closed design products sell (a dithered image, a gradient, grain, halftone and text-picture grounds) to be available here as open code, to be used and read by anyone. No installed command-line app makes them: the apps in the suite have no dither, halftone or text-picture effect, and their grain is loud colour noise.

That needs code that makes pixels. The question is what such a tool may contain, because what enters git history cannot be taken back, and the owner wants the package open.

## Decision

- **A tool may ship its own generator code.** `ground` carries `ground.mjs`, `dither.mjs` and `raster.mjs`, written here, in plain Node with no dependency. The scripts take files in and write files out, as the rest of the package does, and a tool still never imports from another tool's folder.
- **Nothing ships from another product.** No code, palette preset, sample image, font, template, frame, wording or table is taken from another product or program, free or paid, whatever its licence. The methods are written from their public definitions, and `REFERENCES.md` names each definition, whether the primary source or only an encyclopedia was opened, and the date. A number in a public specification (a matrix, a weight) is a fact and is taken as a number.
- **No sign-in and no licence for any product.** Source passes read public pages only, respect each host's `robots.txt`, and use no account, trial or licence. A by-hand trial of a closed product is the owner's, and no session does it.
- **Skill text does not name another product as the model.** A tool describes the capability it has and never says it is a copy of something.
- **Enforced by a test, not only by words.** A test fails on any binary file or `data:` URI in a tool's folder, on any import other than Node's own modules and the folder's own files, and on a dependency in `package.json`. Another test checks that the same input and method give byte-identical output.
- **The same constants twice.** A tool may not import from another tool's folder, so the colour conversion between sRGB and Oklab sits in `ground/raster.mjs` and again in `design/check.mjs`, with the same anchor and round-trip tests on both.

## Consequences

- The package holds code that makes images. It is MIT, like the rest of the repo, and has to stay free of anything it cannot relicense.
- A new generator tool needs its own `REFERENCES.md` of definitions before its first commit, and the same folder test.
- The repo is private today. Publishing it is a separate decision, and the provenance record in `REFERENCES.md` is what that decision will read.
- Programs that do similar work (jp2a, libcaca, ImageMagick, FFmpeg) stay out as code and as dependencies. If a future tool wants one of them, that is a new decision with its licence read.

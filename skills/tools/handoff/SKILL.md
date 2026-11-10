---
name: handoff
description: Finished HTML pages handed on, as Figma layers built by Scripter scripts the owner pastes and runs, and as one self-contained HTML file for the developer with every page, the links between them, a mobile view and the interactions written down. Use when finished pages go to Figma or to a developer.
---

# Handoff

Two deliverables from pages that are finished and accepted: the pages as Figma layers, and one HTML file the developer can open with no server. Both are made by scripts in this folder, with no dependency. Nothing here designs: a page that is not accepted yet goes back to the job that made it.

## Figma layers

`figma.mjs` renders a page in headless Chrome, reads every box, text run, SVG, image crop, clip-path and mask with its position, and writes Scripter scripts that rebuild it as layers. The images go inside the scripts, so the owner drags nothing in.

```sh
node skills/tools/handoff/figma.mjs page /project/site/product.html --width 1920 --frame "Product — desktop" --out /project/figma
node skills/tools/handoff/figma.mjs page /project/site/product.html --width 390 --frame "Product — mobile" --out /project/figma
```

- `--width` is the frame width: the design width for desktop, 390 for mobile. Each width is a separate frame.
- The page's own scripts are left out of the capture, so a reveal on scroll or a carousel cannot hide or move a part. Interactions are not layers; they go in the developer file.
- Scripts are split down the page so each stays under `--max-mb` (1.8 by default). Photos go in at 1.5 times their largest size on the page and cut-out PNGs at 1 times, through ffmpeg when it is on the PATH.
- `--font-map map.json` maps a CSS family to the family the Figma file uses, for example `{"Fraunces": "New Spirit"}`. Without a match the script uses the next family in the CSS stack, then Inter, and prints which it used.
- Every script is run against a stand-in for the Figma plugin API before it is handed over (`figma.mjs check`), and `page` prints `PASS` or `FAIL` per script. A `FAIL` is fixed before anything goes to the owner.

What it handles: gradients (linear and radial), shadows, CSS blur, rounded corners, borders on one side (row dividers), text in a flex box beside an icon, buttons and button rows as auto layout, images cropped the way CSS crops them, clip-path polygons, gradient masks, SVG icons with their group styles copied onto each shape, dotted and dashed strokes, and text on a path as one letter per layer.

### Handing the scripts over

The owner runs them, and nothing in this session can see the result. So:

1. Put one script on the clipboard at a time, and say which file it is and which part of how many.
2. Say: open the Figma file, open Scripter, **New script, Ctrl+A, paste, run.** Pasting into an existing sample script gives errors that are not in the code.
3. Each script prints what it built and the fonts it used. Ask for that line and a screenshot after the first part of each frame, and fix the converter, not the Figma file, when something is missing.
4. A script is safe to run again: it replaces its own group in the frame and leaves everything else.

When the same error line comes back across script versions, suspect where it was pasted before rewriting code.

## The developer file

`bundle.mjs` puts every page in one HTML file: a tab per page, the page links working between tabs, a Desktop / Mobile switch, and an Interactions tab.

```sh
node skills/tools/handoff/bundle.mjs --out /project/handoff.html --title "Site name" \
  --page "Home=/project/site/home.html" --page "Product=/project/site/product.html" \
  --links /project/links.json --interactions /project/interactions.md
```

- Each page runs in its own frame, so its CSS and its scripts work as they do alone. Images are inlined once and shared: photos as JPEG, cut-outs as WebP.
- `links.json` maps a link's visible text to a tab, for example `{"SHOP": "Product"}`. An element with `data-handoff="Product"` works without the map.
- `interactions.md` is written for the developer: `## Group` per page, and `- **Name**: what it does` per interaction, with its trigger, timing and what happens with reduced motion. Name the placeholders still open in the copy.

## Interactions in the pages

When the pages carry interactions (an FAQ that opens, a gallery that swipes, a carousel), classes the script adds start with `ix-`, so they cannot collide with the page's own classes. Motion runs only under `prefers-reduced-motion: no-preference`.

## It is done when

- Every script printed `PASS` here and the owner has sent the build line and a screenshot of each frame.
- The developer file opens with no server, every tab shows its page, the page links switch tabs, and the Interactions tab lists each interaction with its trigger.

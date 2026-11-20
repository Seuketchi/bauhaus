# handoff

## What it does

`handoff` passes finished HTML pages on in two forms. It is two Node scripts in the tool's folder, with no dependency.

- **Figma layers:** `figma.mjs` renders a page in headless Chrome, reads every box, text run, SVG, image crop, clip-path and mask with its position, and writes Scripter scripts that rebuild the page as layers in a frame. The images are inside the scripts. Each script is run against a stand-in for the Figma plugin API before it is handed over, and is safe to run again.
- **The developer file:** `bundle.mjs` puts every page in one HTML file with a tab per page, the page links working between tabs, a Desktop / Mobile switch and an Interactions tab written for the developer.

It designs nothing. Pages that are not accepted go back to the job that made them.

## When to reach for it

- Finished pages go into a Figma file, as desktop and mobile frames.
- Finished pages go to a developer, who needs to see every page, how they link and how each part moves.

Skip it for an email (use `email`), for a single screen spec (use `screens`), and for a page that is still changing.

## Common questions

**Why Scripter and not a Figma import plugin?** Scripter runs the Figma plugin API with no rate limit, and the script can be read and run again. The owner pastes it into a new script and runs it.

**Does the owner have to paste the scripts?** Not when the session has a Figma server connected to the owner's file (tools `figma_run_file` and `figma_screenshot`): each script is run there by path, and a screenshot of the frame is checked after the first part. Pasting into Scripter is the fallback when no server is connected.

**Why are the page's scripts left out of the capture?** A reveal on scroll or a carousel would hide or move parts while the page is read. Interactions are described in the developer file instead.

**The headings came out in Inter.** The font in the CSS is not in the Figma file. Pass `--font-map` with the family the file uses, or install the font, and run the script again.

**A script says FAIL here.** The stand-in API found an error, such as a zero-size element or an empty group. Fix the converter or the page before the owner runs it.

**Why does Chrome have to be installed?** The layout is read from the browser's own rendering, through `--dump-dom`, which Firefox does not have.

**Why WebP in the developer file?** Cut-outs with transparency are several times smaller as WebP than as PNG, and every current browser shows it.

## It's working if

- `figma.mjs page` prints `PASS` for every script, and the screenshot of each frame, from the Figma server or from the owner, shows it matching the page.
- Running a script twice leaves one copy of its part in the frame.
- The developer file opens from disk, every tab shows its page, a header link switches to its tab, and the Mobile switch shows the page at 390 px.

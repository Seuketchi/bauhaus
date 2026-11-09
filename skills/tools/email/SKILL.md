---
name: email
description: HTML email layout and look, built on live text and tables, linted against the client limits table, rendered at two widths, with the images made by FigCraft. Use when the piece is an HTML email.
---

# Email

The layout and look of one HTML email. Follow the `design` method first: its precedence list, its bans and its checks. This folder holds the client limits (`LIMITS.md`), the references for the craft (`REFERENCES.md`) and the registers (`REGISTERS.md`): the look of each category of email, read from real ones.

Words come from `words.md`, written by the writer against the slot ids of the layout, and the plain-text part comes from it too. This skill writes none of the words.

## Output

In this order:

- `comp.figcraft` and `comp.png`: the whole-page comp, 600 px wide, made by `figcraft-cli` (below).
- `research.md`, beside the brief, from the research step of the `design` method.
- `email.html`, with live text, a real link button and alt text on every image, built after the owner has seen the comp.
- The image assets as PNG files, made by `figcraft-cli` and named in the email.
- A render of the HTML at 640 px and at 375 px wide, and a render at the comp's width to set beside it.
- `words.md`, the writer's file, which the layout takes its words from.

## The comp

- **The email starts as a whole-page comp in FigCraft, 600 px wide.** It is built as HTML with live text only afterwards.
- **The owner sees the comp before the HTML is built.** This is a gate: the HTML is not started until the owner has seen the comp.
- **The comp's type, sizes and button are the spec for the HTML.** The built HTML uses a 600 px container, which passes the 640 px limit of the lint, with live text and a real button, and its render is set beside the comp at the same width.
- **The lint and the tells check run on the HTML, never on the comp.** A comp is looked at by eye, and its colour pairs are checked one by one with `check.mjs contrast` and `--min`.
- **A tells run that exits 3 on a comp is reported as `not run`, never as a pass.** A check that could not run is never a pass.
- **Pictures are used at the size they were supplied.** A picture is not enlarged past the size that P6 of the research recorded as its ceiling. `--scale 2` doubles the pixels and does not sharpen a small source.

```
timeout 60 figcraft-cli run /project/email/comp-steps.json --out /project/email/comp.figcraft --no-system-fonts --automation-read-root /project --automation-write-root /project/email
timeout 20 figcraft-cli export /project/email/comp.figcraft -o /project/email/comp.png --format png --node comp --no-system-fonts --automation-read-root /project --automation-write-root /project/email
```

Make the comp frame 600 px wide and name it `comp`. Read the PNG before the owner is shown it.

## Before you build

- **No `DESIGN.md`, no email.** When the project has none, the identity is made first, by `brand`, from the client's past pieces where they exist. Say so and stop.
- Read the `DESIGN.md` and the project's own rules if there are any, and write the brief file for the piece. Cite at least three rows of `REFERENCES.md`, only rows marked `opened`.
- Start from the register of the email's category in `REGISTERS.md`, and add what the piece's own research shows. The register is a starting point and not a template: the brief names the register used and what the piece departs from. If the category has no register, write one first from the research and mark it as new.
- Take every colour as an inline hex value from the token file. The email never relies on a mode, and a client may invert colours on its own.
- Lay the email out in tables and keep every container at 640 px or narrower (rows CE2 and CE1).

## Locked parts

The parts every email of the client repeats (top bar, logo, button, sign-off, footer, background grid, decorations) are components in section 4 of the `DESIGN.md`, each with the past piece it was taken from. An email copies them and never redraws or restyles them: only the words of a part change, such as a button's label.

- Mark each copied part in the HTML with `data-part="<name>"`, the component's name.
- The words inside a marked part are the brand's, not the writer's, and the words check does not read them.
- A decoration is placed beside the content it belongs to, never over text. Look at it again after any row moves.

## The words

The page holds the lines of `words.md` and nothing else: no added title, label, badge, tag, link or kicker. A visual device carries no new words. The lines keep the order of `words.md`, so the first call to action stands where the writer put it, usually right under the headline. A line that does not fit goes back to the writer.

## Build and check

1. Make the comp and show it to the owner. Build the email only after that.
2. Build the email.
3. Run the lint first: `node skills/tools/design/check.mjs email email.html --limits skills/tools/email/LIMITS.md --words words.md`. It fails a line that is not in `words.md`, a line out of its order and a line of `words.md` left off the page. It also fails an image with no alt text, a call to action that is only an image, a body with no live text, a container wider than 640 px, a blocking row of `LIMITS.md` and any tell it can see. The checker is named by its path from the plugin root; give the email's files by path.
4. Check every colour pair with `node skills/tools/design/check.mjs contrast <fg> <bg> --min 4.5` for text, and `--min 3` for a button or other interface part (row W1). Without `--min` a failing pair still exits 0.
5. Render and look at the result, beside the comp.
6. When the email is one of a set, check the set: `node skills/tools/design/check.mjs email-set a.html b.html c.html`. It fails a locked part missing from one email, or one whose markup differs once its words are taken out. Then look at the renders side by side: the same parts at the same spacing, and the decorations in the same place against the content.

## Client limits

`LIMITS.md` lists the features a client cannot be relied on for. The rows move. Re-read each row against its caniemail page at write time, and put the date of that reading in the hand-over. A row whose support is `none` blocks the email. Any other level is a note.

## Dark mode

Gmail recolours an email on its own, and the sender's `prefers-color-scheme` does not reach it (row CE3). The email is therefore legible in its light default, and legibility must not depend on a dark scheme. A dark scheme may be offered as an enhancement. Images carry no background that fails on a dark client.

## Images

A photograph from outside the package, such as a persona shot made in an image generator, gets the photograph check in `critique` before it is placed. A product in a photograph is the client's own cutout laid on top, never a generated one: a generator garbles the label.

Make each image asset with `figcraft-cli run` and `render` to a PNG. `figcraft-cli export` to PNG ran at `--scale 1` and `--scale 2` (see `ARTCRAFT.md`); `--scale 2` doubles the pixels and does not sharpen a small source, so export at the size the image is placed.

```
timeout 60 figcraft-cli run /project/email/assets/hero-steps.json --out /project/email/assets/hero.figcraft --no-system-fonts --automation-read-root /project --automation-write-root /project/email/assets
timeout 20 figcraft-cli render /project/email/assets/hero.figcraft -o /project/email/assets/hero.png --no-system-fonts --automation-read-root /project --automation-write-root /project/email/assets
```

The rules for driving the command-line apps are in the `design` tool's `ARTCRAFT.md`.

## Render

Render the HTML in headless Chrome at both widths, under `timeout 60`, or in headless Firefox when Chrome is not installed. The call is `google-chrome --headless=new --screenshot`. The shot is cut at the window height, not at the end of the email, so the window is 10000 px tall: an email under that shows whole, with the blank page ground below its last row.

```
timeout 60 google-chrome --headless=new --no-sandbox --disable-gpu --user-data-dir=/tmp/email-chrome --screenshot=/project/email/render-640.png --window-size=640,10000 file:///project/email/email.html
timeout 60 google-chrome --headless=new --no-sandbox --disable-gpu --user-data-dir=/tmp/email-chrome --screenshot=/project/email/render-375.png --window-size=375,10000 file:///project/email/email.html
```

With no `google-chrome`, use Firefox. Its profile folder must exist before the call, and the screenshot path follows `--screenshot` after a space.

```
mkdir -p /tmp/email-firefox
timeout 60 firefox --headless --no-remote --profile /tmp/email-firefox --screenshot /project/email/render-640.png --window-size=640,10000 file:///project/email/email.html
timeout 60 firefox --headless --no-remote --profile /tmp/email-firefox --screenshot /project/email/render-375.png --window-size=375,10000 file:///project/email/email.html
```

Look at the bottom of each image. If the footer is not followed by blank ground, the email is taller than the window: raise the height and render again.

Then look at both images beside one real email of the same kind (row RG1).

## Hand over

State, in this order:

- The files made, the comp the owner saw, and the checks run with their result. A tells run that exited 3 on the comp is `not run`. The words check is `not run` when no `--words` file was given, and the set check is `not run` for an email that is not part of a set.
- **Not tested in Outlook for Windows.** Say "not tested in Outlook for Windows" until a real test exists. Which rendering engine Outlook for Windows uses today has no primary source, so say that and cite caniemail.
- The date `LIMITS.md` was re-read from caniemail.
- The rows of `REFERENCES.md` the brief cites.
- The slot ids of `words.md` that the layout uses, and any line sent back to the writer.

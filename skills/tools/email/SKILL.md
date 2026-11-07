---
name: email
description: HTML email layout and look, built on live text and tables, linted against the client limits table, rendered at two widths, with the images made by FigCraft. Use when the piece is an HTML email.
---

# Email

The layout and look of one HTML email. Follow the `design` method first: its precedence list, its bans and its checks. This folder holds the client limits (`LIMITS.md`) and the references for the craft (`REFERENCES.md`).

Copy and the plain-text part come from donna. This skill leaves labelled slots for them and writes none of the words.

## Output

- `email.html`, with live text, a real link button and alt text on every image.
- The image assets as PNG files, made by `figcraft-cli` (below) and named in the email.
- A render of the HTML at 640 px and at 375 px wide.

## Before you build

- Read the `DESIGN.md` and the project's own rules if there are any, and write the brief file for the piece. Cite at least three rows of `REFERENCES.md`, only rows marked `opened`.
- Take every colour as an inline hex value from the token file. The email never relies on a mode, and a client may invert colours on its own.
- Lay the email out in tables and keep every container at 640 px or narrower (rows CE2 and CE1).

## Build and check

1. Build the email.
2. Run the lint first: `node skills/tools/design/check.mjs email email.html --limits skills/tools/email/LIMITS.md`. It fails an image with no alt text, a call to action that is only an image, a body with no live text, a container wider than 640 px, a blocking row of `LIMITS.md` and any tell it can see. The checker is named by its path from the plugin root; give the email's files by path.
3. Check every colour pair with `node skills/tools/design/check.mjs contrast <fg> <bg> --min 4.5` for text, and `--min 3` for a button or other interface part (row W1). Without `--min` a failing pair still exits 0.
4. Render and look at the result.

## Client limits

`LIMITS.md` lists the features a client cannot be relied on for. The rows move. Re-read each row against its caniemail page at write time, and put the date of that reading in the hand-over. A row whose support is `none` blocks the email. Any other level is a note.

## Dark mode

Gmail recolours an email on its own, and the sender's `prefers-color-scheme` does not reach it (row CE3). The email is therefore legible in its light default, and legibility must not depend on a dark scheme. A dark scheme may be offered as an enhancement. Images carry no background that fails on a dark client.

## Images

Make each image asset with `figcraft-cli run` and `render` to a PNG. `figcraft-cli export` to PNG ran at `--scale 1` and `--scale 2` (see `ARTCRAFT.md`); `--scale 2` doubles the pixels and does not sharpen a small source, so export at the size the image is placed.

```
timeout 60 figcraft-cli run /project/email/assets/hero-steps.json --out /project/email/assets/hero.figcraft --no-system-fonts --automation-read-root /project --automation-write-root /project/email/assets
timeout 20 figcraft-cli render /project/email/assets/hero.figcraft -o /project/email/assets/hero.png --no-system-fonts --automation-read-root /project --automation-write-root /project/email/assets
```

The rules for driving the command-line apps are in the `design` tool's `ARTCRAFT.md`.

## Render

Render the HTML in headless Chrome at both widths, under `timeout 20`. The call is `google-chrome --headless=new --screenshot`. The shot is cut at the window height, not at the end of the email, so the window is 10000 px tall: an email under that shows whole, with the blank page ground below its last row.

```
timeout 20 google-chrome --headless=new --no-sandbox --disable-gpu --user-data-dir=/tmp/email-chrome --screenshot=/project/email/render-640.png --window-size=640,10000 file:///project/email/email.html
timeout 20 google-chrome --headless=new --no-sandbox --disable-gpu --user-data-dir=/tmp/email-chrome --screenshot=/project/email/render-375.png --window-size=375,10000 file:///project/email/email.html
```

Look at the bottom of each image. If the footer is not followed by blank ground, the email is taller than the window: raise the height and render again.

Then look at both images beside one real email of the same kind (row RG1).

## Hand over

State, in this order:

- The files made, and the checks run with their result.
- **Not tested in Outlook for Windows.** Say "not tested in Outlook for Windows" until a real test exists. Which rendering engine Outlook for Windows uses today has no primary source, so say that and cite caniemail.
- The date `LIMITS.md` was re-read from caniemail.
- The rows of `REFERENCES.md` the brief cites.
- The labelled slots left for donna's words.

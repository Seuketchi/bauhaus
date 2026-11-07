# email

## What it does

`email` builds the layout and look of one HTML email. It produces `email.html` with live text, a real link button and alt text on every image; the image assets as PNG files made by FigCraft; and a render at 640 px and 375 px wide made in headless Chrome.

It lints the email with `check.mjs email` against `LIMITS.md`, a table of client limits where each row has a feature, a pattern, a client, a support level, a test date and a caniemail page. A row whose support is `none` fails the email. Any other level is a note.

Copy and the plain-text part come from whoever writes the words. `email` leaves labelled slots for them.

## When to reach for it

- The piece is an HTML email.
- A project needs its client limits re-read from caniemail before an email is built.

Skip it for the words of the email, for a web page or an app screen.

## Common questions

**Is the email tested in Outlook for Windows?** No. The hand-over says "not tested in Outlook for Windows" until a real test exists. Which rendering engine Outlook for Windows uses today has no primary source, so the rows cite caniemail's tests only.

**Why is the dark-scheme row only a note?** Gmail recolours an email on its own and ignores the sender's `prefers-color-scheme`. An email may offer a dark scheme as an enhancement, and it must stay legible in its light default.

**How current are the limits?** The rows move. Each row carries the feature's last test date on caniemail, and the hand-over carries the date the rows were re-read.

**Where do the colours come from?** Inline hex values taken from the token file. The email never relies on a mode.

## It's working if

- `check.mjs email email.html --limits LIMITS.md` passes and prints which `LIMITS.md` it read.
- Every colour pair passes `check.mjs contrast --min`: 4.5:1 for text and 3:1 for a button or other interface part.
- Both renders exist, at 640 px and at 375 px, and the email reads with images blocked.
- The hand-over says the email was not tested in Outlook for Windows and gives the date the limits were re-read.
- The brief for the email cites at least three rows of `REFERENCES.md`, or states a lower minimum with a reason.

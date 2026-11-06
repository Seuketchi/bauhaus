# Email client limits

The features an HTML email cannot rely on, one row each. `check.mjs email <file.html> --limits LIMITS.md` applies the Pattern column to the email and reports the rows it finds.

## How a row is read

- **Feature**: the name caniemail gives it.
- **Pattern**: the regular expression the lint applies, written in backticks so a `|` inside it stays in its cell.
- **Client**: where the feature fails.
- **Support**: `none` blocks the email: the run fails when the pattern is found. Any other value is only a note: the run prints it and passes. `ignored` is a note too: the client drops the feature, and the email must stay legible without it.
- **Test date**: the feature's last test date on its caniemail page. It is not the date of the reading, and it can be old: a feature may have been retested for some clients and not others.
- **Source**: the caniemail feature page.

A row with no test date or no source URL fails the run.

## Rows move

Client support changes. Before each email is written, re-read every row against its caniemail page and record the date of that reading in the hand-over. The rows below were re-read on 2026-11-07.

| Feature | Pattern | Client | Support | Test date | Source |
| --- | --- | --- | --- | --- | --- |
| background-image | `background-image\s*:` | Outlook for Windows 2007 to 2019 | none | 2023-07-24 | https://www.caniemail.com/features/css-background-image/ |
| display:grid | `display\s*:\s*(?:inline-)?grid\b` | Outlook for Windows 2007 to 2019 and Windows Mail | none | 2019-02-28 | https://www.caniemail.com/features/css-display-grid/ |
| @media (prefers-color-scheme) | `@media[^{]*prefers-color-scheme` | Gmail on desktop webmail, iOS, Android and mobile webmail | ignored | 2023-03-08 | https://www.caniemail.com/features/css-at-media-prefers-color-scheme/ |

## What each row says

- **background-image**: Outlook for Windows does not draw it from CSS. A background image there needs VML, which this table does not cover. Gmail on desktop webmail read it as partial and buggy in 2023-07, when it removed the whole style attribute, and as supported in 2023-08. Do not put the message on a background image.
- **display:grid**: Outlook for Windows and Windows Mail do not support it. Gmail on desktop webmail reads it as supported as of 2026-03, a later test than the row's date. Lay the email out in tables.
- **@media (prefers-color-scheme)**: Gmail does not apply it, so a sender cannot reach Gmail's dark mode with it. It is a note, not a failure: an email may offer a dark scheme as an enhancement, and it must stay legible in its light default.

Which rendering engine Outlook for Windows uses today has no primary source. These rows cite caniemail's tests and nothing more.

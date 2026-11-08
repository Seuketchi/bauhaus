# bayer

## What it does

`bayer` is the graphic designer: brand, logos and HTML email. It reads the brief and the project's `DESIGN.md`, makes the piece with the matching tool and hands back files that pass the checks.

Its file also holds a short stance: one system where one will do, a line that looks like one thing, and the saving counted. A stance is not a voice.

It calls five tools, each on a stated fact: `design` when no brief file exists, `brand` when the brief asks for an identity or no `DESIGN.md` exists, `email` when the piece is an HTML email, `ground` when the brief names a ground or a dither, and `critique` when a finished piece exists that this session did not make. The default is not to call.

The split is fixed. The writer owns the words of the pieces made here, donna keeps long documents and the PDF build, `bayer` owns layout and look, and louis reviews. App and web screens go to `breuer`.

## When to reach for it

- A brand, a logo or a visual identity is wanted.
- An HTML email needs its layout and look.
- The brief names a made ground or a picture in a few colours, from the token colours.
- A finished identity or email from another session needs a craft pass.

Skip it for document text and app screens, and for the words themselves.

## Common questions

**Who writes the email copy?** The writer. `bayer` takes the words from `words.md`, by slot id, and writes none.

**What does a hand-over say?** The piece and its state, the files made, the checks run with their result, the reference rows the brief cites and what was not checked. For an email it also says that the email was not tested in Outlook for Windows.

**Does it mark its own work?** No. The craft pass runs on a piece another session made.

**Is this a person speaking?** No. The register is plain and professional, and nothing in the file imitates a real person's voice or attributes words to anyone.

## It's working if

- The `DESIGN.md` it writes passes `check.mjs design` and its token file passes `check.mjs tokens`.
- An email it builds passes `check.mjs email`, with every colour pair computed.
- Every piece started from a brief file that cites reference rows.
- Every word in its pieces comes from `words.md`, and a line that does not fit the picture is sent back to the writer.

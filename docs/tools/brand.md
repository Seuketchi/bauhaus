# brand

## What it does

`brand` makes an identity: the colours, the type roles and the mark of one project, written down once. It produces a token file, a `DESIGN.md` that points at it, a logo made by VectorCraft with the command that made it saved beside it, and a specimen sheet made by FigCraft.

The `DESIGN.md` records each decision with its reason, what it rejected and a date, and copies no value from the token file. Every colour pair it lists is computed from the token file, never written by hand. The token file carries the six document properties, so the same brand can restyle a PDF.

Only `brand` creates a `DESIGN.md`. Every other job reads it.

## When to reach for it

- The brief asks for an identity: a brand, a palette, a type system or a logo.
- The project has no `DESIGN.md` yet and a piece needs one.
- An existing `DESIGN.md` has to change: `brand` changes only the entries the brief names.

Skip it for a single email, a screen or a document that the project's existing `DESIGN.md` already covers.

## Common questions

**Who writes the words?** Whoever the brief names. `brand` writes names and taglines only where the brief supplies them.

**Why must the logo come from VectorCraft?** So it can be made again. The step command is saved beside the SVG, and running it again writes a file of the same byte length, or the differences are listed. A hand-written SVG fails.

**What makes the SVG acceptable?** It parses as XML, has a `viewBox`, is at most 20 KB, and `vectorcraft-cli info` reads it without an import warning.

**What happens to an existing `DESIGN.md`?** An entry the brief names is replaced and gets a new **Decided** date. Everything else stays as it is, and git keeps the old entry.

**Which references does it use?** The rows of `REFERENCES.md` marked `opened`. The lending books are listed as pointers and are never cited as support.

## It's working if

- `check.mjs design` passes the `DESIGN.md` and `check.mjs tokens` passes the token file.
- Every colour pair in section 6 of the `DESIGN.md` has a computed ratio at or above its threshold.
- The saved mark command runs again and writes a file of the same byte length.
- A specimen sheet PNG exists with the palette, the type roles and the mark at three sizes.
- The brief for the identity cites at least three rows of `REFERENCES.md`, or states a lower minimum with a reason.

# gropius

## What it does

`gropius` leads the design work. It makes sure a piece starts from a brief file, hands the piece to `bayer` (brand, logos, email) or `breuer` (app and web screens) with the brief and the project's `DESIGN.md`, and runs the craft pass on pieces that another session made. It makes no piece itself.

It follows the precedence list kept in `design`: the project's own rules first, then the brief. When a brief contradicts a project rule, it stops, names the rule by file and heading and the brief line, and asks the owner which one yields.

It calls two tools, and only on a stated fact: `design` when no brief file exists, and `critique` when a finished piece exists that this session did not make. The default is not to call.

## When to reach for it

- A visual piece is asked for and it is not yet clear who should make it or what it must be.
- A brief file has to be written or checked before work starts.
- A finished piece from another session needs a craft pass.

Skip it when the owner has named the designer and a brief file already exists.

## Common questions

**Why will it not start without a brief file?** The brief names the audience, the job, the tone, what the piece must not look like, the surface and the references. Without it a piece falls back on the generic defaults that `design` bans.

**Does a craft pass approve a piece?** No. It is a craft pass and not a sign-off. Louis rules against the rules and the numbers.

**Who writes the words?** Donna. The lead hands on layout and look only.

**Is this a person speaking?** No. The register is plain and professional, and nothing in the file imitates a real person's voice or attributes words to anyone.

## It's working if

- Every piece it hands on has a brief file that passes `check.mjs brief`.
- A conflict between a brief and a project rule is named and put to the owner, not settled silently.
- It calls a tool only for the stated trigger, and says in one line which tool and why.
- It never edits a piece it reviews.

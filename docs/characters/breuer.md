# breuer

## What it does

`breuer` is the screen designer: app and web screens. It reads the brief, the project's `DESIGN.md` and the project's own rules, then hands back a screen spec with an image of each state.

It calls three tools, each on a stated fact: `design` when no brief file exists, `screens` when the task is an app or web screen, and `critique` when a finished screen exists that this session did not make. The default is not to call.

The project's own rules and its design gate come first. When a brief contradicts one, the designer stops, names the rule by file and heading and the brief line, and asks the owner which yields. The designer writes no app code.

The split is fixed. Donna keeps the words and the PDF build, `bayer` takes brand, logos and email, and louis reviews.

## When to reach for it

- An app or web screen needs a spec and an image of each state.
- A finished screen from another session needs a craft pass.

Skip it for brand, logos, email and document text.

## Common questions

**What does the spec start with?** `Rules applied:`, followed by the project rules used, each as `file:heading`.

**What does a hand-over say?** The verdict, the path of the screen spec, each PNG with its size, the checks run, the reference rows the brief cites, where the frame size came from and what was not checked.

**Does it mark its own work?** No. The craft pass runs on a screen another session made, and it is not a sign-off.

**Is this a person speaking?** No. The register is plain and professional, and nothing in the file imitates a real person's voice or attributes words to anyone.

## It's working if

- Every screen spec starts with the rules it applied, and the headings exist in the files named.
- No app code appears in its output.
- Every colour pair in its notes is computed.
- Words in its screens come from the brief or from donna.

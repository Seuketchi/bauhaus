# screens

## What it does

`screens` specifies one app or web screen. Its first step reads the project's own rules (`CLAUDE.md`, `AGENTS.md`, UI guides, a design gate, `DESIGN.md`), and the spec it produces starts with `Rules applied:` and lists each rule as `file:heading`. If the project has no rules, the first line says `No project rules found`.

The spec then gives the screen's purpose, its entry and exit, the empty, loading, loaded and error states, the components, every string on screen and the accessibility notes. Each string is given in the project's own shape: a key with its English text when the project uses keys. It makes one PNG per state with `figcraft-cli`, each exactly the size of its frame. When the states keep the same dimensions, the reserved dimension is named once, with its value and unit, and every state uses it.

It writes no app code. The frame size comes from the project's rules or from the owner, never a guess.

The accessibility checklist rests on WCAG 2.2: a pointer target of at least 24 by 24 CSS pixels (with the project's stricter number winning, such as 44 points on Apple platforms), contrast computed by `check.mjs`, reflow at a width of 320 CSS pixels, focus not obscured, an alternative to dragging and no memory test at sign-in.

If the `ui-ux-pro-max` package is installed, the skill may ask it once for a suggestion. It is never required, it ranks below the project's own rules, and none of its data is copied.

## When to reach for it

- The task is an app or web screen.

Skip it for an email, a logo or an identity, and for document text.

## Common questions

**Does it write the screen's code?** No. The spec and the images go to the project's own gates and owners.

**Where does the frame size come from?** From the project's rules or from the owner. If neither gives one, the hand-over says that none was given.

**What if the project's rules and the brief disagree?** The project's rules win. The conflict is named by file and heading and by the brief line, and the owner is asked which yields.

**Why does the PNG not come from a full render?** A render draws the whole canvas, so its size is not the frame's. The export by frame name gives the frame's own size.

## It's working if

- The spec's first line is `Rules applied:` with real headings, or `No project rules found`.
- Each state has a PNG, and the PNGs are the size of the frame.
- Every string appears with its key and English text, or with the note that no key rule was found.
- Every colour pair in the notes carries a ratio computed by `check.mjs`.
- The hand-over says where the frame size came from and that the screen was not tried on a device.

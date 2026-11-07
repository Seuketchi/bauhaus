# motion

## What it does

`motion` builds an animated title, graphic or effect as one EffectCraft composition. It writes the brief file first, with the size, the frame rate and the length, and says whether a reduced-motion variant is needed. A saved command list builds the composition, and a few keyframes are set and read back.

Every `set` carries `--save`, because a `set` with no `--save` is lost when the process ends. `get` at the midpoint returns two keys. The tool runs no script, no `--eval` and no expression, and uses no `mcp`.

A poster frame is always made, and it is the reduced-motion version: the settled frame, with no move in it. Every text-on-background pair in it passes the contrast check. A GIF is the render that was run, and no video format is made.

The craft rules are limited to timing, the move and the poster frame. No motion-graphics source was opened, so they rest on two opened film rows in `REFERENCES.md`, and the brief states `Minimum: 2` with that reason. The rules for driving the command-line apps are in the `design` tool's `ARTCRAFT.md`.

Every hand-over lists the side file `.motion.ecproj.lock`, and says: this is a plan and a draft, not a cut. No film was made, no shot was taken and no footage was cut.

## When to reach for it

- The task is an animated title, graphic or effect.
- A move needs to be set and read back before it is finished elsewhere.

Skip it for the shots of a film (use `shots`), for the frames of a film in order (use `storyboard`), and for a still image.

## Common questions

**Why is there always a poster?** A shaking or sweeping move can cause motion sickness, and some viewers need no motion at all. The poster is the version with none, and the accessibility floor outranks a trend.

**Why are the rules so few?** They rest on two film pages, not on a motion-graphics source, and a rule that rests on nothing opened is not written.

**Why is there a lock file?** EffectCraft writes a side file beside a project opened with `--project`. It is expected and listed.

**Can the GIF have a craft pass?** No. `critique` takes the poster PNG, and not the GIF or the project.

## It's working if

- `motion.json`, `motion.ecproj`, `motion.sh`, `poster.png` and `motion.gif` exist, the lock file is listed, and every file is in the hand-over.
- `get` at the midpoint returns two keys.
- The poster is the size of the composition and was read as an image.
- Every text pair in the poster passes the contrast check, or the hand-over says it was checked by eye.

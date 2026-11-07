# concept

## What it does

`concept` finds the idea, the insight, the story and the words of one piece. It reads the brief's `Intake` and the research, and writes the brief's `Idea`, `Insight` and `Story` sections and a `words.md` file.

The idea comes from a fact in the research and is cut to exactly two words, kept as the test for every later choice. The story is 3 to 5 beats, each with what carries it, and it must read from the pictures, crops and order before it reads from the copy. The words are plain: the way people speak, short, with no jargon, read aloud the next morning and then edited, saying plainly what the reader should do. No spec, date, figure or performance claim is made unless a research row backs it.

Its rules rest on the opened rows of its own `REFERENCES.md`. It checks its work with `check.mjs brief`.

## When to reach for it

- A brief has an `Intake` and no `Idea` yet.
- A piece needs words that no `words.md` holds.

Skip it for long documents and the PDF build, which are donna's.

## Common questions

**What if the idea will not cut to two words?** Then it is not yet one idea. The tool goes back to the research for the fact it comes from.

**What if a piece needs no story?** A logo mark may write `Story: none. Reason: <why>`. Idea, Insight and the two words stay required.

**Who writes screen strings?** The writer, where the project's l10n rules allow it, in the project's own shape. The project's rules win.

**Who places the words?** The designer, from `words.md`, by slot id. The designer writes none, and may send a line back.

## It's working if

- The brief passes `check.mjs brief`.
- Every insight names a research row.
- Every line in `words.md` has a slot id, and every claim has a research row.
- No question already answered in `Intake` is asked again.

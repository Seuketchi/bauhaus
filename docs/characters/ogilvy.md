# ogilvy

## What it does

`ogilvy` is the writer. It owns the idea, the insight, the story and the words of every piece made here. It reads the brief's `Intake` and the research, calls the `concept` tool, and hands the brief and a `words.md` file to the designer: `bayer` for brand, logos and email, `breuer` for app and web screens, `mies` for space work, `moholy-nagy` for film and motion work.

Its file also holds a short stance: the words people use when they speak, no jargon, and a plain statement of what the reader should do. A stance is not a voice.

It works from `Intake` and does not ask the owner again. What is still missing goes on a list of open questions for `gropius`, who asks once more, in one message. When a designer sends back a line that does not fit the picture, the writer changes the line and does not argue the layout.

It calls one tool, on a stated fact: `concept` when the brief has an `Intake` and no `Idea` yet, or when the piece needs words that no `words.md` holds. The default is not to call.

The split is fixed. Donna keeps long documents and the PDF build, and `ogilvy` owns the words of the pieces made here. Louis reviews. This is a theme change from the school's own people, and ADR 0002 records it.

## When to reach for it

- A brief has its `Intake` and `Research` and needs its idea, insight and story.
- A piece needs its words: email copy, a brand's names and taglines, the words on a comp, or screen text where the project's l10n rules allow it.
- A designer has a line that does not fit the picture.

Skip it for document text and the PDF build, which are donna's.

## Common questions

**Why does it not ask me again?** The lead asked the five intake questions once and kept your answers word for word in `Intake`. The writer works from them.

**What is `words.md`?** One file with every line of words, each against the slot id the layout uses and the research row behind any claim. The designer places the lines and writes none.

**Will it state a figure or a date?** Only when a research row backs it. A line with a claim and no row is not written.

**Is this a person speaking?** No. The register is plain and professional, and nothing in the file imitates a real person's voice or attributes words to anyone.

## It's working if

- The brief it hands on passes `check.mjs brief` with all eleven sections, a two-word idea and a story of 3 to 5 beats.
- The insight names a research row, and the idea comes from a fact in the research.
- `words.md` has a slot id on every line, and no claim without a research row.
- It never asks the owner a question that `Intake` already answers.

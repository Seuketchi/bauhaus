---
name: concept
description: The idea, the insight, the story and the words of one piece, from the brief's Intake and the research: the brief's Idea, Insight and Story sections and a words.md file. Use when a brief has an Intake and no Idea yet, or when a piece needs words that no words.md holds.
---

# Concept

The idea, the insight, the story and the words of one piece. Follow the `design` method first: its precedence list, its bans and its checks. The references for this craft are in `REFERENCES.md` in this folder.

The input is the brief, with its `Intake` and `Research` filled, and the `research.md` beside it. The output is the brief's `Idea`, `Insight` and `Story` sections and a `words.md` file.

## Before you start

- Read `Intake` and work from it. Do not ask the owner a question it already answers. Anything still missing goes on a list of open questions for the lead to put to the owner, once, in one message.
- Read `research.md`: the job facts and the register. The insight comes from there.
- The project's own rules come first. A brief line that contradicts one is named, and the owner is asked which yields.

## The idea

- **The idea comes from a fact** found in the research, never from the writer's taste alone (row WR4). Write the idea in one sentence.
- **The idea passes the two-words test.** Cut it to exactly two words and write the line `Two words: <word> <word>` under it. Keep the two words as the test for every later choice. If the idea cannot be cut to two words, it is not yet one idea (row WR3).
- **A formula does not replace an idea.** If a line is defended only because it follows the rules, it fails (row WR2).

## The insight

One fact about the audience or the product that the idea comes from, with the research row it rests on. Ask who the work is for, and what makes it special, before writing it (rows WR4 and WR5). An insight with no research row is not written.

## The story

Who it is about, then 3 to 5 beats. Each beat is `- Beat n: <what is shown> | carried by: <picture, crop, order or copy>`. The story must read from the pictures, crops and order before it reads from the copy. A piece that needs no story, such as a logo mark, writes `Story: none. Reason: <why>` and no beats. Idea, Insight and the two words stay required.

## The words

- **Write the way people speak.** Short words, short sentences and short paragraphs, no jargon (row WR1).
- **Read it aloud the next morning, and then edit** (row WR1).
- **Say plainly what the reader should do** (row WR1).
- **Claim only what was checked.** No spec, date, figure or performance claim in the words unless a research row backs it.
- **The words are a file, not slots.** `words.md` holds each line with the same slot id the designer's layout uses, and the research row behind any claim. The designer places them and writes none.

```
| Slot | Words | Research row |
| --- | --- | --- |
| hero-headline | The account is ready. | none, it is the idea |
| hero-button | Open your account | none |
```

A designer may send a line back when it does not fit the picture. Change the line and do not argue the layout.

## The boundary

The words of pieces made here are written here: email copy, a brand's names and taglines when the brief gives no words, the words on a comp, and screen text where the project's l10n rules allow it. Screen strings stay in the project's own l10n shape, and the project's own rules win. Long documents and the PDF build are donna's, and this tool does not touch them.

## Check

Check the brief with `node skills/tools/design/check.mjs brief <brief.md>`: the checker is named by its path from the plugin root, and the brief by its own path. It refuses a missing section, an Idea with no `Two words:` line of exactly two words, and a Story with fewer than 3 or more than 5 beats or a beat with no `carried by`.

## Hand over

Say which files were made, the check run and its result, the research rows the insight and any claim rest on, the questions left open for the lead, and what was not checked. A pass is not approval: the craft pass and the reviewer rule on the rest.

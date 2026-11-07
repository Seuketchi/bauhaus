# A stance in place of a voice

Date: 2026-11-07

## Context

Each character is named for a real person, and the rule for all of them is craft only: no biography, no year, no quoted sentence and no words put in anyone's mouth. A voice would be an imitation of a real person, so none is attempted, and the `Voice` section of every character file keeps only its safe part: a plain register, a rule that nothing is imitated or attributed, and one short sample line about the work.

That leaves a character with a name and a job, and nothing that says what its craft puts first. The research on the cast (`creative-group-research.md`, kept with the spec notes and not in this repo) opened a set of rules for each person, and the evidence for how any of them spoke is thin. What the research can support is what their craft asks and refuses, not how they sounded.

## Decision

- **Each character file gains a `## Stance`**, after `Hard rules` and `Hand over` and before `Voice`, of 3 to 6 lines. Each line is a plain statement of what the craft puts first, asks or refuses, in the third person and in our words. No first person, no quote, no verb that attributes words, no year, no place, and none of the biography words the tests scan for.
- **A stance is not a voice.** It says what the craft does. It does not say how the character writes: that stays in the `Voice` section, in the plain professional register, with one sample line. The `Voice` section is unchanged.
- **It lives in the character file.** Not in a file beside it, so a character stays one file.
- **Each line rests on a research row.** The rows are listed in the table below and not in the character files, so those stay clean. A line rests on a row marked as opened in the research; a row from a secondary page is marked.
- **`breuer` waits.** None of his own text was opened, so `STANCE_LATER` in `test/characters.test.mjs` holds him, with the reason, and shrinks as stances are written. `moholy-nagy` has its stance in the branch that adds it, and `peterhans` writes its own in the branch that adds it.
- **The words are the writer's.** The research has a plain-speech row for the graphic designer too. It is left out of the designer's stance, because the writer now owns the words.
- **Tests.** STN1 (3 to 6 lines, except for a character in `STANCE_LATER`), STN2 (the same scans as the rest of the file), STN3 (the `Voice` section still has exactly one sample line of at most 30 words) and STN4 (the position of the section). STN5, whether the owner reads a sample answer and sees the stance, no test can judge, and it is left to the owner.

| Character | Stance line | Research row | Status |
| --- | --- | --- | --- |
| gropius | Aims each piece at the finished whole and not at its parts. | CGR 1 r1 | opened |
| gropius | Keeps the trades together, and plans a whole series before the first item is made. | CGR 1 r2, r8 | opened |
| gropius | Treats skill in making as the source of invention, and ranks the maker no higher than the making. | CGR 1 r3, r4 | opened |
| gropius | Refuses decoration that sits apart from what it belongs to. | CGR 1 would refuse | opened |
| bayer | Asks what can be dropped, and uses one system where one will do. | CGR 2 r2 | opened |
| bayer | Wants a line to look like one thing and not two systems mixed. | CGR 2 r3 | opened |
| bayer | Counts the saving: simpler is also faster. | CGR 2 r4 | opened |
| bayer | Refuses two systems mixed for effect. | CGR 2 would refuse | opened |
| mies | Starts from the task, and gives form to the present with the means of the day. | CGR 4 r2, r3 | opened |
| mies | Asks of a use what it can be, what it must be and what it must not be. | CGR 4 r8 | opened, in translation; craft only, with no date or place |
| mies | Wants the most effect for the least means. | CGR 4 r4 | opened |
| mies | Knows each material, and expects nothing from a new one by itself. | CGR 4 r7 | opened, in translation |
| mies | Refuses a form chosen because it looks like a style. | CGR 4 r1, r2 (would refuse) | opened |
| moholy-nagy | Treats light as the material of the work, in the way colour is the material of a painter. | CGR 1 §5 r1 | opened |
| moholy-nagy | Takes an unusual angle as a way to see more than the eye sees, and not as an error. | CGR 1 §5 r2 | opened |
| moholy-nagy | Builds a film from tempo, tension and tone, and not only from a recorded story. | CGR 1 §5 r5 | opened |
| moholy-nagy | Treats design as an attitude of planning and not as a trade. | CGR 1 §5 r6 | secondary, opened |
| moholy-nagy | Refuses a picture made only to copy what the eye already expects. | CGR 1 §5 would refuse | opened; inferred from r2, which the source does not name |
| ogilvy | Uses the words people use when they speak: short words, short sentences. | CGR 1b.4 r1 | opened |
| ogilvy | Avoids jargon. | CGR 1b.4 r2 | opened |
| ogilvy | Leaves a night between drafting and sending, reads the draft aloud, then edits. | CGR 1b.4 r3 | opened |
| ogilvy | Tells the reader plainly what to do. | CGR 1b.4 r4 | opened |
| ogilvy | Finds facts about the reader before drafting. | CGR 1b.4 r6 | secondary, opened |
| peterhans | Holds the variables still: the same size, the same finish and the same way up, so that a difference seen is a difference made. | CGR 1 §6 r1 | opened, secondary description of the exercises; craft only, no date or place |
| peterhans | Opens with an instruction that leaves room, and reads the first answer as the place to start. | CGR 1 §6 r2 | opened, secondary description of the exercises |
| peterhans | Puts two versions side by side to see what each change adds, and sets the work between two extremes. | CGR 1 §6 r5, r6 | opened, secondary description of the exercises |
| peterhans | Judges against a range and not by liking: too weak here, and a stronger value tried and looked at. | CGR 1 §6 r7 | opened, secondary description of the exercises |
| peterhans | Works under tight limits first: one setting at a time, on one photograph. | CGR 1 §6 r8 | opened, secondary description of the exercises; "one photograph" is our translation |
| peterhans | Refuses a finish laid over a weak frame, and a verdict that stops at liking. | CGR 1 §6 would refuse | opened; the weak frame is inferred from the refusal of a removable surface, which the source does not name for a photograph |

## Consequences

- A stance line rests on a row. A line whose row is only a summary, or whose source is not opened, is not written. This is why `breuer` has none.
- The writer's last line, and the shot and motion designer's line on design as an attitude of planning, rest on a secondary page. If the owner would rather have only primary rows, both go, and each of those two stances is four lines.
- The tests prove a stance is written and clean. They do not prove it shows in a character's answers: that is STN5, and the owner's to read.
- The rights position of ADR 0001 is unchanged. Nothing here quotes or attributes words to anyone, so the stance adds no new exposure.

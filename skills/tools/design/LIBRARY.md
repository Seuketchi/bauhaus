# The library

A designer gets better by keeping what each job teaches: the work studied, the work the owner approved, and what the owner asked to change. The library holds that, so the next job starts from more than the last one did. It ranks as level 5 in the precedence list: an optional reference, below the project's rules, the brief and `DESIGN.md`.

## The files

Two places, so one client's work never reaches another project.

- **Global, in `~/.bauhaus/library/`,** used on every project:
  - one file per craft, named for its row of places to look in `RESEARCH.md`: `brand-and-logos.md`, `email.md`, `screens.md`, `space.md`, `shots-and-motion.md`, `photograph.md`;
  - `taste.md`, the owner's taste notes.
- **Per project, `library.md` beside `DESIGN.md`:** the owner's approved work and the lessons from that project's change requests.

The approved work and a project's own lessons never go to the global files, and never into another project. Only public examples and lessons stated in general words are global.

### A craft file

```
# Library: <craft>

## Examples

| Added | Maker | URL | Move taken |
| --- | --- | --- | --- |

## Lessons

| Added | Lesson | Projects |
| --- | --- | --- |

## Lessons in waiting

| Added | Lesson | Project |
| --- | --- | --- |
```

- **Examples:** every source opened in a job's research, or a small job's three examples, with the move taken from it. A URL is kept once.
- **Lessons in waiting:** a lesson from one project, written in general words with no client detail, and the project's folder name.
- **Lessons:** a lesson seen in two projects. When a lesson in waiting comes up again in a second project, it moves here with both names.

### The owner's taste

```
# Taste

## Notes

| Date | Said | Applies to |
| --- | --- | --- |
```

Whenever the owner says what they like or dislike in a look, it is written here: the owner's words in quotation marks, and `all` or the craft it applies to.

### A project library

```
# Project library: <project>

## Approved work

| Date | Piece | Files | What made it work |
| --- | --- | --- | --- |

## Lessons

| Date | Change request | Lesson |
| --- | --- | --- |
```

`check.mjs library <file>` checks any of the three.

## Reading it

Before research, the designer reads the craft file, `taste.md` and the project's `library.md`, and starts from them. The research still goes out for new work: at least half the P1 sources are new to this job (a source from the library is marked `library` in `Fetched`), and on a small job at most one of the three examples is from the library (`From: library`). A taste note or a lesson never outranks the brief or `DESIGN.md`; when one disagrees with them, say so in the hand-over.

## Filing it

At the owner's final sign-off, the lead files the job, with no further approval:

1. Each source opened and each example used goes into the craft file, if its URL is not there.
2. The approved piece goes into the project's `library.md`, with what made it work in one line.
3. Each change request of the job becomes a lesson in the project's `library.md`, and a lesson in waiting in the craft file. A lesson already waiting from another project is promoted to `Lessons`.
4. `check.mjs library` runs on every file touched.

Taste notes are written when the owner says them, not only at sign-off. The owner removes any row at any time; a character never removes one unless the owner asks.

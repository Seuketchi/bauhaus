# The proposal

The one page that stands in for the brief on a small job (see **A small job** in `SKILL.md`). It is what a studio sends before a small job starts: what is made, in what sizes, with whose words, in how many rounds, for what use, and what is left out. `check.mjs proposal <proposal.md>` checks its shape, and `check.mjs tells` takes it in place of a brief.

The lead writes every part but **Examples**, shows the owner the page and waits for go. When the owner is away, the lead writes `owner away` on the approval line and goes on, and the proposal heads the hand-over. The designer adds the three examples before building and runs the check. The owner's go approves the scope; the proposal is locked once `check.mjs proposal` passes, as `SIGN-OFF.md` sets out.

## The file

```
# Proposal: <piece>

Date: <YYYY-MM-DD>
Approved: <the date the owner said go, or owner away>

## Scope
## Deliverables
## Words
## Examples
## Rounds
## Usage
## Not included
## References
## Tells earned
```

- **Scope.** The one job, for whom, and the brand it is made for, in two or three lines.
- **Deliverables.** A table, `| File | Size | Format |`, with one row for each file handed over.
- **Words.** A table, `| Slot | Words | From |`, where `From` is `owner` for a line given in the ask, used as given, or `writer` for a line the writer wrote because it was missing. A piece with no words writes `none` and the reason.
- **Examples.** Three finished pieces of the same kind, from the craft's row of places to look in `RESEARCH.md`, each opened as an image: `| # | Maker | URL | Read | Move taken |`, with `Read` as `opened` and the one move this piece takes from it. An optional sixth column, `From`, is `new` or `library`; at most one example comes from the library. The rules of `RESEARCH.md` on sources apply; no `research.md` is written.
- **Rounds.** `Rounds: <n>`, the rounds of changes included. Two unless the owner said otherwise.
- **Usage.** The usage the owner gave: where the piece may be used and for how long, or `not given`, which is never filled by guess.
- **Not included.** What is left out, so a later ask for it is new work.
- **References.** The rule rows the piece rests on, as in a brief, with the same minimum.
- **Tells earned.** Optional, as in a brief: a default the piece keeps, with its reason.

The page holds to one page: at most 60 lines that are not blank. A job that needs more is not small, and goes the full way.

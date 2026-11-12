# Sign-off

A stage is approved and locked only by the owner. The craft pass and the reviewer say whether a piece is ready; they never approve it. This file holds the record of what the owner approved, what that locks, and how later feedback reopens it. It is kept as `approvals.md` beside the brief or the proposal, and `check.mjs approvals <approvals.md>` checks it.

## The stages

- `brief`, or `proposal` on a small job: what is being made.
- `comp`: the look before building, such as the email comp or the first draft of a screen.
- `final`: the files handed over.

A small job may go from `proposal` to `final` with no `comp`.

## The file

```
# Approvals: <piece>

Rounds: <n>

## Sign-offs

| Stage | Date | Owner's words | File | SHA-256 |
| --- | --- | --- | --- | --- |

## Change requests

| # | Date | Asked | Reopens | Round | Go-ahead |
| --- | --- | --- | --- | --- | --- |
```

- **Rounds:** the rounds of changes the proposal or the brief includes; two when neither says.
- **Sign-offs.** One row for each file a stage locks. `Owner's words` quotes what the owner said, in quotation marks. `SHA-256` is the file's hash at that moment, from `check.mjs hash <file>`. Never write or add a sign-off row the owner did not give: "looks good, one change" is a change request, not a sign-off. When the owner is away, the stage stays unsigned.
- **Change requests.** Every piece of feedback on a stage already signed off is a row: what was asked, in the owner's words, and the stage it reopens. `Round` counts the rounds of changes, and one round may hold several requests. `Go-ahead` is `within rounds` while the round is within `Rounds:`. Past it the request is extra work: write `extra: waiting` and ask the owner, and nothing changes until the owner says yes, then write `extra: owner approved <date>`.

## What the check holds

A file must match the hash of its latest sign-off, unless a change request dated on or after that sign-off reopens its stage with a go-ahead. Once the change is made and the owner approves again, a new sign-off row records the new hash and locks the stage again. A locked file that changed with no such request fails, and the check names the file and the stage.

The file is kept after the job. What the owner approved, and what was asked for after, is the record of the job.

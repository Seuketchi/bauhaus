# shots

## What it does

`shots` plans the shots of a film or a sequence. It writes the brief file first, with the aspect ratio and the frame rate, and then makes a table: one row for each shot, with its size, angle, movement, lens, subject and planned length in seconds, and a note. The table is this package's own form and is marked inferred, because no source that was opened gives one.

The size of each shot is one of ELS, LS, FS, MWS, MS, MCU, CU and ECU. Shots are numbered from 1 with no gap. Each scene states its axis in one line, and a row that crosses the axis says so in its note and is listed in the hand-over.

The table becomes a FilmCraft project. Each row is a marker at the start of its shot, named for its number and size, with the angle and the movement as its comment, so the table and the project say the same thing. The markers sit on a grey placeholder matte as long as the list, because an empty sequence exports no marker. The project exports an EDL with one marker line for each row, and a frame is rendered at the start of each shot.

Light is only a note column with one rule, from a cinematographer's own words: the note names the real source the light comes from. The craft rules rest on opened rows in `REFERENCES.md`, from the manual pages to the films and filmmakers the owner chose, and the two lending books are pointers that are not cited. The rules for driving the command-line apps are in the `design` tool's `ARTCRAFT.md`.

Every hand-over says: this is a plan and a draft, not a cut. No film was made, no shot was taken and no footage was cut.

## When to reach for it

- The task is the shots of a film or a sequence.
- A storyboard or an animatic needs a shot list to draw from.

Skip it for a still photograph, for the frames of a film in order (use `storyboard`), for an animated title (use `motion`), and for the words of the film.

## Common questions

**Why is there a placeholder matte?** A marker is exported to an EDL only when a clip is under it. The matte gives the markers a clip, and the owner's media replaces it later.

**Why does the table have a `Sec` column?** The markers need to know where each shot starts, and the planned length of each shot gives that.

**What does it mean when a row crosses the axis?** The camera moves to the other side of the line between the scene's two subjects. That is allowed as a named choice, and the note and the hand-over say so.

**Can the shot list have a craft pass?** `critique` takes the PNG frames, not the Markdown or the EDL, so the table itself has none.

## It's working if

- `shots.md`, `shots-base.jsonl`, `shots.jsonl`, `shots.fcproj`, `shots.edl`, `shots.otio` and `shots.sh` exist and every one is listed in the hand-over.
- Every size is one of the eight, and the numbers run from 1 with no gap.
- Each scene has its axis line, and each crossing is in a note and in the hand-over.
- The EDL has one marker line for each row, and the markers read back from the project equal the table.
- The hand-over says a placeholder matte was used and whether any media is offline.

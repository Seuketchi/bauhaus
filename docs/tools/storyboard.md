# storyboard

## What it does

`storyboard` draws the frames of a film in order from a shot list. It takes `shots.md` as its input and draws its rows and nothing else. Each frame is a framing panel: a frame of the film's aspect ratio with the shot's number and size, its angle, movement and lens, its subject and its note as text. FigCraft makes one top-level frame per shot, named for the shot, and exports one PNG for each.

The one aspect ratio is stated once and every frame has it. The number of frames equals the number of rows, and the names match.

FilmCraft then imports the frames and places each still on its own, with the length the shot list gives, because a duration is refused when several stills are placed together. `inspect sequence` is read back, and each clip's length in frames equals its planned seconds times the frame rate. The animatic is rendered as a GIF, which is the render that was run.

Panels of one scene keep the screen direction of the scene's axis. The craft rules rest on opened rows in `REFERENCES.md`, all secondary, and the two lending books are pointers that are not cited. The rules for driving the command-line apps are in the `design` tool's `ARTCRAFT.md`.

Every hand-over says that the panels are framing panels, not drawings, and not a cut. It also says: this is a plan and a draft, not a cut. No film was made, no shot was taken and no footage was cut.

## When to reach for it

- The task is the frames of a film in order, or an animatic.
- A shot list exists and needs to be seen before anything is shot.

Skip it for the shot list itself (use `shots`), for an animated title (use `motion`), and for a finished drawing of a scene.

## Common questions

**Why are the panels not drawings?** They are text in a frame of the right ratio. They show what each shot is, and they are a guide that is rarely followed exactly.

**Why is each still placed on its own?** A `duration` is refused when `items` places several stills at once, and stills are held for five seconds otherwise. Placing one at a time gives each its own length.

**Is there a video file?** No. A GIF is the render that was run, and a video format is not made here.

**Can the panels have a craft pass?** Yes. `critique` takes the PNG frames. It does not take the animatic or the project.

## It's working if

- `storyboard.json`, `storyboard.figcraft`, `frames/S01.png` and the rest, `storyboard.fcproj`, `animatic.jsonl`, `animatic.gif` and `storyboard.sh` exist and every one is listed in the hand-over.
- There is one frame for each row of the shot list, with matching names and one aspect ratio.
- The panels were read as images and their text is legible.
- Each clip in the animatic is as long as the shot list says.

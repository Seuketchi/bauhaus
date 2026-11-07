---
name: storyboard
description: The frames of a film in order as framing panels made by FigCraft, one PNG per shot at the film's aspect ratio, and a rough animatic of them made by FilmCraft with each still held for the time the shot list gives. Handed on as a plan and a draft, not a cut. Use when the task is the frames of a film in order, or an animatic.
---

# Storyboard

The frames of a film in order, drawn as framing panels, and an animatic that plays them at the lengths the shot list gives. Follow the `design` method first: its precedence list, its bans and its checks. The references for this craft are in `REFERENCES.md` in this folder, and the rules for driving the command-line apps are in the `design` tool's `ARTCRAFT.md`.

The inputs are the shot list, `shots.md`, made by the `shots` tool, and the `Story` beats of the brief. The panels draw the rows of the list and add no shot of their own. The beats say what each scene shows, and this tool never invents the story: the writer owns it. This is a plan: it makes no film, takes no shot and cuts no footage.

## Before you draw

- Start from a complete brief file in the format in `design`, all eleven sections, and read its `Story` first. Each beat is `- Beat n: <what is shown> | carried by: <picture, crop, order or copy>`. Every beat is carried by the panels of the scenes whose `Beats:` line names it. A beat no scene names is sent back to `shots`, and a story is never added here. When the brief says `Story: none`, the panels come from the shot list alone and the hand-over says so.
- Cite at least three rows of `REFERENCES.md`, only rows marked `opened`. The minimum is the default of three, because five rows are opened.
- The aspect ratio and the frame rate are the shot list's. Do not change them here.
- The one aspect ratio is stated once, in the first line of the hand-over, and every frame has that ratio. A frame size is a width and a height that match it, such as `960` by `540` for 16:9.
- The output directory is `/project/film` in the examples below. Every path in a command and in a script is absolute and under it.

## What to make

In the output directory:

- `storyboard.json`, the FigCraft steps, and `storyboard.figcraft`, the document they make.
- `frames/S<nn>.png`, one PNG per shot, named for the frame: `S01.png`, `S02.png`.
- `storyboard.fcproj`, the FilmCraft project that holds the frames as stills.
- `animatic.jsonl`, the FilmCraft steps that place them, and `animatic.gif`, the render.
- `storyboard.sh`, the commands that made them, so the plan can be made again.

### The panels

A storyboard gives the size of the shot, the camera angle and the order of the shots, and it is a guide that is rarely followed exactly (row SB1). A panel here is a framing panel, not a drawing: a frame of the right ratio with the shot's number and size, its angle, movement and lens, its subject and its note, as text. It is a sequence of simple images (row SW1).

Make one top-level frame per row of `shots.md`, named `S<nn>` with the shot's number, with `frame.create` and `props.fill`. Put the text in it with `text.create`. Every text step carries `"parent"`, the id of its frame, or the export is blank. A new document hands out ids in creation order from 2, so predict them, and check each against the `id` in the result lines. Space the frames along the x axis so none overlaps another.

```json
[
  {"command":"frame.create","params":{"x":0,"y":0,"width":960,"height":540,"name":"S01","props":{"fill":"#e9edf2"}}},
  {"command":"text.create","params":{"parent":2,"text":"S01 ELS","x":32,"y":28,"props":{"fontSize":36,"fill":"#111827"}}},
  {"command":"text.create","params":{"parent":2,"text":"objective, high; static; 24 mm","x":32,"y":84,"props":{"fontSize":24,"fill":"#111827"}}},
  {"command":"text.create","params":{"parent":2,"text":"the harbour from the hill","x":32,"y":444,"props":{"fontSize":28,"fill":"#111827"}}},
  {"command":"text.create","params":{"parent":2,"text":"light: low sun from the left","x":32,"y":484,"props":{"fontSize":20,"fill":"#111827"}}},
  {"command":"frame.create","params":{"x":1060,"y":0,"width":960,"height":540,"name":"S02","props":{"fill":"#e9edf2"}}},
  {"command":"text.create","params":{"parent":7,"text":"S02 LS","x":32,"y":28,"props":{"fontSize":36,"fill":"#111827"}}},
  {"command":"text.create","params":{"parent":7,"text":"objective, eye level; dolly in, slow; 35 mm","x":32,"y":84,"props":{"fontSize":24,"fill":"#111827"}}},
  {"command":"text.create","params":{"parent":7,"text":"the net-mender on the quay, the boat behind","x":32,"y":444,"props":{"fontSize":28,"fill":"#111827"}}}
]
```

The example shows the first two rows of the shot list in `shots`. The number of frames equals the number of rows, and the names match: `S01` to `S<nn>`, in order.

Each panel has to tell its part of the story by what is in the frame, because a part with no dialog is cut on its pictures (row SE1). Panels of one scene keep the screen direction of the scene's axis, so a character keeps the same side of the frame from panel to panel (row SA1), and the sequence reads as consistent across time and place (row SC1). A panel that crosses the axis keeps the shot list's note and is listed in the hand-over. The hand-over also lists each beat with the panels that carry it, such as `Beat 1: S01, S02, S03`, and each panel whose scene shows no beat.

## The animatic

Import the frames, place each still on its own with the length the shot list gives, and render a GIF. A still is held for five seconds by default, and a `duration` with `items` is refused: `give item or items, and no sourceIn or duration with items`. So place one still at a time, each with its own `item`, its start in `seconds` and its `duration` in seconds. `import` prints the item ids in order as `items`; use those, and never assume them.

`animatic.jsonl`, with `1` and `2` the ids `import` printed:

```json
{"id":"file.newSequence","params":{"name":"Animatic","width":960,"height":540,"fps":24}}
{"id":"timeline.place","params":{"item":1,"track":"V1","seconds":0,"duration":{"seconds":4}}}
{"id":"timeline.place","params":{"item":2,"track":"V1","seconds":4,"duration":{"seconds":5}}}
{"id":"file.exportMedia","params":{"path":"/project/film/animatic.gif","format":"gif","scale":0.5}}
```

## The commands

```sh
timeout 20 figcraft-cli run /project/film/storyboard.json --out /project/film/storyboard.figcraft --no-system-fonts --automation-read-root /project/film --automation-write-root /project/film
timeout 20 figcraft-cli export /project/film/storyboard.figcraft -o /project/film/frames/ --format png --no-system-fonts --automation-read-root /project/film --automation-write-root /project/film
timeout 20 env XDG_DATA_HOME=/project/film/xdg/data XDG_CONFIG_HOME=/project/film/xdg/config XDG_CACHE_HOME=/project/film/xdg/cache filmcraft-cli --data-dir /project/film/data --save-as /project/film/storyboard.fcproj import /project/film/frames/S01.png /project/film/frames/S02.png
timeout 20 env XDG_DATA_HOME=/project/film/xdg/data XDG_CONFIG_HOME=/project/film/xdg/config XDG_CACHE_HOME=/project/film/xdg/cache filmcraft-cli --data-dir /project/film/data --project /project/film/storyboard.fcproj --save run /project/film/animatic.jsonl
timeout 20 env XDG_DATA_HOME=/project/film/xdg/data XDG_CONFIG_HOME=/project/film/xdg/config XDG_CACHE_HOME=/project/film/xdg/cache filmcraft-cli --data-dir /project/film/data --project /project/film/storyboard.fcproj inspect sequence
```

Read the results before the hand-over uses them:

- Every `figcraft-cli run` line prints `ok`, and the result `id` of each frame is the id the steps predicted. One failed step rolls back the whole script.
- Read at least one PNG as an image: the text is in the frame, it is legible, and the frame is the stated ratio.
- Every text pair passes `node skills/tools/design/check.mjs contrast <fg> <bg> --min 4.5`.
- `inspect sequence` lists one clip per frame on `V1`, in order, and each clip's `durationFrames` equals its `Sec` times the frame rate. A clip that is not as long as the table says is fixed and run again.
- The GIF is the render that was run. A video file is not made here.
- Use no `mcp`, no `--bridge` and no path outside the output directory, in the command or in a script.

## Hand over

First line: the verdict with its command and result, and the one aspect ratio, for example `storyboard.json run, six frames at 16:9, animatic of 504 frames, framing panels, not drawings, and not a cut`. Then the paths of the files made, and the figures as the app printed them: the frames exported, the clips and their `durationFrames`, and the GIF's size.

Say that these are framing panels, not drawings, and not a cut. Say that `/bauhaus:critique` takes the PNG frames, so the panels can have a craft pass and the animatic and the project cannot. List each panel that crosses its scene's axis, and say what was not checked.

This is a plan and a draft, not a cut. No film was made, no shot was taken and no footage was cut.

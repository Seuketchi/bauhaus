---
name: shots
description: The shot list of a film or a sequence: a table of each shot's size, angle, movement and lens with each scene's axis, a FilmCraft project with a marker on every shot, and an EDL of the markers. Handed on as a plan and a draft, not a cut. Use when the task is the shots of a film or a sequence.
---

# Shots

The shots of a film or a sequence, planned as a table and as markers in a FilmCraft project. Follow the `design` method first: its precedence list, its bans and its checks. The references for this craft are in `REFERENCES.md` in this folder, and the rules for driving the command-line apps are in the `design` tool's `ARTCRAFT.md`.

This is a plan. It makes no film, takes no shot and cuts no footage. The project holds a grey placeholder matte and the markers, and nothing else.

## Before you plan

- Start from a complete brief file in the format in `design`, all eleven sections: the writer has filled `Idea`, `Insight` and `Story`. Read `Story` first. The scenes follow its beats, and this tool invents no story. The `Two words` of `Idea` are the test for every choice of size, angle and move.
- Cite at least three rows of `REFERENCES.md`, only rows marked `opened`. The minimum is the default of three, because six rows are opened.
- The aspect ratio and the frame rate come from the brief or the owner. If neither gives one, ask and never guess.
- The output directory is `/project/film` in the examples below. Every path in a command and in a script is absolute and under it.
- Light is a note column, not a plan. No lighting rule is written, because the opened Lighting page covers equipment, not setups, and so: a note starts `light:` and records what the owner said.

## What to make

In the output directory:

- `shots.md`, the table (below).
- `shots-base.jsonl`, `shots.jsonl`, the FilmCraft steps, and `shots.fcproj`, the project they make.
- `shots.edl` and `shots.otio`, the exports of the markers.
- `frames/f<nn>.png`, a frame rendered at the start of each shot.
- `shots.sh`, the commands that made them, so the plan can be made again.

### The table

The table is this package's own form and is marked inferred: no source opened gives a shot-list form. Its short forms for the size rest on row SZ1, which says they are used on a shot list or a storyboard. The columns are `No`, `Size`, `Angle`, `Movement`, `Lens`, `Subject`, `Sec` and `Note`. `Sec` is the planned length of the shot in seconds, and the markers need it to know where each shot starts.

- **Size** is one of ELS, LS, FS, MWS, MS, MCU, CU and ECU, which are the sizes of row SZ1 from the widest to the closest. LS is the long shot, also called the wide shot.
- **Angle** says whether the shot is objective, subjective or a point of view (row AG1), then a height: high, eye level or low. The height words are this package's own wording. Most shots are objective, and a subjective or point-of-view shot is kept for when its effect is wanted (row AG1).
- **Movement** starts with one of static, handheld, dolly, slider or jib, and may add a direction. Choose the move for the tone it carries, and keep to simple moves when the owner has no gear or operator for more (row MV1).
- **Lens** is a focal length, such as `35 mm`.
- **Note** holds anything else: a light note, or `crosses the axis` with its reason.

Number the shots from 1 with no gap and no repeat, across scenes. A scene is one place at one time and holds any number of shots (row AG1). Each scene states the beats of `Story` it shows in one `Beats:` line, such as `Beats: 1, 2`, and every beat is in at least one scene. When the brief says `Story: none`, the line is `Beats: none`. Each scene states its axis in one `Axis:` line: the line between the scene's two subjects, and the side the camera stays on. The camera stays on that side, so the first stays on the same side of the frame (row AX1). A row that crosses the axis says `crosses the axis` in its note, and the hand-over lists it. A crossing is a choice that is named and never made silently.

```md
# Shot list: Harbour

Aspect ratio: 16:9
Frame rate: 24

## Scene 1: Quay at dawn

Beats: 1, 2

Axis: the line from the net-mender to the boat; the camera stays on the quay side, so the boat is always frame right.

| No | Size | Angle | Movement | Lens | Subject | Sec | Note |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | ELS | objective, high | static | 24 mm | the harbour from the hill | 4 | light: low sun from the left |
| 2 | LS | objective, eye level | dolly in, slow | 35 mm | the net-mender on the quay, the boat behind | 5 | |
| 3 | CU | objective, eye level | static | 85 mm | hands mending a net | 3 | |

## Scene 2: Market

Beats: 3

Axis: the line from the fishmonger to the buyer; the camera stays on the stall side, so the buyer is always frame left.

| No | Size | Angle | Movement | Lens | Subject | Sec | Note |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 4 | MS | objective, eye level | handheld | 35 mm | the fishmonger calls the price | 4 | |
| 5 | MCU | POV, eye level | static | 50 mm | the buyer's view of the scale | 3 | crosses the axis: the buyer's side is shown once, for the reveal |
| 6 | ECU | objective, low | static | 100 mm | the scale pan and the coins | 2 | |
```

Shots of a scene are joined so the story reads as consistent across time and place (row CN1), so a shot that does not fit its neighbours in size, angle or side is fixed or noted.

## The markers

Each row becomes one marker at the start of its shot. The marker is named `S<nn> <size>`, such as `S02 LS`, and its comment holds the angle and the movement, `objective, eye level; dolly in, slow`. The table and the project then say the same thing, and a change to the angle or the movement in one without the other is a fault.

A marker is exported to an EDL only when a clip is under it. An empty sequence exports no marker, so the markers sit on a placeholder matte as long as the list. The base run makes the sequence and the matte. Read the item id of the matte from the line the base run printed, and put it in `shots.jsonl`; never assume it. The second run places the matte, adds the markers and exports.

`shots-base.jsonl`:

```json
{"id":"file.newSequence","params":{"name":"Harbour","width":1920,"height":1080,"fps":24}}
{"id":"file.newColorMatte","params":{"color":"#202020","seconds":21}}
```

`shots.jsonl`, with `8` the item id the base run printed:

```json
{"id":"timeline.place","params":{"item":8,"track":"V1","seconds":0}}
{"id":"markers.add","params":{"seconds":0,"name":"S01 ELS","comment":"objective, high; static"}}
{"id":"markers.add","params":{"seconds":4,"name":"S02 LS","comment":"objective, eye level; dolly in, slow"}}
{"id":"file.exportEdl","params":{"path":"/project/film/shots.edl"}}
{"id":"file.exportOtio","params":{"path":"/project/film/shots.otio"}}
```

One failed line fails the run and nothing is saved, so read every printed line for `"ok":true`.

## The commands

```sh
timeout 20 env XDG_DATA_HOME=/project/film/xdg/data XDG_CONFIG_HOME=/project/film/xdg/config XDG_CACHE_HOME=/project/film/xdg/cache filmcraft-cli --data-dir /project/film/data --save-as /project/film/shots.fcproj run /project/film/shots-base.jsonl
timeout 20 env XDG_DATA_HOME=/project/film/xdg/data XDG_CONFIG_HOME=/project/film/xdg/config XDG_CACHE_HOME=/project/film/xdg/cache filmcraft-cli --data-dir /project/film/data --project /project/film/shots.fcproj --save run /project/film/shots.jsonl
timeout 20 env XDG_DATA_HOME=/project/film/xdg/data XDG_CONFIG_HOME=/project/film/xdg/config XDG_CACHE_HOME=/project/film/xdg/cache filmcraft-cli --data-dir /project/film/data --project /project/film/shots.fcproj inspect sequence
timeout 20 env XDG_DATA_HOME=/project/film/xdg/data XDG_CONFIG_HOME=/project/film/xdg/config XDG_CACHE_HOME=/project/film/xdg/cache filmcraft-cli --data-dir /project/film/data --project /project/film/shots.fcproj render --seconds 4 --out /project/film/frames/f02.png
```

Read the results before the hand-over uses them:

- `inspect sequence` lists the markers. Each name and comment equals the table, and the start of each equals the sum of the lengths before it.
- The EDL has one `* LOC:` line for each row, named `S<nn> <size>`, in order.
- Render a frame at the start of each shot with `render --seconds`. A frame that renders and exits 0 has no offline media. Where media is offline, `render` exits 1 and an export lists it under `offlineMedia`: the hand-over lists that media and the skill never passes `--allow-offline`.
- The project holds a placeholder matte and no media. A frame is the grey matte until the owner's media is placed, and the hand-over says so.
- Use no `mcp`, no `--bridge` and no path outside the output directory, in the command or in a `path` inside a script.

## Hand over

First line: the verdict with its command and result, for example `shots.jsonl run, six rows, six markers, the EDL has six LOC lines, a shot list and markers, not a cut`. Then the paths of the files made, and the figures as the app printed them: the number of rows and scenes, the markers read back, the LOC lines in the EDL and the frames rendered.

List the beat each scene shows. State the media used: a placeholder matte, and whether any media is offline. List each row that crosses its scene's axis. Say that `/bauhaus:critique` takes the PNG frames and not the Markdown or the EDL, so the table itself has no craft pass. Say what was not checked, such as the content of the OTIO file, which is written and not read.

This is a plan and a draft, not a cut. No film was made, no shot was taken and no footage was cut.

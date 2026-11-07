---
name: motion
description: An animated title, graphic or effect as an EffectCraft project: a saved command list, keyframes read back, a poster frame that is the reduced-motion version, and a GIF render. Handed on as a plan and a draft, not a cut. Use when the task is an animated title, graphic or effect.
---

# Motion

An animated title, graphic or effect, built as one composition in EffectCraft with a few keyframes. Follow the `design` method first: its precedence list, its bans and its checks. The references for this craft are in `REFERENCES.md` in this folder, and the rules for driving the command-line apps are in the `design` tool's `ARTCRAFT.md`.

This is a draft of a move. It is not a finished animation and not a cut. The craft rules here are limited to timing, the move and the poster frame, because no motion-graphics source was opened: the two rows they rest on are about film (rows MO1 and ME1).

## Before you build

- Start from a complete brief file in the format in `design`, all eleven sections. A title or a graphic usually writes `Story: none. Reason: <why>`, and the `Two words` of `Idea` are the test for the move. The words on screen are the writer's, taken from `words.md`, and this tool writes none. For this job the brief states `Minimum: 2. Reason: no motion source opened; two secondary film rows`, and the piece cites those two rows.
- The brief states whether a reduced-motion variant is needed. The poster frame is made either way and is the reduced-motion version (below).
- The size of the composition, its frame rate and its length in seconds come from the brief or the owner. If none gives them, ask and never guess.
- The output directory is `/project/motion` in the examples below. Every path in a command and in a list of commands is absolute and under it.

## What to make

In the output directory:

- `motion.json`, the command list that builds the composition, and `motion.ecproj`, the project it makes.
- `motion.sh`, the commands that made the keys and the renders, so the piece can be made again.
- `poster.png`, a frame of the settled piece, and `motion.gif`, the animation.
- `.motion.ecproj.lock`, a side file that appears beside a project opened with `--project`. It is expected and listed.

### The build

The project is built by `effectcraft-cli --empty` with the list in `motion.json`: a composition, a solid ground and the text. A list holds commands only. It has no expression, no script and no path outside the output directory.

```json
[
  {"command":"comp.new","params":{"name":"Title","width":960,"height":540,"duration":2,"frameRate":24,"background":"#0b2a44"}},
  {"command":"layer.newText","params":{"text":"HARBOUR","name":"title","size":96,"fill":"#ffffff","position":[480,300]}}
]
```

Then set the keys. Every `set` carries `--save`, because a `set` with no `--save` is lost when the process ends. The keys here take the title from nothing to full opacity in one second.

```sh
timeout 20 env XDG_DATA_HOME=/project/motion/xdg/data XDG_CONFIG_HOME=/project/motion/xdg/config XDG_CACHE_HOME=/project/motion/xdg/cache effectcraft-cli --empty --json --save-as /project/motion/motion.ecproj run --commands /project/motion/motion.json
timeout 20 env XDG_DATA_HOME=/project/motion/xdg/data XDG_CONFIG_HOME=/project/motion/xdg/config XDG_CACHE_HOME=/project/motion/xdg/cache effectcraft-cli --project /project/motion/motion.ecproj --save set Title title transform/opacity 0 --time 0
timeout 20 env XDG_DATA_HOME=/project/motion/xdg/data XDG_CONFIG_HOME=/project/motion/xdg/config XDG_CACHE_HOME=/project/motion/xdg/cache effectcraft-cli --project /project/motion/motion.ecproj --save set Title title transform/opacity 100 --time 1
timeout 20 env XDG_DATA_HOME=/project/motion/xdg/data XDG_CONFIG_HOME=/project/motion/xdg/config XDG_CACHE_HOME=/project/motion/xdg/cache effectcraft-cli --project /project/motion/motion.ecproj get Title title transform/opacity --time 0.5
timeout 20 env XDG_DATA_HOME=/project/motion/xdg/data XDG_CONFIG_HOME=/project/motion/xdg/config XDG_CACHE_HOME=/project/motion/xdg/cache effectcraft-cli --project /project/motion/motion.ecproj render-frame --comp Title --time 1.5 --out /project/motion/poster.png
timeout 20 env XDG_DATA_HOME=/project/motion/xdg/data XDG_CONFIG_HOME=/project/motion/xdg/config XDG_CACHE_HOME=/project/motion/xdg/cache effectcraft-cli --project /project/motion/motion.ecproj render --comp Title --out /project/motion/motion.gif --format gif --resolution half
```

Read the results before the hand-over uses them:

- `get` at the midpoint returns two keys, and the value at the midpoint is halfway between them. A key that is missing was lost for want of `--save`.
- `render-frame` writes a PNG at the size of the composition. Read it as an image: the text is there, it is legible and it sits where the brief says.
- `render --format gif` writes an animation. A GIF is the format that was run, and no other format is made here.
- Never `effectcraft-cli script` or `--eval`, which run JavaScript, and no expression on a property: a key is a number at a time. Use no `mcp`, no `--bridge` and no path outside the output directory.

## The poster frame

The poster is always made, and it is the reduced-motion version: the settled frame, with no move in it. It is a frame at a time after the last key, so the title shows in full. Whatever the brief says about a reduced-motion variant, the poster is delivered, and the accessibility floor in the brief outranks a trend.

Every text-on-background pair in the poster passes the contrast check, at 4.5:1 for text and 3:1 for large text, with `--min` so a failing pair stops the run:

```sh
node skills/tools/design/check.mjs contrast <fg> <bg> --min 4.5
```

The pair is computed where the ground is one solid colour. Text over a gradient or an image is checked by eye on the poster, and the hand-over says so.

## The rules

- Choose the move for the tone it carries: a fade in is calm, and a shake adds intensity. A shaking move is also prone to cause motion sickness, so its cost is weighed and the poster frame is delivered (row MO1).
- A piece with no dialog is paced by its picture, so each change falls where its image is at its best (row ME1). Set the length of the hold on that, and read it back with `get`.
- Keep the move to what the brief asks. A move the brief does not ask for is not added.

These three are the whole of the craft rules, and they rest on film pages. No motion-graphics source was opened, so none is claimed.

## Hand over

First line: the verdict with its command and result, for example `motion.json run, one composition 960 by 540 at 24 fps, two keys at the midpoint, poster read, an animated draft`. Then the paths of the files made, and the figures as the app printed them: the composition size and length, the keys `get` returned, the poster's size and the GIF's size and frames.

List the side files: `.motion.ecproj.lock`, and any other file the run wrote beside the project. Say whether the brief asked for a reduced-motion variant, and that the poster is it. Say that `/bauhaus:critique` takes the poster PNG, and not the GIF or the project. Say what was not run: any export to a video format, and every command that is not used.

This is a plan and a draft, not a cut. No film was made, no shot was taken and no footage was cut.

---
name: develop
description: A photograph developed or prepared in LightCraft: exposure, colour and straightening set as stated values, a JPG, a PNG preview and the command that made them, with the source file left untouched. Use when the task is a photograph to develop or prepare.
---

# Develop

A photograph developed or prepared in LightCraft, from a command line. Follow the `design` method first: its precedence list, its bans and its checks. The references for this craft are in `REFERENCES.md` in this folder, and the rules for driving the command-line apps are in the `design` tool's `ARTCRAFT.md`.

The job is the still image after capture. LightCraft acts on develop, library and export. Aperture, shutter speed and ISO are not controls in it, so advice about them is a capture note, written down as a note and never as a step.

The photograph is the owner's, named in the brief. The job makes no picture and writes no words.

## Before you develop

- Write the brief file for the photograph with the format in `design`, and cite rows of `REFERENCES.md`, only rows marked `opened`. The default is at least three opened rows. A brief for editing (a tone curve, a crop, a white balance) may state `Minimum: 2. Reason: editing sources are thin: two secondary rows and the vendor README as a tool row`. A brief for a still life or a tabletop may state `Minimum: 2. Reason: no product-lighting source opened: the still-life and light-tent pages are short`. A brief that fits neither keeps the default.
- The brief's `Story` beats say what each picture must show and in what order. A beat reads `Beat n: <what is shown> | carried by: <picture, crop, order or copy>`. Develop each photograph for the beats it carries as a picture or a crop, and invent no story: the beats come from the brief, and a beat carried by copy is the words file's and not this job's.
- The output directory is `/project/study` in the examples below. Every output path, the library and the settings directories are inside it. The source photograph stays where the owner keeps it and is only read.
- Take the hash of the source file before and after the run, and put both in the hand-over. A source that changed is a failure of the job, not a note.

## What to make

In the output directory:

- `developed.jpg`, the developed photograph, at the long edge the brief states.
- `preview.png`, a PNG of at most 2000 pixels on the long edge. `/bauhaus:critique` takes the PNG, not the JPG, so a craft pass reads the preview.
- `develop.sh`, the commands that made them, so the develop can be redone.
- `controls.json`, the catalogue of controls the values were checked against.
- `library/`, the library the run used, and `xdg/`, the settings and cache directories. They are side files and not results.

The output path differs from the input, always. Never use `format=original` (it writes a copy and a sidecar), and read the source folder after the run to see that no sidecar appeared beside the source.

### Check the values first

Write the catalogue once, and take every control and value from it.

```sh
timeout 20 env XDG_DATA_HOME=/project/study/xdg/data XDG_CONFIG_HOME=/project/study/xdg/config XDG_CACHE_HOME=/project/study/xdg/cache lightcraft-cli run --demo develop.controls > /project/study/controls.json
```

Each entry has an `id`, a `min`, a `max`, a `default` and a `section`. A control that is not in the catalogue is refused by the app. A value outside its `min` and `max` is not: the app clamps an out-of-range value without an error and goes on, so a hand-over could say a stronger change than the file has. The job therefore compares every value to its `min` and `max` and a value that is outside is refused before the run.

### The commands

A single file is developed with `render`. Every value is a `--set` of a control id from the catalogue, and `--size` is the long edge.

```sh
timeout 20 env XDG_DATA_HOME=/project/study/xdg/data XDG_CONFIG_HOME=/project/study/xdg/config XDG_CACHE_HOME=/project/study/xdg/cache lightcraft-cli render /project/photos/street.jpg -o /project/study/developed.jpg --set light.exposure=0.5 --set wb.temp=5600 --size 3000 --quality 90
timeout 20 env XDG_DATA_HOME=/project/study/xdg/data XDG_CONFIG_HOME=/project/study/xdg/config XDG_CACHE_HOME=/project/study/xdg/cache lightcraft-cli render /project/photos/street.jpg -o /project/study/preview.png --set light.exposure=0.5 --set wb.temp=5600 --size 1600
```

A develop that needs a crop, or that starts from the app's own estimate, runs in a library inside the output directory. The library flow imports the source, develops it and exports twice, so the JPG and the PNG preview come from the same develop. A preview made by a separate `render` would not carry the crop.

```sh
timeout 20 env XDG_DATA_HOME=/project/study/xdg/data XDG_CONFIG_HOME=/project/study/xdg/config XDG_CACHE_HOME=/project/study/xdg/cache lightcraft-cli run --library /project/study/library --import /project/photos/street.jpg develop.auto develop.set control=light.exposure value=0.5 develop.set control=wb.temp value=5600 crop.set rect=[0.05,0.05,0.95,0.95] crop.straighten angle=1.5 app.export path=/project/study/developed.jpg longEdge=3000 app.export path=/project/study/preview.png longEdge=1600
```

Rules for the commands:

- Run `develop.auto` first, then the manual `develop.set` steps. `develop.auto` replaces an earlier `develop.set`, so a set made before it is lost, and one made after it holds.
- Every line of the output is `"ok":true`. A line that is not is a failure to fix before the hand-over.
- `app.export` always carries a `longEdge`: with none it writes at the app's default size, and `longEdge=0` writes the full size.
- `crop.set` takes a rectangle in fractions of the straightened frame, `[left, top, right, bottom]`, and the export has the shape of the crop. `crop.straighten` takes an angle in degrees.
- Never run `merge`, `denoise-serve`, `snapshot` or `mcp`, and never use `--connect` or `--bridge`: `merge` writes next to its input, and the others drive a window or a server.
- Side files are expected: `catalog.*` and `view.json` in the library, and a shader cache under `XDG_CACHE_HOME`. List them in the hand-over, and list any source file the run did not write into.

## What the craft rests on

Each rule cites an opened row of `REFERENCES.md`. Every row is secondary, a summary of a Wikibooks or Wikipedia page, so a rule is a starting point for a decision and not a law. State each change as a number the app took.

- **Exposure in stops.** Exposure is counted in stops, a doubling or a halving of the light, so a change of exposure is a number of stops against `light.exposure`, which runs from -5 to 5 (row LD1). Keep the shadows and the highlights that matter inside the range the file holds, since values past it record as plain black or white (row LD2).
- **The light.** Read the direction of the light first, and then its hardness and its pattern: whether it is directional or diffuse (row LD3), whether it is hard and casts strong shadows (row LD4), and where the main light sits and where its shadow falls (row LD5). Develop to keep the light the photograph has, not to replace it.
- **Colour temperature in kelvin.** White balance is stated in kelvin and moves colour along the blue to yellow axis, and the choice is partly artistic (row LD7). In LightCraft `wb.temp` runs from 2000 to 50000, and a higher value warms the picture while a lower value cools it, which is the other way round from the temperature of a light itself. Set it on something that should be neutral (row LD8). A warm cast from a low sun is the light's own, not an error to remove (row LD6).
- **Composition.** The frame is simple, and the main subject is not lost among the rest (row LD9). By the rule of thirds the subject sits on a third line or a crossing of two, and not in the centre (row LD10).
- **A tone curve.** A tone curve remaps tone from an input level to an output level: lights lighter and darks darker raise contrast. The row is thin, so a rule that rests on it says so (row LD13). The controls are `curve.highlights`, `curve.lights`, `curve.darks` and `curve.shadows`.
- **Crop and straighten.** Crop to set a shape or to take out a disturbing element, and straighten a slightly crooked image so that horizontals read as horizontal. The page is thin, and a rule that rests on it says so (row LD14). The control for the angle is `crop.angle`.

Where a brief is for a still life or a tabletop, the pages for it are short: the still-life page and the light-tent page (rows LD11 and LD12) say only that lighting and framing matter and that a diffuse light keeps shadows minimal. There is no rule on product or tabletop lighting setups, because no source for one was opened, and a setup is not described here. A rule on white balance that rests on the digital processing page says that page is thin (row LD15).

Row LD16 is the app's own page and is cited for how the app works, never for a craft rule.

## Hand over

First line: the verdict with its command and result, for example `developed.jpg written at 3000 pixels, every line ok, source hash unchanged`. Then the files made, each by path: `developed.jpg`, `preview.png`, `develop.sh` and `controls.json`. Every file listed exists and every file that exists is listed, with the library and the `xdg` folder named as side files.

Then every control that was set, with its value as the app took it, the long edge of the output as the app printed it, the hash of the source before and after, and the rows of the references the brief cites. Say which values were checked against `min` and `max`, and what was not checked: the photograph was read as an image or was not, and no print or screen was compared. A pass is not approval: louis rules on the rest, and `/bauhaus:critique` takes `preview.png`.

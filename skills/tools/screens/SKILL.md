---
name: screens
description: The spec for one app or web screen, with an image of each state made by FigCraft, checked against the project's own rules and the WCAG 2.2 floor. Writes no app code. Use when the task is an app or web screen.
---

# Screens

The spec for one app or web screen: what it is for, what it shows in each state, every string on it and the rules it was checked against. Follow the `design` method first: its precedence list, its bans and its checks. The references for this craft are in `REFERENCES.md` in this folder.

This skill writes no app code. The spec and the images go to the people who build the screen.

## The first step

The first step reads the project's own rules, before anything is drawn. Look for:

- `CLAUDE.md` and `AGENTS.md`
- UI idioms or themes guides
- a design gate, such as a make target or a check run in CI
- `DESIGN.md`

The precedence list is stated once, in `/bauhaus:design`, and is followed as stated there. The project's own rules win over the brief. A brief that contradicts one is named, and the owner is asked which yields.

The spec starts with `Rules applied:` and lists each rule used as `file:heading`: the file, a colon, the heading of the section that holds the rule. Check each heading in the file before it is listed. It is never a bare file name or a line number. If the project has no rules to read, the first line is `No project rules found`.

## Before you draw

- Write the brief file for the screen with the format in `design`, and cite at least three rows of `REFERENCES.md`, only rows marked `opened`. A lower minimum with a reason may be accepted when fewer than three opened rows fit the screen; the floor is one opened row, and the brief states the reason. A row marked `not opened` is never counted.
- The target size of the frame comes from the project's own rules or from the owner. If neither gives one, ask the owner and never guess; the hand-over says that none was given.
- If the `ui-ux-pro-max` package is installed, `/ui-ux-pro-max:ui-ux-pro-max` may be called once for a suggestion on style, palette or type. It is never required, and a suggestion ranks below the project's own rules. Copy none of its data or text into the spec.

## What to make

**The screen spec**, a Markdown file that starts with `Rules applied:` and holds, in order:

1. Purpose: what the screen is for and who uses it.
2. Entry and exit: how a person gets in and where each action leads.
3. The states: empty, loading, loaded and error, each described by what is on screen.
4. Components: each one named as the project names it, with the grid the screen sits on.
5. Every string on screen, in the project's own shape (below).
6. Accessibility notes: the checklist below, with the result for each line.
7. The rows of `REFERENCES.md` the brief cites.

**One PNG per state**, made by `figcraft-cli` (below). Each PNG is exactly the size of its frame.

### Strings

Read the project's l10n rules first. When the project keeps its text in keys, give each string as its key with its English text. When it has no such rule, write `No l10n rule found`, give the plain text and say where keys would go. Short interface strings come from the brief. Long-form copy is donna's.

### States that keep the same dimensions

When a screen's states keep the same dimensions, one reserved size holds them there (a card height, a row height). Name the reserved dimension once, with its value and unit, as measured in the project's code or design files, and use that value in every state. Export every state's PNG at the same dimensions as its frame, so the four PNGs have the same dimensions too. If the states differ in size, the spec says why.

## Images

The frame comes from a preset. `frame.presets` lists them:

- `iPhone 16` 393 by 852
- `iPhone SE` 320 by 568
- `Android Compact` 412 by 917

Make one frame per state with `frame.create {preset}`, named for the state, then put the content in it. Export each frame by name with `export --node`: the PNG is exactly the frame at scale 1. `render` draws the whole canvas and is the wrong size for a frame.

```
timeout 20 figcraft-cli run /project/screens/presets.json --no-system-fonts --automation-read-root /project --automation-write-root /project/screens
timeout 60 figcraft-cli run /project/screens/steps.json --out /project/screens/screen.figcraft --no-system-fonts --automation-read-root /project --automation-write-root /project/screens
timeout 20 figcraft-cli export /project/screens/screen.figcraft -o /project/screens/loaded.png --format png --node loaded --no-system-fonts --automation-read-root /project --automation-write-root /project/screens
```

`presets.json` holds one step, `{"command":"frame.presets","params":{}}`. The steps file must sit inside the read root. The rules for driving the command-line apps are in the `design` tool's `ARTCRAFT.md`.

Read each PNG after it is made. A frame whose content falls outside it, or a state that looks like another, is fixed before the hand-over.

## Accessibility checklist

Each line is checked, and the spec says how.

- **Target size.** SC 2.5.8 Target Size (Minimum), Level AA: a pointer target is at least 24 by 24 CSS pixels (row WC1). Five exceptions: spacing, equivalent, inline, a size set by the browser or platform and not changed by the design, and essential. Where the project rule is stricter, the project rule wins; on Apple platforms a control has a hit region of at least 44 by 44 points (row AH1), and the project's own number is used when it names one.
- **Contrast.** Every colour pair is computed, never judged by eye: `node check.mjs contrast <fg> <bg>`, run from the `design` skill folder. Text needs 4.5:1 and interface parts 3:1 (row WC1). A pair at 4.4999:1 fails.
- **Reflow.** SC 1.4.10 Reflow: the layout holds at a width of 320 CSS pixels without scrolling in two directions (row WC1).
- **Focus.** SC 2.4.11 Focus Not Obscured (Minimum), Level AA: a focused control is not hidden behind other content.
- **Dragging.** SC 2.5.7 Dragging Movements, Level AA: anything done by dragging can also be done with a single pointer.
- **Sign-in.** SC 3.3.8 Accessible Authentication (Minimum), Level AA: no step depends on remembering or retyping a code or a puzzle.

## Hand over

First line: the spec's path and its state, for example `screen-spec.md written, four PNGs made, contrast pairs pass`. Then the PNGs and their size, the project rules applied, the rows cited, the target size and where it came from (or that none was given), and what was not checked. Say that the screen was not tried on a device.

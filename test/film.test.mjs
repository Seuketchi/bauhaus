// The shot and motion designer and its three tools (spec MN1 to MN4, SHO1 to SHO7, STO1 to STO7, MOT1 to MOT7).
//
// These are phrase tests and rules tested on strings: they prove a rule is written down and that a function enforces it,
// not that a model obeys it. The apps themselves are run in artcraft.test.mjs.
//
//   node --test test/film.test.mjs
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  SIZES, animaticLines, baseLines, boardProblems, boardSteps, clipFrames, crossings, edlLocs, expectedFrames, markerPlan, markersOf,
  motionProblems, parseShots, storyBeats, beatProblems, beatPanels, setProblems, shotLines, shotMarkers, shotProblems, totalSeconds, jsonl, allRows,
} from "./film-lib.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (...p) => readFileSync(join(root, ...p), "utf8");
const exists = (...p) => existsSync(join(root, ...p));
const section = (source, title) => source.match(new RegExp(`^## ${title}\\s*\\n([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, "m"))?.[1] ?? "";
const fences = (source, lang) => [...source.matchAll(new RegExp("^```" + lang + "\\n([\\s\\S]*?)^```", "gm"))].map((m) => m[1]);
const samples = (voice) => [...voice.matchAll(/^(?:>|Sample:)\s*"?(.+?)"?\s*$/gm)].map((m) => m[1]);

const GOOD = `# Shot list: Harbour

Aspect ratio: 16:9
Frame rate: 24

## Scene 1: Quay at dawn

Axis: the line from the net-mender to the boat; the camera stays on the quay side, so the boat is always frame right.

| No | Size | Angle | Movement | Lens | Subject | Sec | Note |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | ELS | objective, high | static | 24 mm | the harbour from the hill | 4 | light: low sun from the left |
| 2 | LS | objective, eye level | dolly in, slow | 35 mm | the net-mender on the quay | 5 | |

## Scene 2: Market

Axis: the line from the fishmonger to the buyer; the camera stays on the stall side, so the buyer is always frame left.

| No | Size | Angle | Movement | Lens | Subject | Sec | Note |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 3 | MS | objective, eye level | handheld | 35 mm | the fishmonger calls the price | 4 | |
| 4 | MCU | POV, eye level | static | 50 mm | the buyer's view of the scale | 3 | crosses the axis: the buyer's side is shown once, for the reveal |
`;

// ---- the shot list (SHO1, SHO2) ----

describe("the shot list, on fixtures (SHO1, SHO2)", () => {
  const shots = parseShots(GOOD);
  test("a good list has no problem, and is read as scenes, rows and a ratio", () => {
    assert.deepEqual(shotProblems(shots), []);
    assert.deepEqual(shots.aspect, [16, 9]);
    assert.equal(shots.fps, 24);
    assert.equal(shots.scenes.length, 2);
    assert.equal(allRows(shots).length, 4);
    assert.equal(totalSeconds(shots), 16);
  });
  test("a size outside the list is flagged", () => {
    assert.ok(shotProblems(parseShots(GOOD.replace("| ELS |", "| XLS |"))).some((p) => /size XLS/.test(p)));
    for (const size of SIZES) assert.deepEqual(shotProblems(parseShots(GOOD.replace("| ELS |", `| ${size} |`))), [], size);
    assert.ok(shotProblems(parseShots(GOOD.replace("| LS |", "| WS |"))).length > 0, "WS is written LS");
  });
  test("a gap, a repeat or a start other than 1 in the numbers is flagged", () => {
    assert.ok(shotProblems(parseShots(GOOD.replace("| 3 | MS |", "| 4 | MS |"))).some((p) => /no gap and no repeat/.test(p)));
    assert.ok(shotProblems(parseShots(GOOD.replace("| 2 | LS |", "| 1 | LS |"))).length > 0);
    assert.ok(shotProblems(parseShots(GOOD.replace("| 1 | ELS |", "| 2 | ELS |"))).length > 0);
  });
  test("a scene with no axis line, a movement outside the list and a bad lens are flagged", () => {
    assert.ok(shotProblems(parseShots(GOOD.replace(/^Axis: the line from the net-mender.*$/m, ""))).some((p) => /no Axis line/.test(p)));
    assert.ok(shotProblems(parseShots(GOOD.replace("| handheld |", "| zoom |"))).some((p) => /movement zoom/.test(p)));
    assert.ok(shotProblems(parseShots(GOOD.replace("| 50 mm |", "| 50 |"))).some((p) => /lens/.test(p)));
    assert.ok(shotProblems(parseShots(GOOD.replace("| 4 | light:", "| 0 | light:"))).some((p) => /Sec/.test(p)));
  });
  test("a missing column, ratio or frame rate is flagged", () => {
    assert.ok(shotProblems(parseShots(GOOD.replaceAll("| Sec ", "| Secs "))).some((p) => /columns/.test(p)));
    assert.ok(shotProblems(parseShots(GOOD.replace("Aspect ratio: 16:9", ""))).includes("no aspect ratio"));
    assert.ok(shotProblems(parseShots(GOOD.replace("Frame rate: 24", ""))).includes("no frame rate"));
  });
  test("a row that crosses the axis is found by its note, so the hand-over can list it", () => {
    assert.deepEqual(crossings(shots), [4]);
  });
});

describe("markers, the EDL and the project agree (SHO3, SHO4)", () => {
  const shots = parseShots(GOOD);
  test("one marker per row, at the shot's start, named S<nn> <size>, holding the angle and the movement", () => {
    assert.deepEqual(markerPlan(shots), [
      { seconds: 0, name: "S01 ELS", comment: "objective, high; static" },
      { seconds: 4, name: "S02 LS", comment: "objective, eye level; dolly in, slow" },
      { seconds: 9, name: "S03 MS", comment: "objective, eye level; handheld" },
      { seconds: 13, name: "S04 MCU", comment: "POV, eye level; static" },
    ]);
  });
  test("the scripts: a base that makes the sequence and a matte as long as the list, and one that places it, marks and exports", () => {
    const [seq, matte] = baseLines(shots);
    assert.equal(seq.params.fps, 24);
    assert.equal(matte.params.seconds, 16);
    const lines = shotLines(shots, { item: 8, edl: "/p/shots.edl", otio: "/p/shots.otio" });
    assert.equal(lines[0].id, "timeline.place");
    assert.equal(lines[0].params.item, 8);
    assert.equal(lines.filter((l) => l.id === "markers.add").length, 4);
    assert.deepEqual(lines.slice(-2).map((l) => l.id), ["file.exportEdl", "file.exportOtio"]);
    assert.equal(jsonl(lines).trim().split("\n").length, lines.length);
  });
  test("the EDL's LOC lines are the marker names, in order, and a mismatch is found", () => {
    const edl = "TITLE: x\n\n001  BL  V  C  00:00:00:00 00:00:16:00 00:00:00:00 00:00:16:00\n* FROM CLIP NAME: Color Matte\n* LOC: 00:00:00:00 GREEN   S01 ELS\n* LOC: 00:00:04:00 GREEN   S02 LS\n* LOC: 00:00:09:00 GREEN   S03 MS\n* LOC: 00:00:13:00 GREEN   S04 MCU\n";
    assert.deepEqual(edlLocs(edl), markerPlan(shots).map((m) => m.name));
    assert.notDeepEqual(edlLocs(edl.replace("S03 MS", "S03 CU")), markerPlan(shots).map((m) => m.name));
    assert.deepEqual(edlLocs("TITLE: Harbour\nFCM: NON-DROP FRAME\n"), [], "an empty sequence exports no marker");
  });
  test("the project's markers equal the table: a change to the angle or the movement alone fails the round trip", () => {
    const sequence = { markers: [{ name: "Open", comment: "", start: 0 }, ...markerPlan(shots).map((m) => ({ name: m.name, comment: m.comment, start: m.seconds * 254016000000 }))] };
    assert.deepEqual(shotMarkers(sequence), markerPlan(shots));
    assert.equal(markersOf(sequence).length, 5);
    const changed = { markers: sequence.markers.map((m) => (m.name === "S02 LS" ? { ...m, comment: "objective, low; dolly in, slow" } : m)) };
    assert.notDeepEqual(shotMarkers(changed), markerPlan(shots));
    const moved = parseShots(GOOD.replace("| handheld |", "| static |"));
    assert.notDeepEqual(markerPlan(moved), shotMarkers(sequence));
  });
});

// ---- the storyboard (STO2, STO3, STO5) ----

describe("the storyboard frames and the animatic, on fixtures", () => {
  const shots = parseShots(GOOD);
  test("one frame per row, named S<nn>, all at the one aspect ratio, every text step with its parent frame id", () => {
    const { steps, frameIds } = boardSteps(shots);
    assert.deepEqual(boardProblems(shots, steps), []);
    assert.deepEqual(frameIds, [2, 7, 11, 15], "ids are predicted in creation order: a frame, then its texts");
    assert.equal(steps.filter((s) => s.command === "frame.create").length, 4);
  });
  test("a missing frame, a wrong name, another size and a text with no parent are flagged", () => {
    const { steps } = boardSteps(shots);
    const frames = steps.filter((s) => s.command === "frame.create");
    assert.ok(boardProblems(shots, steps.filter((s) => s !== frames[3])).some((p) => /3 frames for 4 shots/.test(p)));
    assert.ok(boardProblems(shots, steps.map((s) => (s === frames[1] ? { ...s, params: { ...s.params, name: "S99" } } : s))).some((p) => /S99/.test(p)));
    assert.ok(boardProblems(shots, steps.map((s) => (s === frames[2] ? { ...s, params: { ...s.params, width: 800 } } : s))).some((p) => /not 16:9/.test(p)));
    assert.ok(boardProblems(shots, steps.map((s) => (s.command === "text.create" ? { ...s, params: { ...s.params, parent: undefined } } : s))).some((p) => /no parent/.test(p)));
  });
  test("the animatic places each still on its own with its own duration, and the clips are as long as the table says", () => {
    const lines = animaticLines(shots, [1, 2, 3, 4], { gif: "/p/animatic.gif" });
    const placed = lines.filter((l) => l.id === "timeline.place");
    assert.equal(placed.length, 4);
    assert.ok(placed.every((l) => l.params.item !== undefined && l.params.items === undefined), "a duration is refused with items");
    assert.deepEqual(placed.map((l) => l.params.seconds), [0, 4, 9, 13]);
    assert.deepEqual(placed.map((l) => l.params.duration.seconds), [4, 5, 4, 3]);
    assert.deepEqual(expectedFrames(shots), [96, 120, 96, 72]);
    assert.deepEqual(clipFrames({ video: [{ items: [{ durationFrames: 96 }, { durationFrames: 120 }] }] }), [96, 120]);
  });
});

// ---- motion (MOT5) ----

describe("motion: the saved commands run no script (MOT1, MOT5)", () => {
  test("a script, --eval, mcp, an expression and a .jsx are flagged, and a plain command list is not", () => {
    for (const bad of ["effectcraft-cli script a.jsx", "effectcraft-cli --eval 1", "effectcraft-cli mcp", '{"expression":"time*2"}', "effectcraft-cli set A b c --expression x", "run a.jsx", "effectcraft-cli --bridge 1"]) {
      assert.ok(motionProblems(bad).length > 0, bad);
    }
    assert.deepEqual(motionProblems('[{"command":"comp.new","params":{"name":"Title"}}]'), []);
  });
  test("a set with no --save is flagged, and one with --save or --save-as is not", () => {
    assert.equal(setProblems(["timeout 20 effectcraft-cli --project /p/m.ecproj set Title title transform/opacity 0 --time 0"]).length, 1);
    assert.deepEqual(setProblems(["timeout 20 effectcraft-cli --project /p/m.ecproj --save set Title title transform/opacity 0 --time 0"]), []);
    assert.deepEqual(setProblems(["timeout 20 effectcraft-cli --project /p/m.ecproj --save-as /p/n.ecproj set A b c"]), []);
  });
});

// ---- the shipped files ----

const TOOLS = ["shots", "storyboard", "motion"];
const tool = (name) => read("skills/tools", name, "SKILL.md");
const refs = (name) => read("skills/tools", name, "REFERENCES.md");
const rowsOf = (text) => text.split("\n").filter((l) => l.startsWith("|") && !/^\|\s*(Id\s*\||-)/.test(l)).map((l) => l.split("|").slice(1, -1).map((c) => c.trim()));
const HANDOVER_LINE = "This is a plan and a draft, not a cut. No film was made, no shot was taken and no footage was cut.";

describe("the eleven files exist", () => {
  const files = [
    "skills/characters/moholy-nagy/SKILL.md", "docs/characters/moholy-nagy.md",
    ...TOOLS.flatMap((t) => [`skills/tools/${t}/SKILL.md`, `skills/tools/${t}/REFERENCES.md`, `docs/tools/${t}.md`]),
  ];
  test("each is there, and there are eleven", () => {
    assert.equal(files.length, 11);
    for (const f of files) assert.ok(exists(f), f);
  });
  test("each docs page has its four sections", () => {
    for (const f of files.filter((x) => x.startsWith("docs/"))) {
      for (const title of ["What it does", "When to reach for it", "Common questions", "It's working if"]) assert.ok(section(read(f), title).trim().length > 0, `${f}: ${title}`);
    }
  });
  test("every tool's hand-over carries the plan-and-draft line, and no file claims a film was made", () => {
    for (const t of TOOLS) assert.ok(section(tool(t), "Hand over").includes(HANDOVER_LINE), `${t}: hand-over lacks the line`);
    assert.ok(section(read("skills/characters/moholy-nagy/SKILL.md"), "Hand over").includes(HANDOVER_LINE));
    for (const f of files.filter((x) => x.endsWith(".md") && !x.endsWith("REFERENCES.md"))) {
      const claim = read(f).split(/(?<=[.!?])\s+|\n+/).filter((s) => /\b(?:film|footage|cut)\b[^.]*\b(?:was|were) (?:made|shot|taken|finished|delivered)\b/i.test(s) && !/\b(?:not|no|never)\b/i.test(s));
      assert.deepEqual(claim, [], f);
    }
  });
});

describe("moholy-nagy (MN1 to MN4)", () => {
  const source = read("skills/characters/moholy-nagy/SKILL.md");
  test("calls only design, shots, storyboard, motion and critique, each on a fact about the task (MN2)", () => {
    const named = [...new Set([...source.matchAll(/`\/bauhaus:([a-z][a-z0-9-]*)`/g)].map((m) => m[1]))].sort();
    assert.deepEqual(named, ["critique", "design", "motion", "shots", "storyboard"]);
    const when = section(source, "When to call");
    assert.match(when, /default is not to call/i);
    assert.match(when, /no brief file exists/i);
    assert.match(when, /task is the shots of a film or a sequence/i);
    assert.match(when, /task is the frames of a film in order, or an animatic/i);
    assert.match(when, /task is an animated title, graphic or effect/i);
    assert.match(when, /finished frame exists that this session did not make/i);
    assert.match(when, /one line[^.]*which tool[^.]*why/i);
    assert.match(when, /skipped without comment/i);
  });
  test("a still photograph goes to peterhans, and the shot list holds light only as a note column (MN3)", () => {
    assert.match(source, /still photograph[^.\n]*`peterhans`/i);
    assert.match(source, /light[^.\n]*note column/i);
    assert.doesNotMatch(source, /\/bauhaus:peterhans/);
  });
  test("claims no film made, no shot taken and no footage cut (MN4)", () => {
    assert.match(source, /a plan and a draft, not a cut/i);
    assert.match(section(source, "Hard rules"), /no film made[^.\n]*no shot taken[^.\n]*no footage cut/i);
  });
  test("has a Stance of three to six lines after Hard rules and Hand over and before Voice (STN1, STN4)", () => {
    const headings = [...source.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
    const at = (t) => headings.indexOf(t);
    assert.ok(at("Stance") > at("Hard rules") && at("Stance") > at("Hand over") && at("Stance") < at("Voice"), headings.join(", "));
    const lines = section(source, "Stance").split("\n").filter((l) => l.trim());
    assert.ok(lines.length >= 3 && lines.length <= 6, `${lines.length} lines`);
    for (const l of lines) assert.match(l, /^- [A-Z]/, "a plain statement, one to a line");
    assert.doesNotMatch(section(source, "Stance"), /\b(?:I|my|me|we)\b/, "third person");
    assert.doesNotMatch(section(source, "Stance"), /["“”]/, "no quotation");
    const sample = samples(section(source, "Voice"));
    assert.equal(sample.length, 1, "the Stance adds no sample line");
  });
  test("the sample line is about the shot list and names its axes", () => {
    const [line] = samples(section(source, "Voice"));
    assert.match(line, /shot list/i);
    assert.match(line, /axis/i);
    assert.ok(line.split(/\s+/).length <= 30);
  });
  test("the split: the writer owns the words, donna keeps long documents, and the other designers are named as prose", () => {
    assert.match(source, /writer owns the words of the pieces made here, and donna keeps long documents and the PDF build/i);
    assert.doesNotMatch(source, /\/bauhaus:(?:bayer|breuer|gropius|mies)/);
    assert.doesNotMatch(source, /\]\(\.\.\//);
  });
});

describe("shots (SHO1 to SHO7)", () => {
  const source = tool("shots");
  const hand = section(source, "Hand over");
  test("its example shot list is well-formed and has a scene that crosses its axis", () => {
    const md = fences(source, "md")[0];
    assert.ok(md, "an example list in a fenced md block");
    const shots = parseShots(md);
    assert.deepEqual(shotProblems(shots), []);
    assert.ok(crossings(shots).length >= 1, "an example of a row that is flagged");
    assert.ok(shots.scenes.length >= 2);
  });
  test("the form is its own and marked inferred, the sizes are the eight, the abbreviations rest on a row (SHO1)", () => {
    assert.match(source, /our own form|this package's own form/i);
    assert.match(source, /inferred/i);
    assert.match(source, /ELS, LS, FS, MWS, MS, MCU, CU and ECU/);
    assert.match(source, /Sec[^.\n]*(?:length|seconds)/);
  });
  test("each scene states its axis in one line and a row that crosses it says so (SHO2)", () => {
    assert.match(source, /`Axis:`/);
    assert.match(source, /crosses the axis/);
    assert.match(source, /row AX1/);
  });
  test("the marker comment holds the angle and the movement, and the EDL has one LOC line per row (SHO3, SHO4)", () => {
    assert.match(source, /`S<nn> <size>`/);
    assert.match(source, /comment[^.\n]*angle[^.\n]*movement/i);
    assert.match(source, /`\* LOC:`/);
    assert.match(source, /one[^.\n]*`\* LOC:`[^.\n]*each row|each row[^.\n]*`\* LOC:`/i);
  });
  test("markers sit on a placeholder matte as long as the list, because an empty sequence exports none; the item id is read, not assumed", () => {
    assert.match(source, /file\.newColorMatte/);
    assert.match(source, /empty sequence[^.\n]*no marker|no marker[^.\n]*empty sequence/i);
    assert.match(source, /read the item id[^.\n]*(?:printed|output)|never assum/i);
  });
  test("a frame is rendered at each shot start and offline media is listed, never accepted silently (SHO5)", () => {
    assert.match(source, /render --seconds/);
    assert.match(source, /offlineMedia/);
    assert.match(source, /never passes `--allow-offline`|never pass `--allow-offline`/i);
  });
  test("the hand-over: a shot list and markers, not a cut; the media; the axis crossings; critique takes the frames (SHO6)", () => {
    assert.match(hand, /shot list and markers, not a cut/i);
    assert.match(hand, /placeholder/i);
    assert.match(hand, /offline/i);
    assert.match(hand, /cross(?:es|ings)/i);
    assert.match(hand, /`\/bauhaus:critique` takes the PNG frames[^.\n]*not the Markdown or the EDL/i);
  });
  test("lighting is a note and no lighting rule is written, and the camera rules cite rows (SHO7)", () => {
    assert.match(source, /light[^.\n]*note/i);
    assert.match(source, /no lighting rule/i);
    for (const id of ["SZ1", "AG1", "MV1", "AX1"]) assert.match(source, new RegExp(`row ${id}`));
  });
  test("a deliverable cites at least three rows, and the brief minimum is the default", () => {
    assert.match(source, /at least three rows/i);
    assert.doesNotMatch(source, /Minimum: [12]\b/);
  });
});

describe("storyboard (STO1 to STO7)", () => {
  const source = tool("storyboard");
  const hand = section(source, "Hand over");
  test("one top-level frame per shot named S<nn>, made with figcraft-cli run, with roots and --no-system-fonts, exported as PNG (STO1)", () => {
    assert.match(source, /`S<nn>`/);
    assert.match(source, /figcraft-cli run/);
    assert.match(source, /frame\.create/);
    assert.match(source, /props\.fill/);
    assert.match(source, /text\.create/);
    assert.match(source, /"parent"/);
    assert.match(source, /--automation-read-root/);
    assert.match(source, /--no-system-fonts/);
    assert.match(source, /export [^\n]*-o [^\n]*--format png/);
  });
  test("its example steps pass the frame rules: one frame per shot, one aspect ratio, a parent on every text (STO2, STO3)", () => {
    const steps = JSON.parse(fences(source, "json")[0]);
    const shots = parseShots(read("skills/tools/shots/SKILL.md").match(/^```md\n([\s\S]*?)^```/m)[1]);
    // The example shows the first shots of the list; the rules are the same for a whole list.
    const first = { ...shots, scenes: [{ ...shots.scenes[0], rows: shots.scenes[0].rows.slice(0, 2) }] };
    assert.deepEqual(boardProblems(first, steps), []);
  });
  test("the aspect ratio is stated once, and every frame uses it (STO3)", () => {
    assert.match(source, /one aspect ratio[^.\n]*stated once|stated once[^.\n]*one aspect ratio/i);
  });
  test("the frames are imported, each still placed on its own with its duration, and read back with inspect sequence (STO4, STO5)", () => {
    assert.match(source, /filmcraft-cli[^\n]*import/);
    assert.match(source, /timeline\.place/);
    assert.match(source, /one still at a time|each still on its own/i);
    assert.match(source, /refused with `items`|`duration` with `items` is refused/);
    assert.match(source, /inspect sequence/);
    assert.match(source, /durationFrames/);
    assert.match(source, /\.gif/);
  });
  test("the hand-over: framing panels, not drawings, and not a cut; critique takes the PNG frames (STO6)", () => {
    assert.match(hand, /framing panels, not drawings, and not a cut/i);
    assert.match(hand, /`\/bauhaus:critique` takes the PNG frames/);
  });
  test("panels of one scene keep the screen direction, and the rule cites an opened row (STO7)", () => {
    assert.match(source, /screen direction/i);
    assert.match(source, /row SA1/);
  });
  test("an mp4 is not made: only the GIF was run", () => {
    assert.doesNotMatch(prose(source), /\.mp4/);
  });
});

describe("motion (MOT1 to MOT7)", () => {
  const source = tool("motion");
  const hand = section(source, "Hand over");
  test("the project is built by effectcraft-cli --empty with a command list, and every set carries --save (MOT1)", () => {
    assert.match(source, /effectcraft-cli --empty/);
    assert.match(source, /comp\.new/);
    assert.match(source, /--commands/);
    assert.match(source, /`set`[^.\n]*--save|--save[^.\n]*`set`/);
    const lines = fences(source, "sh").flatMap((t) => t.replace(/\\\n\s*/g, " ").split("\n"));
    assert.deepEqual(setProblems(lines), []);
    assert.deepEqual(motionProblems(lines.join("\n")), []);
    assert.match(source, /get[^.\n]*midpoint[^.\n]*two keys/i);
  });
  test("the poster frame is always made, and a GIF is the render that was run (MOT2, MOT3)", () => {
    assert.match(source, /render-frame/);
    assert.match(source, /poster/i);
    assert.match(source, /always (?:made|delivered)/i);
    assert.match(source, /reduced-motion/i);
    assert.match(source, /--format gif/);
    assert.match(source, /states whether a reduced-motion variant is needed|says whether a reduced-motion variant is needed/i);
  });
  test("every text on its background in the poster passes check.mjs contrast with --min (MOT4)", () => {
    assert.match(source, /node skills\/tools\/design\/check\.mjs contrast <fg> <bg> --min 4\.5/);
    assert.match(source, /3:1/);
  });
  test("no script, no --eval, no expression and no mcp (MOT5)", () => {
    assert.match(source, /never[^.\n]*effectcraft-cli script/i);
    assert.match(source, /--eval/);
    assert.match(source, /expression/);
  });
  test("the rules rest on two film rows and say so, and the minimum is two with its reason (MOT6, MOT7)", () => {
    assert.match(source, /Minimum: 2\./);
    assert.match(source, /Reason: no motion source opened; two secondary film rows/);
    assert.match(source, /no motion-graphics source was opened/i);
    for (const id of ["MO1", "ME1"]) assert.match(source, new RegExp(`row ${id}`));
  });
  test("the hand-over lists the side files and says what was and was not run", () => {
    assert.match(hand, /\.motion\.ecproj\.lock/);
    assert.match(hand, /poster/i);
    assert.match(hand, /`\/bauhaus:critique` takes the poster PNG/);
    assert.match(hand, /not run/i);
  });
});

// ---- references ----

const prose = (source) => source.replace(/^(```|~~~)[\s\S]*?^\1/gm, "").replace(/`[^`\n]*`/g, "").replace(/https?:\/\/\S+/g, "");
const allReferenceFiles = () => readdirSync(join(root, "skills", "tools"), { withFileTypes: true }).filter((e) => e.isDirectory() && exists("skills/tools", e.name, "REFERENCES.md")).map((e) => `skills/tools/${e.name}/REFERENCES.md`);

describe("the three REFERENCES.md files", () => {
  const FLOOR = { shots: 5, storyboard: 4, motion: 3 };
  for (const t of TOOLS) {
    describe(t, () => {
      const rows = rowsOf(refs(t));
      test("has its rows, an opened one among them, each Wikibooks or Wikipedia row secondary", () => {
        assert.ok(rows.length >= FLOOR[t], `${rows.length} rows`);
        assert.ok(rows.some((r) => r[5] === "opened"));
        for (const r of rows.filter((x) => /Wikibooks|Wikipedia/.test(x[1]))) {
          assert.match(r[2], /secondary/, r[0]);
          assert.equal(r[5], "opened", r[0]);
          assert.match(r[6], /^free \(https:\/\/en\.wiki(?:books|pedia)\.org\//, r[0]);
          assert.match(`${r[2]} ${r[3]}`, /20\d\d-\d\d-\d\d/, `${r[0]}: the revision date is recorded`);
        }
      });
      test("the lending books are pointers: not opened, lending, inferred from the title", () => {
        for (const r of rows.filter((x) => x[6] === "lending")) {
          assert.equal(r[5], "not opened");
          assert.match(r[4], /^Inferred from the title:/);
        }
      });
      test("no cast name and no Lucia", () => assert.doesNotMatch(refs(t), /Gropius|Bayer|Breuer|Albers|Moholy|Mies|Peterhans|Lucia/i));
      test("every row it cites in SKILL.md is its own and opened", () => {
        const mine = new Map(rows.map((r) => [r[0], r]));
        const cited = [...tool(t).matchAll(/\brows? ((?:[A-Z]{1,2}\d+)(?:(?:,\s*|\s+and\s+)[A-Z]{1,2}\d+)*)/g)].flatMap((m) => m[1].split(/,\s*|\s+and\s+/));
        assert.ok(cited.length > 0);
        for (const id of cited) {
          assert.ok(mine.has(id), `${id} is not a row of ${t}/REFERENCES.md`);
          assert.equal(mine.get(id)[5], "opened", id);
        }
      });
    });
  }
  test("the ids of the three files repeat no id of any other file, and none repeats inside a file", () => {
    const own = TOOLS.flatMap((t) => rowsOf(refs(t)).map((r) => r[0]));
    const others = allReferenceFiles().filter((f) => !TOOLS.some((t) => f.includes(`/${t}/`))).flatMap((f) => rowsOf(read(f)).map((r) => r[0]));
    assert.equal(new Set(own).size, own.length, `repeated: ${own.filter((id, i) => own.indexOf(id) !== i)}`);
    assert.deepEqual(own.filter((id) => others.includes(id)), []);
  });
  test("the Wikibooks rows record the page and the revision the rule rests on", () => {
    const all = TOOLS.flatMap((t) => rowsOf(refs(t))).filter((r) => /Wikibooks/.test(r[1]));
    assert.ok(all.length >= 4);
    for (const r of all) assert.match(r[2], /revision 20\d\d-\d\d-\d\d/, r[0]);
  });
});

describe("the briefs (spec section 5)", () => {
  test("shots and storyboard take the default minimum of three, and motion states two with its reason", () => {
    assert.match(tool("shots"), /at least three rows/i);
    assert.match(tool("storyboard"), /at least three rows/i);
    assert.match(tool("motion"), /Minimum: 2\. Reason: no motion source opened; two secondary film rows/);
  });
  test("the three tools point at the ArtCraft rules and copy none", () => {
    for (const t of TOOLS) {
      assert.match(tool(t), /ARTCRAFT\.md/, t);
      assert.match(tool(t), /REFERENCES\.md/, t);
      assert.doesNotMatch(tool(t), /\]\(\.\.\/design\//, t);
    }
  });
});

// ---- the Story beats: the writer owns the story, and these tools carry it (STO8) ----

const BRIEF = `# Brief

## Idea

A harbour that wakes.
Two words: slow dawn

## Story

Who it is about: the net-mender.

- Beat 1: the harbour before work | carried by: order
- Beat 2: hands at the net | carried by: crop
- Beat 3: the first sale | carried by: picture

## Research

None.
`;
const LIST = `# Shot list

Aspect ratio: 16:9
Frame rate: 24

## Scene 1: Quay

Beats: 1, 2

Axis: the line from a to b.

| No | Size | Angle | Movement | Lens | Subject | Sec | Note |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | ELS | objective, high | static | 24 mm | the harbour | 4 | |
| 2 | CU | objective, eye level | static | 85 mm | hands | 3 | |

## Scene 2: Market

Beats: 3

Axis: the line from c to d.

| No | Size | Angle | Movement | Lens | Subject | Sec | Note |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 3 | MS | objective, eye level | handheld | 35 mm | the sale | 4 | |
`;

describe("the Story beats in the film tools (STO8)", () => {
  test("the beats of a brief's Story are read, in order", () => {
    const story = storyBeats(BRIEF);
    assert.equal(story.none, false);
    assert.deepEqual(story.beats.map((b) => b.n), [1, 2, 3]);
    assert.equal(story.beats[1].carriedBy, "crop");
  });
  test("Story: none is read as none, with no beat", () => {
    const story = storyBeats("## Story\n\nStory: none. Reason: a title card.\n");
    assert.deepEqual(story, { none: true, beats: [] });
  });
  test("a shot list that shows every beat has no problem, and the panels that carry each beat are listed", () => {
    const story = storyBeats(BRIEF);
    const shots = parseShots(LIST);
    assert.deepEqual(beatProblems(story, shots), []);
    assert.deepEqual(beatPanels(story, shots), { byBeat: { 1: ["S01", "S02"], 2: ["S01", "S02"], 3: ["S03"] }, none: [] });
  });
  test("a beat that no scene shows is sent back, and a scene cannot add a beat the brief does not have", () => {
    const story = storyBeats(BRIEF);
    const missing = parseShots(LIST.replace("Beats: 3", "Beats: none"));
    assert.deepEqual(beatProblems(story, missing), ["Beat 3 is shown by no scene"]);
    const invented = parseShots(LIST.replace("Beats: 3", "Beats: 3, 4"));
    assert.deepEqual(beatProblems(story, invented), ["Scene 2: Market: Beat 4 is not a beat of the brief"]);
  });
  test("a scene with no Beats line is a problem, and with Story: none the line is Beats: none and the panels are listed apart", () => {
    const story = storyBeats(BRIEF);
    assert.match(beatProblems(story, parseShots(LIST.replace("Beats: 1, 2\n\n", "")))[0], /Scene 1: Quay: no Beats line/);
    const none = storyBeats("## Story\n\nStory: none. Reason: a title card.\n");
    const shots = parseShots(LIST.replace("Beats: 1, 2", "Beats: none").replace("Beats: 3", "Beats: none"));
    assert.deepEqual(beatProblems(none, shots), []);
    assert.deepEqual(beatPanels(none, shots).none, ["S01", "S02", "S03"]);
  });

  const shots = tool("shots");
  const board = tool("storyboard");
  const motion = tool("motion");
  test("shots: every scene states its Beats line, the example shows it and the list invents no story", () => {
    assert.match(shots, /`Beats:`/);
    assert.match(shots, /every beat is in at least one scene/i);
    assert.match(shots, /invents no story/i);
    const md = fences(shots, "md")[0];
    const parsed = parseShots(md);
    assert.ok(parsed.scenes.every((sc) => sc.beatLine), "every scene of the example has a Beats line");
    assert.deepEqual(beatProblems({ none: false, beats: [{ n: 1 }, { n: 2 }, { n: 3 }] }, parsed), []);
    assert.match(section(shots, "Hand over"), /beat each scene shows/i);
  });
  test("storyboard: takes the Story beats as its input, never invents the story, and lists each beat with its panels", () => {
    assert.match(board, /`Story` beats of the brief/);
    assert.match(board, /never invents the story/i);
    assert.match(board, /writer owns it/i);
    assert.match(board, /`Story: none`/);
    assert.match(board, /Beat 1: S01, S02, S03/);
    assert.match(board, /sent back to `shots`/);
  });
  test("storyboard, shots and motion start from a complete brief of all eleven sections", () => {
    for (const [name, source] of [["shots", shots], ["storyboard", board], ["motion", motion]]) assert.match(source, /complete brief[^.\n]*all eleven sections/i, name);
  });
  test("motion: the words on screen are the writer's, taken from words.md", () => {
    assert.match(motion, /words on screen are the writer's, taken from `words\.md`/);
    assert.match(motion, /`Story: none\. Reason: <why>`/);
  });
});

// The rules of the film tools (shots, storyboard, motion), as functions over strings.
// Imported by film.test.mjs, which tests them on fixtures, and by artcraft.test.mjs, which runs the apps with what they make.
// This file is not a test: the test glob reads test/*.test.mjs only.

// ---- shots: the table, which is this package's own form (marked inferred in the skill) ----

export const SIZES = ["ELS", "LS", "FS", "MWS", "MS", "MCU", "CU", "ECU"];
export const MOVES = ["static", "handheld", "dolly", "slider", "jib"];
export const COLUMNS = ["No", "Size", "Angle", "Movement", "Lens", "Subject", "Sec", "Note"];
export const CROSSES = /crosses the axis/i;

const cells = (line) => line.split("|").slice(1, -1).map((c) => c.trim());

// A shot list as Markdown: an aspect ratio and a frame rate, then one section per scene with its axis line and its table.
export function parseShots(md) {
  const aspect = /^Aspect ratio:\s*(\d+):(\d+)\s*$/m.exec(md);
  const fps = /^Frame rate:\s*(\d+(?:\.\d+)?)\s*$/m.exec(md);
  const scenes = md
    .split(/^## /m)
    .slice(1)
    .map((block) => {
      const [title, ...rest] = block.split("\n");
      const axis = /^Axis:\s*(.+)$/m.exec(rest.join("\n"))?.[1]?.trim() ?? "";
      const beatLine = /^Beats:\s*(.+)$/m.exec(rest.join("\n"))?.[1]?.trim() ?? "";
      const beats = beatLine === "" || /^none$/i.test(beatLine) ? [] : beatLine.split(/\s*,\s*/).map(Number);
      const header = rest.find((l) => /^\|\s*No\s*\|/.test(l));
      const rows = rest
        .filter((l) => l.startsWith("|") && !/^\|\s*(?:No\s*\||-)/.test(l))
        .map((l) => Object.fromEntries(cells(l).map((c, i) => [COLUMNS[i] ?? `extra${i}`, c])));
      return { title: title.trim(), axis, beatLine, beats, header: header ? cells(header) : [], rows };
    });
  return { aspect: aspect ? [Number(aspect[1]), Number(aspect[2])] : null, fps: fps ? Number(fps[1]) : null, scenes };
}

export const allRows = (shots) => shots.scenes.flatMap((s) => s.rows);
export const nn = (no) => String(no).padStart(2, "0");

// SHO1, SHO2 and the shape of the table. Empty means the list is well-formed.
export function shotProblems(shots) {
  const problems = [];
  if (!shots.aspect) problems.push("no aspect ratio");
  if (!shots.fps) problems.push("no frame rate");
  if (!shots.scenes.length) problems.push("no scene");
  for (const scene of shots.scenes) {
    if (scene.header.join("|") !== COLUMNS.join("|")) problems.push(`${scene.title}: columns are not ${COLUMNS.join(", ")}`);
    if (!scene.axis) problems.push(`${scene.title}: no Axis line`);
    if (!scene.rows.length) problems.push(`${scene.title}: no rows`);
  }
  const rows = allRows(shots);
  rows.forEach((row, i) => {
    if (Number(row.No) !== i + 1) problems.push(`shot ${row.No}: numbers run from 1 with no gap and no repeat (expected ${i + 1})`);
    if (!SIZES.includes(row.Size)) problems.push(`shot ${row.No}: size ${row.Size} is not one of ${SIZES.join(", ")}`);
    if (!MOVES.includes((row.Movement ?? "").split(/\s+/)[0])) problems.push(`shot ${row.No}: movement ${row.Movement} does not start with one of ${MOVES.join(", ")}`);
    if (!/^\d+ mm$/.test(row.Lens ?? "")) problems.push(`shot ${row.No}: lens ${row.Lens} is not "<n> mm"`);
    if (!(Number(row.Sec) > 0)) problems.push(`shot ${row.No}: Sec ${row.Sec} is not a length in seconds`);
    if (!row.Subject) problems.push(`shot ${row.No}: no subject`);
  });
  return problems;
}

// The rows whose note says they cross the axis: listed in the hand-over, never silent.
export const crossings = (shots) => allRows(shots).filter((r) => CROSSES.test(r.Note ?? "")).map((r) => Number(r.No));

// A marker for each shot: at the shot's start, named `S<nn> <size>`, holding the angle and the movement as its comment (SHO3, SHO4).
export function markerPlan(shots) {
  let at = 0;
  return allRows(shots).map((row) => {
    const marker = { seconds: at, name: `S${nn(row.No)} ${row.Size}`, comment: `${row.Angle}; ${row.Movement}` };
    at += Number(row.Sec);
    return marker;
  });
}
export const totalSeconds = (shots) => allRows(shots).reduce((v, r) => v + Number(r.Sec), 0);

// The two FilmCraft scripts: a base that makes the sequence and the placeholder matte, and the one that places it and marks the shots.
export function baseLines(shots, { name = "Shots", width = 1920, height = 1080 } = {}) {
  return [
    { id: "file.newSequence", params: { name, width, height, fps: shots.fps } },
    { id: "file.newColorMatte", params: { color: "#202020", seconds: totalSeconds(shots) } },
  ];
}
export function shotLines(shots, { item, edl, otio }) {
  return [
    { id: "timeline.place", params: { item, track: "V1", seconds: 0 } },
    ...markerPlan(shots).map((m) => ({ id: "markers.add", params: m })),
    { id: "file.exportEdl", params: { path: edl } },
    ...(otio ? [{ id: "file.exportOtio", params: { path: otio } }] : []),
  ];
}
export const jsonl = (lines) => lines.map((l) => JSON.stringify(l)).join("\n") + "\n";

// The marker names an EDL carries, in order: its `* LOC:` lines (a LOC line is `* LOC: <timecode> <colour> <name>`).
export const edlLocs = (edl) => [...edl.matchAll(/^\* LOC:\s+\S+\s+\S+\s+(.+?)\s*$/gm)].map((m) => m[1]);

// What `filmcraft-cli inspect sequence` holds for the markers of the plan, to compare with the table: start in seconds, name and comment.
export const TICKS = 254016000000;
export const markersOf = (sequence) => sequence.markers.map((m) => ({ seconds: m.start / TICKS, name: m.name, comment: m.comment }));
// Only the markers this plan made: the names that start `S<nn> `.
export const shotMarkers = (sequence) => markersOf(sequence).filter((m) => /^S\d\d /.test(m.name));

// ---- the brief's Story: the beats the scenes and the panels carry. The writer owns the story; these tools never add one. ----

// The beats of a brief's `Story` section: `- Beat n: <what is shown> | carried by: <how>`. `none` is true for `Story: none. Reason: ...`.
export function storyBeats(brief) {
  const section = brief.split(/^## /m).find((b) => /^Story\b/.test(b)) ?? "";
  const beats = [...section.matchAll(/^- Beat (\d+):\s*(.+?)\s*\|\s*carried by:\s*(.+?)\s*$/gm)].map((m) => ({ n: Number(m[1]), shown: m[2], carriedBy: m[3] }));
  return { none: /^Story: none\./m.test(section), beats };
}

// Every beat is shown by at least one scene, and a scene names no beat the brief does not have. `Story: none` goes with `Beats: none` and no invented beat.
export function beatProblems(story, shots) {
  const problems = [];
  const have = story.beats.map((b) => b.n);
  for (const scene of shots.scenes) {
    if (!scene.beatLine) problems.push(`${scene.title}: no Beats line (write Beats: none when the brief has no story)`);
    for (const n of scene.beats) if (!have.includes(n)) problems.push(`${scene.title}: Beat ${n} is not a beat of the brief`);
  }
  for (const n of have) if (!shots.scenes.some((sc) => sc.beats.includes(n))) problems.push(`Beat ${n} is shown by no scene`);
  return problems;
}

// The panels that carry each beat: the shots of the scenes whose Beats line names it. A panel of a scene with no beat is listed apart.
export function beatPanels(story, shots) {
  const byBeat = Object.fromEntries(story.beats.map((b) => [b.n, []]));
  const none = [];
  for (const scene of shots.scenes) {
    const panels = scene.rows.map((r) => `S${nn(r.No)}`);
    if (!scene.beats.length) none.push(...panels);
    for (const n of scene.beats) if (byBeat[n]) byBeat[n].push(...panels);
  }
  return { byBeat, none };
}

// ---- storyboard: one top-level frame per shot, with the text that names it ----

export function boardSteps(shots, { width = 960, height = 540, gap = 100 } = {}) {
  const steps = [];
  const ids = [];
  let id = 2; // a new document hands out ids in creation order, the first frame is 2
  allRows(shots).forEach((row, i) => {
    const frame = id++;
    ids.push(frame);
    steps.push({ command: "frame.create", params: { x: i * (width + gap), y: 0, width, height, name: `S${nn(row.No)}`, props: { fill: "#e9edf2" } } });
    const text = (value, y, size) => {
      steps.push({ command: "text.create", params: { parent: frame, text: value, x: 32, y, props: { fontSize: size, fill: "#111827" } } });
      id++;
    };
    text(`S${nn(row.No)} ${row.Size}`, 28, 36);
    text(`${row.Angle}; ${row.Movement}; ${row.Lens}`, 84, 24);
    text(row.Subject, height - 96, 28);
    if (row.Note) text(row.Note, height - 56, 20);
  });
  return { steps, frameIds: ids };
}
export const frameSteps = (steps) => steps.filter((s) => s.command === "frame.create");
export const aspectOf = (shots, width, height) => !!shots.aspect && width * shots.aspect[1] === height * shots.aspect[0];

// STO2, STO3: the frames and the table agree, and every frame has the one aspect ratio.
export function boardProblems(shots, steps) {
  const problems = [];
  const frames = frameSteps(steps);
  const rows = allRows(shots);
  if (frames.length !== rows.length) problems.push(`${frames.length} frames for ${rows.length} shots`);
  rows.forEach((row, i) => {
    if (frames[i]?.params.name !== `S${nn(row.No)}`) problems.push(`frame ${i + 1} is named ${frames[i]?.params.name}, not S${nn(row.No)}`);
    if (frames[i] && !aspectOf(shots, frames[i].params.width, frames[i].params.height)) problems.push(`frame S${nn(row.No)} is ${frames[i].params.width} by ${frames[i].params.height}, not ${shots.aspect?.join(":")}`);
  });
  const sizes = new Set(frames.map((f) => `${f.params.width}x${f.params.height}`));
  if (sizes.size > 1) problems.push(`more than one frame size: ${[...sizes].join(", ")}`);
  for (const step of steps) if (step.command === "text.create" && typeof step.params.parent !== "number") problems.push("a text step with no parent frame id (the export is blank)");
  return problems;
}

// The animatic: each still is placed on its own, with its own duration, because a duration is refused with `items` (STO5).
export function animaticLines(shots, items, { name = "Animatic", width = 960, height = 540, gif }) {
  const rows = allRows(shots);
  let at = 0;
  const placed = rows.map((row, i) => {
    const line = { id: "timeline.place", params: { item: items[i], track: "V1", seconds: at, duration: { seconds: Number(row.Sec) } } };
    at += Number(row.Sec);
    return line;
  });
  return [{ id: "file.newSequence", params: { name, width, height, fps: shots.fps } }, ...placed, { id: "file.exportMedia", params: { path: gif, format: "gif", scale: 0.5 } }];
}
// What `inspect sequence` reports on V1: one clip per frame, in order, each as long as the table says.
export const clipFrames = (sequence) => sequence.video[0].items.map((c) => c.durationFrames);
export const expectedFrames = (shots) => allRows(shots).map((r) => Math.round(Number(r.Sec) * shots.fps));

// ---- motion: the saved commands run no script ----

// Every command and value in a saved EffectCraft script or command list that runs code, reads a window or leaves the output directory.
export function motionProblems(text) {
  const problems = [];
  if (/\beffectcraft-cli\s+script\b|--eval\b|\bmcp\b|--bridge\b|--connect\b/.test(text)) problems.push("a script, --eval, mcp, --bridge or --connect");
  if (/"expression"\s*:|--expression\b/.test(text)) problems.push("an expression field");
  if (/\.jsx\b/.test(text)) problems.push("a .jsx script");
  return problems;
}
// Every `set` carries --save (or --save-as), or the key is lost when the process ends.
export function setProblems(lines) {
  return lines.filter((l) => /\beffectcraft-cli\b.*\bset\b/.test(l) && !/--save(?:-as)?\b/.test(l)).map((l) => `${l}: a set with no --save is lost`);
}

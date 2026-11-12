// The hand-off to ArtCraft: a steps file goes in, a PNG, an SVG and a PDF come out, and the tells that read a render run on a real one.
// Follows skills/tools/design/ARTCRAFT.md: only the -cli apps are run, every call is under `timeout 20`,
// every figcraft-cli call takes both roots (and --no-system-fonts when it renders), vectorcraft-cli run takes no root flag,
// solidcraft-cli and cadcraft-cli take none and are confined by absolute paths, the settings directories and a scan of the
// command and of the script's own paths, and everything is written under a temporary directory that is removed afterwards.
// No window and no launcher is ever started.
//
//   npm test                  skips a test, printing which command-line app it needs, where that app is missing
//   npm run test:artcraft     fails instead of skipping (the local gate before a pull request is marked ready)
import { test, after, describe } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { accessSync, constants, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { tmpdir } from "node:os";
import { delimiter, dirname, isAbsolute, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { canvas as groundCanvas, pngBytes as groundPng } from "../skills/tools/ground/raster.mjs";
import {
  animaticLines, baseLines, boardProblems, boardSteps, clipFrames, edlLocs, expectedFrames, jsonl, markerPlan, motionProblems, parseShots,
  setProblems, shotLines, shotMarkers, shotProblems, totalSeconds,
} from "./film-lib.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const CHECK = join(here, "..", "skills", "tools", "design", "check.mjs");
const required = process.env.ARTCRAFT_REQUIRED === "1";

const onPath = (name) =>
  (process.env.PATH ?? "").split(delimiter).some((d) => {
    try {
      accessSync(join(d, name), constants.X_OK);
      return true;
    } catch {
      return false;
    }
  });
const missingOf = (apps) => ["timeout", ...apps].filter((name) => !onPath(name));
// The headless browser the HTML renders use: Chrome when it is installed, else Firefox.
const BROWSER = ["google-chrome", "firefox"].find(onPath) ?? "google-chrome";

const work = mkdtempSync(join(tmpdir(), "bauhaus-artcraft-"));
after(() => rmSync(work, { recursive: true, force: true }));
const out = join(work, "out");
mkdirSync(out);

// A test runs when the command-line apps it needs are there. When one is missing it skips (npm test) or fails (test:artcraft).
function hand(name, apps, body) {
  const missing = missingOf(apps);
  if (!missing.length) return test(name, body);
  const reason = `${missing.join(", ")} not on PATH`;
  if (required) return test(name, () => assert.fail(`${reason}; npm run test:artcraft needs ${apps.join(", ")}`));
  return test(name, { skip: reason }, () => {});
}

// ---- the rules of the hand-off, as functions tested on strings below ----

// The names a window app answers to (no -cli), and the launcher. None is ever started.
const WINDOW_APPS = ["figcraft", "vectorcraft", "pdfcraft", "solidcraft", "cadcraft", "filmcraft", "effectcraft", "lightcraft", "artcraft-launcher"];
const OUTPUT_FLAGS = ["--out", "--save", "--json-out", "--export", "-o", "--save-as", "--project", "--data-dir", "--commands", "--args-file"];
const underDir = (path, dir) => resolve(path) === resolve(dir) || resolve(path).startsWith(resolve(dir) + sep);

// A command as a list of words, from a list or from a line of text.
const words = (command) => (Array.isArray(command) ? command : [...command.matchAll(/"([^"]*)"|'([^']*)'|(\S+)/g)].map((m) => m[1] ?? m[2] ?? m[3]));

// Every path the command line writes or names that is not an absolute path under the output directory.
// An environment assignment (CADCRAFT_CONFIG_DIR=/x) counts, and so does a relative output.
function commandPaths(command, outDir) {
  const argv = words(command);
  const problems = [];
  // In FilmCraft and EffectCraft --save is a switch (save back to --project) and takes no path; --save-as takes one.
  const switchSave = argv.includes("filmcraft-cli") || argv.includes("effectcraft-cli");
  argv.forEach((word, i) => {
    const assign = /^[A-Z][A-Z0-9_]*=(.*)$/.exec(word);
    if (assign && /^(?:\/|~|\.\.?\/)/.test(assign[1]) && !underDir(assign[1], outDir)) problems.push(`${word}: outside ${outDir}`);
    if (OUTPUT_FLAGS.includes(word) && !(switchSave && word === "--save") && argv[i + 1] !== undefined) {
      const value = argv[i + 1];
      if (!isAbsolute(value)) problems.push(`${word} ${value}: not an absolute path`);
      else if (!underDir(value, outDir)) problems.push(`${word} ${value}: outside ${outDir}`);
    }
    if (isAbsolute(word) && !underDir(word, outDir) && word !== process.execPath && word !== CHECK && !/^\/(?:usr\/)?bin\//.test(word) && !/^(?:--[\w-]+=)/.test(word)) {
      problems.push(`${word}: outside ${outDir}`);
    }
  });
  return problems;
}

// Every string in a script's JSON that names a path: a path, file or out key, or any value that looks like one.
function scriptPaths(script, outDir) {
  const problems = [];
  const walk = (value, key) => {
    if (Array.isArray(value)) return value.forEach((v) => walk(v, key));
    if (value && typeof value === "object") return Object.entries(value).forEach(([k, v]) => walk(v, k));
    if (typeof value !== "string") return;
    const named = /^(?:path|file|out|output|dir|folder|filename)$/i.test(key ?? "");
    const looksLikeOne = /^(?:\/|~\/|\.\.?\/)/.test(value);
    if (!named && !looksLikeOne) return;
    if (!isAbsolute(value)) problems.push(`${key}: ${value}: not an absolute path`);
    else if (!underDir(value, outDir)) problems.push(`${key}: ${value}: outside ${outDir}`);
  };
  walk(typeof script === "string" ? JSON.parse(script) : script, undefined);
  return problems;
}

// What is wrong with a command and the script it runs, as a list of messages. Empty means confined.
function outsidePaths(command, script, outDir) {
  const argv = words(command);
  const problems = commandPaths(argv, outDir);
  if (argv.includes("--allow-any-path") || argv.includes("--allow-path")) problems.push("a path allow-list flag");
  if (argv.includes("mcp") || argv.includes("--connect") || argv.includes("--bridge")) problems.push("mcp, --connect or --bridge");
  if (script !== undefined) problems.push(...scriptPaths(script, outDir));
  return problems;
}

// The call itself: which binary, which subcommand, how many exports.
function callProblems(command) {
  const argv = words(command);
  const [bin, sub] = argv;
  const problems = [];
  if (WINDOW_APPS.includes(bin)) problems.push(`${bin} is a window app or the launcher`);
  if (bin === "cadcraft-cli" && sub === "run" && argv.filter((a) => a === "--export").length > 1) problems.push("cadcraft-cli run takes one --export");
  if (bin === "solidcraft-cli" && (sub === "render" || sub === "fuzz" || /^bench/.test(sub ?? ""))) problems.push(`solidcraft-cli ${sub} is not run`);
  // FilmCraft and EffectCraft take their global flags first, so the subcommand is found anywhere in the line.
  if (bin === "effectcraft-cli" && (argv.includes("script") || argv.includes("--eval") || argv.includes("--expression"))) problems.push("effectcraft-cli runs no script, no --eval and no expression");
  if (bin === "filmcraft-cli" && (argv.includes("mcp") || argv.includes("bench-decode") || argv.includes("--bridge") || argv.includes("--allow-offline"))) problems.push("filmcraft-cli runs no mcp, no bench and no --bridge, and never passes --allow-offline");
  if (bin === "effectcraft-cli" && (argv.includes("mcp") || argv.includes("bench") || argv.includes("--bridge"))) problems.push("effectcraft-cli runs no mcp, no bench and no --bridge");
  if ((bin === "filmcraft-cli" || bin === "effectcraft-cli") && argv.some((a) => a.startsWith("--automation"))) problems.push(`a root flag would reach ${bin}`);
  if (bin === "lightcraft-cli" && (sub === "denoise-serve" || sub === "merge" || sub === "snapshot")) problems.push(`lightcraft-cli ${sub} is not used`);
  if (bin === "figcraft-cli") for (const flag of ["--automation-read-root", "--automation-write-root"]) if (!argv.includes(flag)) problems.push(`figcraft-cli ${sub} is missing ${flag}`);
  if ((bin === "vectorcraft-cli" && sub === "run") || bin === "solidcraft-cli" || bin === "cadcraft-cli") {
    if (argv.some((a) => a.startsWith("--automation"))) problems.push(`a root flag would reach ${bin}`);
  }
  return problems;
}

// A plan view out of SolidCraft: every file.export_view_dxf needs a parallel camera (fov 0) looking straight down.
const PLAN_PITCH = 1.5707963;
function viewDxfProblems(script) {
  const steps = typeof script === "string" ? JSON.parse(script) : script;
  return steps
    .filter((s) => s.command === "file.export_view_dxf")
    .flatMap((s) => {
      const camera = s.params?.camera;
      if (!camera) return ["file.export_view_dxf has no camera"];
      const found = [];
      if (camera.fov !== 0) found.push(`fov is ${camera.fov}, not 0`);
      if (camera.pitch !== PLAN_PITCH) found.push(`pitch is ${camera.pitch}, not ${PLAN_PITCH}`);
      return found;
    });
}

// Every solid.* step names its body with body_name: name names the feature, and the body stays Body1.
function bodyNameProblems(script) {
  const steps = typeof script === "string" ? JSON.parse(script) : script;
  return steps.filter((s) => /^solid\./.test(s.command) && !s.params?.body_name).map((s) => `${s.command}: no body_name${s.params?.name ? " (name names the feature)" : ""}`);
}

// What `solidcraft-cli eval` prints, read the way a hand-over states it. The total is a sum of the bodies, so overlaps count twice.
function figures(measure) {
  const bodies = measure.bodies;
  const low = Math.min(...bodies.map((b) => b.bbox.min[2]));
  const ground = bodies.filter((b) => b.bbox.min[2] === low);
  const span = (list, axis) => Math.max(...list.map((b) => b.bbox.max[axis])) - Math.min(...list.map((b) => b.bbox.min[axis]));
  const overlap = (a, b) => [0, 1, 2].reduce((v, k) => v * Math.max(0, Math.min(a.bbox.max[k], b.bbox.max[k]) - Math.max(a.bbox.min[k], b.bbox.min[k])), 1);
  let overlaps = 0;
  for (let i = 0; i < bodies.length; i++) for (let j = i + 1; j < bodies.length; j++) overlaps += overlap(bodies[i], bodies[j]);
  return {
    footprint: [span(ground, 0), span(ground, 1)],
    height: span(bodies, 2),
    sumOfBodies: bodies.reduce((v, b) => v + b.volume_mm3, 0),
    overlaps,
    allClosed: bodies.every((b) => b.closed === true),
  };
}

// ---- the rules, on strings (these run wherever node runs, with no app installed) ----

describe("the hand-off rules, on fixtures", () => {
  const dir = "/work/out";
  const good = `timeout 20 env CADCRAFT_CONFIG_DIR=${dir}/cfg cadcraft-cli run --metric --cmd 'units {"lunits":2}' --save ${dir}/plan.dxf --export ${dir}/plan.pdf`;

  test("a confined command and script pass", () => {
    assert.deepEqual(outsidePaths(good, undefined, dir), []);
    assert.deepEqual(outsidePaths(`timeout 20 solidcraft-cli run ${dir}/massing.json --out ${dir}/massing.step --save ${dir}/massing.sc`, [{ command: "file.export_view_dxf", params: { path: `${dir}/plan.dxf` } }], dir), []);
  });
  test("a relative --out, --save, --json-out or --export is flagged", () => {
    for (const flag of ["--out", "--save", "--json-out", "--export"]) assert.ok(outsidePaths(`solidcraft-cli run ${dir}/a.json ${flag} massing.step`, undefined, dir).length > 0, flag);
  });
  test("an absolute path outside the output directory is flagged, in the command and in an environment assignment", () => {
    assert.ok(outsidePaths(`solidcraft-cli run ${dir}/a.json --out /elsewhere/massing.step`, undefined, dir).length > 0);
    assert.ok(outsidePaths(`env CADCRAFT_CONFIG_DIR=/home/me/.config cadcraft-cli run`, undefined, dir).length > 0);
    assert.ok(outsidePaths(`solidcraft-cli run /elsewhere/a.json --out ${dir}/a.step`, undefined, dir).length > 0);
  });
  test("a path inside the script is scanned too: an absolute path outside, or a relative one", () => {
    assert.ok(outsidePaths(`solidcraft-cli run ${dir}/a.json`, [{ command: "file.export_view_dxf", params: { path: "/elsewhere/plan.dxf" } }], dir).length > 0);
    assert.ok(outsidePaths(`solidcraft-cli run ${dir}/a.json`, [{ command: "file.export_view_dxf", params: { path: "plan.dxf" } }], dir).length > 0);
    assert.ok(outsidePaths(`solidcraft-cli run ${dir}/a.json`, JSON.stringify([{ command: "x", params: { note: "../escape" } }]), dir).length > 0);
    assert.deepEqual(outsidePaths(`solidcraft-cli run ${dir}/a.json`, [{ command: "solid.box", params: { body_name: "slab" } }], dir), []);
  });
  test("a path allow-list flag, mcp, --connect and --bridge are flagged", () => {
    for (const bad of ["--allow-any-path", "mcp", "--connect", "--bridge"]) assert.ok(outsidePaths(`solidcraft-cli ${bad} --out ${dir}/a`, undefined, dir).length > 0, bad);
  });
  test("a window app, the launcher and the commands that are not run are flagged", () => {
    for (const bad of ["figcraft", "vectorcraft", "pdfcraft", "solidcraft", "cadcraft", "filmcraft", "effectcraft", "lightcraft", "artcraft-launcher"]) assert.ok(callProblems([bad, "--help"]).length > 0, bad);
    for (const bad of ["solidcraft-cli render x --out y", "solidcraft-cli fuzz", "solidcraft-cli bench-mesh", "effectcraft-cli script x", "effectcraft-cli run --eval 1", "lightcraft-cli merge a b", "lightcraft-cli denoise-serve"]) {
      assert.ok(callProblems(bad).length > 0, bad);
    }
    assert.deepEqual(callProblems(["solidcraft-cli", "run", "a.json"]), []);
  });
  test("filmcraft-cli and effectcraft-cli: no mcp, bench, --bridge, --allow-offline, script, --eval, expression or root flag, wherever the subcommand sits", () => {
    for (const bad of [
      "filmcraft-cli --data-dir /w/d mcp", "filmcraft-cli --demo bench-decode a.mp4", "filmcraft-cli --bridge 127.0.0.1:1 run a.jsonl", "filmcraft-cli --project /w/p.fcproj render --seconds 1 --out /w/f.png --allow-offline",
      "filmcraft-cli run a.jsonl --automation-write-root /w", "effectcraft-cli --project /w/p.ecproj script a.jsx", "effectcraft-cli --eval 1", "effectcraft-cli --project /w/p.ecproj set A b c --expression x",
      "effectcraft-cli mcp", "effectcraft-cli bench --comp A", "effectcraft-cli --bridge 1 run",
    ]) assert.ok(callProblems(bad).length > 0, bad);
    for (const good of ["filmcraft-cli --data-dir /w/d --save-as /w/p.fcproj run /w/a.jsonl", "filmcraft-cli --project /w/p.fcproj inspect sequence", "effectcraft-cli --empty --json --save-as /w/p.ecproj run --commands /w/m.json", "effectcraft-cli --project /w/p.ecproj --save set Title title transform/opacity 0 --time 0"]) {
      assert.deepEqual(callProblems(good), [], good);
    }
  });
  test("--save is a switch in filmcraft-cli and effectcraft-cli, and a path in solidcraft-cli and cadcraft-cli", () => {
    assert.deepEqual(outsidePaths(`filmcraft-cli --project ${dir}/p.fcproj --save run ${dir}/a.jsonl`, undefined, dir), []);
    assert.deepEqual(outsidePaths(`effectcraft-cli --project ${dir}/p.ecproj --save set A b c`, undefined, dir), []);
    assert.ok(outsidePaths(`solidcraft-cli run ${dir}/a.json --save model.sc`, undefined, dir).length > 0);
  });
  test("a relative --project, --data-dir or --commands is flagged, and an absolute one under the output directory is not", () => {
    for (const flag of ["--project", "--data-dir", "--commands"]) {
      assert.ok(outsidePaths(`filmcraft-cli ${flag} p.fcproj run`, undefined, dir).length > 0, flag);
      assert.ok(outsidePaths(`filmcraft-cli ${flag} /elsewhere/p run`, undefined, dir).length > 0, flag);
      assert.deepEqual(outsidePaths(`filmcraft-cli ${flag} ${dir}/p run`, undefined, dir), [], flag);
    }
  });
  test("a cadcraft-cli run with two --export is flagged, and one is not", () => {
    assert.ok(callProblems(`cadcraft-cli run --export ${dir}/a.pdf --export ${dir}/a.svg`).some((p) => /one --export/.test(p)));
    assert.deepEqual(callProblems(`cadcraft-cli run --export ${dir}/a.pdf`), []);
  });
  test("a root flag on solidcraft-cli or cadcraft-cli is flagged", () => {
    assert.ok(callProblems("solidcraft-cli run a.json --automation-write-root x").length > 0);
    assert.ok(callProblems("cadcraft-cli run --automation-read-root x").length > 0);
  });

  const script = (camera) => [{ command: "file.export_view_dxf", params: { camera, path: `${dir}/p.dxf` } }];
  const camera = { target: [6000, 4000, 0], yaw: 0, pitch: PLAN_PITCH, distance: 30000, fov: 0 };
  test("a plan DXF without fov 0, or without the straight-down pitch, or without a camera, is flagged", () => {
    assert.deepEqual(viewDxfProblems(script(camera)), []);
    assert.ok(viewDxfProblems(script({ ...camera, fov: 60 })).length > 0);
    const { fov, ...noFov } = camera;
    assert.ok(viewDxfProblems(script(noFov)).length > 0);
    assert.ok(viewDxfProblems(script({ ...camera, pitch: 1.5707 })).length > 0);
    assert.ok(viewDxfProblems([{ command: "file.export_view_dxf", params: {} }]).length > 0);
    assert.deepEqual(viewDxfProblems([{ command: "solid.box", params: {} }]), []);
  });
  test("a solid step with name only is flagged, and one with body_name passes", () => {
    assert.ok(bodyNameProblems([{ command: "solid.box", params: { name: "slab" } }])[0].includes("name names the feature"));
    assert.ok(bodyNameProblems([{ command: "solid.box", params: {} }]).length > 0);
    assert.deepEqual(bodyNameProblems([{ command: "file.new", params: { name: "p" } }, { command: "solid.box", params: { body_name: "slab" } }]), []);
  });
  test("figures: footprint, height, the sum of the bodies and what is counted twice", () => {
    const body = (name, min, max, volume, closed = true) => ({ name, bbox: { min, max }, volume_mm3: volume, closed });
    const measure = {
      bodies: [
        body("slab", [0, 0, 0], [12000, 8000, 300], 28.8e9),
        body("wall-west", [0, 0, 300], [200, 8000, 3300], 4.8e9),
        body("wall-south", [0, 0, 300], [12000, 200, 3300], 7.2e9),
        body("roof-plane", [-500, -500, 3300], [12500, 8500, 3450], 17.55e9),
      ],
    };
    assert.deepEqual(figures(measure), { footprint: [12000, 8000], height: 3450, sumOfBodies: 58.35e9, overlaps: 120e6, allClosed: true });
    assert.equal(figures({ bodies: [body("a", [0, 0, 0], [1, 1, 1], 1, false)] }).allClosed, false);
  });
});

// ---- the shipped skills obey the rules ----

describe("the examples in the massing, plans, shots, storyboard and motion skills", () => {
  const fences = (file, lang) => [...readFileSync(join(here, "..", file), "utf8").matchAll(new RegExp("^```" + lang + "\\n([\\s\\S]*?)^```", "gm"))].map((m) => m[1]);
  test("every script in the massing skill names its bodies with body_name and every plan view has a parallel camera", () => {
    const scripts = fences("skills/tools/massing/SKILL.md", "json").map((t) => JSON.parse(t)).filter(Array.isArray);
    assert.ok(scripts.length > 0, "the massing skill shows a script");
    for (const script of scripts) {
      assert.deepEqual(bodyNameProblems(script), []);
      assert.deepEqual(viewDxfProblems(script), []);
      assert.deepEqual(scriptPaths(script, "/project/study"), []);
    }
    assert.ok(scripts.some((s) => s.some((x) => x.command === "file.export_view_dxf")), "the plan view is shown");
  });
  // Each skill has its own output directory in its examples.
  const OUT_OF = { massing: "/project/study", plans: "/project/study", shots: "/project/film", storyboard: "/project/film", motion: "/project/motion" };
  test("every command line in the massing, plans, shots, storyboard and motion skills passes the call rules, and every path is absolute under the output directory", () => {
    for (const [name, outDir] of Object.entries(OUT_OF)) {
      const file = `skills/tools/${name}/SKILL.md`;
      const lines = fences(file, "sh").flatMap((t) => t.replace(/\\\n\s*/g, " ").split("\n")).filter((l) => /-cli/.test(l));
      assert.ok(lines.length > 0, file);
      for (const line of lines) {
        assert.deepEqual(callProblems(line.replace(/^timeout \d+ (?:env (?:[A-Z_]+=\S+ )+)?/, "")), [], line);
        assert.deepEqual(outsidePaths(line, undefined, outDir), [], line);
      }
    }
  });
  test("every FilmCraft script the shots and storyboard skills show is JSON lines with no path outside the output directory, and every figcraft step list is well-formed", () => {
    for (const name of ["shots", "storyboard"]) {
      const blocks = fences(`skills/tools/${name}/SKILL.md`, "json");
      assert.ok(blocks.length > 0, name);
      for (const block of blocks) {
        const values = block.trim().startsWith("[") ? [JSON.parse(block)] : block.trim().split("\n").map((l) => JSON.parse(l));
        for (const value of values) assert.deepEqual(scriptPaths(value, "/project/film"), [], name);
      }
    }
    const lines = fences("skills/tools/shots/SKILL.md", "json").flatMap((b) => b.trim().split("\n")).map((l) => JSON.parse(l));
    for (const line of lines) assert.ok(typeof line.id === "string" && line.params, "an id and its params");
    assert.ok(lines.some((l) => l.id === "markers.add" && /; /.test(l.params.comment)), "a marker comment holds the angle and the movement");
  });
  test("the motion skill's command list builds a composition and a text layer, and it runs no script", () => {
    const list = JSON.parse(fences("skills/tools/motion/SKILL.md", "json")[0]);
    assert.deepEqual(list.map((c) => c.command), ["comp.new", "layer.newText"]);
    assert.deepEqual(motionProblems(JSON.stringify(list)), []);
    assert.deepEqual(setProblems(fences("skills/tools/motion/SKILL.md", "sh").flatMap((t) => t.split("\n"))), []);
  });
});

// ---- the run: every call goes through `timeout 20`, with the settings and data directories under the temporary directory ----

const env = {
  ...process.env,
  XDG_DATA_HOME: join(work, "xdg", "data"),
  XDG_CONFIG_HOME: join(work, "xdg", "config"),
  XDG_CACHE_HOME: join(work, "xdg", "cache"),
  CADCRAFT_CONFIG_DIR: join(out, "cfg"),
};
function run(args, { cwd = work, seconds = 20 } = {}) {
  assert.deepEqual(callProblems(args), [], args.join(" "));
  assert.deepEqual(outsidePaths(args, undefined, work), [], args.join(" "));
  const r = spawnSync("timeout", [String(seconds), ...args], { cwd, encoding: "utf8", env });
  assert.notEqual(r.status, 124, `timed out: ${args.join(" ")}`);
  return r;
}
const roots = ["--automation-read-root", work, "--automation-write-root", out];
// The native file is named in two pieces so a scan for the window apps' names finds only real calls.
const native = join(out, `hero.fig${"craft"}`);
const heroPng = join(out, "hero.png");
const heroPdf = join(out, "hero.pdf");
const markSvg = join(out, "mark.svg");

const pngSize = (file) => {
  const b = readFileSync(file);
  assert.equal(b.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", `${file} is not a PNG`);
  assert.equal(b.toString("latin1", 12, 16), "IHDR");
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
};

// Enough of an XML parser to tell a well-formed SVG: tags nest and close.
function wellFormed(xml) {
  const stack = [];
  for (const m of xml.replace(/<\?[\s\S]*?\?>|<!--[\s\S]*?-->/g, "").matchAll(/<(\/?)([\w:.-]+)[^>]*?(\/?)>/g)) {
    if (m[3]) continue;
    if (m[1]) {
      if (stack.pop() !== m[2]) return false;
    } else stack.push(m[2]);
  }
  return stack.length === 0;
}

hand("figcraft-cli runs a steps file, renders a 600 by 300 PNG and exports a PDF", ["figcraft-cli"], () => {
  const steps = [
    { command: "frame.create", params: { x: 0, y: 0, width: 600, height: 300, name: "hero", props: { fill: "#1f4e79" } } },
    { command: "text.create", params: { text: "Hello", x: 40, y: 40, props: { fontSize: 32, fill: "#ffffff" } } },
  ];
  writeFileSync(join(work, "steps.json"), JSON.stringify(steps));
  const made = run(["figcraft-cli", "run", "steps.json", "--out", native, "--no-system-fonts", ...roots]);
  assert.equal(made.status, 0, made.stderr);
  const lines = made.stdout.split("\n").filter((l) => l.startsWith("{")).map((l) => JSON.parse(l));
  assert.equal(lines.length, 2);
  assert.ok(lines.every((l) => l.ok === true), made.stdout);

  const rendered = run(["figcraft-cli", "render", native, "-o", heroPng, "--no-system-fonts", ...roots]);
  assert.equal(rendered.status, 0, rendered.stderr);
  assert.deepEqual(pngSize(heroPng), { width: 600, height: 300 });

  const exported = run(["figcraft-cli", "export", native, "-o", heroPdf, "--format", "pdf", "--no-system-fonts", ...roots]);
  assert.equal(exported.status, 0, exported.stderr);
  assert.equal(readFileSync(heroPdf).subarray(0, 5).toString(), "%PDF-");
});

hand("figcraft-cli exports one PNG per top-level frame into an assets directory", ["figcraft-cli"], () => {
  const assets = join(out, "assets");
  mkdirSync(assets);
  const exported = run(["figcraft-cli", "export", native, "-o", `${assets}/`, "--format", "png", "--no-system-fonts", ...roots]);
  assert.equal(exported.status, 0, exported.stderr);
  assert.deepEqual(pngSize(join(assets, "hero.png")), { width: 600, height: 300 });
});

hand("vectorcraft-cli run writes an SVG with a viewBox, to an absolute path, with no root flag", ["vectorcraft-cli"], () => {
  const rect = { x: 32, y: 32, width: 192, height: 192, radius: 24 };
  const args = [
    "vectorcraft-cli", "run",
    "--cmd", "file.new", "--params", JSON.stringify({ width: 256, height: 256, units: "Pixels", backgroundContents: "white" }),
    "--cmd", "shape.rectangle", "--params", JSON.stringify(rect),
    "--export", markSvg,
  ];
  assert.ok(!args.some((a) => a.startsWith("--automation")), "a root flag would reach vectorcraft-cli run");
  const made = run(args);
  assert.equal(made.status, 0, made.stderr);
  const svg = readFileSync(markSvg, "utf8");
  assert.match(svg, /<svg\b[^>]*\sviewBox="[^"]+"/);
  assert.ok(wellFormed(svg), "the SVG is not well-formed XML");
  assert.ok(svg.length <= 20 * 1024);
  const info = run(["vectorcraft-cli", "info", markSvg]);
  assert.equal(info.status, 0, info.stderr);
});

hand("vectorcraft-cli run traces a picture into the token colours and simplifies it (run 29)", ["vectorcraft-cli"], () => {
  // A yellow disc over a blue band on white: the shape of a picture the owner picked.
  const w = 200, h = 200, field = groundCanvas(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const disc = (x - 100) ** 2 + (y - 90) ** 2 < 50 ** 2, band = y >= 120 && y < 160 && x >= 30 && x < 170;
    const [r, g, b] = band ? [1, 66, 155] : disc ? [253, 195, 12] : [255, 255, 255];
    field.rgba.set([r, g, b, 255], (y * w + x) * 4);
  }
  const picture = join(out, "picture.png"), traced = join(out, "traced.svg"), simple = join(out, "simple.svg"), steps = join(out, "trace.json"), simplify = join(out, "simplify.json");
  writeFileSync(picture, groundPng(w, h, field.rgba));
  writeFileSync(steps, JSON.stringify([
    { command: "select.all", params: {} },
    { command: "imageTrace.makeAndExpand", params: { params: { mode: "logo", logoColors: ["#01429B", "#FDC30C"], ignoreWhite: true, noise: 40 } } },
  ]));
  writeFileSync(simplify, JSON.stringify([{ command: "select.all", params: {} }, { command: "object.path.simplify", params: { auto: true } }]));
  const made = run(["vectorcraft-cli", "run", "--in", picture, "--commands", steps, "--export", traced], { seconds: 60 });
  assert.equal(made.status, 0, made.stderr);
  const svg = readFileSync(traced, "utf8");
  assert.match(svg, /<svg\b[^>]*\sviewBox="[^"]+"/);
  assert.ok(wellFormed(svg), "the traced SVG is not well-formed XML");
  const fills = new Set([...svg.matchAll(/fill="(#[0-9a-fA-F]{6})"/g)].map((m) => m[1].toUpperCase()));
  assert.ok(fills.has("#01429B") && fills.has("#FDC30C"), `the trace keeps the token colours, got ${[...fills]}`);
  assert.ok(!fills.has("#FFFFFF"), "the white ground is left out");
  const again = run(["vectorcraft-cli", "run", "--in", traced, "--commands", simplify, "--export", simple]);
  assert.equal(again.status, 0, again.stderr);
  assert.ok(wellFormed(readFileSync(simple, "utf8")), "the simplified SVG is not well-formed XML");
  const info = run(["vectorcraft-cli", "info", simple]);
  assert.equal(info.status, 0, info.stderr);
  assert.deepEqual(JSON.parse(info.stdout).warnings, [], "info reports an import warning");
});

hand("pdfcraft-cli checks the PDF as ok, audits it and renders a page", ["figcraft-cli", "pdfcraft-cli"], () => {
  const checked = run(["pdfcraft-cli", "check", heroPdf, "--json", join(out, "check.json")]);
  assert.equal(checked.status, 0, checked.stderr);
  const [row] = JSON.parse(readFileSync(join(out, "check.json"), "utf8"));
  assert.equal(row.status, "ok");
  assert.equal(row.pages, 1);
  assert.equal(run(["pdfcraft-cli", "info", heroPdf]).status, 0);
  assert.equal(run(["pdfcraft-cli", "audit", heroPdf]).status, 0);
  const page = join(out, "page.png");
  assert.equal(run(["pdfcraft-cli", "render", heroPdf, "--page", "1", "--dpi", "72", "--out", page]).status, 0);
  assert.deepEqual(pngSize(page), { width: 600, height: 300 });
});

hand("the tells that read a render run for real on the FigCraft render", ["figcraft-cli"], () => {
  const dimension = (value) => ({ $type: "dimension", $value: { value, unit: "px" } });
  writeFileSync(
    join(work, "brand.tokens"),
    JSON.stringify({ grid: { columns: { $type: "number", $value: 12 }, gutter: dimension(16), margin: dimension(24) }, type: { base: dimension(16), "step-1": dimension(20) } }),
  );
  writeFileSync(
    join(work, "brief.md"),
    "## Audience\n\nCustomers.\n\n## Job\n\nSay hello.\n\n## Tone\n\nPlain.\n\n## Must not look like\n\nA template.\n\n## Surface\n\nWeb page\n\n## Intake\n\nnot answered\n\n## Idea\n\nHello.\n\nTwo words: say hello\n\n## Insight\n\nPeople want to know the account is ready.\n\n## Story\n\nStory: none. Reason: a one-line page has one beat.\n\n## Research\n\nnone for this check\n\n## References\n\n- V1: Grid.\n- W2: Contrast.\n- C3: Support tables.\n",
  );
  writeFileSync(join(work, "piece.html"), "<!doctype html><html><head><style>p{font-size:16px;color:#111827;background:#ffffff}</style></head><body><h1>Hello</h1><p>Your account is ready.</p></body></html>");
  const args = [process.execPath, CHECK, "tells", "piece.html", "--brief", "brief.md", "--brand", "brand.tokens", "--render", heroPng];
  const r = spawnSync("timeout", ["20", ...args], { cwd: work, encoding: "utf8", env });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(r.stdout.split("\n")[0], "PASS: no tells");
  const onlyRender = run([...args, "--only", "T4,T17,T18,T20"]);
  assert.equal(onlyRender.status, 0, onlyRender.stdout);
  const noRender = run(args.slice(0, -2));
  assert.equal(noRender.status, 3);
  assert.match(noRender.stdout, /^FAIL: could not run T4, T17, T18, T20 \(no render given\)/);
});

// ---- massing: SolidCraft (spec MAS1 to MAS7), run 2026-11-07 on solidcraft-cli 0.30.1 ----

const study = join(out, "study");
mkdirSync(study);
const SCRIPT = [
  { command: "file.new", params: { name: "pavilion" } },
  { command: "solid.box", params: { length: 12000, width: 8000, height: 300, corner: [0, 0, 0], body_name: "slab" } },
  { command: "solid.box", params: { length: 200, width: 8000, height: 3000, corner: [0, 0, 300], body_name: "wall-west" } },
  { command: "solid.box", params: { length: 12000, width: 200, height: 3000, corner: [0, 0, 300], body_name: "wall-south" } },
  { command: "solid.box", params: { length: 13000, width: 9000, height: 150, corner: [-500, -500, 3300], body_name: "roof-plane" } },
  { command: "inspect.measure", params: {} },
];
const PLAN_STEP = (path) => ({ command: "file.export_view_dxf", params: { camera: { target: [6000, 4000, 0], yaw: 0, pitch: PLAN_PITCH, distance: 30000, fov: 0 }, path } });

hand("solidcraft-cli run writes a STEP file and a model, and the same script gives the same total in a fresh directory (MAS1, MAS3)", ["solidcraft-cli"], () => {
  assert.deepEqual(bodyNameProblems(SCRIPT), []);
  const make = (dir) => {
    mkdirSync(dir, { recursive: true });
    const script = join(dir, "massing.json");
    writeFileSync(script, JSON.stringify(SCRIPT));
    const made = run(["solidcraft-cli", "run", script, "--results", "--out", join(dir, "massing.step"), "--save", join(dir, "massing.sc"), "--json-out", join(dir, "run.json")]);
    assert.equal(made.status, 0, made.stderr);
    assert.equal(readFileSync(join(dir, "massing.step"), "utf8").slice(0, 13), "ISO-10303-21;");
    const measured = run(["solidcraft-cli", "eval", join(dir, "massing.sc"), "--json-out", join(dir, "massing.measure.json")]);
    assert.equal(measured.status, 0, measured.stderr);
    return JSON.parse(readFileSync(join(dir, "massing.measure.json"), "utf8"));
  };
  const first = make(join(study, "one"));
  const second = make(join(study, "two"));
  assert.equal(first.total.volume_mm3, second.total.volume_mm3);
  assert.equal(first.total.volume_mm3, 58350000000);
});

hand("solidcraft-cli eval reports every body closed, named for what it is, and the figures a hand-over states (MAS2, MAS4)", ["solidcraft-cli"], () => {
  const measure = JSON.parse(readFileSync(join(study, "one", "massing.measure.json"), "utf8"));
  assert.deepEqual(measure.bodies.map((b) => b.name), ["slab", "wall-west", "wall-south", "roof-plane"]);
  const f = figures(measure);
  assert.equal(f.allClosed, true);
  assert.deepEqual(f.footprint, [12000, 8000]);
  assert.equal(f.height, 3450);
  assert.equal(f.sumOfBodies, 58350000000);
  assert.equal(f.sumOfBodies, measure.total.volume_mm3, "the hand-over's volume is eval's total, labelled as a sum of bodies");
  assert.equal(f.overlaps, 120000000, "the west and south walls overlap by 200 by 200 by 3000 mm and are counted twice");
});

hand("solidcraft-cli snapshot writes an 800 by 500 PNG (MAS5)", ["solidcraft-cli"], () => {
  const png = join(study, "one", "massing-iso.png");
  const made = run(["solidcraft-cli", "snapshot", join(study, "one", "massing.sc"), "--out", png, "--view", "iso", "--width", "800", "--height", "500"]);
  assert.equal(made.status, 0, made.stderr);
  assert.deepEqual(pngSize(png), { width: 800, height: 500 });
});

hand("a plan DXF from solidcraft-cli needs fov 0, and cadcraft-cli info opens it; fov 60 is refused (MAS6)", ["solidcraft-cli", "cadcraft-cli"], () => {
  const dxf = join(study, "one", "massing-plan.dxf");
  const withPlan = (path, fov) => {
    const step = PLAN_STEP(path);
    step.params.camera.fov = fov;
    return [...SCRIPT.slice(0, -1), step];
  };
  assert.deepEqual(viewDxfProblems(withPlan(dxf, 0)), []);
  const good = join(study, "one", "plan-script.json");
  writeFileSync(good, JSON.stringify(withPlan(dxf, 0)));
  assert.deepEqual(scriptPaths(readFileSync(good, "utf8"), study), []);
  const made = run(["solidcraft-cli", "run", good, "--out", join(study, "one", "plan.step")]);
  assert.equal(made.status, 0, made.stderr);
  const info = run(["cadcraft-cli", "info", dxf]);
  assert.equal(info.status, 0, info.stderr);
  assert.ok(JSON.parse(info.stdout).counts.Line >= 1, "the DXF holds the roof outline");

  assert.ok(viewDxfProblems(withPlan(dxf, 60)).length > 0, "the rule refuses fov 60 before it is run");
  const bad = join(study, "one", "plan-bad.json");
  writeFileSync(bad, JSON.stringify(withPlan(join(study, "one", "bad.dxf"), 60)));
  const refused = run(["solidcraft-cli", "run", bad, "--out", join(study, "one", "bad.step")]);
  assert.notEqual(refused.status, 0);
  assert.match(refused.stderr + refused.stdout, /invalid camera/);
});

// ---- plans: CADCraft (spec PLN1 to PLN8), run 2026-11-07 on cadcraft-cli 0.18.0 ----

const sheet = join(out, "sheet");
mkdirSync(sheet);
const STUDY_LINE = "This is a design study, not an engineered design. It has no structural calculation and no code check.";
const cmd = (id, params) => ["--cmd", `${id} ${JSON.stringify(params)}`];
const PLAN_COMMANDS = [
  ...cmd("units", { lunits: 2, luprec: 0 }),
  ...cmd("layer.new", { name: "WALLS", color: "white", lineweight: 0.5 }),
  ...cmd("layer.new", { name: "DIMS", color: "cyan" }),
  ...cmd("layer.new", { name: "NOTES", color: "green" }),
  ...cmd("layer.set", { name: "WALLS", current: true }),
  ...cmd("rectang", { p1: [0, 0], p2: [12000, 8000] }),
  ...cmd("layer.set", { name: "DIMS", current: true }),
  ...cmd("dimstyle", { name: "Standard", current: true, DIMSCALE: 1, DIMTXT: 350, DIMASZ: 250, DIMEXE: 150, DIMEXO: 100, DIMDEC: 0 }),
  ...cmd("dimlinear", { p1: [0, 0], p2: [12000, 0], at: [6000, -1500] }),
  ...cmd("dimlinear", { p1: [0, 0], p2: [0, 8000], at: [-1500, 4000] }),
  ...cmd("layer.set", { name: "NOTES", current: true }),
  ...cmd("text", { at: [6000, 4000], text: "HALL", height: 300, justify: "MC" }),
  ...cmd("text", { at: [0, -3000], text: STUDY_LINE, height: 200, justify: "BL" }),
];

hand("cadcraft-cli run writes a DXF and one PDF, convert writes the SVG and the PNG, and two --export in one run are refused (PLN1)", ["cadcraft-cli"], () => {
  const dxf = join(sheet, "plan.dxf");
  const made = run(["cadcraft-cli", "run", "--metric", ...PLAN_COMMANDS, "--save", dxf, "--export", join(sheet, "plan.pdf")]);
  assert.equal(made.status, 0, made.stderr);
  assert.equal(readFileSync(join(sheet, "plan.pdf")).subarray(0, 5).toString(), "%PDF-");

  const svg = run(["cadcraft-cli", "convert", dxf, join(sheet, "plan.svg")]);
  assert.equal(svg.status, 0, svg.stderr);
  assert.match(readFileSync(join(sheet, "plan.svg"), "utf8"), /<svg\b[^>]*viewBox=/);
  const png = run(["cadcraft-cli", "convert", dxf, join(sheet, "plan.png")]);
  assert.equal(png.status, 0, png.stderr);
  assert.deepEqual(pngSize(join(sheet, "plan.png")), { width: 2400, height: 1600 });

  // The rule refuses it before it is run, and the app refuses it too.
  const twice = ["cadcraft-cli", "run", "--metric", "--export", join(sheet, "a.pdf"), "--export", join(sheet, "a.svg")];
  assert.ok(callProblems(twice).length > 0);
  const refused = spawnSync("timeout", ["20", ...twice], { cwd: work, encoding: "utf8", env });
  assert.notEqual(refused.status, 0);
  assert.match(refused.stderr, /cannot be used multiple times/);
});

hand("cadcraft-cli info lists the layers, the unit, the dimensions and the design-study line (PLN2, PLN3, PLN4, PLN7)", ["cadcraft-cli"], () => {
  const info = JSON.parse(run(["cadcraft-cli", "info", join(sheet, "plan.dxf")]).stdout);
  const layers = info.layers.map((l) => l.name);
  for (const name of ["WALLS", "DIMS", "NOTES"]) assert.ok(layers.includes(name), `no layer ${name}`);
  assert.ok(info.counts.Dimension >= 2, "both overall dimensions are drawn");
  assert.ok(info.counts.Text >= 2, "the label and the design-study line are text entities");
  // The unit is in the command that made the drawing: metric, lunits 2 (decimal), no decimals shown.
  assert.ok(PLAN_COMMANDS.includes('units {"lunits":2,"luprec":0}'));
  assert.ok(PLAN_COMMANDS.some((w) => w.startsWith("dimstyle ") && /DIMSCALE/.test(w) && /DIMTXT/.test(w)), "a dimstyle with a scale and a text height is in the saved command");
  assert.ok(PLAN_COMMANDS.some((w) => w.includes("not an engineered design")), "the design-study line is on the sheet");
});

hand("pdfcraft-cli checks the plan PDF as ok (PLN5)", ["cadcraft-cli", "pdfcraft-cli"], () => {
  const checked = run(["pdfcraft-cli", "check", join(sheet, "plan.pdf")]);
  assert.equal(checked.status, 0, checked.stderr);
  assert.match(checked.stdout + checked.stderr, /checked 1 files: \{"ok": 1\}/);
});

hand("lightcraft-cli answers --version and runs one headless command on the demo library, writing no file (ARTCRAFT.md, run 17)", ["lightcraft-cli"], () => {
  const before = readdirSync(work, { recursive: true }).length;
  assert.match(run(["lightcraft-cli", "--version"]).stdout, /^lightcraft-cli 0\.19\.0\b/);
  const listed = run(["lightcraft-cli", "run", "--demo", "engine.commands"]);
  assert.equal(listed.status, 0, listed.stderr);
  const [line] = listed.stdout.trim().split("\n");
  const result = JSON.parse(line);
  assert.equal(result.command, "engine.commands");
  assert.equal(result.ok, true);
  assert.ok(Array.isArray(result.result) && result.result.length > 100, "the command list is long");
  assert.equal(readdirSync(work, { recursive: true }).length, before, "no file was written");
});

// The pixel at (x, y) of an 8-bit RGB or RGBA PNG that is not interlaced, which is what headless Chrome writes.
function pixel(file, x, y) {
  const b = readFileSync(file);
  const { width } = pngSize(file);
  assert.equal(b[24], 8, "8 bits");
  assert.ok(b[25] === 2 || b[25] === 6, "RGB or RGBA");
  assert.equal(b[28], 0, "not interlaced");
  const bpp = b[25] === 2 ? 3 : 4;
  const idat = [];
  for (let at = 8; at < b.length; ) {
    const length = b.readUInt32BE(at);
    if (b.toString("latin1", at + 4, at + 8) === "IDAT") idat.push(b.subarray(at + 8, at + 8 + length));
    at += 12 + length;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * bpp;
  let prev = Buffer.alloc(stride);
  for (let row = 0; row <= y; row += 1) {
    const filter = raw[row * (stride + 1)];
    const line = Buffer.from(raw.subarray(row * (stride + 1) + 1, (row + 1) * (stride + 1)));
    for (let i = 0; i < stride; i += 1) {
      const a = i >= bpp ? line[i - bpp] : 0;
      const up = prev[i];
      const c = i >= bpp ? prev[i - bpp] : 0;
      const guess = [0, a, up, (a + up) >> 1, (() => { const p = a + up - c; const pa = Math.abs(p - a), pb = Math.abs(p - up), pc = Math.abs(p - c); return pa <= pb && pa <= pc ? a : pb <= pc ? up : c; })()][filter];
      line[i] = (line[i] + guess) & 255;
    }
    if (row === y) return [...line.subarray(x * bpp, x * bpp + 3)];
    prev = line;
  }
}

// P4: the email skill's render call, run on an email taller than one screen, shows the whole of it at both widths.
hand(`the email skill's headless ${BROWSER} render shows an email 3,000 px tall to its last row at 640 and at 375 px wide`, [BROWSER], () => {
  const skill = readFileSync(join(here, "..", "skills", "tools", "email", "SKILL.md"), "utf8");
  const lines = skill.split("\n").filter((l) => l.startsWith(`timeout 60 ${BROWSER} `));
  assert.equal(lines.length, 2, "one call per width");
  const mail = join(out, "tall-email.html");
  const rows = Array.from({ length: 30 }, (_, i) => `<tr><td style="height:100px;background:${i === 29 ? "#ff0000" : "#dddddd"}"></td></tr>`).join("");
  writeFileSync(mail, `<!doctype html><html><body style="margin:0"><table width="300" style="width:300px;border-collapse:collapse">${rows}</table></body></html>`);
  for (const [width, line] of [[640, lines[0]], [375, lines[1]]]) {
    const png = join(out, `tall-${width}.png`);
    mkdirSync(join(out, "firefox"), { recursive: true });
    const call = line
      .replace(/--user-data-dir=\S+/, `--user-data-dir=${join(out, "chrome")}`)
      .replace(/--profile \S+/, `--profile ${join(out, "firefox")}`)
      .replace(/--screenshot[= ]\S+/, (m) => `--screenshot${m[12]}${png}`)
      .replace(/file:\/\/\S+/, `file://${mail}`);
    assert.match(call, new RegExp(`--window-size=${width},\\d+`));
    // The browser is not an ArtCraft app: its calls run under timeout 60, which the skill's lines state and the test repeats.
    const made = run(call.replace(/^timeout 60 /, "").split(" "), { seconds: 60 });
    assert.equal(made.status, 0, made.stderr);
    const size = pngSize(png);
    assert.equal(size.width, width);
    assert.ok(size.height > 3000, `${width}: the window is ${size.height} px, not taller than the email`);
    assert.deepEqual(pixel(png, 10, 2999), [255, 0, 0], `${width}: the last row of the email is in the render`);
    assert.deepEqual(pixel(png, 10, 3100), [255, 255, 255], `${width}: the page ground follows it`);
  }
});

// ground: the ASCII tile is SVG text drawn to a PNG by a headless browser under `timeout 60`, as the email skill does for HTML.
hand(`the ground tool draws an ASCII tile to a PNG of the field's size with ${BROWSER}, in the two colours, and a second run gives the same bytes`, [BROWSER], () => {
  const tool = join(here, "..", "skills", "tools", "ground", "ground.mjs"), dir = join(out, "ground");
  mkdirSync(dir);
  const colour = (h, c) => ({ $value: { colorSpace: "srgb", components: c, hex: h } });
  writeFileSync(join(dir, "t.tokens"), JSON.stringify({ semantic: { color: { ink: colour("#0b2a44", [0.043, 0.165, 0.267]), paper: colour("#f4e8d0", [0.957, 0.91, 0.816]) } } }));
  const field = groundCanvas(240, 160);
  for (let y = 0; y < 160; y++) for (let x = 0; x < 240; x++) field.rgba.set([(x * 255) / 239, (x * 255) / 239, (x * 255) / 239, 255], (y * 240 + x) * 4);
  writeFileSync(join(dir, "field.png"), groundPng(240, 160, field.rgba));
  const make = (name) => spawnSync(process.execPath, [tool, "ascii", "--tokens", "t.tokens", "--in", "field.png", "--bg", "semantic.color.ink", "--fg", "semantic.color.paper", "--cell", "12", "--out", name], { cwd: dir, encoding: "utf8", timeout: 70000 });
  const a = make("a.png"), b = make("b.png");
  assert.equal(a.status, 0, a.stderr);
  assert.equal(b.status, 0, b.stderr);
  assert.deepEqual(pngSize(join(dir, "a.png")), { width: 240, height: 160 });
  assert.deepEqual(pixel(join(dir, "a.png"), 1, 1), [11, 42, 68], "the corner is the ground colour");
  let light = 0;
  for (let y = 8; y < 32; y++) for (let x = 0; x < 240; x++) if (pixel(join(dir, "a.png"), x, y)[0] > 150) light++;
  assert.ok(light > 30, `the first row of text is drawn in the second colour (${light} light pixels)`);
  assert.ok(readFileSync(join(dir, "a.png")).equals(readFileSync(join(dir, "b.png"))), "same input, same bytes");
});

hand("the run leaves nothing outside the temporary directory: the settings directory is the output directory's (PLN8)", ["cadcraft-cli"], () => {
  assert.ok(underDir(env.CADCRAFT_CONFIG_DIR, out));
  assert.ok([env.XDG_DATA_HOME, env.XDG_CONFIG_HOME, env.XDG_CACHE_HOME].every((d) => underDir(d, work)));
});

// ---- shots, storyboard and motion: FilmCraft, FigCraft and EffectCraft (spec SHO, STO, MOT), run 2026-11-07 ----
// filmcraft-cli 0.18.0, effectcraft-cli 0.22.0 and figcraft-cli 0.16.0, each under `timeout 20`, with the data directories under the temporary directory.

const FILM = join(out, "film");
mkdirSync(join(FILM, "data"), { recursive: true });
const skillBlock = (name, lang, at = 0) => [...readFileSync(join(here, "..", "skills", "tools", name, "SKILL.md"), "utf8").matchAll(new RegExp("^```" + lang + "\\n([\\s\\S]*?)^```", "gm"))].map((m) => m[1])[at];
// The shot list the skill shows is the one the run uses.
const sampleShots = () => parseShots(skillBlock("shots", "md"));
const printed = (r) => r.stdout.split("\n").filter((l) => l.startsWith("{")).map((l) => JSON.parse(l));
const film = (...args) => run(["filmcraft-cli", "--data-dir", join(FILM, "data"), ...args]);
const gifSize = (file) => {
  const b = readFileSync(file);
  assert.equal(b.toString("latin1", 0, 3), "GIF", `${file} is not a GIF`);
  return { width: b.readUInt16LE(6), height: b.readUInt16LE(8) };
};
const script = (shots, lines) => {
  const text = jsonl(lines);
  for (const line of text.trim().split("\n")) assert.deepEqual(scriptPaths(line, work), [], line);
  return text;
};

const shotsProject = join(FILM, "shots.fcproj");
const shotsEdl = join(FILM, "shots.edl");

hand("filmcraft-cli makes a sequence and a placeholder matte, places it, marks every shot, and exports an EDL with one LOC line per row (SHO3)", ["filmcraft-cli"], () => {
  const shots = sampleShots();
  assert.deepEqual(shotProblems(shots), []);
  assert.equal(totalSeconds(shots), 21);
  const base = join(FILM, "shots-base.jsonl");
  writeFileSync(base, script(shots, baseLines(shots)));
  const made = film("--save-as", shotsProject, "run", base);
  assert.equal(made.status, 0, made.stdout + made.stderr);
  const [seq, matte] = printed(made);
  assert.ok(seq.ok && matte.ok, made.stdout);
  const item = matte.result.item; // read from the printed line, never assumed

  const file = join(FILM, "shots.jsonl");
  writeFileSync(file, script(shots, shotLines(shots, { item, edl: shotsEdl, otio: join(FILM, "shots.otio") })));
  const placed = film("--project", shotsProject, "--save", "run", file);
  assert.equal(placed.status, 0, placed.stdout + placed.stderr);
  const results = printed(placed);
  assert.equal(results.length, 1 + 6 + 2);
  assert.ok(results.every((l) => l.ok === true), placed.stdout);
  assert.deepEqual(edlLocs(readFileSync(shotsEdl, "utf8")), markerPlan(shots).map((m) => m.name));
  assert.ok(readFileSync(join(FILM, "shots.otio")).length > 0, "the OTIO file is written (its markers are not read)");
});

hand("the project's markers equal the table: the comment holds the angle and the movement, and the start is the sum of the lengths before it (SHO4)", ["filmcraft-cli"], () => {
  const shots = sampleShots();
  const sequence = JSON.parse(film("--project", shotsProject, "inspect", "sequence").stdout);
  assert.deepEqual(shotMarkers(sequence), markerPlan(shots));
  assert.deepEqual(markerPlan(shots).map((m) => m.seconds), [0, 4, 9, 12, 16, 19]);
});

hand("a frame renders at the start of each shot, exits 0 and so has no offline media (SHO5)", ["filmcraft-cli"], () => {
  mkdirSync(join(FILM, "frames"), { recursive: true });
  for (const [i, m] of markerPlan(sampleShots()).entries()) {
    const png = join(FILM, "frames", `f${String(i + 1).padStart(2, "0")}.png`);
    const r = film("--project", shotsProject, "render", "--seconds", String(m.seconds), "--out", png);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.deepEqual(pngSize(png), { width: 1920, height: 1080 });
  }
});

hand("an empty sequence exports an EDL with no marker, which is why the markers sit on a placeholder matte (SHO3)", ["filmcraft-cli"], () => {
  const dir = join(FILM, "empty");
  mkdirSync(join(dir, "data"), { recursive: true });
  const edl = join(dir, "empty.edl");
  const lines = [
    { id: "file.newSequence", params: { name: "Empty", width: 1920, height: 1080, fps: 24 } },
    { id: "markers.add", params: { seconds: 0, name: "S01 ELS", comment: "objective, high; static" } },
    { id: "file.exportEdl", params: { path: edl } },
  ];
  writeFileSync(join(dir, "empty.jsonl"), script(undefined, lines));
  const r = run(["filmcraft-cli", "--data-dir", join(dir, "data"), "--save-as", join(dir, "empty.fcproj"), "run", join(dir, "empty.jsonl")]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.deepEqual(edlLocs(readFileSync(edl, "utf8")), []);
});

hand("figcraft-cli makes one frame per shot at the ratio, FilmCraft holds each still for the table's length, and a duration with items is refused (STO1 to STO5)", ["figcraft-cli", "filmcraft-cli"], () => {
  const shots = sampleShots();
  const { steps, frameIds } = boardSteps(shots);
  assert.deepEqual(boardProblems(shots, steps), []);
  const board = join(FILM, "storyboard.json");
  writeFileSync(board, JSON.stringify(steps));
  const doc = join(FILM, "storyboard.figcraft");
  const made = run(["figcraft-cli", "run", board, "--out", doc, "--no-system-fonts", ...roots]);
  assert.equal(made.status, 0, made.stdout + made.stderr);
  const results = printed(made);
  assert.ok(results.every((l) => l.ok === true), made.stdout);
  const frameResults = results.filter((l, i) => steps[i].command === "frame.create").map((l) => l.result.id);
  assert.deepEqual(frameResults, frameIds, "the predicted ids are the ids the app handed out");

  const frames = join(FILM, "board-frames");
  mkdirSync(frames, { recursive: true });
  const exported = run(["figcraft-cli", "export", doc, "-o", `${frames}/`, "--format", "png", "--no-system-fonts", ...roots]);
  assert.equal(exported.status, 0, exported.stderr);
  const names = readdirSync(frames).sort();
  assert.deepEqual(names, ["S01.png", "S02.png", "S03.png", "S04.png", "S05.png", "S06.png"]);
  for (const name of names) assert.deepEqual(pngSize(join(frames, name)), { width: 960, height: 540 }, name);
  const contrast = spawnSync("timeout", ["20", process.execPath, CHECK, "contrast", "#111827", "#e9edf2", "--min", "4.5"], { encoding: "utf8", env });
  assert.equal(contrast.status, 0, contrast.stdout);

  const sb = join(FILM, "storyboard.fcproj");
  const imported = film("--save-as", sb, "import", ...names.map((n) => join(frames, n)));
  assert.equal(imported.status, 0, imported.stdout + imported.stderr);
  const { items, errors } = JSON.parse(imported.stdout);
  assert.deepEqual(errors, []);
  assert.equal(items.length, 6);

  const gif = join(FILM, "animatic.gif");
  const animatic = join(FILM, "animatic.jsonl");
  writeFileSync(animatic, script(shots, animaticLines(shots, items, { gif })));
  const played = film("--project", sb, "--save-as", join(FILM, "animatic.fcproj"), "run", animatic);
  assert.equal(played.status, 0, played.stdout + played.stderr);
  const exportLine = printed(played).find((l) => l.id === "file.exportMedia");
  assert.equal(exportLine.result.result.frames, 21 * 24, "the animatic is as long as the table");
  assert.deepEqual(exportLine.result.offlineMedia, []);
  assert.deepEqual(gifSize(gif), { width: 480, height: 270 });

  const sequence = JSON.parse(film("--project", join(FILM, "animatic.fcproj"), "inspect", "sequence", "--compact").stdout);
  assert.deepEqual(clipFrames(sequence), expectedFrames(shots));
  assert.deepEqual(clipFrames(sequence), [96, 120, 72, 96, 72, 48]);

  // A duration with items is refused, so the skill places one still at a time.
  const bad = join(FILM, "bad.jsonl");
  writeFileSync(bad, script(shots, [{ id: "file.newSequence", params: { name: "B", width: 960, height: 540, fps: 24 } }, { id: "timeline.place", params: { items: [items[0], items[1]], track: "V1", seconds: 0, duration: { seconds: 2 } } }]));
  const refused = film("--project", sb, "run", bad);
  assert.notEqual(refused.status, 0);
  assert.match(refused.stdout + refused.stderr, /no `sourceIn` or `duration` with `items`/);
});

const MOTION = join(out, "motion");
mkdirSync(MOTION, { recursive: true });
const ec = (...args) => run(["effectcraft-cli", ...args]);
const proj = join(MOTION, "motion.ecproj");

hand("effectcraft-cli builds the composition from a command list, and every set that carries --save keeps its key (MOT1)", ["effectcraft-cli"], () => {
  const list = join(MOTION, "motion.json");
  writeFileSync(list, skillBlock("motion", "json"));
  assert.deepEqual(motionProblems(readFileSync(list, "utf8")), []);
  const made = ec("--empty", "--json", "--save-as", proj, "run", "--commands", list);
  assert.equal(made.status, 0, made.stdout + made.stderr);
  assert.ok(readFileSync(proj).length > 0);
  for (const [value, time] of [["0", "0"], ["100", "1"]]) {
    const set = ec("--project", proj, "--save", "set", "Title", "title", "transform/opacity", value, "--time", time);
    assert.equal(set.status, 0, set.stdout + set.stderr);
  }
  const got = JSON.parse(ec("--project", proj, "get", "Title", "title", "transform/opacity", "--time", "0.5").stdout);
  assert.equal(got.keys.length, 2, "get at the midpoint returns two keys");
  assert.deepEqual(got.keys.map((k) => [k.compTime, k.value]), [[0, 0], [1, 100]]);
  assert.equal(got.value, 50);
});

hand("a set with no --save is lost when the process ends (MOT1)", ["effectcraft-cli"], () => {
  const copy = join(MOTION, "copy.ecproj");
  writeFileSync(copy, readFileSync(proj));
  assert.equal(ec("--project", copy, "set", "Title", "title", "transform/opacity", "42", "--time", "0").status, 0);
  const got = JSON.parse(ec("--project", copy, "get", "Title", "title", "transform/opacity", "--time", "0").stdout);
  assert.equal(got.value, 0, "the key set without --save did not reach the file");
});

hand("effectcraft-cli writes the poster at the composition's size and a GIF, and leaves its lock file beside the project (MOT2)", ["effectcraft-cli"], () => {
  const poster = join(MOTION, "poster.png");
  const r = ec("--project", proj, "render-frame", "--comp", "Title", "--time", "1.5", "--out", poster);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.deepEqual(pngSize(poster), { width: 960, height: 540 });
  const gif = join(MOTION, "motion.gif");
  const g = ec("--project", proj, "render", "--comp", "Title", "--out", gif, "--format", "gif", "--resolution", "half");
  assert.equal(g.status, 0, g.stdout + g.stderr);
  assert.deepEqual(gifSize(gif), { width: 480, height: 270 });
  assert.match(g.stdout + g.stderr, /48 frames/);
  assert.ok(readdirSync(MOTION).includes(".motion.ecproj.lock"), "the lock file is a side file the hand-over lists");
});

hand("the poster's text pair passes the contrast check with --min (MOT4)", ["effectcraft-cli"], () => {
  const list = JSON.parse(skillBlock("motion", "json"));
  const background = list[0].params.background;
  const fill = list[1].params.fill;
  const check = spawnSync("timeout", ["20", process.execPath, CHECK, "contrast", fill, background, "--min", "4.5"], { encoding: "utf8", env });
  assert.equal(check.status, 0, check.stdout);
  const fails = spawnSync("timeout", ["20", process.execPath, CHECK, "contrast", "#777777", "#888888", "--min", "4.5"], { encoding: "utf8", env });
  assert.notEqual(fails.status, 0, "a failing pair stops the run");
});

// ---- develop: LightCraft (spec DEV1 to DEV7), run 2026-11-07 on lightcraft-cli 0.19.0 ----
//
// LightCraft acts after capture. A job renders one file (`render`) or opens a library inside the output directory,
// imports the source photograph and exports (`run`). The source is read and never written. The app does not refuse an
// out-of-range value (it clamps it), so the job checks every value against `develop.controls` before the run (DEV3).
import { createHash } from "node:crypto";
import { crc32, deflateSync } from "node:zlib";

// A few controls from `lightcraft-cli run --demo develop.controls` (lightcraft-cli 0.19.0, 2026-11-07). The test against the
// real catalogue below fails when one of these drifts.
const LIGHT_CATALOGUE = [
  { id: "wb.temp", min: 2000, max: 50000 },
  { id: "wb.tint", min: -150, max: 150 },
  { id: "light.exposure", min: -5, max: 5 },
  { id: "light.contrast", min: -100, max: 100 },
  { id: "light.highlights", min: -100, max: 100 },
  { id: "light.shadows", min: -100, max: 100 },
  { id: "light.whites", min: -100, max: 100 },
  { id: "light.blacks", min: -100, max: 100 },
  { id: "curve.highlights", min: -100, max: 100 },
  { id: "curve.lights", min: -100, max: 100 },
  { id: "curve.darks", min: -100, max: 100 },
  { id: "curve.shadows", min: -100, max: 100 },
  { id: "color.vibrance", min: -100, max: 100 },
  { id: "color.saturation", min: -100, max: 100 },
  { id: "crop.angle", min: -45, max: 45 },
];

// What is wrong with the values a job sets, against the catalogue: an unknown control, a value that is not a number, or one outside min and max.
function controlProblems(catalogue, sets) {
  const byId = new Map(catalogue.map((c) => [c.id, c]));
  return sets.flatMap(([id, raw]) => {
    const control = byId.get(id);
    if (!control) return [`${id}: not a control of develop.controls`];
    const value = typeof raw === "number" ? raw : raw === "" ? NaN : Number(raw);
    if (!Number.isFinite(value)) return [`${id}: "${raw}" is not a number`];
    if (value < control.min || value > control.max) return [`${id}: ${value} is outside ${control.min} to ${control.max}`];
    return [];
  });
}

// The controls a command sets: `--set C=V` on render, and `develop.set control=C value=V` on run.
function setsOf(command) {
  const argv = words(command);
  const sets = [];
  argv.forEach((word, i) => {
    if (word === "--set" && argv[i + 1]) {
      const [id, ...value] = argv[i + 1].split("=");
      sets.push([id, value.join("=")]);
    }
    if (word === "crop.straighten") {
      const angle = /^angle=(.*)$/.exec(argv[i + 1] ?? "");
      sets.push(["crop.angle", angle ? angle[1] : ""]);
    }
    if (word === "develop.set") {
      const pairs = {};
      for (const next of argv.slice(i + 1)) {
        const m = /^(control|value)=(.*)$/.exec(next);
        if (!m) break;
        pairs[m[1]] = m[2];
      }
      sets.push([pairs.control ?? "", pairs.value ?? ""]);
    }
  });
  return sets;
}

// The files a lightcraft-cli command writes, each with the long edge it asks for: a render has one, a library run has one per app.export.
function outputsOf(command) {
  const argv = words(command);
  const at = argv.indexOf("lightcraft-cli");
  if (at < 0) return [];
  if (argv[at + 1] === "render") return [[argv[argv.indexOf("-o") + 1], argv.includes("--size") ? Number(argv[argv.indexOf("--size") + 1]) : undefined]];
  const found = [];
  argv.forEach((w, i) => {
    if (w !== "app.export") return;
    const next = argv.indexOf("app.export", i + 1);
    const own = argv.slice(i + 1, next < 0 ? undefined : next);
    const path = own.find((x) => x.startsWith("path="))?.slice(5);
    const edge = own.find((x) => /^longEdge=\d+$/.test(x));
    found.push([path, edge ? Number(edge.slice(9)) : undefined]);
  });
  return found;
}

// What is wrong with one lightcraft-cli command line: the call, the paths and the options. Empty means it follows ARTCRAFT.md.
function lightcraftProblems(command, outDir) {
  const argv = words(command);
  const at = argv.indexOf("lightcraft-cli");
  if (at < 0) return [];
  const sub = argv[at + 1];
  const problems = callProblems(argv.slice(at));
  if (argv[0] !== "timeout") problems.push("the call does not run under timeout");
  if (!["render", "run"].includes(sub)) problems.push(`lightcraft-cli ${sub} is not used`);
  for (const bad of ["mcp", "--connect", "--bridge", "--allow-any-path", "--allow-path"]) if (argv.includes(bad)) problems.push(`${bad} is not used`);
  for (const name of ["XDG_DATA_HOME", "XDG_CONFIG_HOME", "XDG_CACHE_HOME"]) {
    const set = argv.slice(0, at).find((w) => w.startsWith(`${name}=`));
    if (!set) problems.push(`${name} is not set under the output directory`);
    else if (!underDir(set.slice(name.length + 1), outDir)) problems.push(`${set}: outside ${outDir}`);
  }
  if (argv.some((w) => w === "format=original" || w === '"format":"original"')) problems.push("format=original writes a copy and a sidecar");
  const under = (label, value) => {
    if (value === undefined) problems.push(`${label} has no value`);
    else if (!isAbsolute(value)) problems.push(`${label} ${value}: not an absolute path`);
    else if (!underDir(value, outDir)) problems.push(`${label} ${value}: outside ${outDir}`);
  };
  const absolute = (label, value) => {
    if (value === undefined) problems.push(`${label} has no value`);
    else if (!isAbsolute(value)) problems.push(`${label} ${value}: not an absolute path`);
  };
  const after = (flag) => argv[argv.indexOf(flag) + 1];
  if (sub === "render") {
    absolute("the input", argv[at + 2]);
    under("-o", after("-o"));
    if (!argv.includes("--size")) problems.push("render has no --size, so the output is the full size of the source");
  }
  if (sub === "run") {
    if (argv.includes("--library")) under("--library", after("--library"));
    else problems.push("run has no --library inside the output directory");
    argv.forEach((w, i) => {
      if (w === "--import") absolute("--import", argv[i + 1]);
      const m = /^path=(.*)$/.exec(w);
      if (m) under("path=", m[1]);
    });
    for (const [path, edge] of outputsOf(command)) if (edge === undefined) problems.push(`the export to ${path ?? "an unnamed path"} has no longEdge, so it writes at the app's default size`);
  }
  return problems;
}

describe("develop: the control check, on fixtures (DEV3)", () => {
  test("a value inside min and max passes, and the ends pass", () => {
    assert.deepEqual(controlProblems(LIGHT_CATALOGUE, [["light.exposure", 0.5], ["light.exposure", "-5"], ["wb.temp", "6500"], ["wb.temp", 50000]]), []);
  });
  test("an unknown control is refused", () => {
    assert.deepEqual(controlProblems(LIGHT_CATALOGUE, [["light.nope", 1]]), ["light.nope: not a control of develop.controls"]);
  });
  test("a value below min or above max is refused, because the app would clamp it without an error", () => {
    assert.deepEqual(controlProblems(LIGHT_CATALOGUE, [["light.exposure", 9]]), ["light.exposure: 9 is outside -5 to 5"]);
    assert.deepEqual(controlProblems(LIGHT_CATALOGUE, [["wb.temp", 1999]]), ["wb.temp: 1999 is outside 2000 to 50000"]);
  });
  test("a value that is not a number, or is empty, is refused", () => {
    assert.equal(controlProblems(LIGHT_CATALOGUE, [["light.exposure", "warm"]]).length, 1);
    assert.equal(controlProblems(LIGHT_CATALOGUE, [["light.exposure", ""]]).length, 1);
  });
  test("a straighten angle is checked against crop.angle, so a turn past 45 degrees is refused", () => {
    assert.deepEqual(setsOf("lightcraft-cli run crop.straighten angle=1.5"), [["crop.angle", "1.5"]]);
    assert.deepEqual(controlProblems(LIGHT_CATALOGUE, setsOf("lightcraft-cli run crop.straighten angle=60")), ["crop.angle: 60 is outside -45 to 45"]);
  });
  test("setsOf reads --set on render and develop.set on run", () => {
    assert.deepEqual(setsOf("lightcraft-cli render a.jpg -o b.jpg --set light.exposure=0.5 --set wb.temp=5600"), [["light.exposure", "0.5"], ["wb.temp", "5600"]]);
    assert.deepEqual(setsOf("lightcraft-cli run develop.auto develop.set control=light.exposure value=-0.3 app.export path=/x.jpg"), [["light.exposure", "-0.3"]]);
  });
});

describe("develop: the call rules, on fixtures (DEV1, DEV2, DEV4, DEV7)", () => {
  const O = "/project/study";
  const XDG = `XDG_DATA_HOME=${O}/xdg/data XDG_CONFIG_HOME=${O}/xdg/config XDG_CACHE_HOME=${O}/xdg/cache`;
  const render = `timeout 20 env ${XDG} lightcraft-cli render /photos/a.jpg -o ${O}/developed.jpg --set light.exposure=0.5 --size 1600 --quality 90`;
  const library = `timeout 20 env ${XDG} lightcraft-cli run --library ${O}/library --import /photos/a.jpg develop.auto develop.set control=light.exposure value=0.5 app.export path=${O}/developed.jpg longEdge=1600`;
  test("outputsOf reads the long edge of each export, so a preview and a full-size export in one run are judged apart", () => {
    assert.deepEqual(outputsOf("lightcraft-cli run app.export path=/a.jpg longEdge=3000 app.export path=/b.png longEdge=1600"), [["/a.jpg", 3000], ["/b.png", 1600]]);
    assert.deepEqual(outputsOf("lightcraft-cli render /i.jpg -o /o.png --size 800"), [["/o.png", 800]]);
    assert.deepEqual(outputsOf("lightcraft-cli run app.export path=/a.jpg longEdge=3000 app.export path=/b.png"), [["/a.jpg", 3000], ["/b.png", undefined]]);
  });
  test("a second export with no longEdge is refused even when the first has one", () => {
    assert.ok(lightcraftProblems(`${library} app.export path=${O}/preview.png`, O).some((p) => /preview\.png has no longEdge/.test(p)));
  });
  test("a render and a library run that follow the rules pass, and the source may be anywhere because it is only read", () => {
    assert.deepEqual(lightcraftProblems(render, O), []);
    assert.deepEqual(lightcraftProblems(library, O), []);
  });
  test("a relative or outside output is refused", () => {
    assert.ok(lightcraftProblems(render.replace(`-o ${O}/developed.jpg`, "-o developed.jpg"), O).some((p) => /not an absolute path/.test(p)));
    assert.ok(lightcraftProblems(render.replace(`-o ${O}/developed.jpg`, "-o /tmp/developed.jpg"), O).some((p) => /outside/.test(p)));
    assert.ok(lightcraftProblems(library.replace(`path=${O}/developed.jpg`, "path=/tmp/developed.jpg"), O).some((p) => /outside/.test(p)));
  });
  test("a library outside the output directory, or none, is refused", () => {
    assert.ok(lightcraftProblems(library.replace(`--library ${O}/library`, "--library /home/owner/Library"), O).some((p) => /outside/.test(p)));
    assert.ok(lightcraftProblems(library.replace(`--library ${O}/library `, ""), O).some((p) => /no --library/.test(p)));
  });
  test("merge, snapshot, denoise-serve, mcp, --connect and the other subcommands are refused", () => {
    for (const sub of ["merge", "snapshot", "denoise-serve", "synth-merge", "commands"]) assert.ok(lightcraftProblems(render.replace("render", sub), O).length > 0, sub);
    assert.ok(lightcraftProblems(`${library} --connect`, O).some((p) => /--connect/.test(p)));
    assert.ok(lightcraftProblems(library.replace("run --library", "mcp --library"), O).length > 0);
  });
  test("format=original, a render with no --size and an export with no longEdge are refused", () => {
    assert.ok(lightcraftProblems(`${library} format=original`, O).some((p) => /format=original/.test(p)));
    assert.ok(lightcraftProblems(render.replace("--size 1600 ", ""), O).some((p) => /--size/.test(p)));
    assert.ok(lightcraftProblems(library.replace(" longEdge=1600", ""), O).some((p) => /longEdge/.test(p)));
  });
  test("a call with no timeout, or with the settings directories not set under the output directory, is refused", () => {
    assert.ok(lightcraftProblems(render.replace("timeout 20 ", ""), O).length > 0);
    assert.ok(lightcraftProblems(render.replace(`XDG_CACHE_HOME=${O}/xdg/cache`, "XDG_CACHE_HOME=/home/owner/.cache"), O).some((p) => /outside/.test(p)));
    assert.ok(lightcraftProblems(render.replace(` XDG_CONFIG_HOME=${O}/xdg/config`, ""), O).some((p) => /XDG_CONFIG_HOME/.test(p)));
  });
  test("the launcher and the window app are refused", () => {
    assert.ok(callProblems("lightcraft --control 7980").length > 0);
    assert.ok(callProblems("artcraft-launcher --help").length > 0);
  });
});

describe("the examples in the develop skill", () => {
  const skill = readFileSync(join(here, "..", "skills", "tools", "develop", "SKILL.md"), "utf8");
  const fences = [...skill.matchAll(/^```[^\n]*\n([\s\S]*?)^```/gm)].map((m) => m[1]);
  const lines = fences.flatMap((t) => t.replace(/\\\n\s*/g, " ").split("\n")).filter((l) => /lightcraft-cli/.test(l));
  test("there is a render, a preview render and a library run", () => {
    assert.ok(lines.some((l) => /lightcraft-cli render/.test(l) && /\.jpg/.test(l)), "a render to JPG");
    assert.ok(lines.some((l) => /lightcraft-cli render/.test(l) && /\.png/.test(l)), "a render to PNG for critique");
    assert.ok(lines.some((l) => /lightcraft-cli run/.test(l) && /--library/.test(l) && outputsOf(l).some(([p]) => /\.jpg$/.test(p)) && outputsOf(l).some(([p]) => /\.png$/.test(p))), "a library run that exports the JPG and the PNG preview");
    assert.ok(lines.some((l) => /lightcraft-cli run --demo develop\.controls/.test(l)), "the catalogue");
  });
  test("every command line follows the rules, every control is in the catalogue and inside min and max, and a preview is at most 2000 pixels", () => {
    for (const line of lines) {
      if (/--demo/.test(line)) {
        assert.deepEqual(callProblems(line.replace(/^timeout \d+ (?:env (?:[A-Z_]+=\S+ )+)?/, "")), [], line);
        continue;
      }
      assert.deepEqual(lightcraftProblems(line, "/project/study"), [], line);
      assert.deepEqual(controlProblems(LIGHT_CATALOGUE, setsOf(line)), [], line);
      for (const [path, edge] of outputsOf(line)) if (/\.png$/.test(path)) assert.ok(edge <= 2000, `${line}: a preview over 2000 pixels`);
    }
  });
});

// ---- the run ----

// A flat grey PNG, 8 bit RGB, made here so no fixture file lives in the repo and no photograph of anyone is needed.
function greyPng(width, height, level) {
  const chunk = (type, data) => {
    const head = Buffer.alloc(4);
    head.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, "latin1"), data]);
    const tail = Buffer.alloc(4);
    tail.writeUInt32BE(crc32(body));
    return Buffer.concat([head, body, tail]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(width * 3, level)]);
  const raw = Buffer.concat(Array.from({ length: height }, () => row));
  return Buffer.concat([Buffer.from("89504e470d0a1a0a", "hex"), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

// The mean red, green and blue of an 8 bit PNG of colour type 2 or 6.
function pngMean(file) {
  const b = readFileSync(file);
  let pos = 8;
  let ihdr;
  const idat = [];
  while (pos < b.length) {
    const n = b.readUInt32BE(pos);
    const type = b.toString("latin1", pos + 4, pos + 8);
    const body = b.subarray(pos + 8, pos + 8 + n);
    if (type === "IHDR") ihdr = { width: body.readUInt32BE(0), height: body.readUInt32BE(4), depth: body[8], colour: body[9] };
    if (type === "IDAT") idat.push(body);
    pos += 12 + n;
  }
  assert.equal(ihdr.depth, 8, "an 8 bit PNG");
  assert.ok([2, 6].includes(ihdr.colour), "an RGB or RGBA PNG");
  const bpp = ihdr.colour === 2 ? 3 : 4;
  const stride = ihdr.width * bpp;
  const raw = inflateSync(Buffer.concat(idat));
  let prev = Buffer.alloc(stride);
  const sum = [0, 0, 0];
  for (let y = 0; y < ihdr.height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = Buffer.from(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)));
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? line[x - bpp] : 0;
      const up = prev[x];
      const c = x >= bpp ? prev[x - bpp] : 0;
      let add = 0;
      if (filter === 1) add = a;
      else if (filter === 2) add = up;
      else if (filter === 3) add = (a + up) >> 1;
      else if (filter === 4) {
        const p = a + up - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - c);
        add = pa <= pb && pa <= pc ? a : pb <= pc ? up : c;
      }
      line[x] = (line[x] + add) & 255;
    }
    for (let x = 0; x < stride; x += bpp) for (let k = 0; k < 3; k++) sum[k] += line[x + k];
    prev = line;
  }
  return sum.map((v) => v / (ihdr.width * ihdr.height));
}

// The size a JPEG says it is, from its start-of-frame marker.
function jpegSize(file) {
  const b = readFileSync(file);
  assert.equal(b.subarray(0, 2).toString("hex"), "ffd8", `${file} is not a JPEG`);
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) {
      i++;
      continue;
    }
    const marker = b[i + 1];
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return { width: b.readUInt16BE(i + 7), height: b.readUInt16BE(i + 5) };
    i += 2 + b.readUInt16BE(i + 2);
  }
  assert.fail("no frame header in the JPEG");
}
const sha = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");
const jsonLines = (text) => text.split("\n").filter((l) => l.startsWith("{")).map((l) => JSON.parse(l));

const photoDir = join(out, "photo");
mkdirSync(photoDir);
const source = join(photoDir, "source.png");
writeFileSync(source, greyPng(640, 360, 128));
const sourceHash = sha(source);

hand("lightcraft-cli lists its controls with an id, min, max, default and section (V18, DEV3)", ["lightcraft-cli"], () => {
  const r = run(["lightcraft-cli", "run", "--demo", "develop.controls"]);
  assert.equal(r.status, 0, r.stderr);
  const [line] = jsonLines(r.stdout);
  assert.equal(line.ok, true);
  const catalogue = line.result;
  assert.ok(catalogue.length >= 100, `${catalogue.length} controls`);
  for (const c of catalogue) for (const key of ["id", "min", "max", "default", "section"]) assert.ok(key in c, `${c.id ?? "a control"} has no ${key}`);
  for (const known of LIGHT_CATALOGUE) {
    const live = catalogue.find((c) => c.id === known.id);
    assert.ok(live, `${known.id} is no longer a control`);
    assert.deepEqual({ min: live.min, max: live.max }, { min: known.min, max: known.max }, known.id);
  }
});

hand("lightcraft-cli render writes a JPEG of the stated long edge and never touches the source (V16, DEV1, DEV4)", ["lightcraft-cli"], () => {
  const developed = join(photoDir, "developed.jpg");
  const r = run(["lightcraft-cli", "render", source, "-o", developed, "--set", "light.exposure=0.5", "--set", "wb.temp=6500", "--size", "320", "--quality", "90"]);
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(jpegSize(developed), { width: 320, height: 180 });
  assert.notEqual(developed, source);
  assert.equal(sha(source), sourceHash, "the source photograph changed");
  assert.deepEqual(readdirSync(photoDir).filter((f) => /\.xmp$/i.test(f)), [], "a sidecar beside the source");
  assert.ok(readFileSync(developed).includes("LightCraft"), "the file names the app that made it");
});

hand("lightcraft-cli render writes a PNG preview of the stated long edge, which critique can take (DEV6)", ["lightcraft-cli"], () => {
  const preview = join(photoDir, "preview.png");
  const r = run(["lightcraft-cli", "render", source, "-o", preview, "--size", "320"]);
  assert.equal(r.status, 0, r.stderr);
  const size = pngSize(preview);
  assert.equal(Math.max(size.width, size.height), 320);
  assert.ok(Math.max(size.width, size.height) <= 2000);
});

hand("an unknown control is refused by the app, and an out-of-range value is not: it is clamped without an error (DEV3)", ["lightcraft-cli"], () => {
  const unknown = run(["lightcraft-cli", "render", source, "-o", join(photoDir, "unknown.jpg"), "--set", "light.nope=1", "--size", "64"]);
  assert.notEqual(unknown.status, 0);
  assert.match(unknown.stderr, /unknown control/);
  const library = join(photoDir, "library-clamp");
  const clamped = run(["lightcraft-cli", "run", "--library", library, "--import", source, "develop.set", "control=light.exposure", "value=9", "develop.get"]);
  assert.equal(clamped.status, 0, clamped.stderr);
  const get = jsonLines(clamped.stdout).find((l) => l.command === "develop.get");
  assert.equal(get.result.light.exposure, 5, "the app clamps 9 to the top of the range and says nothing");
  assert.deepEqual(controlProblems(LIGHT_CATALOGUE, [["light.exposure", 9]]), ["light.exposure: 9 is outside -5 to 5"], "so the job's own check refuses it first");
});

hand("the library flow imports, develops and exports with every line ok, writes only inside the output directory, and leaves the source alone (V17, DEV2, DEV4)", ["lightcraft-cli"], () => {
  const library = join(photoDir, "library");
  const exported = join(photoDir, "lib-out.jpg");
  const r = run(["lightcraft-cli", "run", "--library", library, "--import", source, "develop.auto", "develop.set", "control=light.exposure", "value=0.5", "app.export", `path=${exported}`, "longEdge=320", "app.export", `path=${join(photoDir, "lib-preview.png")}`, "longEdge=160"]);
  assert.equal(r.status, 0, r.stderr);
  const lines = jsonLines(r.stdout);
  assert.equal(lines.length, 4);
  assert.deepEqual(pngSize(join(photoDir, "lib-preview.png")), { width: 160, height: 90 }, "a second export in the same run, to a PNG by its extension");
  assert.ok(lines.every((l) => l.ok === true), r.stdout);
  const written = lines.find((l) => l.command === "app.export").result;
  assert.equal(Math.max(written.width, written.height), 320);
  assert.deepEqual(written.sidecars, []);
  assert.deepEqual(jpegSize(exported), { width: 320, height: 180 });
  const side = readdirSync(library);
  for (const f of ["catalog.lock", "catalog.snap", "view.json"]) assert.ok(side.includes(f), `the library has no ${f}`);
  assert.equal(sha(source), sourceHash, "the source photograph changed");
  assert.deepEqual(readdirSync(photoDir).filter((f) => /\.xmp$/i.test(f)), [], "--import wrote a sidecar beside the source");
});

hand("crop.set sets the shape of the export, in fractions of the frame, and crop.straighten takes an angle in degrees (V17, DEV8)", ["lightcraft-cli"], () => {
  const exported = join(photoDir, "cropped.jpg");
  const r = run(["lightcraft-cli", "run", "--library", join(photoDir, "library-crop"), "--import", source, "crop.set", "rect=[0,0,0.5,1]", "crop.straighten", "angle=0", "app.export", `path=${exported}`, "longEdge=360"]);
  assert.equal(r.status, 0, r.stderr);
  assert.ok(jsonLines(r.stdout).every((l) => l.ok === true), r.stdout);
  assert.deepEqual(jpegSize(exported), { width: 320, height: 360 }, "half the width of a 640 by 360 source, the whole height");
  assert.equal(sha(source), sourceHash);
});

hand("develop.auto after develop.set replaces the set, so the job runs develop.auto first and the manual sets after it (V17)", ["lightcraft-cli"], () => {
  const exposureAfter = (name, steps) => {
    const r = run(["lightcraft-cli", "run", "--library", join(photoDir, name), "--import", source, ...steps, "develop.get"]);
    assert.equal(r.status, 0, r.stderr);
    const lines = jsonLines(r.stdout);
    return { exposure: lines.find((l) => l.command === "develop.get").result.light.exposure, auto: lines.find((l) => l.command === "develop.auto")?.result };
  };
  const setThenAuto = exposureAfter("library-set-auto", ["develop.set", "control=light.exposure", "value=-0.5", "develop.auto"]);
  assert.equal(setThenAuto.exposure, setThenAuto.auto.exposure, "develop.auto replaced the earlier set");
  assert.notEqual(setThenAuto.exposure, -0.5);
  const autoThenSet = exposureAfter("library-auto-set", ["develop.auto", "develop.set", "control=light.exposure", "value=-0.5"]);
  assert.equal(autoThenSet.exposure, -0.5, "the manual set after develop.auto holds");
});

hand("a higher wb.temp warms the picture and a lower one cools it: red rises and blue falls as the value goes up", ["lightcraft-cli"], () => {
  const mean = (temp) => {
    const file = join(photoDir, `temp-${temp}.png`);
    const r = run(["lightcraft-cli", "render", source, "-o", file, "--set", `wb.temp=${temp}`, "--size", "64"]);
    assert.equal(r.status, 0, r.stderr);
    return pngMean(file);
  };
  const cool = mean(3000);
  const warm = mean(9000);
  assert.ok(warm[0] > cool[0], `red: ${cool[0]} at 3000, ${warm[0]} at 9000`);
  assert.ok(warm[2] < cool[2], `blue: ${cool[2]} at 3000, ${warm[2]} at 9000`);
});

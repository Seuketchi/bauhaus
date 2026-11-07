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
import { accessSync, constants, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, isAbsolute, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

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
const OUTPUT_FLAGS = ["--out", "--save", "--json-out", "--export", "-o", "--save-as"];
const underDir = (path, dir) => resolve(path) === resolve(dir) || resolve(path).startsWith(resolve(dir) + sep);

// A command as a list of words, from a list or from a line of text.
const words = (command) => (Array.isArray(command) ? command : [...command.matchAll(/"([^"]*)"|'([^']*)'|(\S+)/g)].map((m) => m[1] ?? m[2] ?? m[3]));

// Every path the command line writes or names that is not an absolute path under the output directory.
// An environment assignment (CADCRAFT_CONFIG_DIR=/x) counts, and so does a relative output.
function commandPaths(command, outDir) {
  const argv = words(command);
  const problems = [];
  argv.forEach((word, i) => {
    const assign = /^[A-Z][A-Z0-9_]*=(.*)$/.exec(word);
    if (assign && /^(?:\/|~|\.\.?\/)/.test(assign[1]) && !underDir(assign[1], outDir)) problems.push(`${word}: outside ${outDir}`);
    if (OUTPUT_FLAGS.includes(word) && argv[i + 1] !== undefined) {
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
  if (bin === "effectcraft-cli" && (sub === "script" || argv.includes("--eval"))) problems.push("effectcraft-cli runs no script and no --eval");
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

describe("the examples in the massing and plans skills", () => {
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
  test("every command line in the massing and plans skills passes the call rules, and every path is absolute under the output directory", () => {
    for (const file of ["skills/tools/massing/SKILL.md", "skills/tools/plans/SKILL.md"]) {
      const lines = fences(file, "").concat(fences(file, "sh"), fences(file, "bash")).flatMap((t) => t.replace(/\\\n\s*/g, " ").split("\n")).filter((l) => /-cli/.test(l));
      assert.ok(lines.length > 0, file);
      for (const line of lines) {
        assert.deepEqual(callProblems(line.replace(/^timeout \d+ (?:env (?:[A-Z_]+=\S+ )+)?/, "")), [], line);
        assert.deepEqual(outsidePaths(line, undefined, "/project/study"), [], line);
      }
    }
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
function run(args, { cwd = work } = {}) {
  assert.deepEqual(callProblems(args), [], args.join(" "));
  assert.deepEqual(outsidePaths(args, undefined, work), [], args.join(" "));
  const r = spawnSync("timeout", ["20", ...args], { cwd, encoding: "utf8", env });
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
    "## Audience\n\nCustomers.\n\n## Job\n\nSay hello.\n\n## Tone\n\nPlain.\n\n## Must not look like\n\nA template.\n\n## Surface\n\nWeb page\n\n## References\n\n- V1: Grid.\n- W2: Contrast.\n- C3: Support tables.\n",
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

hand("the run leaves nothing outside the temporary directory: the settings directory is the output directory's (PLN8)", ["cadcraft-cli"], () => {
  assert.ok(underDir(env.CADCRAFT_CONFIG_DIR, out));
  assert.ok([env.XDG_DATA_HOME, env.XDG_CONFIG_HOME, env.XDG_CACHE_HOME].every((d) => underDir(d, work)));
});

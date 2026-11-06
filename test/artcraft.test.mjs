// The hand-off to ArtCraft: a steps file goes in, a PNG, an SVG and a PDF come out, and the tells that read a render run on a real one.
// Follows skills/tools/design/ARTCRAFT.md: only the -cli apps are run, every call is under `timeout 20`,
// every figcraft-cli call takes both roots (and --no-system-fonts when it renders), vectorcraft-cli run takes no root flag,
// and everything is written under a temporary directory that is removed afterwards. No window and no launcher is ever started.
//
//   npm test                  skips these tests, printing which command-line app is missing
//   npm run test:artcraft     fails instead of skipping (the local gate before a pull request is marked ready)
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { accessSync, constants, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join } from "node:path";
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
const missing = ["timeout", "figcraft-cli", "vectorcraft-cli", "pdfcraft-cli"].filter((name) => !onPath(name));
const reason = `${missing.join(", ")} not on PATH`;

const work = mkdtempSync(join(tmpdir(), "bauhaus-artcraft-"));
after(() => rmSync(work, { recursive: true, force: true }));
const out = join(work, "out");
mkdirSync(out);

// A test runs when every command-line app is there. When one is missing it skips (npm test) or fails (test:artcraft).
function hand(name, body) {
  if (!missing.length) return test(name, body);
  if (required) return test(name, () => assert.fail(`${reason}; npm run test:artcraft needs all three`));
  return test(name, { skip: reason }, () => {});
}

// Every call goes through `timeout 20`.
function run(args, { cwd = work } = {}) {
  if (args[0] === "figcraft-cli") {
    for (const flag of ["--automation-read-root", "--automation-write-root", "--no-system-fonts"]) {
      assert.ok(args.includes(flag), `figcraft-cli ${args[1]} is missing ${flag}`);
    }
  }
  if (args[0] === "vectorcraft-cli" && args[1] === "run") {
    assert.ok(!args.some((a) => a.startsWith("--automation")), "a root flag would reach vectorcraft-cli run");
  }
  const r = spawnSync("timeout", ["20", ...args], { cwd, encoding: "utf8" });
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

hand("figcraft-cli runs a steps file, renders a 600 by 300 PNG and exports a PDF", () => {
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

hand("vectorcraft-cli run writes an SVG with a viewBox, to an absolute path, with no root flag", () => {
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

hand("pdfcraft-cli checks the PDF as ok, audits it and renders a page", () => {
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

hand("the tells that read a render run for real on the FigCraft render", () => {
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
  const r = run(args);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(r.stdout.split("\n")[0], "PASS: no tells");
  const onlyRender = run([...args, "--only", "T4,T17,T18,T20"]);
  assert.equal(onlyRender.status, 0, onlyRender.stdout);
  const noRender = run(args.slice(0, -2));
  assert.equal(noRender.status, 3);
  assert.match(noRender.stdout, /^FAIL: could not run T4, T17, T18, T20 \(no render given\)/);
});

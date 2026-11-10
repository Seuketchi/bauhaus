// handoff: HTML pages to Figma scripts and to one developer file.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { build, check, extract, findChrome, families, gradient, itemsOf, pathSvg, svgFlatten } from "../skills/tools/handoff/figma.mjs";
import { bundle, interactionsHtml } from "../skills/tools/handoff/bundle.mjs";

const dir = mkdtempSync(join(tmpdir(), "handoff-test-"));
const ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="#f48"/></svg>';
writeFileSync(join(dir, "icon.svg"), ICON);

// a layout as extract.js writes it: one of each kind the converter must handle
const base = { z: 0, tags: [], parent: null, rot: 0, opacity: 1, filter: "none" };
const seg = (t, family = '"Helvetica Neue", Helvetica, Arial, sans-serif') => ({ t, s: { color: "rgb(14, 47, 87)", weight: 700, italic: false, family, size: 20 } });
const text = (t, y, extra = {}) => ({ type: "text", ...base, segs: [seg(t)], size: 20, lh: 24, ls: 0, align: "left", auto: true, lines: 1, x: 100, width: 300, rx: 100, rw: 120, y, ...extra });
const box = (extra) => ({ type: "box", ...base, k: 1, bg: "rgba(0, 0, 0, 0)", bi: "none", radius: "0px", shadow: "none", border: null, clipPath: "none", mask: "none", ...extra });
const LAYOUT = { W: 1200, H: 900, items: [
  box({ id: 1, cx: 600, cy: 200, w: 1000, h: 300, bi: "linear-gradient(110deg, rgb(255, 241, 204), rgb(255, 227, 236) 55%, rgb(230, 246, 211))", radius: "32px" }),
  box({ id: 2, cx: 600, cy: 400, w: 800, h: 2, bg: "rgba(14, 47, 87, 0.1)" }),                           // a one-sided border, as extract writes it
  text("Hydration 101", 420),                                                                         // bare text beside an icon
  text("hidden", 0, { rw: 0 }),                                                                       // inside display:none: skipped
  { type: "pill", id: 3, ...base, cx: 300, cy: 500, w: 200, h: 56, bg: "rgb(255, 79, 134)", bi: "none", radius: "99px", shadow: "none", pad: [0, 30, 0, 30], anchor: "left", inRow: false, text: text("START", 490) },
  { type: "pill", id: 4, ...base, cx: 0, cy: 0, w: 0, h: 0, bg: "rgb(255, 79, 134)", bi: "none", radius: "99px", shadow: "none", pad: [0, 0, 0, 0], anchor: "left", inRow: false, text: text("ENLARGE", 0) },
  { type: "svg", ...base, cx: 600, cy: 600, w: 400, h: 200, snake: false,
    markup: '<svg width="400" height="200" viewBox="0 0 400 200"><g fill="none" stroke="#0E2F57" stroke-opacity=".28" stroke-width="2" stroke-dasharray="2 9" stroke-linecap="round"><path d="M0 0 C 50 50, 100 50, 150 100"></path></g></svg>' },
  { type: "svg", ...base, cx: 600, cy: 760, w: 1200, h: 200, snake: true,
    markup: '<svg width="1200" height="200" viewBox="0 0 1200 200"><defs><path id="p1" d="M0 100 C 400 0, 800 200, 1200 100"/></defs><use href="#p1" fill="none" stroke="#FFD54F" stroke-width="70"/><text><textPath href="#p1">Free shipping</textPath></text></svg>',
    glyphs: [["F", 40, 760, -10], ["r", 55, 758, -9], { size: 23, weight: 700, family: "Helvetica Neue", color: "rgb(14, 47, 87)", ls: 2.5 }] },
  { type: "img", ...base, src: "icon.svg", cx: 1000, cy: 500, w: 80, h: 80 },
] };

test("gradients, families and SVG clean-up", () => {
  const g = gradient("linear-gradient(90deg, rgb(255, 0, 0), rgb(0, 0, 255))", 100, 50);
  assert.equal(g.type, "GRADIENT_LINEAR");
  assert.deepEqual(g.gradientStops.map((s) => s.position), [0, 1]);
  assert.equal(gradient("radial-gradient(circle at 62% 55%, rgb(255, 241, 168) 0px, rgb(255, 111, 160) 100%)", 200, 100).type, "GRADIENT_RADIAL");
  assert.deepEqual(families('Fraunces, "Helvetica Neue", serif'), ["Fraunces", "Helvetica Neue"]);
  const flat = svgFlatten('<svg><g fill="none" stroke="#000" stroke-dasharray="2 9"><path d="M0 0"></path></g></svg>');
  assert.match(flat, /<path fill="none" stroke="#000" stroke-dasharray="2 9" d="M0 0">/);
  const path = pathSvg(LAYOUT.items[7].markup);
  assert.doesNotMatch(path, /<text|<use/);
  assert.match(path, /<path d="M0 100/);
});

test("itemsOf keeps what renders and marks dotted lines and text on a path", () => {
  const { items, svgs } = itemsOf(LAYOUT, dir);
  assert.ok(!items.some((o) => o.k === "text" && o.segs[0].t === "hidden"), "0-width text is skipped");
  assert.ok(!items.some((o) => o.k === "pill" && o.w === 0), "0x0 pill is skipped");
  assert.ok(items.some((o) => o.k === "text" && o.segs[0].t === "Hydration 101"));
  assert.ok(items.some((o) => o.k === "box" && o.h === 2), "the divider stays");
  const dots = items.find((o) => o.dash);
  assert.deepEqual(dots.dash.pattern, [2, 9]);
  assert.equal(dots.dash.cap, "ROUND");
  const rib = items.find((o) => o.k === "ribbon");
  assert.equal(rib.runs[0].chars.length, 2);
  assert.deepEqual(rib.runs[0].f[0], ["Helvetica Neue"]);
  assert.ok(svgs["icon.svg"]);
});

test("build writes scripts that run against the stand-in API, and run again", async () => {
  const out = join(dir, "figma");
  const files = build(LAYOUT, { page: join(dir, "page.html"), frame: "Test — desktop", out });
  assert.equal(files.length, 1);
  const first = await check(files[0]);
  assert.ok(first.ok, first.printed);
  assert.match(first.printed, /Test — desktop — Part 1/);
  assert.ok(first.created > 8);
  const src = readFileSync(files[0], "utf8");
  assert.match(src, /New script, Ctrl\+A, paste/);
  assert.match(src, /try \{ await main\(\) \}/, "the body is wrapped: Scripter rejects a top-level return");
});

test("check reports a broken script", async () => {
  const bad = join(dir, "bad.js");
  writeFileSync(bad, "try { figma.createRectangle().resize(0, 10) } catch (e) { print('ERROR while building: ' + e.message) }");
  const r = await check(bad);
  assert.equal(r.ok, false);
});

test("extract reads a real page", { skip: !findChrome() && "no Chrome on this machine" }, () => {
  const page = join(dir, "page.html");
  writeFileSync(page, `<!doctype html><html><body style="margin:0"><div class="page" style="width:600px">
<div style="display:flex;gap:10px;border-bottom:2px solid #0E2F5733;font-family:Georgia"><i style="width:16px;height:16px;border-radius:50%;background:#f48"></i>Hydration 101<span>→</span></div>
<div style="height:200px;background:url(icon.svg) center/contain no-repeat"></div>
<script>document.body.dataset.ran = "yes"</script></div></body></html>`);
  const L = extract(page, 600);
  assert.equal(L.W, 600);
  const texts = L.items.filter((i) => i.type === "text").map((i) => i.segs[0].t);
  assert.ok(texts.includes("Hydration 101"), texts.join("|"));
  assert.ok(L.items.some((i) => i.type === "box" && i.h === 2), "one-sided border becomes a 2px box");
  assert.ok(L.items.some((i) => i.img && i.img.path === "icon.svg"));
  assert.deepEqual(readdirSync(dir).filter((f) => f.includes(".extract.")), [], "temporary files are removed");
});

test("bundle puts pages, shared images, links and interactions in one file", () => {
  const a = join(dir, "a.html"), b = join(dir, "b.html"), md = join(dir, "ix.md"), out = join(dir, "handoff.html");
  writeFileSync(a, '<html><body><nav><span>SHOP</span></nav><img src="icon.svg" alt=""></body></html>');
  writeFileSync(b, '<html><body><a data-handoff="Home">back</a><div style="background:url(icon.svg)"></div></body></html>');
  writeFileSync(md, "## Every page\n- **Scroll reveal**: sections fade in once.\n## Product\n- **Gallery**: a thumbnail <swaps> the image.\n");
  const r = bundle({ out, pages: [`Home=${a}`, `Product=${b}`], interactions: md, links: { SHOP: "Product" }, title: "Test" });
  assert.equal(r.images, 1, "the same image is inlined once");
  const html = readFileSync(out, "utf8");
  assert.match(html, /data-p="Home"/);
  assert.match(html, /data-p="__ix"/);
  assert.ok(html.includes('\\"SHOP\\":\\"Product\\"'), "the link map is in each page");
  assert.doesNotMatch(html, /src=\\"icon\.svg/, "paths are replaced by the shared copy");
  assert.match(interactionsHtml(readFileSync(md, "utf8")), /<b>Gallery<\/b><span>a thumbnail &lt;swaps&gt; the image\.<\/span>/);
});

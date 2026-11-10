#!/usr/bin/env node
// A finished HTML page as Figma layers, through Scripter scripts the owner pastes and runs. No dependencies.
//
//   figma.mjs extract <page.html> --width <px> --out <layout.json>
//   figma.mjs build <layout.json> --page <page.html> --frame <name> --out <dir> [--max-mb 1.8] [--font-map <map.json>]
//   figma.mjs check <script.js> [<more.js> ...]
//   figma.mjs page <page.html> --width <px> --frame <name> --out <dir> [--max-mb 1.8] [--font-map <map.json>]
//
// extract renders the page in headless Chrome and reads every box, text run, SVG, image crop, clip-path and
// mask with its page position. build turns that into one or more scripts under --max-mb each, with the
// images inside them (downscaled with ffmpeg when it is on the PATH). check runs each script against a
// stand-in for the Figma plugin API and fails on any error. page does all three.
// Exit 0 when everything passed, 1 when not.

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { basename, dirname, join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { homedir, tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
class Failure extends Error {}
const fail = (m) => { throw new Failure(m); };

function parseArgs(argv) {
  const positional = [], flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) { if (i + 1 >= argv.length) fail(`${a} needs a value`); flags[a.slice(2)] = argv[++i]; }
    else positional.push(a);
  }
  return { positional, flags };
}
const need = (flags, k) => flags[k] ?? fail(`--${k} is required`);
const onPath = (bin) => spawnSync("sh", ["-c", `command -v ${bin}`]).status === 0;

// ---------------------------------------------------------------- extract
export function findChrome() {
  if (process.env.CHROME && existsSync(process.env.CHROME)) return process.env.CHROME;
  for (const b of ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "chrome-headless-shell"]) if (onPath(b)) return b;
  const pw = join(homedir(), ".cache", "ms-playwright");
  if (existsSync(pw)) for (const d of readdirSync(pw).filter((x) => x.startsWith("chromium")).sort().reverse()) {
    for (const sub of readdirSync(join(pw, d))) for (const exe of ["chrome-headless-shell", "chrome"]) {
      const p = join(pw, d, sub, exe); if (existsSync(p)) return p;
    }
  }
  return null;
}

export function extract(page, width) {
  const chrome = findChrome() ?? fail("extract needs Chrome or Chromium (headless). Set CHROME to its path. Firefox cannot dump the DOM.");
  const src = resolve(page);
  let html = readFileSync(src, "utf8");
  // the page's own scripts are left out: a reveal-on-scroll or carousel script would hide or move parts mid-capture
  html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  const tmp = join(dirname(src), `.${basename(src)}.extract.html`), tmpJs = tmp.replace(/html$/, "js");
  html = html.replace(/<\/body>/i, `<style>*{animation:none!important;transition:none!important}</style><script src="${basename(tmpJs)}"></script></body>`);
  writeFileSync(tmp, html); writeFileSync(tmpJs, readFileSync(join(here, "extract.js"), "utf8"));
  try {
    const out = execFileSync(chrome, ["--headless", "--disable-gpu", "--no-sandbox", "--allow-file-access-from-files", "--hide-scrollbars",
      `--window-size=${width},1000`, "--virtual-time-budget=60000", `--user-data-dir=${join(tmpdir(), "handoff-chrome")}`, "--dump-dom", `file://${tmp}`],
      { encoding: "utf8", maxBuffer: 1 << 28, timeout: 180000, stdio: ["ignore", "pipe", "ignore"] });
    const m = [...out.matchAll(/<pre id="__out">([\s\S]*?)<\/pre>/g)].pop() ?? fail("the page did not finish rendering; nothing was read");
    const t = m[1].replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
    if (t.startsWith("ERR")) fail(t.slice(0, 500));
    return JSON.parse(t);
  } finally { rmSync(tmp, { force: true }); rmSync(tmpJs, { force: true }); }
}

// ---------------------------------------------------------------- CSS → Figma paints
export function splitTop(s) {
  const out = []; let d = 0, cur = "";
  for (const ch of s) {
    if (ch === "(") d++;
    if (ch === ")") d--;
    if (ch === "," && d === 0) { out.push(cur.trim()); cur = ""; } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}
export function color(s) {
  const m = s.trim().match(/rgba?\(([^)]+)\)/) ?? fail(`not a colour: ${s}`);
  const v = m[1].trim().split(/[,\s/]+/).filter(Boolean).map(Number);
  return { r: v[0] / 255, g: v[1] / 255, b: v[2] / 255, a: v.length > 3 ? v[3] : 1 };
}
const length = (v, ref) => (v = v.trim(), v.endsWith("%") ? parseFloat(v) / 100 * ref : parseFloat(v));
export const solid = (c, op = 1) => { c = typeof c === "string" ? color(c) : c; return { type: "SOLID", color: { r: c.r, g: c.g, b: c.b }, opacity: c.a * op }; };

function stops(parts, L) {
  const st = parts.map((p) => {
    const m = p.match(/(rgba?\([^)]+\))\s*(.*)/); const pos = m[2].trim();
    return [color(m[1]), !pos ? null : pos.endsWith("%") ? parseFloat(pos) / 100 : parseFloat(pos) / L];
  });
  if (st[0][1] === null) st[0][1] = 0;
  if (st[st.length - 1][1] === null) st[st.length - 1][1] = 1;
  for (let i = 0; i < st.length; i++) if (st[i][1] === null) {
    let j = i; while (st[j][1] === null) j++;
    const a = st[i - 1][1], b = st[j][1];
    for (let k = i; k < j; k++) st[k][1] = a + (b - a) * (k - i + 1) / (j - i + 1);
    i = j;
  }
  return st.map(([c, p]) => ({ position: Math.max(0, Math.min(1, p)), color: c }));
}
export function gradient(g, w, h) {
  const i = g.indexOf("("), kind = g.slice(0, i), args = splitTop(g.slice(i + 1, -1));
  if (kind.endsWith("linear-gradient")) {
    let ang = 180;
    if (!args[0].startsWith("rgb")) {
      const a = args.shift();
      ang = a.endsWith("deg") ? parseFloat(a) : ({ "to right": 90, "to left": 270, "to top": 0, "to bottom": 180 })[a] ?? 180;
    }
    const t = ang * Math.PI / 180, dx = Math.sin(t), dy = -Math.cos(t), L = Math.abs(w * dx) + Math.abs(h * dy);
    const r0 = [w * dx / L, h * dy / L, .5 - (w * dx + h * dy) / (2 * L)], r1 = [-w * dy / L, h * dx / L, .5 - (-w * dy + h * dx) / (2 * L)];
    return { type: "GRADIENT_LINEAR", gradientTransform: [r0, r1], gradientStops: stops(args, L) };
  }
  let cx = w / 2, cy = h / 2, circle = false, rx = null, ry = null;
  if (!args[0].startsWith("rgb")) {
    const a = args.shift(); let pre = a;
    if (a.includes(" at ") || a.startsWith("at ")) {
      const [p, at] = a.startsWith("at ") ? ["", a.slice(3)] : a.split(" at ");
      pre = p; const [px, py] = at.split(/\s+/); cx = length(px, w); cy = length(py, h);
    }
    const toks = pre.split(/\s+/); circle = toks.includes("circle");
    const nums = toks.filter((t) => /^[\d.]+(px|%)$/.test(t));
    if (nums.length) { rx = length(nums[0], w); ry = nums[1] ? length(nums[1], h) : rx; }
  }
  if (rx === null) {
    const fx = Math.max(cx, w - cx), fy = Math.max(cy, h - cy);
    if (circle) rx = ry = Math.hypot(fx, fy); else { rx = fx * Math.SQRT2; ry = fy * Math.SQRT2; }
  }
  return { type: "GRADIENT_RADIAL", gradientTransform: [[w / (2 * rx), 0, .5 - cx / (2 * rx)], [0, h / (2 * ry), .5 - cy / (2 * ry)]], gradientStops: stops(args, rx) };
}
export function shadows(s) {
  if (!s || s === "none") return [];
  return splitTop(s).filter((p) => !p.includes("inset")).map((p) => {
    const m = p.match(/(rgba?\([^)]+\))\s+(.*)/); const n = m[2].split(/\s+/).map((x) => parseFloat(x)); while (n.length < 4) n.push(0);
    return { type: "DROP_SHADOW", color: color(m[1]), offset: { x: n[0], y: n[1] }, radius: n[2], spread: n[3], visible: true, blendMode: "NORMAL" };
  });
}
export function filters(f) {
  if (!f || f === "none") return [];
  const out = [];
  for (const m of f.matchAll(/drop-shadow\((rgba?\([^)]+\))\s+([^)]*)\)/g)) {
    const n = m[2].split(/\s+/).map((x) => parseFloat(x)).concat([0, 0, 0]);
    out.push({ type: "DROP_SHADOW", color: color(m[1]), offset: { x: n[0], y: n[1] }, radius: n[2], spread: 0, visible: true, blendMode: "NORMAL" });
  }
  const b = f.match(/(?<!-)blur\(([\d.]+)px\)/);
  if (b) out.push({ type: "LAYER_BLUR", radius: parseFloat(b[1]) * 2, visible: true });   // CSS blur is a std deviation; Figma's radius is about twice it
  return out;
}
export function imagePaint(img, w, h) {
  const { nw, nh } = img, sz = img.size.split(/\s+/), ps = (img.pos || "50% 50%").split(/\s+/);
  let bw, bh;
  if (sz[0] === "cover") { const s = Math.max(w / nw, h / nh); bw = nw * s; bh = nh * s; }
  else if (sz[0] === "contain") { const s = Math.min(w / nw, h / nh); bw = nw * s; bh = nh * s; }
  else {
    bw = sz[0] === "auto" ? null : length(sz[0], w);
    bh = sz.length < 2 || sz[1] === "auto" ? null : length(sz[1], h);
    if (bw === null && bh === null) { bw = nw; bh = nh; } else if (bw === null) bw = bh * nw / nh; else if (bh === null) bh = bw * nh / nw;
  }
  const bx = ps[0].endsWith("%") ? (w - bw) * parseFloat(ps[0]) / 100 : parseFloat(ps[0]);
  const by = (ps[1] ?? "50%").endsWith("%") ? (h - bh) * parseFloat(ps[1] ?? "50") / 100 : parseFloat(ps[1]);
  return { type: "IMAGE", scaleMode: "CROP", src: img.path, imageTransform: [[w / bw, 0, -bx / bw], [0, h / bh, -by / bh]], drawn: bw };
}
export const families = (stack) => stack.split(",").map((f) => f.trim().replace(/^["']|["']$/g, "")).filter((f) => !/^(serif|sans-serif|monospace|cursive|fantasy|system-ui|ui-[a-z-]+|-apple-system|BlinkMacSystemFont)$/i.test(f));
const fontOf = (s) => [families(s.family), s.weight, s.italic];

// ---------------------------------------------------------------- SVG clean-up
export function svgClean(mk) {
  if (!mk.includes("xmlns=")) mk = mk.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  return mk.replace(/ class="[^"]*"/g, "").replace(/ aria-hidden="[^"]*"/g, "");
}
// stroke and fill set on a <g> are copied onto each child shape: Figma's SVG import does not always inherit them
export function svgFlatten(mk) {
  return mk.replace(/<g([^>]*)>([\s\S]*?)<\/g>/g, (all, attrs, inner) => {
    const keep = [...attrs.matchAll(/\s((?:stroke|fill)[\w-]*="[^"]*")/g)].map((m) => m[1]);
    if (!keep.length) return all;
    return "<g>" + inner.replace(/<(path|circle|rect|ellipse|line|polyline|polygon)(?=[\s/>])([^>]*)>/g, (m, tag, rest) =>
      `<${tag}${keep.filter((a) => !rest.includes(" " + a.split("=")[0] + "=")).map((a) => " " + a).join("")}${rest}>`) + "</g>";
  });
}
// <use href="#p"> becomes a real path, and the text is dropped (its letters are placed one by one)
export function pathSvg(mk) {
  mk = mk.replace(/<text[\s\S]*?<\/text>/g, "");
  const paths = Object.fromEntries([...mk.matchAll(/<path id="([^"]+)" d="([^"]+)"\s*\/?>(?:<\/path>)?/g)].map((m) => [m[1], m[2]]));
  mk = mk.replace(/<path id="[^"]+" d="[^"]+"\s*\/?>(?:<\/path>)?/g, "");
  mk = mk.replace(/<use([^>]*?)\/?>(?:<\/use>)?/g, (m, attrs) => {
    const id = (attrs.match(/href="#([^"]+)"/) ?? [])[1]; if (!paths[id]) return "";
    return `<path d="${paths[id]}"${attrs.replace(/\s*(xlink:)?href="#[^"]+"/, "")}/>`;
  });
  return svgClean(mk);
}
function dashOf(mk) {
  const m = mk.match(/stroke-dasharray="([\d.\s,]+)"/); if (!m) return null;
  const a = (k, d) => (mk.match(new RegExp(`${k}="([^"]+)"`)) ?? [, d])[1];
  const hex = a("stroke", "#000000").replace("#", "");
  const rgb = hex.length === 6 ? [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) : hex.length === 3 ? [0, 1, 2].map((i) => parseInt(hex[i] + hex[i], 16) / 255) : [0, 0, 0];
  return { pattern: m[1].trim().split(/[\s,]+/).map(Number), w: parseFloat(a("stroke-width", "1")), op: parseFloat(a("stroke-opacity", "1")), cap: a("stroke-linecap", "") === "round" ? "ROUND" : "NONE", rgb };
}

// ---------------------------------------------------------------- images
function probe(file, entries) {
  return spawnSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", `stream=${entries}`, "-of", "csv=p=0", file], { encoding: "utf8" }).stdout.trim();
}
function seeThrough(file) {
  const e = spawnSync("ffmpeg", ["-v", "info", "-i", file, "-vf", "alphaextract,signalstats,metadata=print", "-f", "null", "-"], { encoding: "utf8" }).stderr ?? "";
  const m = e.match(/YMIN=(\d+)/); return Boolean(m) && Number(m[1]) < 255;
}
// a PNG or JPEG at `width` pixels, as base64. Without ffmpeg the original goes in when Figma can read it.
export function imageData(file, width, cache) {
  const ext = file.toLowerCase().split(".").pop();
  if (!onPath("ffmpeg")) {
    if (!["png", "jpg", "jpeg", "gif"].includes(ext)) fail(`${file}: Figma reads PNG, JPEG and GIF only; install ffmpeg to convert it`);
    return readFileSync(file).toString("base64");
  }
  const alpha = ext !== "jpg" && ext !== "jpeg" && seeThrough(file);
  const nw = parseInt(probe(file, "width"), 10) || width;
  const tw = Math.max(2, Math.min(nw, Math.ceil(width / 2) * 2));
  mkdirSync(cache, { recursive: true });
  const out = join(cache, createHash("md5").update(`${file}${statSync(file).mtimeMs}${tw}`).digest("hex").slice(0, 12) + (alpha ? ".png" : ".jpg"));
  if (!existsSync(out)) execFileSync("ffmpeg", ["-v", "error", "-y", "-i", file, "-vf", `scale=${tw}:-2:flags=lanczos`, ...(alpha ? ["-pix_fmt", "rgba", "-compression_level", "9"] : ["-q:v", "3"]), out]);
  return readFileSync(out).toString("base64");
}

// ---------------------------------------------------------------- layout → items
export function itemsOf(L, pageDir) {
  const items = [], svgs = {}, need = {};
  const textobj = (it) => ({ x: it.x, y: it.y, width: it.width, rx: it.rx, rw: it.rw, auto: it.auto, align: it.align, lh: it.lh, ls: it.ls, op: it.opacity,
    segs: it.segs.map((s) => ({ t: s.t, f: fontOf(s.s), size: s.s.size, fill: solid(s.s.color) })) });
  const svgimg = (o, path, it, size, pos) => {
    const name = basename(path); let mk = readFileSync(join(pageDir, path), "utf8"); mk = mk.slice(mk.indexOf("<svg"));
    svgs[name] = svgClean(mk);
    const vb = (mk.match(/viewBox="([^"]+)"/) ?? [])[1]?.trim().split(/[\s,]+/).map(Number);
    const vw = vb ? vb[2] : parseFloat((mk.match(/width="([\d.]+)/) ?? [, 100])[1]), vh = vb ? vb[3] : parseFloat((mk.match(/height="([\d.]+)/) ?? [, 100])[1]);
    const w = it.w, h = it.h, s = size.startsWith("contain") ? Math.min(w / vw, h / vh) : size.startsWith("cover") ? Math.max(w / vw, h / vh) : w / vw;
    const dw = vw * s, dh = vh * s, ps = (pos || "50% 50%").split(/\s+/);
    const fx = ps[0].endsWith("%") ? parseFloat(ps[0]) / 100 : 0, fy = (ps[1] ?? "50%").endsWith("%") ? parseFloat(ps[1] ?? "50") / 100 : .5;
    Object.assign(o, { k: "svgimg", svg: name, name: name.replace(/\.svg$/i, ""), dw, dx: it.cx - w / 2 + (w - dw) * fx, dy: it.cy - h / 2 + (h - dh) * fy, op: it.opacity });
  };
  L.items.forEach((it, i) => {
    // elements that do not render (inside a display:none parent) come out 0 by 0
    if (it.type === "text" && it.rw < 1) return;
    if (it.type !== "text" && (it.w ?? 1) < 1 && (it.h ?? 1) < 1) return;
    const o = { k: it.type, z: it.z, i, parent: it.parent ?? null };
    if (it.type === "row") { Object.assign(o, { id: it.id, left: it.left, top: it.top, w: it.w, h: it.h, gap: it.gap, rowGap: it.rowGap, wrap: it.wrap, justify: it.justify }); items.push(o); return; }
    if (it.type === "pill") {
      const fills = (it.bg !== "rgba(0, 0, 0, 0)" ? [solid(it.bg)] : []).concat(it.bi !== "none" ? splitTop(it.bi).reverse().map((g) => gradient(g, it.w, it.h)) : []);
      Object.assign(o, { id: it.id, cx: it.cx, cy: it.cy, w: it.w, h: it.h, rot: 0, op: it.opacity, fills, radius: it.radius.endsWith("px") ? parseFloat(it.radius) : it.h / 2,
        fx: shadows(it.shadow), pad: it.pad, anchor: it.anchor, text: textobj(it.text) });
      items.push(o); return;
    }
    if (it.type === "text") { Object.assign(o, textobj(it)); items.push(o); return; }
    Object.assign(o, { cx: it.cx, cy: it.cy, w: it.w, h: it.h, rot: it.rot, op: it.opacity, fx: filters(it.filter) });
    if (it.type === "box" || it.type === "clip") {
      const { w, h } = it; o.id = it.id;
      let img = it.img;
      if (img && /\.svg$/i.test(img.path)) {
        if (it.bg === "rgba(0, 0, 0, 0)" && it.type === "box") { svgimg(o, img.path, it, img.size, img.pos); items.push(o); return; }
        img = null;
      }
      const fills = [];
      if (it.bg !== "rgba(0, 0, 0, 0)") fills.push(solid(it.bg));
      const k = it.k ?? 1;
      if (img) {
        const p = imagePaint(img, w / k, h / k);
        need[img.path] = Math.max(need[img.path] ?? 0, p.drawn); delete p.drawn;
        fills.push(p);
      } else if (it.bi !== "none") fills.push(...splitTop(it.bi).reverse().filter((g) => g.includes("gradient")).map((g) => gradient(g, w, h)));
      o.fills = fills;
      const r = it.radius;
      o.ellipse = r.endsWith("%") && parseFloat(r) >= 50 && Math.abs(w - h) > 1;
      o.radius = r.endsWith("%") ? Math.min(w, h) * parseFloat(r) / 100 : parseFloat(r) * k;
      o.fx = shadows(it.shadow).concat(o.fx);
      o.border = it.border ? { w: it.border.w, paint: solid(it.border.color) } : null;
      o.masks = [];
      if (it.clipPath.startsWith("polygon")) {
        const pts = splitTop(it.clipPath.slice(8, -1)).map((p) => p.split(/\s+/)).map(([a, b]) => [length(a, w), length(b, h)]);
        o.masks.push({ poly: "M " + pts.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join(" L ") + " Z" });
      }
      if (it.mask && it.mask !== "none") for (const g of splitTop(it.mask)) {
        if (!g.includes("gradient")) continue;
        const pg = gradient(g, w, h); pg.gradientStops.forEach((s) => (s.color = { r: 0, g: 0, b: 0, a: s.color.a })); o.masks.push({ paint: pg });
      }
    } else if (it.type === "svg") {
      if (it.glyphs) {
        const runs = []; let cur = [];
        for (const g of it.glyphs) {
          if (Array.isArray(g)) { cur.push(g); continue; }
          runs.push({ f: [families(g.family ?? "Inter"), g.weight, false], size: g.size, fill: solid(g.color), label: cur.slice(0, 40).map((c) => c[0]).join(""),
            chars: cur.map(([c, x, y, a]) => [c, +x.toFixed(2), +y.toFixed(2), +a.toFixed(2)]) });
          cur = [];
        }
        Object.assign(o, { k: "ribbon", svg: pathSvg(it.markup), runs });
      } else {
        o.svg = svgFlatten(svgClean(it.markup));
        const d = dashOf(it.markup); if (d) o.dash = d;
      }
    } else if (it.type === "img") {
      const name = basename(it.src); svgs[name] = svgClean(readFileSync(join(pageDir, it.src), "utf8")); o.svgfile = name;
    }
    items.push(o);
  });
  return { items, svgs, need };
}

// ---------------------------------------------------------------- scripts
function js(v) {
  if (typeof v === "string") {
    if (v.length <= 400) return JSON.stringify(v);
    const parts = []; for (let i = 0; i < v.length; i += 400) parts.push(JSON.stringify(v.slice(i, i + 400)));
    return "[\n" + parts.join(",\n") + "\n].join('')";   // short lines: some editors choke on one long line
  }
  if (typeof v === "number") return JSON.stringify(Object.is(+v.toFixed(5), -0) ? 0 : +v.toFixed(5));
  if (Array.isArray(v)) { const inner = v.map(js); return inner.join("").length < 300 && !inner.some((x) => x.includes("\n")) ? `[${inner.join(",")}]` : `[\n${inner.join(",\n")}\n]`; }
  if (v && typeof v === "object") { const inner = Object.entries(v).map(([k, x]) => JSON.stringify(k) + ":" + js(x)); return inner.join("").length < 300 && !inner.some((x) => x.includes("\n")) ? `{${inner.join(",")}}` : `{\n${inner.join(",\n")}\n}`; }
  return JSON.stringify(v);
}

export function build(L, { page, frame, out, maxMb = 1.8, fontMap = {} }) {
  const pageDir = dirname(resolve(page));
  const { items, svgs, need } = itemsOf(L, pageDir);
  const b64 = {};
  // photos at 1.5x their largest size on the page; cut-outs (PNG) at 1x, where transparency makes them several times heavier
  for (const [p, drawn] of Object.entries(need)) b64[p] = imageData(join(pageDir, p), Math.ceil(drawn * (/\.png$/i.test(p) ? 1 : 1.5)), join(tmpdir(), "handoff-images"));
  for (const [k, v] of Object.entries(svgs)) if (v.length > 500e3) console.error(`note: ${k} is ${(v.length / 1e6).toFixed(1)} MB of SVG, probably a picture inside an SVG; a PNG would be lighter`);
  const byId = Object.fromEntries(items.filter((o) => o.id != null).map((o) => [o.id, o]));
  const rootY = (o) => { while (o.parent != null && byId[o.parent]) o = byId[o.parent]; return o.cy ?? (o.top != null ? o.top + o.h / 2 : o.y ?? o.dy ?? 0); };
  const imgsOf = (its) => new Set(its.flatMap((o) => (o.fills ?? []).filter((f) => f.type === "IMAGE").map((f) => f.src)));
  const sizeOf = (its) => its.reduce((n, o) => n + JSON.stringify(o).length, 0) + [...imgsOf(its)].reduce((n, p) => n + b64[p].length, 0)
    + [...new Set(its.map((o) => o.svg ?? o.svgfile).filter((k) => svgs[k]))].reduce((n, k) => n + svgs[k].length, 0);
  // bands down the page, each as big as fits under maxMb
  const H = Math.ceil(L.H), bands = []; let start = 0, prev = 0;
  for (let y = 200; y <= H + 100; y += 100) {
    const its = items.filter((o) => rootY(o) >= start && rootY(o) < y);
    if (sizeOf(its) > maxMb * 1e6 && prev > start) { bands.push([start, prev]); start = prev; }
    prev = y;
  }
  bands.push([start, Infinity]);
  const runtime = readFileSync(join(here, "runtime.js"), "utf8");
  const slug = frame.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  mkdirSync(out, { recursive: true });
  const files = [];
  bands.forEach(([a0, a1], n) => {
    const its = items.filter((o) => rootY(o) >= a0 && rootY(o) < a1);
    const imgs = imgsOf(its), names = new Set(its.map((o) => o.svg ?? o.svgfile).filter(Boolean));
    const file = join(out, `${slug}-part${n + 1}.js`);
    const part = { frame, name: `Part ${n + 1} (y ${a0}–${Math.min(a1, H)})`, fontMap, next: n + 1 < bands.length ? `run ${slug}-part${n + 2}.js` : "" };
    const text = runtime.replace("__TITLE__", frame).replace("__N__", n + 1).replace("__OF__", bands.length)
      .replace("__PART__", js(part)).replace("__DATA__", js({ W: L.W, H, items: its }))
      .replace("__SVGS__", js(Object.fromEntries(Object.entries(svgs).filter(([k]) => names.has(k)))))
      .replace("__IMGS__", js(Object.fromEntries([...imgs].map((k) => [k, b64[k]]))));
    writeFileSync(file, text); files.push(file);
  });
  return files;
}

// ---------------------------------------------------------------- check: a stand-in for the Figma plugin API
export async function check(file) {
  let nid = 0, created = 0, printed = "";
  const node = (type) => {
    const n = { id: "n" + ++nid, type, children: [], parent: null, width: 100, height: 20, x: 0, y: 0, fills: [], strokes: [], name: type, characters: "" };
    n.appendChild = (c) => { if (c.parent) c.parent.children = c.parent.children.filter((k) => k !== c); c.parent = n; n.children.push(c); };
    n.insertChild = (i, c) => n.appendChild(c);
    n.remove = () => { if (n.parent) n.parent.children = n.parent.children.filter((k) => k !== n); };
    n.resize = (w, h) => { if (!(w > 0 && h > 0)) throw new Error(`resize(${w}, ${h}) on ${type}`); n.width = w; n.height = h; };
    n.rescale = (s) => { if (!(s > 0 && isFinite(s))) throw new Error(`rescale(${s}) on ${type}`); n.width *= s; n.height *= s; };
    n.setRangeFontName = n.setRangeFontSize = n.setRangeFills = (a, b) => { if (b > n.characters.length) throw new Error("text range past the end"); };
    n.findAll = (f) => n.children.flatMap((c) => [c, ...c.findAll(() => true)]).filter(f);
    return new Proxy(n, { set(t, k, v) {
      if (typeof v === "number" && !isFinite(v)) throw new Error(`${String(k)} = ${v} on ${t.type}`);
      if (k === "relativeTransform" && v.flat().some((x) => !isFinite(x))) throw new Error(`relativeTransform has NaN on ${t.type}`);
      t[k] = v; return true; } });
  };
  const page = node("PAGE");
  const make = (type) => () => (created++, node(type));
  globalThis.figma = {
    currentPage: page, viewport: { scrollAndZoomIntoView() {} },
    listAvailableFontsAsync: async () => [{ fontName: { family: "Inter", style: "Regular" } }, { fontName: { family: "Inter", style: "Bold" } }],
    loadFontAsync: async () => {}, getNodeByIdAsync: async () => null,
    createFrame: make("FRAME"), createRectangle: make("RECTANGLE"), createEllipse: make("ELLIPSE"), createText: make("TEXT"), createVector: make("VECTOR"),
    createNodeFromSvg: (s) => { if (!/^<svg[\s>]/.test(s)) throw new Error("createNodeFromSvg: not an <svg>"); created++; const f = node("FRAME"); const v = node("VECTOR"); v.strokes = [1]; f.appendChild(v); return f; },
    group: (ns, p) => { if (!ns.length) throw new Error("group() of nothing"); const g = node("GROUP"); p.appendChild(g); ns.forEach((c) => g.appendChild(c)); return g; },
    createImage: (b) => { if (!b?.length) throw new Error("createImage: empty"); return { hash: "h" + b.length }; },
    base64Decode: (s) => Buffer.from(s, "base64"),
  };
  globalThis.print = (s) => { printed += String(s); };
  const AsyncFunction = (async () => {}).constructor;
  await new AsyncFunction(readFileSync(file, "utf8"))();   // like Scripter: the script is the body of an async function
  const ok = !printed.startsWith("ERROR");
  return { ok, created, printed };
}

// ---------------------------------------------------------------- CLI
async function main(argv) {
  const [cmd, ...rest] = argv; const { positional, flags } = parseArgs(rest);
  const fontMap = flags["font-map"] ? JSON.parse(readFileSync(flags["font-map"], "utf8")) : {};
  const report = async (files) => {
    let bad = 0;
    for (const f of files) {
      const r = await check(f); if (!r.ok) bad++;
      console.log(`${r.ok ? "PASS" : "FAIL"} ${basename(f)}: ${(statSync(f).size / 1e6).toFixed(2)} MB, ${r.created} layers${r.ok ? "" : "\n" + r.printed}`);
    }
    return bad ? 1 : 0;
  };
  if (cmd === "extract") {
    const L = extract(positional[0] ?? fail("extract <page.html>"), +need(flags, "width"));
    writeFileSync(need(flags, "out"), JSON.stringify(L)); console.log(`${L.items.length} items, ${L.W} x ${Math.round(L.H)}`); return 0;
  }
  if (cmd === "build") {
    const L = JSON.parse(readFileSync(positional[0] ?? fail("build <layout.json>"), "utf8"));
    return report(build(L, { page: need(flags, "page"), frame: need(flags, "frame"), out: need(flags, "out"), maxMb: +(flags["max-mb"] ?? 1.8), fontMap }));
  }
  if (cmd === "check") return report(positional.length ? positional : fail("check <script.js> ..."));
  if (cmd === "page") {
    const page = positional[0] ?? fail("page <page.html>");
    const L = extract(page, +need(flags, "width"));
    return report(build(L, { page, frame: need(flags, "frame"), out: need(flags, "out"), maxMb: +(flags["max-mb"] ?? 1.8), fontMap }));
  }
  fail("usage: figma.mjs <extract|build|check|page> ...");
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then((c) => process.exit(c), (e) => { if (!(e instanceof Failure)) throw e; console.error(e.message); process.exit(1); });
}

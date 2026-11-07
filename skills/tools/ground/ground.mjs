#!/usr/bin/env node
// Grounds: linear and mesh gradients mixed in Oklab, a blur field, seeded grain, halftone dots and an ASCII tile,
// and the command line for them and for the dither. Node's own modules only. The colours of a command come from the
// project's token file and from nothing else. Written from nothing but the formulas stated at each function; the
// sources of the colour maths and of the dither are in REFERENCES.md.
//
//   ground.mjs linear   --tokens F --stops P,P[,P…] --size WxH [--angle 90] [grain flags] --out x.png
//   ground.mjs mesh     --tokens F --points "x,y,P;x,y,P" --size WxH [--power 2.5] --brief B [grain flags] --out x.png
//   ground.mjs blur     --tokens F --base P --blobs "x,y,r,P[,strength];…" --size WxH --brief B [grain flags] --out x.png
//   ground.mjs grain    --in x.png [--amount 0.04] [--seed 1] [--grain-size 1] --out y.png
//   ground.mjs halftone --tokens F --in field.png --ink P --paper P [--cell 10] [--angle 45] --out x.png
//   ground.mjs ascii    --tokens F --in field.png --bg P --fg P [--cell 12] [--ramp " .,:;+*#%@"] --out x.svg|x.png
//   ground.mjs dither   --tokens F --in x.png --palette P,P[,P…] [--method fs] [--scale 1] [--spread S] --out x.png|x.svg
//
// P is a token path such as semantic.color.accent. A hex colour is refused. Grain flags: --grain AMOUNT --seed N
// --grain-size N. Methods: bayer2, bayer4, bayer8, fs, atkinson, none.
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { canvas, decodePng, fromOklab, hex, pngBytes, readPng, rng, toHex, toOklab, tokenColour } from "./raster.mjs";
import { METHODS, dither, toRgba, toSvg } from "./dither.mjs";

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const put = (img, x, y, [r, g, b]) => {
  const o = (y * img.w + x) * 4;
  img.rgba[o] = r;
  img.rgba[o + 1] = g;
  img.rgba[o + 2] = b;
  img.rgba[o + 3] = 255;
};
const lab = (colour) => toOklab(hex(colour));

// ---- grounds (colours are "#rrggbb" here; the command line turns token paths into them) -----------------------------

// A gradient along a line. stops are spread evenly; angle is in degrees, 0 running to the right and 90 downward.
// Each pixel is projected on the line, and the colour is mixed in Oklab between the two stops either side.
export function linear(w, h, stops, angle = 90) {
  if (!Array.isArray(stops) || stops.length < 2) throw new Error("a linear gradient needs at least two stops");
  const img = canvas(w, h), labs = stops.map(lab), a = (angle * Math.PI) / 180, dx = Math.cos(a), dy = Math.sin(a);
  const length = Math.abs(w * dx) + Math.abs(h * dy) || 1; // the corners land on 0 and 1
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const t = clamp01(((x + 0.5 - w / 2) * dx + (y + 0.5 - h / 2) * dy) / length + 0.5) * (labs.length - 1), i = Math.min(Math.floor(t), labs.length - 2);
      put(img, x, y, fromOklab(mix(labs[i], labs[i + 1], t - i)));
    }
  }
  return img;
}

// A mesh gradient: points {x, y, color} with x and y in 0 to 1. Each pixel mixes every point's colour in Oklab with
// the weight 1 / distance^power. Distance is measured in units of the width, so the field is not stretched.
export function mesh(w, h, points, power = 2.5) {
  if (!Array.isArray(points) || points.length < 1) throw new Error("a mesh needs at least one point");
  for (const p of points) if (!(p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1)) throw new Error("a mesh point lies between 0 and 1 in x and in y");
  const img = canvas(w, h), P = points.map((p) => ({ ...p, lab: lab(p.color) }));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let total = 0;
      const sum = [0, 0, 0];
      for (const p of P) {
        const d = Math.hypot((x + 0.5) / w - p.x, ((y + 0.5) / h - p.y) * (h / w)) + 1e-4, k = 1 / d ** power;
        total += k;
        for (let i = 0; i < 3; i++) sum[i] += p.lab[i] * k;
      }
      put(img, x, y, fromOklab(sum.map((v) => v / total)));
    }
  }
  return img;
}

// A blur field: soft blobs {x, y, r, color, strength} over a base colour, x and y in 0 to 1 and r a fraction of the
// width. Each blob pulls the colour toward its own by a Gaussian weight, mixed in Oklab, in the order given.
export function blurField(w, h, base, blobs) {
  for (const b of blobs) if (!(b.r > 0)) throw new Error("a blob has a radius above 0");
  const img = canvas(w, h), b0 = lab(base), B = blobs.map((b) => ({ ...b, lab: lab(b.color) }));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let c = b0;
      for (const b of B) {
        const d2 = (((x + 0.5) / w - b.x) ** 2 + (((y + 0.5) / h - b.y) * (h / w)) ** 2) / (2 * b.r * b.r);
        c = mix(c, b.lab, Math.exp(-d2) * (b.strength ?? 1));
      }
      put(img, x, y, fromOklab(c));
    }
  }
  return img;
}

// Grain: seeded noise added to Oklab lightness, so the shift is even across hues. Each draw is the sum of three
// uniform numbers, centred and scaled to -1 to 1 (spread about a third), times amount (0.02 to 0.08 reads as grain).
// size is the side of a noise block in pixels. Mean shift is zero; hue and chroma are kept.
export function grain(img, amount = 0.04, seed = 1, size = 1) {
  if (!Number.isInteger(size) || size < 1) throw new Error("the grain size is a whole number of at least 1");
  const draw = rng(seed), out = { w: img.w, h: img.h, rgba: new Uint8ClampedArray(img.rgba) };
  const cols = Math.ceil(img.w / size), noise = new Float32Array(cols * Math.ceil(img.h / size));
  for (let i = 0; i < noise.length; i++) noise[i] = (draw() + draw() + draw() - 1.5) / 1.5;
  if (amount === 0) return out;
  for (let y = 0; y < img.h; y++) {
    for (let x = 0; x < img.w; x++) {
      const o = (y * img.w + x) * 4, c = toOklab([img.rgba[o], img.rgba[o + 1], img.rgba[o + 2]]);
      c[0] += noise[Math.floor(y / size) * cols + Math.floor(x / size)] * amount;
      put(out, x, y, fromOklab(c));
      out.rgba[o + 3] = img.rgba[o + 3];
    }
  }
  return out;
}

// Halftone: one dot to each cell of a grid turned by angle (degrees). The dot radius is cell * 0.72 * sqrt(1 - L),
// L the Oklab lightness of the field at the cell centre, so a dark field has big dots and a light one small. A pixel
// is ink inside the dot and paper outside, with one pixel of soft edge, mixed in sRGB between the two colours.
export function halftone(field, ink, paper, cell = 10, angle = 45) {
  if (!(cell >= 2)) throw new Error("a halftone cell is at least 2 pixels");
  const img = canvas(field.w, field.h), I = hex(ink), P = hex(paper), a = (angle * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  for (let y = 0; y < field.h; y++) {
    for (let x = 0; x < field.w; x++) {
      const u = (x + 0.5) * c + (y + 0.5) * s, v = -(x + 0.5) * s + (y + 0.5) * c; // grid coordinates
      const cu = (Math.floor(u / cell) + 0.5) * cell, cv = (Math.floor(v / cell) + 0.5) * cell; // the cell centre
      const sx = Math.min(field.w - 1, Math.max(0, Math.round(cu * c - cv * s))), sy = Math.min(field.h - 1, Math.max(0, Math.round(cu * s + cv * c)));
      const o = (sy * field.w + sx) * 4, L = toOklab([field.rgba[o], field.rgba[o + 1], field.rgba[o + 2]])[0];
      const radius = cell * 0.72 * Math.sqrt(clamp01(1 - L));
      put(img, x, y, mix(P, I, clamp01(radius - Math.hypot(u - cu, v - cv) + 0.5)));
    }
  }
  return img;
}

const escapeXml = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// ASCII: one character to each cell of cell by 2*cell pixels, chosen from the ramp (light to dense) by the mean Oklab
// lightness of the field under the cell: a dark field takes the dense characters. Drawn as SVG text in the generic
// monospace family, each row spread over the full width of its columns so the grid does not depend on the font.
export function asciiSvg(field, bg, fg, cell = 12, ramp = " .,:;+*#%@") {
  if (!(cell >= 4)) throw new Error("an ASCII cell is at least 4 pixels");
  if ([...ramp].length < 2) throw new Error("an ASCII ramp has at least two characters");
  const chars = [...ramp], charH = cell * 2, cols = Math.floor(field.w / cell), rows = Math.floor(field.h / charH);
  if (cols < 1 || rows < 1) throw new Error("the field is smaller than one ASCII cell");
  const left = (field.w - cols * cell) / 2, top = (field.h - rows * charH) / 2;
  let text = "";
  for (let r = 0; r < rows; r++) {
    let line = "";
    for (let q = 0; q < cols; q++) {
      let sum = 0, n = 0;
      for (let y = Math.floor(r * charH); y < Math.min(field.h, Math.floor((r + 1) * charH)); y++) {
        for (let x = q * cell; x < Math.min(field.w, (q + 1) * cell); x++) {
          const o = (y * field.w + x) * 4;
          sum += toOklab([field.rgba[o], field.rgba[o + 1], field.rgba[o + 2]])[0];
          n++;
        }
      }
      line += chars[Math.min(chars.length - 1, Math.floor(clamp01(1 - sum / n) * chars.length))];
    }
    text += `<text x="${left}" y="${top + r * charH + charH * 0.78}" textLength="${cols * cell}" lengthAdjust="spacing" xml:space="preserve">${escapeXml(line)}</text>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${field.w} ${field.h}" width="${field.w}" height="${field.h}"><rect width="100%" height="100%" fill="${bg}"/><g font-family="monospace" font-size="${cell / 0.6}" fill="${fg}">${text}</g></svg>\n`;
}

// SVG text drawn to a PNG of w by h pixels by headless Chrome, under `timeout 60`. The PNG is read and written again
// by this module, so its bytes depend on its pixels alone.
export function svgToPng(svg, w, h) {
  const dir = mkdtempSync(join(tmpdir(), "bauhaus-ground-"));
  try {
    const file = join(dir, "tile.svg"), shot = join(dir, "tile.png");
    writeFileSync(file, svg);
    const run = spawnSync("timeout", ["60", "google-chrome", "--headless=new", "--no-sandbox", "--disable-gpu", "--hide-scrollbars", `--user-data-dir=${join(dir, "chrome")}`, `--screenshot=${shot}`, `--window-size=${w},${h}`, `file://${file}`], { encoding: "utf8" });
    if (run.error?.code === "ENOENT" || run.status === 127) throw new Error("drawing ASCII to a PNG needs headless Chrome (google-chrome) and `timeout` on the PATH; write an .svg instead");
    if (run.status !== 0 || !existsSync(shot)) throw new Error(`Chrome did not draw the tile (exit ${run.status}): ${(run.stderr || "").trim().split("\n").slice(-2).join(" ")}`);
    const img = decodePng(readFileSync(shot));
    if (img.w < w || img.h < h) throw new Error(`Chrome drew ${img.w} by ${img.h}, not ${w} by ${h}`);
    const rgba = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) rgba.set(img.rgba.subarray(y * img.w * 4, y * img.w * 4 + w * 4), y * w * 4); // the top left w by h
    return pngBytes(w, h, rgba);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// ---- the command line ---------------------------------------------------------------------------------------------------

class Usage extends Error {}
const fail = (message) => {
  throw new Usage(message);
};

const GRAIN = ["grain", "seed", "grain-size"];
const SPECS = {
  linear: { need: ["tokens", "stops", "size", "out"], may: ["angle", ...GRAIN] },
  mesh: { need: ["tokens", "points", "size", "out"], may: ["brief", "power", ...GRAIN] },
  blur: { need: ["tokens", "base", "blobs", "size", "out"], may: ["brief", ...GRAIN] },
  grain: { need: ["in", "out"], may: ["amount", "seed", "grain-size"] },
  halftone: { need: ["tokens", "in", "ink", "paper", "out"], may: ["cell", "angle"] },
  ascii: { need: ["tokens", "in", "bg", "fg", "out"], may: ["cell", "ramp"] },
  dither: { need: ["tokens", "in", "palette", "out"], may: ["method", "scale", "spread"] },
};
const USAGE = `usage: ground.mjs <command> [options]
commands: ${Object.keys(SPECS).join(", ")}
  linear   --tokens F --stops P,P[,P…] --size WxH [--angle 90] --out x.png
  mesh     --tokens F --points "x,y,P;x,y,P" --size WxH --brief B --out x.png
  blur     --tokens F --base P --blobs "x,y,r,P[,strength];…" --size WxH --brief B --out x.png
  grain    --in x.png [--amount 0.04] [--seed 1] [--grain-size 1] --out y.png
  halftone --tokens F --in field.png --ink P --paper P [--cell 10] [--angle 45] --out x.png
  ascii    --tokens F --in field.png --bg P --fg P [--cell 12] --out x.svg|x.png
  dither   --tokens F --in x.png --palette P,P[,P…] [--method fs] [--scale 1] --out x.png|x.svg
P is a token path such as semantic.color.accent; a hex colour is refused.`;

function parseArgs(argv) {
  const [command, ...rest] = argv;
  if (!command) fail(USAGE);
  const spec = SPECS[command];
  if (!spec) fail(`unknown command ${command}\n${USAGE}`);
  const options = {};
  for (let i = 0; i < rest.length; i += 2) {
    const flag = rest[i];
    if (!flag.startsWith("--")) fail(`unexpected argument ${flag}`);
    const name = flag.slice(2);
    if (![...spec.need, ...spec.may].includes(name)) fail(`unknown option ${flag} for ${command}`);
    if (rest[i + 1] === undefined) fail(`${flag} needs a value`);
    options[name] = rest[i + 1];
  }
  for (const name of spec.need) if (options[name] === undefined) fail(`--${name} is needed for ${command}`);
  return { command, options };
}

const number = (name, text, { min = -Infinity, max = Infinity, integer = false } = {}) => {
  const n = Number(text);
  if (text === "" || !Number.isFinite(n) || n < min || n > max || (integer && !Number.isInteger(n))) fail(`--${name}: "${text}" is not ${integer ? "a whole number" : "a number"} from ${min} to ${max}`);
  return n;
};
const size = (text) => {
  const m = /^(\d+)x(\d+)$/.exec(text);
  if (!m || +m[1] < 1 || +m[2] < 1 || +m[1] > 8192 || +m[2] > 8192) fail(`--size: "${text}" is not WxH between 1 and 8192`);
  return [+m[1], +m[2]];
};

function loadTokens(file) {
  if (!existsSync(file)) fail(`${file}: no such file`);
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return fail(`${file}: not valid JSON`);
  }
}
// A colour from a token path, as "#rrggbb". Nothing else is a colour here.
function colour(root, path) {
  if (!/^[A-Za-z_][\w-]*(?:\.[\w-]+)+$/.test(path)) fail(`"${path}": colour stops come from the token file; give a token path such as semantic.color.accent`);
  try {
    return toHex(tokenColour(root, path));
  } catch (error) {
    return fail(error.message.startsWith(path) ? error.message : `${path}: ${error.message}`);
  }
}
const colours = (root, list) => list.split(",").map((p) => colour(root, p.trim()));

function readImage(file) {
  if (!existsSync(file)) fail(`${file}: no such file`);
  try {
    return readPng(file);
  } catch (error) {
    return fail(`${file}: ${error.message}`);
  }
}

function checkBrief(file, what) {
  const named = file !== undefined && existsSync(file) && /\b(?:mesh|blur|aurora)\b/i.test(readFileSync(file, "utf8"));
  if (!named) fail(`a ${what} ground is made only when the brief names one: pass --brief <brief.md> that says mesh, blur or aurora${file === undefined || existsSync(file) ? "" : ` (${file}: no such file)`}`);
}

const extensionOf = (out) => extname(out).toLowerCase();
function pngOut(out, what) {
  if (extensionOf(out) !== ".png") fail(`${what} is a PNG: --out ends in .png`);
}

function withGrain(img, o) {
  if (o.grain === undefined) return img;
  return grain(img, number("grain", o.grain, { min: 0, max: 0.3 }), number("seed", o.seed ?? "1", { integer: true, min: 0 }), number("grain-size", o["grain-size"] ?? "1", { integer: true, min: 1, max: 64 }));
}
const encode = (img) => pngBytes(img.w, img.h, img.rgba);

// Each handler returns { bytes, text, width, height }: the file to write and its size.
const HANDLERS = {
  linear(o) {
    pngOut(o.out, "a ground");
    const [w, h] = size(o.size), root = loadTokens(o.tokens);
    const stops = colours(root, o.stops);
    return { bytes: encode(withGrain(linear(w, h, stops, number("angle", o.angle ?? "90")), o)), w, h };
  },
  mesh(o) {
    pngOut(o.out, "a ground");
    const [w, h] = size(o.size), root = loadTokens(o.tokens);
    checkBrief(o.brief, "mesh");
    const points = o.points.split(";").map((part) => {
      const [x, y, ...path] = part.split(",");
      if (path.length === 0) fail(`--points: "${part}" is not x,y,P`);
      return { x: number("points", x, { min: 0, max: 1 }), y: number("points", y, { min: 0, max: 1 }), color: colour(root, path.join(",").trim()) };
    });
    return { bytes: encode(withGrain(mesh(w, h, points, number("power", o.power ?? "2.5", { min: 0.5, max: 8 })), o)), w, h };
  },
  blur(o) {
    pngOut(o.out, "a ground");
    const [w, h] = size(o.size), root = loadTokens(o.tokens);
    checkBrief(o.brief, "blur");
    const blobs = o.blobs.split(";").map((part) => {
      const [x, y, r, path, strength] = part.split(",");
      if (path === undefined) fail(`--blobs: "${part}" is not x,y,r,P[,strength]`);
      return { x: number("blobs", x, { min: 0, max: 1 }), y: number("blobs", y, { min: 0, max: 1 }), r: number("blobs", r, { min: 0.001, max: 2 }), color: colour(root, path.trim()), strength: strength === undefined ? 1 : number("blobs", strength, { min: 0, max: 1 }) };
    });
    return { bytes: encode(withGrain(blurField(w, h, colour(root, o.base), blobs), o)), w, h };
  },
  grain(o) {
    pngOut(o.out, "a ground");
    const img = readImage(o.in);
    return { bytes: encode(grain(img, number("amount", o.amount ?? "0.04", { min: 0, max: 0.3 }), number("seed", o.seed ?? "1", { integer: true, min: 0 }), number("grain-size", o["grain-size"] ?? "1", { integer: true, min: 1, max: 64 }))), w: img.w, h: img.h };
  },
  halftone(o) {
    pngOut(o.out, "a halftone");
    const root = loadTokens(o.tokens), field = readImage(o.in);
    const img = halftone(field, colour(root, o.ink), colour(root, o.paper), number("cell", o.cell ?? "10", { min: 2, max: 512 }), number("angle", o.angle ?? "45"));
    return { bytes: encode(img), w: img.w, h: img.h };
  },
  ascii(o) {
    if (![".svg", ".png"].includes(extensionOf(o.out))) fail("an ASCII tile is an SVG or a PNG: --out ends in .svg or .png");
    const root = loadTokens(o.tokens), field = readImage(o.in);
    const svg = asciiSvg(field, colour(root, o.bg), colour(root, o.fg), number("cell", o.cell ?? "12", { min: 4, max: 256 }), o.ramp);
    return extensionOf(o.out) === ".svg" ? { text: svg, w: field.w, h: field.h } : { bytes: svgToPng(svg, field.w, field.h), w: field.w, h: field.h };
  },
  dither(o) {
    if (![".svg", ".png"].includes(extensionOf(o.out))) fail("a dither is a PNG or an SVG: --out ends in .png or .svg");
    const root = loadTokens(o.tokens), img = readImage(o.in), palette = colours(root, o.palette).map(hex), method = o.method ?? "fs";
    if (!METHODS.includes(method)) fail(`unknown method ${method} (use ${METHODS.join(", ")})`);
    if (palette.length < 2 || palette.length > 256) fail("--palette: a palette has 2 to 256 colours");
    const scale = number("scale", o.scale ?? "1", { integer: true, min: 1, max: 32 });
    const result = dither(img, { method, palette, spread: o.spread === undefined ? undefined : number("spread", o.spread, { min: 0, max: 2 }) });
    if (extensionOf(o.out) === ".svg") return { text: toSvg(result, scale), w: img.w * scale, h: img.h * scale };
    const { W, H, out } = toRgba(result, scale);
    return { bytes: pngBytes(W, H, out), w: W, h: H };
  },
};

export function run(argv) {
  try {
    const { command, options } = parseArgs(argv);
    const made = HANDLERS[command](options);
    writeFileSync(options.out, made.text ?? made.bytes);
    return { code: 0, out: `wrote ${options.out} (${made.w} by ${made.h})` };
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    return { code: 1, err: error.message };
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = run(process.argv.slice(2));
  if (result.out) console.log(result.out);
  if (result.err) console.error(result.err.startsWith("usage:") ? result.err : `ground: ${result.err}`);
  process.exit(result.code);
}

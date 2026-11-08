// Pixels and colour for the ground tool: PNG out and in, sRGB and Oklab, token colours, a seeded random
// generator. Node's own modules only. Where each constant comes from is in REFERENCES.md (rows GR4 and GR5).
import { crc32, deflateSync, inflateSync } from "node:zlib";
import { readFileSync, writeFileSync } from "node:fs";

// ---- a canvas: width, height and 8-bit RGBA ----------------------------------------------------------------------

export const canvas = (w, h) => ({ w, h, rgba: new Uint8ClampedArray(w * h * 4) });

// ---- PNG out (8-bit RGBA, no interlace) --------------------------------------------------------------------------

const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

export function pngBytes(w, h, rgba) {
  const stride = w * 4;
  const raw = Buffer.alloc((stride + 1) * h); // each row starts with filter type 0 (none)
  for (let y = 0; y < h; y++) Buffer.from(rgba.buffer, rgba.byteOffset + y * stride, stride).copy(raw, y * (stride + 1) + 1);
  const chunk = (type, data) => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, "latin1"), data]);
    const sum = Buffer.alloc(4);
    sum.writeUInt32BE(crc32(body));
    return Buffer.concat([length, body, sum]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(w, 0);
  header.writeUInt32BE(h, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // colour type: RGBA
  return Buffer.concat([SIGNATURE, chunk("IHDR", header), chunk("IDAT", deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}
export const writePng = (path, w, h, rgba) => writeFileSync(path, pngBytes(w, h, rgba));

// ---- PNG in (8-bit grey, grey with alpha, RGB, palette or RGBA; not interlaced; all five row filters) ---------------

export function decodePng(bytes) {
  if (bytes.length < 33 || !bytes.subarray(0, 8).equals(SIGNATURE)) throw new Error("not a PNG file");
  let at = 8, w = 0, h = 0, type = -1;
  const data = [];
  let palette = null, alphaOfPalette = null;
  while (at + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(at), name = bytes.toString("latin1", at + 4, at + 8), body = bytes.subarray(at + 8, at + 8 + length);
    if (name === "IHDR") {
      w = body.readUInt32BE(0);
      h = body.readUInt32BE(4);
      type = body[9];
      if (body[8] !== 8 || body[12] !== 0 || ![0, 2, 3, 4, 6].includes(type)) throw new Error("only 8-bit PNG, not interlaced (grey, RGB, palette or with alpha)");
    } else if (name === "PLTE") palette = body;
    else if (name === "tRNS") alphaOfPalette = body;
    else if (name === "IDAT") data.push(body);
    else if (name === "IEND") break;
    at += 12 + length;
  }
  if (type < 0 || data.length === 0) throw new Error("not a PNG file: no header or no image data");
  const bpp = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[type], stride = w * bpp, raw = inflateSync(Buffer.concat(data)), px = Buffer.alloc(stride * h);
  for (let y = 0; y < h; y++) {
    const filter = raw[y * (stride + 1)];
    for (let x = 0; x < stride; x++) {
      const v = raw[y * (stride + 1) + 1 + x];
      const a = x >= bpp ? px[y * stride + x - bpp] : 0, b = y ? px[(y - 1) * stride + x] : 0, c = x >= bpp && y ? px[(y - 1) * stride + x - bpp] : 0;
      const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
      const guess = [0, a, b, (a + b) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? b : c][filter];
      if (guess === undefined) throw new Error(`bad PNG row filter ${filter}`);
      px[y * stride + x] = (v + guess) & 255;
    }
  }
  const rgba = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const o = i * 4, s = i * bpp;
    if (type === 0) rgba.set([px[s], px[s], px[s], 255], o);
    else if (type === 4) rgba.set([px[s], px[s], px[s], px[s + 1]], o);
    else if (type === 2) rgba.set([px[s], px[s + 1], px[s + 2], 255], o);
    else if (type === 3) rgba.set([palette[px[s] * 3], palette[px[s] * 3 + 1], palette[px[s] * 3 + 2], alphaOfPalette && px[s] < alphaOfPalette.length ? alphaOfPalette[px[s]] : 255], o);
    else rgba.set([px[s], px[s + 1], px[s + 2], px[s + 3]], o);
  }
  return { w, h, rgba };
}
export const readPng = (path) => decodePng(readFileSync(path));

// ---- colour ------------------------------------------------------------------------------------------------------

// "#rrggbb", "rrggbb", "#rgb" to [r, g, b] in 0 to 255.
export function hex(text) {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(text).trim());
  if (!m) throw new Error(`"${text}" is not a colour (#rrggbb)`);
  const six = m[1].length === 3 ? [...m[1]].map((c) => c + c).join("") : m[1];
  const n = parseInt(six, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export const toHex = ([r, g, b]) => "#" + [r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("");

// The sRGB transfer function: encoded 0 to 255 to linear 0 to 1, and back (clamped to 0 to 255).
const toLin = (v) => ((v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const toEnc = (v) => 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.max(v, 0) ** (1 / 2.4) - 0.055);
export const toLinear = (c) => c.map(toLin);
export const toSrgbRaw = (c) => c.map(toEnc); // not clamped: a value outside 0 to 255 is outside the sRGB gamut
export const toSrgb = (c) => toSrgbRaw(c).map((v) => Math.min(255, Math.max(0, v)));

// Oklab from linear sRGB and back: the matrices and the cube-root step of the Oklab definition (REFERENCES.md, GR4).
export function toOklab(rgb) {
  const [r, g, b] = toLinear(rgb);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
// Unclamped, so a caller can see that a colour is outside the sRGB gamut.
export function fromOklabRaw([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return toSrgbRaw([4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s]);
}
export const fromOklab = (lab) => fromOklabRaw(lab).map((v) => Math.min(255, Math.max(0, v)));

// OKLCH is Oklab in polar form: chroma is the length of (a, b) and hue is its angle in degrees.
export const toOklch = ([L, a, b]) => [L, Math.hypot(a, b), ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360];
export const fromOklch = ([L, C, h]) => [L, C * Math.cos((h * Math.PI) / 180), C * Math.sin((h * Math.PI) / 180)];

// ---- colours from a token file ------------------------------------------------------------------------------------
// The colour of a token path such as semantic.color.accent, from a parsed DTCG token file. Follows aliases. A colour
// is read from its hex, or from srgb, oklab or oklch components; an oklab or oklch colour outside the sRGB gamut is
// refused, never clipped, because a clipped colour is not the colour the token names.

const GAMUT_SLACK = 0.0005 * 255; // the rounding of the conversion, in 8-bit steps
export function tokenColour(root, path, seen = []) {
  if (seen.includes(path)) throw new Error(`alias cycle: ${[...seen, path].join(" -> ")}`);
  let node = root;
  for (const part of path.split(".")) node = node !== null && typeof node === "object" ? node[part] : undefined;
  if (node === null || typeof node !== "object" || !("$value" in node)) throw new Error(`${path}: not a token in the token file`);
  const value = node.$value, alias = typeof value === "string" ? /^\{([^{}]+)\}$/.exec(value)?.[1] : undefined;
  if (alias) return tokenColour(root, alias, [...seen, path]);
  if (value === null || typeof value !== "object") throw new Error(`cannot compute: ${path} is not a colour object`);
  if (value.alpha !== undefined && value.alpha < 1) throw new Error(`cannot compute: ${path} is translucent`);
  if (typeof value.hex === "string") return hex(value.hex);
  const c = value.components;
  const number = (v) => (v === "none" ? 0 : v);
  if (Array.isArray(c) && c.length === 3 && c.map(number).every((v) => typeof v === "number" && Number.isFinite(v))) {
    const n = c.map(number);
    if (value.colorSpace === "srgb") return n.map((v) => Math.round(Math.min(1, Math.max(0, v)) * 255));
    if (value.colorSpace === "oklab" || value.colorSpace === "oklch") {
      const rgb = fromOklabRaw(value.colorSpace === "oklch" ? fromOklch(n) : n);
      if (rgb.some((v) => v < -GAMUT_SLACK || v > 255 + GAMUT_SLACK)) throw new Error(`cannot compute: ${path} is ${value.colorSpace} outside the sRGB gamut`);
      return rgb.map((v) => Math.round(Math.min(255, Math.max(0, v))));
    }
  }
  throw new Error(`cannot compute: ${path} is ${value.colorSpace ?? "a colour"} with no hex`);
}

// ---- a seeded random generator --------------------------------------------------------------------------------------
// Defined here from a counter, an odd step and a mix of shifts and multiplications chosen here. It is not copied from
// any source and it is not a cryptographic generator. The same seed gives the same numbers in [0, 1).

export function rng(seed) {
  let counter = seed >>> 0;
  return () => {
    counter = (counter + 0x7a3c91e5) >>> 0;
    let z = (counter ^ (counter >>> 15)) >>> 0;
    z = Math.imul(z, 0x3a8f2d6b) >>> 0;
    z = (z ^ (z >>> 13)) >>> 0;
    z = Math.imul(z, 0x6c1d4e93) >>> 0;
    z = (z ^ (z >>> 16)) >>> 0;
    return z / 4294967296;
  };
}

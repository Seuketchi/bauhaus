// Dither: a picture reduced to a few colours. Ordered (Bayer 2, 4 and 8), Floyd–Steinberg and Atkinson error
// diffusion, or a plain nearest colour. The nearest colour is found in linear light. Written from the public
// definitions in REFERENCES.md (rows GR1 to GR3); nothing is copied.
import { toLinear } from "./raster.mjs";

// The threshold map of side 2^k, built by recursion from the 1 by 1 map: each step lays four copies of the
// map, as 4M, 4M+2, 4M+3 and 4M+1. The values run 0 to side²−1, each once.
export function bayer(side) {
  if (!Number.isInteger(side) || side < 1 || (side & (side - 1)) !== 0) throw new Error(`the side of a Bayer map is a power of two, not ${side}`);
  let map = [[0]];
  for (let n = 1; n < side; n *= 2) {
    const next = Array.from({ length: n * 2 }, () => Array(n * 2));
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const v = 4 * map[y][x];
        next[y][x] = v;
        next[y][x + n] = v + 2;
        next[y + n][x] = v + 3;
        next[y + n][x + n] = v + 1;
      }
    }
    map = next;
  }
  return map;
}

// Where the error of a pixel goes: [dx, dy, weight]. Floyd–Steinberg sends all of it, 7+3+5+1 over 16.
// Atkinson sends one eighth to each of six neighbours, so a quarter of the error is dropped.
const KERNELS = {
  fs: { divisor: 16, taps: [[1, 0, 7], [-1, 1, 3], [0, 1, 5], [1, 1, 1]] },
  atkinson: { divisor: 8, taps: [[1, 0, 1], [2, 0, 1], [-1, 1, 1], [0, 1, 1], [1, 1, 1], [0, 2, 1]] },
};
export const METHODS = ["bayer2", "bayer4", "bayer8", "fs", "atkinson", "none"];

// The relative luminance of a colour in linear light (the sRGB row of the XYZ matrix in CSS Color 4).
const luminance = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

// The index of the palette colour nearest to c, by squared distance in linear light. Ties go to the first.
function nearest(c, palette) {
  let best = 0, bestDistance = Infinity;
  for (let i = 0; i < palette.length; i++) {
    const d = (c[0] - palette[i][0]) ** 2 + (c[1] - palette[i][1]) ** 2 + (c[2] - palette[i][2]) ** 2;
    if (d < bestDistance) { bestDistance = d; best = i; }
  }
  return best;
}

// img: { w, h, rgba }. palette: 2 to 256 colours as [r, g, b] in sRGB. spread (ordered methods only) is how far the
// threshold map moves a pixel, in linear light: by default the average gap between the palette's levels, so a map
// moves a pixel across one step of the palette. Alpha is ignored. Returns { w, h, index, palette }.
export function dither(img, { method = "fs", palette, spread } = {}) {
  if (!img || !img.rgba || !(img.w > 0) || !(img.h > 0)) throw new Error("dither needs an image: { w, h, rgba }");
  if (!Array.isArray(palette) || palette.length < 2 || palette.length > 256) throw new Error("a palette has 2 to 256 colours");
  const ordered = /^bayer(\d+)$/.exec(method);
  if (!ordered && method !== "none" && !KERNELS[method]) throw new Error(`unknown method ${method} (use ${METHODS.join(", ")})`);
  const { w, h, rgba } = img, lin = palette.map((c) => toLinear(c)), index = new Uint8Array(w * h);
  const levels = lin.map(luminance);
  const step = spread ?? (Math.max(...levels) - Math.min(...levels)) / (palette.length - 1);
  const buffer = new Float32Array(w * h * 3);
  for (let i = 0; i < w * h; i++) buffer.set(toLinear([rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]]), i * 3);

  if (ordered) {
    const side = +ordered[1], map = bayer(side);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const t = ((map[y % side][x % side] + 0.5) / (side * side) - 0.5) * step; // centred on zero
        const i = y * w + x;
        index[i] = nearest([buffer[i * 3] + t, buffer[i * 3 + 1] + t, buffer[i * 3 + 2] + t], lin);
      }
    }
  } else if (method === "none") {
    for (let i = 0; i < w * h; i++) index[i] = nearest([buffer[i * 3], buffer[i * 3 + 1], buffer[i * 3 + 2]], lin);
  } else {
    const { divisor, taps } = KERNELS[method];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x, c = [buffer[i * 3], buffer[i * 3 + 1], buffer[i * 3 + 2]], j = nearest(c, lin);
        index[i] = j;
        const error = [c[0] - lin[j][0], c[1] - lin[j][1], c[2] - lin[j][2]];
        for (const [dx, dy, weight] of taps) {
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || xx >= w || yy >= h) continue;
          for (let ch = 0; ch < 3; ch++) buffer[(yy * w + xx) * 3 + ch] += (error[ch] * weight) / divisor;
        }
      }
    }
  }
  return { w, h, index, palette };
}

// RGBA pixels at a whole-number scale, each pixel the palette colour of its index. Opaque.
export function toRgba({ w, h, index, palette }, scale = 1) {
  if (!Number.isInteger(scale) || scale < 1) throw new Error("scale is a whole number of at least 1");
  const W = w * scale, H = h * scale, out = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const c = palette[index[Math.floor(y / scale) * w + Math.floor(x / scale)]], o = (y * W + x) * 4;
      out[o] = c[0];
      out[o + 1] = c[1];
      out[o + 2] = c[2];
      out[o + 3] = 255;
    }
  }
  return { W, H, out };
}

// SVG: one background rect in the commonest colour, then one rect for each run of another colour in a row.
export function toSvg({ w, h, index, palette }, scale = 1) {
  if (!Number.isInteger(scale) || scale < 1) throw new Error("scale is a whole number of at least 1");
  const col = (i) => "#" + palette[i].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
  const counts = palette.map(() => 0);
  for (const i of index) counts[i]++;
  const ground = counts.indexOf(Math.max(...counts));
  let body = "";
  for (let y = 0; y < h; y++) {
    let x = 0;
    while (x < w) {
      const v = index[y * w + x];
      let end = x + 1;
      while (end < w && index[y * w + end] === v) end++;
      if (v !== ground) body += `<rect x="${x * scale}" y="${y * scale}" width="${(end - x) * scale}" height="${scale}" fill="${col(v)}"/>`;
      x = end;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w * scale} ${h * scale}" width="${w * scale}" height="${h * scale}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="${col(ground)}"/>${body}</svg>\n`;
}

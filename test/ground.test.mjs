// The ground tool: where its code and numbers come from (provenance), and what it makes.
// Fixtures are made in code, never a photograph. No test depends on the clock or the network.
import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { asciiSvg, blurField, grain, halftone, linear, mesh } from "../skills/tools/ground/ground.mjs";
import { canvas, decodePng, fromOklab, hex, pngBytes, rng, toHex, toLinear, toOklab, toOklch, fromOklch, toSrgb } from "../skills/tools/ground/raster.mjs";
import { bayer, dither, toRgba, toSvg } from "../skills/tools/ground/dither.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const GROUND = join(root, "skills", "tools", "ground");
const read = (...parts) => readFileSync(join(root, ...parts), "utf8");
const filesUnder = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? filesUnder(join(dir, e.name)) : [join(dir, e.name)]));

describe("provenance: what the ground folder may hold (spec: licence and provenance)", () => {
  const files = existsSync(GROUND) ? filesUnder(GROUND) : [];

  test("the folder exists and holds only text files: .md, .mjs and .json", () => {
    assert.ok(files.length > 0, "skills/tools/ground has no files");
    for (const f of files) assert.match(f, /\.(?:md|mjs|json)$/, `${relative(root, f)}: only .md, .mjs and .json files ship here`);
  });

  test("no file is binary: no NUL byte, and every file is valid UTF-8", () => {
    for (const f of files) {
      const bytes = readFileSync(f);
      assert.ok(!bytes.includes(0), `${relative(root, f)}: has a NUL byte`);
      assert.doesNotThrow(() => new TextDecoder("utf-8", { fatal: true }).decode(bytes), `${relative(root, f)}: not UTF-8`);
    }
  });

  test("no file holds a data: URI, so no image, font or other asset is embedded", () => {
    for (const f of files) {
      const text = readFileSync(f, "utf8");
      assert.doesNotMatch(text, /data:[a-z][a-z0-9.+-]*\/[a-z0-9.+-]+\s*[;,]/i, `${relative(root, f)}: a data: URI`);
      assert.doesNotMatch(text, /data:;base64|;base64,/i, `${relative(root, f)}: base64 data`);
    }
  });

  test("the code imports Node's own modules and this folder's own files, and nothing else", () => {
    for (const f of files.filter((x) => x.endsWith(".mjs"))) {
      const text = readFileSync(f, "utf8");
      for (const [, spec] of text.matchAll(/(?:^|\n)\s*(?:import|export)\b[^'"\n]*?from\s*["']([^"']+)["']/g)) {
        assert.ok(/^node:/.test(spec) || /^\.\/[\w-]+\.mjs$/.test(spec), `${relative(root, f)}: imports ${spec}`);
      }
      assert.doesNotMatch(text, /\brequire\s*\(/, `${relative(root, f)}: require()`);
      assert.doesNotMatch(text, /import\s*\(\s*["'](?!node:|\.\/)/, `${relative(root, f)}: a dynamic import of a package`);
    }
  });

  test("nothing in the package depends on a library: package.json has no dependencies", () => {
    const pkg = JSON.parse(read("package.json"));
    for (const key of ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"]) assert.equal(pkg[key], undefined, key);
  });
});

describe("provenance: REFERENCES.md states where every method comes from", () => {
  const refs = existsSync(join(GROUND, "REFERENCES.md")) ? read("skills/tools/ground/REFERENCES.md") : "";
  const row = (id) => refs.split("\n").find((l) => l.startsWith(`| ${id} |`)) ?? "";

  test("the file exists and says the code is written from the definition, with no text or pseudocode pasted", () => {
    assert.ok(refs.length > 0, "REFERENCES.md is missing");
    assert.match(refs, /written from (?:the|each) (?:public )?definition/i);
    assert.match(refs, /no (?:text|code)[^.]*pseudocode[^.]*(?:is )?pasted|no text or pseudocode (?:is )?pasted/i);
  });

  test("Floyd-Steinberg: 7, 3, 5 and 1 over 16, a secondary page, opened with a date", () => {
    const r = row("GR1");
    assert.match(r, /Floyd/);
    assert.match(r, /7[^|]*3[^|]*5[^|]*1[^|]*16|7, 3, 5 and 1 over 16/);
    assert.match(r, /secondary/i);
    assert.match(r, /opened 2026-11-07/);
  });

  test("Atkinson: one eighth to each of six neighbours, so a quarter of the error is dropped", () => {
    const r = row("GR2");
    assert.match(r, /Atkinson/);
    assert.match(r, /one eighth|1\/8/i);
    assert.match(r, /six neighbours/);
    assert.match(r, /secondary/i);
    assert.match(r, /opened 2026-11-07/);
  });

  test("Bayer: the matrix is built by recursion, and the normalisation used is stated", () => {
    const r = row("GR3");
    assert.match(r, /Bayer|ordered/i);
    assert.match(r, /recursi/i);
    assert.match(r, /secondary/i);
    assert.match(r, /opened 2026-11-07/);
  });

  test("OKLab: the constants, their two sources, the licences read, the date opened, and the checks", () => {
    const r = row("GR4");
    assert.match(r, /CSS Color Module Level 4/);
    assert.match(r, /Ottosson/);
    assert.match(r, /public domain/i);
    assert.match(r, /MIT/);
    assert.match(r, /permissive document licen[cs]e/i);
    assert.match(r, /opened 2026-11-07/);
    assert.match(r, /round trip/i);
    assert.match(r, /anchor/i);
    assert.match(r, /matrices updated 2021-01-25|2021-01-25/);
  });

  test("the sRGB transfer function is a row of its own, from CSS Color 4", () => {
    const r = row("GR5");
    assert.match(r, /sRGB/);
    assert.match(r, /0\.04045/);
    assert.match(r, /0\.0031308/);
    assert.match(r, /opened 2026-11-07/);
  });

  test("the seeded random generator is defined in the file and not copied", () => {
    assert.match(refs, /random generator[^.]*(?:defined|written) in `raster\.mjs`[^.]*not (?:copied|pasted)/i);
  });

  test("halftone and ASCII are our own geometry and our own character ramp", () => {
    assert.match(refs, /halftone[^.]*our own/i);
    assert.match(refs, /ASCII[^.]*our own/i);
  });

  test("it names the programs no code was taken from, and says none is a dependency", () => {
    for (const name of ["jp2a", "libcaca", "ImageMagick", "FFmpeg"]) assert.match(refs, new RegExp(name), name);
    assert.match(refs, /no code from [^.]*jp2a[^.]*libcaca[^.]*ImageMagick[^.]*FFmpeg[^.]*is used/i);
    assert.match(refs, /none is a dependency/i);
  });

  test("it says no palette preset, sample image or font ships, and the ASCII tile names only the generic monospace family", () => {
    assert.match(refs, /no palette preset, sample image or font ships/i);
    assert.match(refs, /generic `monospace` family/);
    assert.match(refs, /no font file is bundled/i);
  });

  test("it says fixtures are made in code and never a photograph", () => {
    assert.match(refs, /fixtures are made in code[^.]*never a photograph/i);
  });

  test("it states the conduct of the source pass: public pages only, robots.txt respected, no account", () => {
    assert.match(refs, /public pages only/i);
    assert.match(refs, /robots\.txt/);
    assert.match(refs, /no (?:account|sign-in)/i);
  });
});

describe("provenance: the words of the folder, its docs page and its decision", () => {
  const texts = () =>
    [...(existsSync(GROUND) ? filesUnder(GROUND) : []).filter((f) => f.endsWith(".md")), join(root, "docs", "tools", "ground.md")]
      .filter(existsSync)
      .map((f) => [relative(root, f), readFileSync(f, "utf8")]);

  test("no text names another product as the model, or says this is a copy of one", () => {
    const products = /ultramock|dither it|ditherit|backgrounds\.supply|animos|shotcandy|devices\.css|photoshop|procreate/i;
    for (const [name, text] of texts()) {
      assert.doesNotMatch(text, products, `${name}: names another product`);
      assert.doesNotMatch(text, /\b(?:a|the) (?:copy|clone|replica|knock-?off) of\b/i, `${name}: says it is a copy`);
    }
  });

  test("no text calls into suits or names a build tool", () => {
    for (const [name, text] of texts()) {
      assert.doesNotMatch(text, /\/suits:/, name);
      assert.doesNotMatch(text, /\b(?:cooks?|kitchen|sub-?agents?|claude)\b/i, name);
    }
  });

  test("ADR 0004 says a tool may ship generator code and that nothing ships from another product", () => {
    const adrs = readdirSync(join(root, "docs", "adr")).filter((f) => /^0004-/.test(f));
    assert.equal(adrs.length, 1, "exactly one ADR 0004");
    const adr = read("docs", "adr", adrs[0]);
    assert.match(adr, /^# /m);
    assert.match(adr, /tool may ship (?:its own )?generator code/i);
    assert.match(adr, /nothing (?:ships|is shipped|is taken) from another product/i);
  });
});

// ---- fixtures, made in code ----

// A lit sphere on a soft ground, and a grey ramp: never a photograph.
function sphere(w, h) {
  const img = canvas(w, h);
  const cx = w / 2, cy = h / 2, r = Math.min(w, h) * 0.38;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (x - cx) / r, dy = (y - cy) / r, d2 = dx * dx + dy * dy;
    const v = d2 < 1 ? 60 + 190 * Math.max(0, (-dx * 0.5 - dy * 0.6 + Math.sqrt(1 - d2) * 0.62)) : 40 + 30 * (y / h);
    const o = (y * w + x) * 4;
    img.rgba[o] = img.rgba[o + 1] = img.rgba[o + 2] = Math.min(255, Math.round(v));
    img.rgba[o + 3] = 255;
  }
  return img;
}
function flat(w, h, grey) {
  const img = canvas(w, h);
  for (let i = 0; i < w * h; i++) img.rgba.set([grey, grey, grey, 255], i * 4);
  return img;
}
const BW = [[0, 0, 0], [255, 255, 255]];
const share = (r, index) => r.index.reduce((n, v) => n + (v === index ? 1 : 0), 0) / r.index.length;

describe("raster: PNG out and in", () => {
  test("an image written as a PNG reads back the same pixels, with its size", () => {
    const img = sphere(37, 23);
    const back = decodePng(pngBytes(img.w, img.h, img.rgba));
    assert.equal(back.w, 37);
    assert.equal(back.h, 23);
    assert.deepEqual([...back.rgba], [...img.rgba]);
  });
  test("the file starts with the PNG signature and the same input gives the same bytes", () => {
    const img = sphere(16, 16);
    const a = pngBytes(img.w, img.h, img.rgba), b = pngBytes(img.w, img.h, img.rgba);
    assert.deepEqual([...a.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
    assert.ok(a.equals(b));
  });
  test("a file that is not an 8-bit RGB or RGBA PNG is refused with a reason", () => {
    assert.throws(() => decodePng(Buffer.from("not a png at all")), /not a PNG/);
  });
});

describe("raster: colour (sRGB transfer, Oklab, OKLCH)", () => {
  const close = (a, b, eps, what) => a.forEach((v, i) => assert.ok(Math.abs(v - b[i]) <= eps, `${what}: ${a} vs ${b}`));

  test("hex parses with and without the hash, in three and six digits, and prints back", () => {
    assert.deepEqual(hex("#0b2a44"), [11, 42, 68]);
    assert.deepEqual(hex("fff"), [255, 255, 255]);
    assert.equal(toHex([11, 42, 68]), "#0b2a44");
    assert.throws(() => hex("#12345"), /not a colour/);
    assert.throws(() => hex("blue"), /not a colour/);
  });

  test("the sRGB transfer function matches its definition at the breakpoints and the ends", () => {
    close(toLinear([0, 255, 255 * 0.04045]), [0, 1, 0.04045 / 12.92], 1e-9, "linear");
    close(toSrgb([0.0031308, 1, 0]), [255 * 12.92 * 0.0031308, 255, 0], 1e-6, "encoded");
  });

  // Anchors: white is (1, 0, 0) and black is (0, 0, 0).
  test("anchors: white maps to (1, 0, 0) and black to (0, 0, 0)", () => {
    close(toOklab([255, 255, 255]), [1, 0, 0], 1e-4, "white");
    close(toOklab([0, 0, 0]), [0, 0, 0], 1e-9, "black");
  });

  // The CSS Color 4 route, through XYZ at 64-bit precision, with the sample table of the Oklab post as its own check.
  const CSS_LIN_TO_XYZ = [[506752 / 1228815, 87881 / 245763, 12673 / 70218], [87098 / 409605, 175762 / 245763, 12673 / 175545], [7918 / 409605, 87881 / 737289, 1001167 / 1053270]];
  const CSS_XYZ_TO_LMS = [[0.819022437996703, 0.3619062600528904, -0.1288737815209879], [0.0329836539323885, 0.9292868615863434, 0.0361446663506424], [0.0481771893596242, 0.2642395317527308, 0.6335478284694309]];
  const CSS_LMS_TO_OKLAB = [[0.210454268309314, 0.7936177747023054, -0.0040720430116193], [1.9779985324311684, -2.42859224204858, 0.450593709617411], [0.0259040424655478, 0.7827717124575296, -0.8086757549230774]];
  const mul = (m, v) => m.map((row) => row[0] * v[0] + row[1] * v[1] + row[2] * v[2]);
  const cssOklab = (xyz) => mul(CSS_LMS_TO_OKLAB, mul(CSS_XYZ_TO_LMS, xyz).map(Math.cbrt));

  test("anchors: the published XYZ to Oklab sample pairs hold on the CSS route", () => {
    close(cssOklab([0.95, 1, 1.089]), [1, 0, 0], 2e-3, "white point");
    close(cssOklab([1, 0, 0]), [0.45, 1.236, -0.019], 1e-3, "X");
    close(cssOklab([0, 1, 0]), [0.922, -0.671, 0.263], 1e-3, "Y");
    close(cssOklab([0, 0, 1]), [0.153, -1.415, -0.449], 1e-3, "Z");
  });

  test("anchors: the sRGB primaries and a mid colour agree with the CSS route to 1e-5", () => {
    for (const rgb of [[255, 0, 0], [0, 255, 0], [0, 0, 255], [255, 255, 255], [11, 42, 68], [200, 120, 30]]) {
      close(toOklab(rgb), cssOklab(mul(CSS_LIN_TO_XYZ, toLinear(rgb))), 1e-5, `rgb ${rgb}`);
    }
  });

  test("a round trip through Oklab returns every grey and a grid of colours to within 0.001 of a step", () => {
    for (let g = 0; g < 256; g++) close(fromOklab(toOklab([g, g, g])), [g, g, g], 1e-3, `grey ${g}`);
    for (let r = 0; r < 256; r += 51) for (let g = 0; g < 256; g += 51) for (let b = 0; b < 256; b += 51) close(fromOklab(toOklab([r, g, b])), [r, g, b], 1e-3, `rgb ${r},${g},${b}`);
  });

  test("a round trip through OKLCH, polar form and back, returns the colour; grey has no chroma", () => {
    for (const rgb of [[255, 0, 0], [12, 200, 90], [40, 40, 200], [128, 128, 128]]) close(fromOklab(fromOklch(toOklch(toOklab(rgb)))), rgb, 1e-3, `rgb ${rgb}`);
    const [L, C] = toOklch(toOklab([128, 128, 128]));
    assert.ok(C < 1e-6 && L > 0.5 && L < 0.7);
    const [, c2, h] = toOklch(toOklab([255, 0, 0]));
    assert.ok(Math.abs(c2 - 0.2577) < 1e-3, `red chroma ${c2}`);
    assert.ok(Math.abs(h - 29.23) < 0.05, `red hue ${h}`);
  });
});

describe("raster: the seeded random generator", () => {
  test("the same seed gives the same numbers and another seed gives others", () => {
    const a = rng(7), b = rng(7), c = rng(8);
    const sa = Array.from({ length: 50 }, a), sb = Array.from({ length: 50 }, b), sc = Array.from({ length: 50 }, c);
    assert.deepEqual(sa, sb);
    assert.notDeepEqual(sa, sc);
  });
  test("numbers lie in [0, 1) with mean 1/2, variance 1/12 and sixteen even buckets", () => {
    const r = rng(1), n = 160000, buckets = Array(16).fill(0);
    let sum = 0, sq = 0, prev = r(), lag = 0;
    for (let i = 0; i < n; i++) {
      const v = r();
      assert.ok(v >= 0 && v < 1);
      sum += v; sq += v * v; buckets[Math.floor(v * 16)]++; lag += (v - 0.5) * (prev - 0.5); prev = v;
    }
    assert.ok(Math.abs(sum / n - 0.5) < 0.005, `mean ${sum / n}`);
    assert.ok(Math.abs(sq / n - (1 / 12 + 0.25)) < 0.005, `second moment ${sq / n}`);
    for (const b of buckets) assert.ok(Math.abs(b / n - 1 / 16) < 0.003, `bucket ${b / n}`);
    assert.ok(Math.abs(lag / n) < 0.003, `lag-1 covariance ${lag / n}`);
  });
  test("a long run has no short repeat: 100,000 draws give nearly as many distinct values", () => {
    const r = rng(99), seen = new Set();
    for (let i = 0; i < 100000; i++) seen.add(r());
    assert.ok(seen.size > 99900, `${seen.size} distinct`);
  });
});

describe("dither: the ordered threshold map (Bayer)", () => {
  test("the maps follow the recursion: 1, 2 and 4 by hand", () => {
    assert.deepEqual(bayer(1), [[0]]);
    assert.deepEqual(bayer(2), [[0, 2], [3, 1]]);
    // Worked by hand from the recursion: 4M, 4M+2 above, 4M+3, 4M+1 below, with M = [[0, 2], [3, 1]].
    assert.deepEqual(bayer(4), [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]);
  });
  test("the 8 by 8 map holds each of 0 to 63 once", () => {
    assert.deepEqual(bayer(8).flat().sort((a, b) => a - b), Array.from({ length: 64 }, (_, i) => i));
  });
  test("a side that is not a power of two, and a side of zero, are refused", () => {
    for (const side of [0, 3, 6, 12]) assert.throws(() => bayer(side), /power of two/);
  });
});

describe("dither: the methods", () => {
  const METHODS = ["bayer2", "bayer4", "bayer8", "fs", "atkinson", "none"];

  test("every pixel is an index into the palette, for every method and a palette of two, four and sixteen", () => {
    const img = sphere(48, 40);
    for (const n of [2, 4, 16]) {
      const palette = Array.from({ length: n }, (_, i) => { const g = Math.round((255 * i) / (n - 1)); return [g, g, g]; });
      for (const method of METHODS) {
        const r = dither(img, { method, palette });
        assert.equal(r.index.length, 48 * 40);
        assert.ok(r.index.every((v) => v >= 0 && v < n), `${method} ${n}`);
      }
    }
  });

  test("the same input and method give the same PNG bytes, for every method", () => {
    const img = sphere(40, 30), palette = [hex("#111111"), hex("#f2efe6")];
    for (const method of METHODS) {
      const a = toRgba(dither(img, { method, palette })), b = toRgba(dither(img, { method, palette }));
      assert.ok(pngBytes(a.W, a.H, a.out).equals(pngBytes(b.W, b.H, b.out)), method);
    }
  });

  test("nearest colour is found in linear light: the split between black and white falls at 188, not 128", () => {
    const at = (g) => dither(flat(1, 1, g), { method: "none", palette: BW }).index[0];
    assert.equal(at(150), 0, "150 is darker than the middle of linear light");
    assert.equal(at(187), 0);
    assert.equal(at(189), 1);
  });

  test("a flat grey comes out with the share of light pixels its linear value says, for the maps and for error diffusion", () => {
    const grey = 128, expected = toLinear([grey, grey, grey])[0]; // 0.2158
    for (const method of ["bayer2", "bayer4", "bayer8"]) {
      const side = +method.slice(5);
      const got = share(dither(flat(64, 64, grey), { method, palette: BW }), 1);
      assert.ok(Math.abs(got - expected) <= 1 / (side * side) + 1e-9, `${method}: ${got} vs ${expected}`);
    }
    const fs = share(dither(flat(64, 64, grey), { method: "fs", palette: BW }), 1);
    assert.ok(Math.abs(fs - expected) < 0.02, `fs: ${fs} vs ${expected}`);
  });

  test("Atkinson keeps the average only where the error is not dropped: darks come out darker and lights lighter", () => {
    const darkWant = toLinear([128, 128, 128])[0], lightGrey = Math.round(toSrgb([0.8])[0]), lightWant = toLinear([lightGrey, lightGrey, lightGrey])[0];
    const dark = share(dither(flat(64, 64, 128), { method: "atkinson", palette: BW }), 1);
    const light = share(dither(flat(64, 64, lightGrey), { method: "atkinson", palette: BW }), 1);
    assert.ok(dark < darkWant - 0.03, `dark ${dark} against ${darkWant}`);
    assert.ok(light > lightWant + 0.03, `light ${light} against ${lightWant}`);
  });

  test("Floyd–Steinberg passes on all of the error and Atkinson only six eighths, so Atkinson loses the near-white", () => {
    // Linear 0.95 as a grey value, on black and white: Floyd–Steinberg keeps about 5% black, Atkinson fewer.
    const g = Math.round(toSrgb([0.95])[0]);
    const fs = share(dither(flat(96, 96, g), { method: "fs", palette: BW }), 0);
    const at = share(dither(flat(96, 96, g), { method: "atkinson", palette: BW }), 0);
    assert.ok(fs > 0.03 && fs < 0.07, `fs black share ${fs}`);
    assert.ok(at < fs - 0.015, `atkinson black share ${at} against ${fs}`);
  });

  test("with a two-colour palette that is not black and white, the share still follows the palette's own light", () => {
    const palette = [hex("#111111"), hex("#f2efe6")];
    const lo = toLinear(palette[0]), hi = toLinear(palette[1]), v = 0.4;
    const g = toSrgb([v, v, v]).map(Math.round), grey = toLinear(g)[0];
    // The share that keeps the average of every channel: the least-squares fit of the grey between the two colours.
    let top = 0, bottom = 0;
    for (let c = 0; c < 3; c++) { top += (grey - lo[c]) * (hi[c] - lo[c]); bottom += (hi[c] - lo[c]) ** 2; }
    const want = top / bottom;
    for (const method of ["bayer8", "fs"]) {
      const got = share(dither(flat(64, 64, g[0]), { method, palette }), 1);
      assert.ok(Math.abs(got - want) < 0.03, `${method}: ${got} vs ${want}`);
    }
  });

  test("bad input is refused with a reason: an unknown method, a palette of one, a palette of 257, no image", () => {
    const img = flat(2, 2, 100);
    assert.throws(() => dither(img, { method: "sierra", palette: BW }), /unknown method sierra/);
    assert.throws(() => dither(img, { method: "fs", palette: [[0, 0, 0]] }), /2 to 256 colours/);
    assert.throws(() => dither(img, { method: "fs", palette: Array.from({ length: 257 }, () => [1, 2, 3]) }), /2 to 256 colours/);
    assert.throws(() => dither(null, { method: "fs", palette: BW }), /image/);
  });

  test("the output is the palette's own colours and nothing else, as PNG at any whole scale", () => {
    const palette = [hex("#0b2a44"), hex("#f4e8d0"), hex("#c8553d")];
    const r = dither(sphere(20, 12), { method: "fs", palette }), { W, H, out } = toRgba(r, 3);
    assert.equal(W, 60);
    assert.equal(H, 36);
    const colours = new Set();
    for (let i = 0; i < W * H; i++) colours.add(toHex([out[i * 4], out[i * 4 + 1], out[i * 4 + 2]]));
    assert.ok([...colours].every((c) => ["#0b2a44", "#f4e8d0", "#c8553d"].includes(c)));
    assert.ok(Array.from({ length: W * H }, (_, i) => out[i * 4 + 3]).every((a) => a === 255));
  });
});

describe("dither: SVG out", () => {
  const palette = [hex("#0b2a44"), hex("#f4e8d0")];
  const svg = toSvg(dither(sphere(24, 16), { method: "bayer4", palette }), 2);
  test("it has a viewBox at the scaled size, crisp edges and no filter", () => {
    assert.match(svg, /^<svg [^>]*viewBox="0 0 48 32"/);
    assert.match(svg, /shape-rendering="crispEdges"/);
    assert.doesNotMatch(svg, /feTurbulence|<filter|repeating-linear-gradient|data:/);
  });
  test("it draws the commonest colour once as the ground and the rest as runs, in palette colours only", () => {
    const fills = new Set([...svg.matchAll(/fill="(#[0-9a-f]{6})"/g)].map((m) => m[1]));
    assert.ok([...fills].every((c) => ["#0b2a44", "#f4e8d0"].includes(c)), [...fills].join());
    assert.equal(svg.match(/<rect width="100%"/g).length, 1);
    assert.ok(svg.match(/<rect /g).length < 24 * 16, "runs, not one rect per pixel");
  });
  test("the same input gives the same text", () => {
    assert.equal(svg, toSvg(dither(sphere(24, 16), { method: "bayer4", palette }), 2));
  });
});

// ---- the grounds ----

const px = (img, x, y) => [...img.rgba.subarray((y * img.w + x) * 4, (y * img.w + x) * 4 + 4)];
const near = (a, b, eps, what) => a.forEach((v, i) => assert.ok(Math.abs(v - b[i]) <= eps, `${what}: ${a} vs ${b}`));
const oklabMix = (a, b, t) => fromOklab(toOklab(hex(a)).map((v, i) => v + (toOklab(hex(b))[i] - v) * t));

describe("grounds: linear gradient, mixed in Oklab", () => {
  test("the first and last columns are the first and last stops, and the size is the size asked", () => {
    const g = linear(64, 8, ["#0b2a44", "#f4e8d0"], 0);
    assert.equal(g.w, 64);
    assert.equal(g.h, 8);
    near(px(g, 0, 4).slice(0, 3), hex("#0b2a44"), 3, "left");
    near(px(g, 63, 4).slice(0, 3), hex("#f4e8d0"), 3, "right");
    assert.ok(px(g, 10, 0).every((v, i) => v === px(g, 10, 7)[i]), "angle 0 changes along x only");
  });
  test("the middle is the Oklab mix, which is not the sRGB mix: blue to yellow does not pass through grey", () => {
    const g = linear(101, 1, ["#0000ff", "#ffff00"], 0), mid = px(g, 50, 0).slice(0, 3);
    near(mid, oklabMix("#0000ff", "#ffff00", 0.5), 2, "oklab middle");
    assert.ok(Math.abs(mid[0] - 127.5) > 20 || Math.abs(mid[2] - 127.5) > 20, `middle ${mid} is the sRGB average`);
  });
  test("three stops are evenly spaced: the middle column is the middle stop", () => {
    const g = linear(101, 1, ["#ff0000", "#00aa00", "#0000ff"], 0);
    near(px(g, 50, 0).slice(0, 3), [0, 170, 0], 3, "middle stop");
  });
  test("angle 90 runs top to bottom, and the result is opaque", () => {
    const g = linear(8, 40, ["#000000", "#ffffff"], 90);
    assert.ok(px(g, 0, 5)[0] < px(g, 0, 35)[0]);
    assert.ok(px(g, 0, 5).every((v, i) => v === px(g, 7, 5)[i]));
    assert.ok(Array.from({ length: 8 * 40 }, (_, i) => g.rgba[i * 4 + 3]).every((a) => a === 255));
  });
  test("fewer than two stops is refused", () => assert.throws(() => linear(4, 4, ["#000000"]), /at least two stops/));
});

describe("grounds: mesh gradient", () => {
  const points = [{ x: 0.1, y: 0.1, color: "#c8553d" }, { x: 0.9, y: 0.2, color: "#0b2a44" }, { x: 0.5, y: 0.9, color: "#f4e8d0" }];
  test("at a point the colour is that point's colour", () => {
    const g = mesh(100, 60, points);
    near(px(g, 10, 6).slice(0, 3), hex("#c8553d"), 6, "first point");
    near(px(g, 90, 12).slice(0, 3), hex("#0b2a44"), 6, "second point");
  });
  test("it is deterministic and one colour makes a flat field", () => {
    assert.deepEqual([...mesh(40, 30, points).rgba], [...mesh(40, 30, points).rgba]);
    const flatMesh = mesh(10, 10, [{ x: 0, y: 0, color: "#336699" }, { x: 1, y: 1, color: "#336699" }]);
    for (let i = 0; i < 100; i++) near([...flatMesh.rgba.subarray(i * 4, i * 4 + 3)], hex("#336699"), 1, "flat");
  });
  test("a point outside the frame, or no points, is refused", () => {
    assert.throws(() => mesh(10, 10, []), /at least one point/);
    assert.throws(() => mesh(10, 10, [{ x: 2, y: 0, color: "#000000" }]), /between 0 and 1/);
  });
});

describe("grounds: blur field", () => {
  test("far from a blob it is the base, and at the centre of a full-strength blob it is the blob's colour", () => {
    const g = blurField(120, 80, "#101820", [{ x: 0.5, y: 0.5, r: 0.1, color: "#e0a030" }]);
    near(px(g, 0, 0).slice(0, 3), hex("#101820"), 2, "corner");
    near(px(g, 60, 40).slice(0, 3), hex("#e0a030"), 2, "centre");
  });
  test("a blob of strength 0 changes nothing", () => {
    const g = blurField(20, 20, "#101820", [{ x: 0.5, y: 0.5, r: 0.3, color: "#e0a030", strength: 0 }]);
    for (let i = 0; i < 400; i++) near([...g.rgba.subarray(i * 4, i * 4 + 3)], hex("#101820"), 1, "base");
  });
});

describe("grounds: grain (seeded)", () => {
  const base = linear(64, 64, ["#444444", "#bbbbbb"], 45);
  test("amount 0 changes nothing, the same seed gives the same bytes and another seed gives others", () => {
    assert.deepEqual([...grain(base, 0, 1).rgba], [...base.rgba]);
    assert.deepEqual([...grain(base, 0.05, 3).rgba], [...grain(base, 0.05, 3).rgba]);
    assert.notDeepEqual([...grain(base, 0.05, 3).rgba], [...grain(base, 0.05, 4).rgba]);
  });
  test("it moves lightness about zero on average and by about a third of the amount", () => {
    const out = grain(flat(96, 96, 128), 0.06, 5), L0 = toOklab([128, 128, 128])[0];
    let sum = 0, sq = 0;
    for (let i = 0; i < 96 * 96; i++) { const d = toOklab([...out.rgba.subarray(i * 4, i * 4 + 3)])[0] - L0; sum += d; sq += d * d; }
    const n = 96 * 96;
    assert.ok(Math.abs(sum / n) < 0.003, `mean shift ${sum / n}`);
    const sd = Math.sqrt(sq / n - (sum / n) ** 2);
    assert.ok(sd > 0.06 / 3 - 0.008 && sd < 0.06 / 3 + 0.008, `spread ${sd}`);
  });
  test("a grain size of 4 makes the noise in blocks of 4 by 4 pixels", () => {
    const out = grain(flat(32, 32, 128), 0.08, 2, 4);
    assert.deepEqual(px(out, 4, 4), px(out, 7, 7));
    assert.deepEqual(px(out, 0, 0), px(out, 3, 3));
    assert.ok(new Set(Array.from({ length: 64 }, (_, i) => px(out, (i % 8) * 4, Math.floor(i / 8) * 4).join())).size > 8);
  });
  test("it keeps hue: a coloured field stays that colour on average", () => {
    const field = linear(64, 64, ["#c8553d", "#c8553d"], 0), out = grain(field, 0.05, 9);
    let r = 0, b = 0;
    for (let i = 0; i < 64 * 64; i++) { r += out.rgba[i * 4]; b += out.rgba[i * 4 + 2]; }
    assert.ok(r / 4096 > b / 4096 + 60, "still orange");
  });
});

describe("grounds: halftone", () => {
  const coverage = (img, ink) => { let n = 0; for (let i = 0; i < img.w * img.h; i++) if (img.rgba[i * 4] === ink[0] && img.rgba[i * 4 + 1] === ink[1]) n++; return n / (img.w * img.h); };
  test("a dark field is mostly ink and a light one mostly paper, and coverage falls as the field lightens", () => {
    const cov = (g) => coverage(halftone(flat(100, 100, g), "#101010", "#f0f0f0", 10, 45), hex("#101010"));
    assert.ok(cov(10) > 0.5, `dark ${cov(10)}`);
    assert.ok(cov(255) < 0.01, `white ${cov(255)}`);
    assert.ok(cov(60) > cov(128) && cov(128) > cov(200), `${cov(60)} ${cov(128)} ${cov(200)}`);
  });
  test("every pixel lies between the ink and the paper, and the result is deterministic", () => {
    const out = halftone(sphere(80, 60), "#101010", "#f0f0f0", 8, 30);
    for (let i = 0; i < 80 * 60; i++) assert.ok(out.rgba[i * 4] >= 16 && out.rgba[i * 4] <= 240);
    assert.deepEqual([...out.rgba], [...halftone(sphere(80, 60), "#101010", "#f0f0f0", 8, 30).rgba]);
  });
  test("a cell smaller than 2 pixels is refused", () => assert.throws(() => halftone(flat(8, 8, 100), "#000000", "#ffffff", 1, 0), /cell/));
});

describe("grounds: ASCII", () => {
  const field = linear(240, 160, ["#000000", "#ffffff"], 0);
  const svg = asciiSvg(field, "#0b2a44", "#f4e8d0", 12);
  test("it is an SVG with a viewBox of the field's size, the two colours, the generic monospace family and no embedded font", () => {
    assert.match(svg, /^<svg [^>]*viewBox="0 0 240 160"/);
    assert.match(svg, /fill="#0b2a44"/);
    assert.match(svg, /fill="#f4e8d0"/);
    assert.match(svg, /font-family="monospace"/);
    assert.doesNotMatch(svg, /@font-face|data:|<image|feTurbulence/);
  });
  test("each row is one text element spread over the full width, and the characters come from the ramp", () => {
    const rows = [...svg.matchAll(/<text [^>]*textLength="(\d+)"[^>]*>([^<]*)<\/text>/g)];
    assert.ok(rows.length >= 5, `${rows.length} rows`);
    for (const [, length, line] of rows) {
      assert.equal(+length, 240);
      assert.equal(line.length, 20);
      assert.ok([...line].every((c) => " .,:;+*#%@".includes(c)), line);
    }
  });
  test("the dark side of the field takes the dense characters and the light side the sparse ones", () => {
    const line = svg.match(/<text [^>]*>([^<]*)<\/text>/)[1];
    assert.ok(" .,".includes(line[line.length - 1]) && "#%@".includes(line[0]), line);
  });
  test("a ramp character that is special in XML is escaped", () => {
    assert.match(asciiSvg(flat(24, 40, 0), "#000000", "#ffffff", 12, " <&"), /&lt;|&amp;/);
    assert.doesNotMatch(asciiSvg(flat(24, 40, 0), "#000000", "#ffffff", 12, " <&"), />[^<]*[<][^/a-z]/);
  });
  test("it is deterministic", () => assert.equal(svg, asciiSvg(field, "#0b2a44", "#f4e8d0", 12)));
});

// ---- the command line ----

const work = mkdtempSync(join(tmpdir(), "bauhaus-ground-"));
after(() => rmSync(work, { recursive: true, force: true }));
const GROUND_MJS = join(GROUND, "ground.mjs");
const tokenFile = join(work, "design.tokens");
const color = (h) => ({ $value: { colorSpace: "srgb", components: hex(h).map((v) => v / 255), hex: h } });
writeFileSync(tokenFile, JSON.stringify({
  primitive: { color: { ink: color("#0b2a44"), paper: color("#f4e8d0"), rust: color("#c8553d"), moss: color("#4f6f3a"),
    soft: { $value: { colorSpace: "oklch", components: [0.7, 0.1, 200] } }, wild: { $value: { colorSpace: "oklch", components: [0.7, 0.4, 150] } } } },
  semantic: { color: { ink: { $value: "{primitive.color.ink}" }, paper: { $value: "{primitive.color.paper}" }, accent: { $value: "{primitive.color.rust}" }, moss: { $value: "{primitive.color.moss}" },
    soft: { $value: "{primitive.color.soft}" }, wild: { $value: "{primitive.color.wild}" } } },
}));
const T = ["--tokens", tokenFile];
const cli = (...args) => spawnSync(process.execPath, [GROUND_MJS, ...args], { encoding: "utf8", cwd: work, timeout: 60000 });
const png = (name) => decodePng(readFileSync(join(work, name)));

describe("command line: colours come from the token file", () => {
  test("a linear ground is written as a PNG of the size asked, and a second run gives the same bytes", () => {
    const a = cli("linear", ...T, "--stops", "semantic.color.ink,semantic.color.paper", "--size", "64x40", "--angle", "0", "--out", "lin-a.png");
    assert.equal(a.status, 0, a.stderr);
    const img = png("lin-a.png");
    assert.deepEqual([img.w, img.h], [64, 40]);
    near([...img.rgba.subarray(0, 3)], hex("#0b2a44"), 3, "first stop");
    assert.equal(cli("linear", ...T, "--stops", "semantic.color.ink,semantic.color.paper", "--size", "64x40", "--angle", "0", "--out", "lin-b.png").status, 0);
    assert.ok(readFileSync(join(work, "lin-a.png")).equals(readFileSync(join(work, "lin-b.png"))));
  });
  test("a colour that is not a token path is refused: stops come only from the token file", () => {
    const r = cli("linear", ...T, "--stops", "#ff00ff,semantic.color.paper", "--size", "8x8", "--out", "bad.png");
    assert.equal(r.status, 1);
    assert.match(r.stderr, /colour stops come from the token file/);
    assert.ok(!existsSync(join(work, "bad.png")));
  });
  test("a token path that is not in the file is named", () => {
    const r = cli("linear", ...T, "--stops", "semantic.color.ink,semantic.color.nope", "--size", "8x8", "--out", "bad.png");
    assert.equal(r.status, 1);
    assert.match(r.stderr, /semantic\.color\.nope: not a token/);
  });
  test("an oklch token is used as its computed colour, and one outside the sRGB gamut is refused", () => {
    assert.equal(cli("linear", ...T, "--stops", "semantic.color.soft,semantic.color.ink", "--size", "8x8", "--out", "soft.png").status, 0);
    const r = cli("linear", ...T, "--stops", "semantic.color.wild,semantic.color.ink", "--size", "8x8", "--out", "wild.png");
    assert.equal(r.status, 1);
    assert.match(r.stderr, /semantic\.color\.wild[^\n]*outside the sRGB gamut/);
  });
  test("a missing or unknown option, an unknown command and a wrong output type are refused with a reason", () => {
    assert.match(cli("linear", ...T, "--size", "8x8", "--out", "x.png").stderr, /--stops is needed/);
    assert.match(cli("linear", ...T, "--stops", "semantic.color.ink,semantic.color.paper", "--size", "8x8", "--bogus", "1", "--out", "x.png").stderr, /unknown option --bogus/);
    assert.match(cli("sparkle").stderr, /unknown command sparkle/);
    assert.match(cli("linear", ...T, "--stops", "semantic.color.ink,semantic.color.paper", "--size", "8x8", "--out", "x.svg").stderr, /a ground is a PNG/);
    assert.match(cli("linear", ...T, "--stops", "semantic.color.ink,semantic.color.paper", "--size", "0x8", "--out", "x.png").stderr, /--size/);
    for (const r of [cli("sparkle"), cli("linear")]) assert.equal(r.status, 1);
  });
  test("with no arguments it prints its usage and exits 1", () => {
    const r = cli();
    assert.equal(r.status, 1);
    assert.match(r.stderr, /usage:/);
  });
});

describe("command line: mesh and blur only when the brief names one", () => {
  const briefYes = join(work, "brief-yes.md"), briefNo = join(work, "brief-no.md");
  writeFileSync(briefYes, "## Surface\nA soft mesh ground behind the headline.\n");
  writeFileSync(briefNo, "## Surface\nA flat colour ground.\n");
  const args = ["mesh", ...T, "--points", "0.1,0.1,semantic.color.accent;0.9,0.8,semantic.color.ink", "--size", "40x30", "--out", "mesh.png"];
  test("with no brief, or a brief that does not name it, it is refused and writes nothing", () => {
    for (const extra of [[], ["--brief", briefNo], ["--brief", join(work, "missing.md")]]) {
      const r = cli(...args, ...extra);
      assert.equal(r.status, 1);
      assert.match(r.stderr, /only when the brief names/);
    }
    assert.ok(!existsSync(join(work, "mesh.png")));
  });
  test("with a brief that names a mesh it is made", () => {
    const r = cli(...args, "--brief", briefYes);
    assert.equal(r.status, 0, r.stderr);
    assert.deepEqual([png("mesh.png").w, png("mesh.png").h], [40, 30]);
  });
  test("the blur field has the same rule", () => {
    const blur = ["blur", ...T, "--base", "semantic.color.ink", "--blobs", "0.5,0.5,0.2,semantic.color.accent", "--size", "40x30", "--out", "blur.png"];
    assert.match(cli(...blur).stderr, /only when the brief names/);
    writeFileSync(join(work, "brief-blur.md"), "Use a blur field of two colours.\n");
    assert.equal(cli(...blur, "--brief", join(work, "brief-blur.md")).status, 0);
  });
});

describe("command line: grain, halftone, ASCII and dither", () => {
  test("grain on a gradient is seeded: same seed same bytes, another seed other bytes", () => {
    const make = (name, seed) => cli("linear", ...T, "--stops", "semantic.color.ink,semantic.color.paper", "--size", "48x32", "--grain", "0.05", "--seed", seed, "--out", name);
    assert.equal(make("g1.png", "1").status, 0);
    assert.equal(make("g1b.png", "1").status, 0);
    assert.equal(make("g2.png", "2").status, 0);
    assert.ok(readFileSync(join(work, "g1.png")).equals(readFileSync(join(work, "g1b.png"))));
    assert.ok(!readFileSync(join(work, "g1.png")).equals(readFileSync(join(work, "g2.png"))));
  });
  test("grain of an existing PNG, then halftone of a ground, then ASCII to SVG", () => {
    assert.equal(cli("grain", "--in", "lin-a.png", "--amount", "0.04", "--seed", "3", "--out", "lin-grain.png").status, 0);
    assert.deepEqual([png("lin-grain.png").w, png("lin-grain.png").h], [64, 40]);
    const h = cli("halftone", ...T, "--in", "lin-a.png", "--ink", "semantic.color.ink", "--paper", "semantic.color.paper", "--cell", "8", "--angle", "45", "--out", "ht.png");
    assert.equal(h.status, 0, h.stderr);
    assert.deepEqual([png("ht.png").w, png("ht.png").h], [64, 40]);
    const a = cli("ascii", ...T, "--in", "lin-a.png", "--bg", "semantic.color.ink", "--fg", "semantic.color.paper", "--cell", "8", "--out", "tile.svg");
    assert.equal(a.status, 0, a.stderr);
    assert.match(readFileSync(join(work, "tile.svg"), "utf8"), /^<svg [^>]*viewBox="0 0 64 40"/);
  });
  test("dither reads a PNG and writes a PNG or an SVG in the token palette only", () => {
    writeFileSync(join(work, "src.png"), pngBytes(48, 32, sphere(48, 32).rgba));
    const base = ["dither", ...T, "--in", "src.png", "--method", "atkinson", "--palette", "semantic.color.ink,semantic.color.paper,semantic.color.accent", "--scale", "2"];
    const a = cli(...base, "--out", "dith.png");
    assert.equal(a.status, 0, a.stderr);
    const img = png("dith.png");
    assert.deepEqual([img.w, img.h], [96, 64]);
    const colours = new Set(Array.from({ length: 96 * 64 }, (_, i) => toHex([...img.rgba.subarray(i * 4, i * 4 + 3)])));
    assert.ok([...colours].every((c) => ["#0b2a44", "#f4e8d0", "#c8553d"].includes(c)), [...colours].join());
    assert.equal(cli(...base, "--out", "dith.svg").status, 0);
    assert.match(readFileSync(join(work, "dith.svg"), "utf8"), /viewBox="0 0 96 64"/);
    assert.equal(cli(...base, "--out", "dith2.png").status, 0);
    assert.ok(readFileSync(join(work, "dith.png")).equals(readFileSync(join(work, "dith2.png"))), "same input and method, same bytes");
  });
  test("a palette entry that is a hex colour, a method that does not exist, and a missing input are refused", () => {
    const base = ["dither", ...T, "--in", "src.png", "--out", "n.png"];
    assert.match(cli(...base, "--palette", "#000000,semantic.color.paper").stderr, /colour stops come from the token file|palette colours come from the token file/);
    assert.match(cli(...base, "--palette", "semantic.color.ink,semantic.color.paper", "--method", "sierra").stderr, /unknown method sierra/);
    assert.match(cli("dither", ...T, "--in", "nope.png", "--palette", "semantic.color.ink,semantic.color.paper", "--out", "n.png").stderr, /nope\.png/);
  });
});

// ---- the skill and its docs page ----

describe("the ground skill: the defaults, and the examples it shows", () => {
  const skill = read("skills/tools/ground/SKILL.md"), page = read("docs/tools/ground.md");

  test("it states the defaults: not called by default, stops only from the token file, mesh and blur only when the brief names one, PNG for grain and stripes, PNG at final size for email", () => {
    assert.match(skill, /Not called by default/);
    assert.match(skill, /Colour stops come only from the token file/);
    assert.match(skill, /only when the brief names it/i);
    assert.match(skill, /Grain and stripes are a PNG, never a filter/);
    assert.match(skill, /feTurbulence/);
    assert.match(skill, /For email the ground is a PNG at final size/);
    assert.match(skill, /does not clip/i);
    for (const phrase of [/not called by default/i, /token path/i, /only when the brief names one/i, /never a filter|never an SVG/i, /PNG at the final size/i]) assert.match(page, phrase);
  });

  test("it names every command and every dither method, and follows the design method first", () => {
    for (const c of ["linear", "mesh", "blur", "grain", "halftone", "ascii", "dither"]) assert.match(skill, new RegExp(`\`${c}\``), c);
    for (const m of ["bayer2", "bayer4", "bayer8", "fs", "atkinson", "none"]) assert.match(skill, new RegExp(`\`${m}\``), m);
    assert.match(skill, /Follow the `design` method first/);
    assert.match(skill, /REFERENCES\.md/);
    assert.match(skill, /ARTCRAFT\.md/);
  });

  test("it says no craft rule is written, because no source about the craft was opened", () => {
    assert.match(skill, /no craft rule is written here/i);
  });

  test("its hand-over has a verdict first line, the commands kept as ground.sh, and what was not checked", () => {
    const hand = skill.split(/^## Hand over/m)[1];
    assert.match(hand, /First line: the verdict with its command and result/);
    assert.match(hand, /ground\.sh/);
    assert.match(hand, /not checked/i);
  });

  test("every example command in the skill runs, in order, and writes the file it names", () => {
    const lines = [...skill.matchAll(/^node skills\/tools\/ground\/ground\.mjs .*$/gm)].map((m) => m[0]);
    assert.equal(lines.length, 7, "one example for each command");
    const ex = join(work, "examples");
    mkdirSync(join(ex, "ground"), { recursive: true });
    writeFileSync(join(ex, "brief.md"), "A mesh ground and a blur field, both named in this brief.\n");
    writeFileSync(join(ex, "ground", "source.png"), pngBytes(48, 32, sphere(48, 32).rgba));
    const haveChrome = spawnSync("timeout", ["5", "google-chrome", "--version"]).status === 0;
    for (const line of lines) {
      assert.doesNotMatch(line, /#[0-9a-f]{3,6}\b/i, `a hex colour in: ${line}`);
      let text = line.replaceAll("/project/design.tokens", tokenFile).replaceAll("/project/brief.md", join(ex, "brief.md")).replaceAll("/project/ground/", `${join(ex, "ground")}/`);
      if (!haveChrome) text = text.replace("ascii.png", "ascii.svg");
      const argv = [...text.matchAll(/"([^"]*)"|(\S+)/g)].map((m) => m[1] ?? m[2]).slice(2); // after node and the script
      const r = spawnSync(process.execPath, [GROUND_MJS, ...argv], { encoding: "utf8", cwd: ex, timeout: 120000 });
      assert.equal(r.status, 0, `${line}\n${r.stderr}`);
      assert.ok(existsSync(argv[argv.indexOf("--out") + 1]), line);
    }
  });
});

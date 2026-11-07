// skills/tools/design/check.mjs: each subcommand accepts a valid input and rejects each defect named in the spec.
// Inputs are written to a temporary directory per test run, so no fixture files live in the repo.
// No test reads the clock: dates are arguments (--as-of) or fixed values.
//
//   node --test test/design.test.mjs
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync, crc32 } from "node:zlib";

const here = dirname(fileURLToPath(import.meta.url));
const designDir = join(here, "..", "skills", "tools", "design");
const CHECK = join(designDir, "check.mjs");
const scratch = mkdtempSync(join(tmpdir(), "bauhaus-design-"));
after(() => rmSync(scratch, { recursive: true, force: true }));

let n = 0;
// Writes `files` (name to content) into a fresh directory; returns the directory.
function dir(files = {}) {
  const d = join(scratch, `d${n++}`);
  mkdirSync(d, { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    mkdirSync(dirname(join(d, name)), { recursive: true });
    writeFileSync(join(d, name), content);
  }
  return d;
}
// Runs check.mjs with arguments; paths starting with "@" are resolved inside `cwd`.
function ck(args, cwd = scratch) {
  const r = spawnSync(process.execPath, [CHECK, ...args], { cwd, encoding: "utf8", timeout: 20000 });
  return { status: r.status, out: r.stdout, err: r.stderr, all: r.stdout + r.stderr, first: r.stdout.split("\n")[0] };
}
function ok(args, cwd) {
  const r = ck(args, cwd);
  assert.equal(r.status, 0, r.all);
  return r;
}
function bad(args, message, cwd) {
  const r = ck(args, cwd);
  assert.notEqual(r.status, 0, `expected failure: ${r.all}`);
  assert.ok(r.all.includes(message), `expected "${message}" in:\n${r.all}`);
  return r;
}

// ---- contrast ----

test("contrast: black on white is 21:1 and white on black the same", () => {
  assert.match(ok(["contrast", "#000000", "#ffffff"]).out, /^21:1\b/);
  assert.match(ok(["contrast", "#ffffff", "#000000"]).out, /^21:1\b/);
});

test("contrast: #767676 on white is 4.54:1 and passes text", () => {
  const r = ok(["contrast", "#767676", "#ffffff"]);
  assert.match(r.out, /^4\.54:1\b/);
  assert.match(r.out, /text \(4\.5\): pass/);
});

test("contrast: #777777 on white is 4.48:1 and fails text", () => {
  const r = ok(["contrast", "#777777", "#ffffff"]);
  assert.match(r.out, /^4\.48:1\b/);
  assert.match(r.out, /text \(4\.5\): fail/);
  assert.match(r.out, /large and ui \(3\): pass/);
});

test("contrast: accepts #fff, #FFF and #FFFFFF", () => {
  for (const white of ["#fff", "#FFF", "#FFFFFF"]) assert.match(ok(["contrast", "#000", white]).out, /^21:1\b/);
});

test("contrast: a pair just under 4.5 never shows 4.50 beside a fail", () => {
  const r = ok(["contrast", "#006ffb", "#ffffff"]);
  assert.match(r.out, /^4\.4999:1\b/);
  assert.match(r.out, /text \(4\.5\): fail/);
  assert.doesNotMatch(r.out, /4\.50/);
});

test("contrast: a pair just under 3 never shows 3.00 beside a fail", () => {
  const r = ok(["contrast", "#0099ff", "#ffffff"]);
  assert.match(r.out, /^2\.9998:1\b/);
  assert.match(r.out, /large and ui \(3\): fail/);
  assert.doesNotMatch(r.out, /3\.00/);
});

test("contrast: --min makes a failing pair exit 1", () => {
  assert.equal(ck(["contrast", "#777777", "#ffffff", "--min", "4.5"]).status, 1);
  assert.equal(ck(["contrast", "#767676", "#ffffff", "--min", "4.5"]).status, 0);
});

test("contrast: a colour name is an error and prints no ratio", () => {
  const r = bad(["contrast", "red", "#ffffff"], 'not a colour: "red"');
  assert.doesNotMatch(r.out, /:1/);
});

test("contrast: a short hex of five digits is an error", () => {
  const r = bad(["contrast", "#12345", "#fff"], 'not a colour: "#12345"');
  assert.doesNotMatch(r.out, /:1/);
});

test("contrast: a colour with alpha is an error, because a ratio over it is a guess", () => {
  for (const alpha of ["#ff000080", "#f008"]) {
    const r = bad(["contrast", alpha, "#fff"], "cannot compute a ratio over a translucent colour");
    assert.doesNotMatch(r.out, /:1/);
  }
});

test("the luminance formula appears once in check.mjs", () => {
  assert.equal(readFileSync(CHECK, "utf8").split("0.2126").length - 1, 1);
});

// ---- token files ----

const srgb = (hex) => ({ colorSpace: "srgb", components: [1, 3, 5].map((i) => Number((parseInt(hex.slice(i, i + 2), 16) / 255).toFixed(6))), hex });
const px = (value) => ({ value, unit: "px" });
const VALID_TOKENS = {
  primitive: {
    color: {
      $type: "color",
      ink: { $value: srgb("#111827") },
      paper: { $value: srgb("#ffffff") },
      blue: { $value: srgb("#1f4e79") },
      grey: { $value: srgb("#595959") },
      mist: { $value: srgb("#e5e7eb") },
      wash: { $value: srgb("#f3f4f6") },
      base: { $value: "{primitive.color.blue}" },
    },
    font: { $type: "fontFamily", body: { $value: ["IBM Plex Sans", "Helvetica Neue", "sans-serif"] } },
  },
  semantic: {
    color: {
      $type: "color",
      text: { $value: "{primitive.color.ink}" },
      surface: { $value: "{primitive.color.paper}" },
      accent: { $value: "{primitive.color.base}" },
      muted: { $value: "{primitive.color.grey}" },
      border: { $value: "{primitive.color.mist}" },
      tint: { $value: "{primitive.color.wash}" },
    },
    font: { $type: "fontFamily", body: { $value: "{primitive.font.body}" } },
  },
  component: { button: { background: { $type: "color", $value: "{semantic.color.accent}" } } },
  document: {
    accent: { $type: "color", $value: "{semantic.color.accent}" },
    ink: { $type: "color", $value: "{semantic.color.text}" },
    muted: { $type: "color", $value: "{semantic.color.muted}" },
    line: { $type: "color", $value: "{semantic.color.border}" },
    tint: { $type: "color", $value: "{semantic.color.tint}" },
    font: { $type: "fontFamily", $value: "{semantic.font.body}" },
  },
  grid: { $type: "dimension", columns: { $type: "number", $value: 12 }, gutter: { $value: px(16) }, margin: { $value: px(24) } },
  type: { $type: "dimension", base: { $value: px(16) }, "step-1": { $value: px(20) }, "step-2": { $value: px(25) }, measure: { $type: "number", $value: 65 } },
  space: { $type: "dimension", 1: { $value: px(8) }, 2: { $value: px(16) }, 3: { $value: px(24) } },
};
const tokenFile = (change = () => {}) => {
  const t = structuredClone(VALID_TOKENS);
  change(t);
  return JSON.stringify(t, null, 2);
};
const tok = (change) => dir({ "d.tokens": tokenFile(change) });

test("tokens: a valid file passes, including an alias to an alias and inherited group types", () => {
  ok(["tokens", "d.tokens"], tok());
});

test("tokens: a token with no $value is rejected", () => {
  bad(["tokens", "d.tokens"], "primitive.color.broken: no $value", tok((t) => (t.primitive.color.broken = { $description: "empty" })));
});

test("tokens: an alias to a missing token is rejected", () => {
  bad(["tokens", "d.tokens"], "alias {primitive.color.nope} does not resolve", tok((t) => (t.semantic.color.text.$value = "{primitive.color.nope}")));
});

test("tokens: an alias cycle of two tokens is rejected and ends", () => {
  bad(["tokens", "d.tokens"], "alias cycle", tok((t) => {
    t.primitive.color.a = { $value: "{primitive.color.b}" };
    t.primitive.color.b = { $value: "{primitive.color.a}" };
  }));
});

test("tokens: a token that aliases itself is rejected and ends", () => {
  bad(["tokens", "d.tokens"], "alias cycle", tok((t) => (t.primitive.color.self = { $value: "{primitive.color.self}" })));
});

test("tokens: a colour with no colorSpace is rejected", () => {
  bad(["tokens", "d.tokens"], "primitive.color.ink: colorSpace is missing", tok((t) => delete t.primitive.color.ink.$value.colorSpace));
});

test("tokens: a colour with no components is rejected", () => {
  bad(["tokens", "d.tokens"], "primitive.color.ink: components is missing", tok((t) => delete t.primitive.color.ink.$value.components));
});

test("tokens: a semantic token that is not an alias is rejected", () => {
  bad(["tokens", "d.tokens"], "semantic.color.text: a semantic token must be an alias to a primitive token", tok((t) => (t.semantic.color.text.$value = srgb("#000000"))));
});

test("tokens: a semantic token that aliases a non-primitive is rejected", () => {
  bad(["tokens", "d.tokens"], "semantic.color.text: a semantic token must be an alias to a primitive token", tok((t) => (t.semantic.color.text.$value = "{semantic.color.accent}")));
});

test("tokens: a component token that is not an alias to a semantic token is rejected", () => {
  bad(["tokens", "d.tokens"], "component.button.background: a component token must be an alias to a semantic token", tok((t) => (t.component.button.background.$value = "{primitive.color.blue}")));
});

for (const property of ["accent", "ink", "muted", "line", "tint", "font"]) {
  test(`tokens: a document group missing ${property} is rejected`, () => {
    bad(["tokens", "d.tokens"], `document.${property} is missing`, tok((t) => delete t.document[property]));
  });
}

test("tokens: a document property that is a raw value is rejected", () => {
  bad(["tokens", "d.tokens"], "document.accent: a document property must be an alias to a semantic token", tok((t) => (t.document.accent.$value = srgb("#000000"))));
});

test("tokens: a top-level group that is no tier and no data group is rejected", () => {
  bad(["tokens", "d.tokens"], 'top-level group "extra"', tok((t) => (t.extra = { a: { $value: 1 } })));
});

test("tokens: a file that is not JSON is rejected", () => {
  bad(["tokens", "d.tokens"], "d.tokens: not valid JSON", dir({ "d.tokens": "{ nope" }));
});

test("tokens: mode files with the same paths pass and differing paths are rejected", () => {
  const same = dir({ "light.tokens": tokenFile(), "dark.tokens": tokenFile((t) => (t.primitive.color.paper.$value = srgb("#000000"))) });
  ok(["tokens", "light.tokens", "dark.tokens"], same);
  const differ = dir({ "light.tokens": tokenFile(), "dark.tokens": tokenFile((t) => delete t.semantic.color.tint) });
  bad(["tokens", "light.tokens", "dark.tokens"], "dark.tokens: token paths differ from light.tokens: missing semantic.color.tint", differ);
  const extra = dir({ "light.tokens": tokenFile(), "dark.tokens": tokenFile((t) => (t.primitive.color.more = { $value: srgb("#000000") })) });
  bad(["tokens", "light.tokens", "dark.tokens"], "extra primitive.color.more", extra);
});

test("tokens: a display-p3 colour with no hex is a valid token", () => {
  ok(["tokens", "d.tokens"], tok((t) => (t.primitive.color.ink.$value = { colorSpace: "display-p3", components: [0.1, 0.1, 0.2] })));
});

// ---- document-css ----

const DOCUMENT_CSS = `:root {
  --accent: #1f4e79;
  --ink: #111827;
  --muted: #595959;
  --line: #e5e7eb;
  --tint: #f3f4f6;
  --font: "IBM Plex Sans", "Helvetica Neue", sans-serif;
}
`;

test("document-css: writes the six properties with aliases resolved to hex", () => {
  assert.equal(ok(["document-css", "d.tokens"], tok()).out, DOCUMENT_CSS);
});

test("document-css: a colour with srgb components and no hex is written as 8-bit hex", () => {
  const out = ok(["document-css", "d.tokens"], tok((t) => (t.primitive.color.blue.$value = { colorSpace: "srgb", components: [0.1216, 0.3059, 0.4745] }))).out;
  assert.match(out, /--accent: #1f4e79;/);
});

test("document-css: a display-p3 colour with no hex cannot be computed and writes nothing", () => {
  const r = bad(["document-css", "d.tokens"], "cannot compute", tok((t) => (t.primitive.color.blue.$value = { colorSpace: "display-p3", components: [0.1, 0.3, 0.5] })));
  assert.equal(r.out, "");
});

test("document-css: a display-p3 colour with a hex is written from the hex", () => {
  const out = ok(["document-css", "d.tokens"], tok((t) => (t.primitive.color.blue.$value = { colorSpace: "display-p3", components: [0.1, 0.3, 0.5], hex: "#123456" }))).out;
  assert.match(out, /--accent: #123456;/);
});

test("document-css: an unresolved alias exits 1 with no partial output", () => {
  const r = bad(["document-css", "d.tokens"], "alias {semantic.color.nope} does not resolve", tok((t) => (t.document.muted.$value = "{semantic.color.nope}")));
  assert.equal(r.out, "");
});

test("document-css: a missing property exits 1 with no partial output", () => {
  const r = bad(["document-css", "d.tokens"], "document.line is missing", tok((t) => delete t.document.line));
  assert.equal(r.out, "");
});

// ---- trends ----

const TREND_FIELDS = ["What it is", "Originator and date", "Sources", "Counter-evidence", "Suits", "Status", "Review by"];
const trendEntry = (name = "Frosted panels", change = {}) => {
  const f = {
    "What it is": "A translucent panel material.",
    "Originator and date": "Example Co, 2025-06-09.",
    Sources: "https://example.com/frosted",
    "Counter-evidence": "Text over images is hard to read.",
    Suits: "Media surfaces.",
    Status: "Watch",
    "Review by": "2027-05-07",
    ...change,
  };
  const lines = Object.entries(f).filter(([, v]) => v !== null).map(([k, v]) => `**${k}:** ${v}`);
  return `## ${name}\n\n${lines.join("\n")}\n`;
};
const trendsFile = (...entries) => `# Trends\n\n${entries.join("\n")}`;
const trends = (...entries) => dir({ "TRENDS.md": trendsFile(...(entries.length ? entries : [trendEntry()])) });

test("trends: a valid file passes with --as-of", () => {
  ok(["trends", "TRENDS.md", "--as-of", "2026-11-07"], trends());
});

for (const field of TREND_FIELDS) {
  test(`trends: an entry missing "${field}" is rejected`, () => {
    bad(["trends", "TRENDS.md", "--as-of", "2026-11-07"], `entry "Frosted panels": missing "${field}"`, trends(trendEntry("Frosted panels", { [field]: null })));
  });
}

test("trends: an entry whose Sources has no URL is rejected", () => {
  bad(["trends", "TRENDS.md", "--as-of", "2026-11-07"], 'entry "Frosted panels": Sources has no URL', trends(trendEntry("Frosted panels", { Sources: "a blog, undated" })));
});

test("trends: a status other than Watch, Trial or Retired is rejected", () => {
  bad(["trends", "TRENDS.md", "--as-of", "2026-11-07"], 'entry "Frosted panels": status "Maybe" is not Watch, Trial or Retired', trends(trendEntry("Frosted panels", { Status: "Maybe" })));
});

test("trends: Trial and Retired are accepted statuses", () => {
  ok(["trends", "TRENDS.md", "--as-of", "2026-11-07"], trends(trendEntry("A", { Status: "Trial" }), trendEntry("B", { Status: "Retired" })));
});

test("trends: a review-by date that is not a date is rejected", () => {
  bad(["trends", "TRENDS.md", "--as-of", "2026-11-07"], '"2027-13-45" is not a date', trends(trendEntry("Frosted panels", { "Review by": "2027-13-45" })));
});

test("trends: an entry is overdue the day after its review-by date, and not the day before or the day of", () => {
  const d = trends(trendEntry("Frosted panels", { "Review by": "2027-05-07" }));
  ok(["trends", "TRENDS.md", "--as-of", "2027-05-06"], d);
  ok(["trends", "TRENDS.md", "--as-of", "2027-05-07"], d);
  bad(["trends", "TRENDS.md", "--as-of", "2027-05-08"], 'entry "Frosted panels": review-by 2027-05-07 is past on 2027-05-08', d);
});

test("trends: with no --as-of it says the dates were not checked and exits 0, even for an old date", () => {
  const r = ok(["trends", "TRENDS.md"], trends(trendEntry("Frosted panels", { "Review by": "2000-01-01" })));
  assert.match(r.all, /no --as-of: review-by dates were not checked/);
});

test("trends: a bad --as-of is rejected", () => {
  bad(["trends", "TRENDS.md", "--as-of", "2026-02-30"], '"2026-02-30" is not a date', trends());
});

test("no test and no code path reads the clock", () => {
  for (const file of [CHECK, fileURLToPath(import.meta.url)]) assert.doesNotMatch(readFileSync(file, "utf8"), /new Date\(\)|Date\.now\(/);
});

// ---- DESIGN.md ----

const SECTION_NAMES = ["Brand and references", "Foundations as roles", "Token source", "Components and patterns in use", "Content and voice", "Accessibility floor", "Platform conformance", "Trends in use", "Decisions and evidence", "Change log", "Not to do"];
const FRONT_KEYS = { project: "Demo", "design-md": "1", tokens: "d.tokens", "tokens-format": "dtcg-2025.10" };
const BODIES = {
  "Brand and references": "A calm bank.\n",
  "Foundations as roles": "### Text colour\nSemantic text on surface.\n\n**Why:** It reads at a high ratio.\n**Rejected:** Pure black.\n**Decided:** 2026-11-01\n",
  "Token source": "The tokens are in `d.tokens`.\n",
  "Components and patterns in use": "### Button\n\n**Status:** Stable\n",
  "Content and voice": "Plain.\n",
  "Accessibility floor": "WCAG 2.2.\n\n- text: semantic.color.text on semantic.color.surface\n- large: semantic.color.muted on semantic.color.surface\n- ui: semantic.color.accent on semantic.color.surface\n",
  "Platform conformance": "Web.\n",
  "Trends in use": "None.\n",
  "Decisions and evidence": "### Use a grid\n\n**Decided:** 2026-11-02\n",
  "Change log": "- 2026-11-02: Added the grid decision.\n- 2026-11-01: First version.\n",
  "Not to do": "No gradients.\n",
};
// A DESIGN.md with `bodies` replacing section bodies (null drops the section), `front` replacing front-matter keys (null drops the key),
// and `order` replacing the order of the sections.
function designMd({ bodies = {}, front = {}, order = SECTION_NAMES, extra = "" } = {}) {
  const keys = { ...FRONT_KEYS, ...front };
  const fm = Object.entries(keys).filter(([, v]) => v !== null).map(([k, v]) => `${k}: ${v}`);
  const rules = front["rules-win"] === null ? [] : ["rules-win:", "  - CLAUDE.md#Design rules"];
  const body = order.map((name) => (bodies[name] === null ? "" : `## ${name}\n\n${bodies[name] ?? BODIES[name]}\n`)).join("");
  return `---\n${fm.join("\n")}\n${rules.join("\n")}\n---\n\n# Demo\n\n${body}${extra}`;
}
const design = (options, { tokens = tokenFile(), trendsText } = {}) => {
  const files = { "DESIGN.md": designMd(options), "d.tokens": tokens };
  if (trendsText !== undefined) files["TRENDS.md"] = trendsText;
  return dir(files);
};
const D = ["design", "DESIGN.md"];

test("design: a valid DESIGN.md passes", () => {
  ok(D, design());
});

test("design: sections a tool outside the format added are kept and allowed", () => {
  ok(D, design({ extra: "## Plating notes\n\nKept as written.\n" }));
});

for (const key of ["project", "design-md", "tokens", "tokens-format", "rules-win"]) {
  test(`design: a missing front-matter key "${key}" is rejected`, () => {
    bad(D, `front matter: missing "${key}"`, design({ front: { [key]: null } }));
  });
}

test("design: a file with no front matter is rejected", () => {
  bad(D, "front matter: missing", dir({ "DESIGN.md": "# Demo\n", "d.tokens": tokenFile() }));
});

test("design: a missing section is rejected", () => {
  bad(D, 'missing section "Token source"', design({ bodies: { "Token source": null } }));
});

test("design: two sections swapped are rejected", () => {
  const order = [...SECTION_NAMES];
  [order[2], order[3]] = [order[3], order[2]];
  bad(D, 'section "Components and patterns in use" is out of order', design({ order }));
});

test("design: a decision entry with no Decided date is rejected", () => {
  bad(D, 'entry "Use a grid": no **Decided:** date', design({ bodies: { "Decisions and evidence": "### Use a grid\n\n**Why:** It aligns.\n" } }));
});

test("design: a Decided date that is not a real date is rejected", () => {
  bad(D, '"2026-13-45" is not a date', design({ bodies: { "Decisions and evidence": "### Use a grid\n\n**Decided:** 2026-13-45\n" } }));
});

test("design: a foundations entry with no Decided date is rejected", () => {
  bad(D, 'entry "Text colour": no **Decided:** date', design({ bodies: { "Foundations as roles": "### Text colour\n\n**Why:** Reads.\n" } }));
});

test("design: a component status other than Trial, Stable or Deprecated is rejected", () => {
  bad(D, 'component "Button": status "Draft" is not Trial, Stable or Deprecated', design({ bodies: { "Components and patterns in use": "### Button\n\n**Status:** Draft\n" } }));
});

test("design: Trial and Deprecated component statuses pass", () => {
  ok(D, design({ bodies: { "Components and patterns in use": "### Button\n\n**Status:** Trial\n\n### Tag\n\n**Status:** Deprecated\n" } }));
});

test("design: a component with no status is rejected", () => {
  bad(D, 'component "Button": no **Status:**', design({ bodies: { "Components and patterns in use": "### Button\n\nNo status.\n" } }));
});

test("design: an accessibility pair that does not resolve to two colours is rejected", () => {
  bad(D, "semantic.color.nope does not resolve", design({ bodies: { "Accessibility floor": "- text: semantic.color.nope on semantic.color.surface\n" } }));
});

test("design: a pair that resolves to something that is no colour is rejected", () => {
  bad(D, "semantic.font.body is not a colour", design({ bodies: { "Accessibility floor": "- text: semantic.font.body on semantic.color.surface\n" } }));
});

test("design: a pair written as hex values is rejected", () => {
  bad(D, "write role paths, not values", design({ bodies: { "Accessibility floor": "- text: #111827 on #ffffff\n" } }));
});

test("design: a computed ratio below the threshold is rejected", () => {
  bad(D, "text pair semantic.color.border on semantic.color.surface is 1.2", design({ bodies: { "Accessibility floor": "- text: semantic.color.border on semantic.color.surface\n" } }));
});

// Greys on white: #757575 is 4.61:1, #909090 is 3.19:1, #999999 is 2.85:1.
const greyTokens = tokenFile((t) => {
  t.primitive.color.g46 = { $value: srgb("#757575") };
  t.primitive.color.g32 = { $value: srgb("#909090") };
  t.primitive.color.g28 = { $value: srgb("#999999") };
  for (const [name, p] of [["g46", "g46"], ["g32", "g32"], ["g28", "g28"]]) t.semantic.color[name] = { $value: `{primitive.color.${p}}` };
});
const pairs = (text) => design({ bodies: { "Accessibility floor": text } }, { tokens: greyTokens });

test("design: the threshold comes from the pair's kind", () => {
  ok(D, pairs("- text: semantic.color.g46 on semantic.color.surface\n"));
  ok(D, pairs("- large: semantic.color.g32 on semantic.color.surface\n"));
  bad(D, "ui pair semantic.color.g28 on semantic.color.surface is 2.8", pairs("- ui: semantic.color.g28 on semantic.color.surface\n"));
  bad(D, "text pair semantic.color.g32 on semantic.color.surface is 3.1", pairs("- text: semantic.color.g32 on semantic.color.surface\n"));
});

test("design: a text pair of #006ffb on white fails, as contrast says", () => {
  const tokens = tokenFile((t) => {
    t.primitive.color.edge = { $value: srgb("#006ffb") };
    t.semantic.color.edge = { $value: "{primitive.color.edge}" };
  });
  bad(D, "text pair semantic.color.edge on semantic.color.surface is 4.4999", design({ bodies: { "Accessibility floor": "- text: semantic.color.edge on semantic.color.surface\n" } }, { tokens }));
});

test("design: a stated ratio that matches the computed one passes and one that differs is rejected", () => {
  ok(D, pairs("- text: semantic.color.g46 on semantic.color.surface = 4.61\n"));
  bad(D, "stated ratio 7 differs from the computed 4.61", pairs("- text: semantic.color.g46 on semantic.color.surface = 7\n"));
});

test("design: a pair of a colour with no hex in a space that cannot be computed says cannot compute", () => {
  const tokens = tokenFile((t) => (t.primitive.color.ink.$value = { colorSpace: "oklch", components: [0.2, 0.02, 260] }));
  bad(D, "cannot compute", design({}, { tokens }));
  const withHex = tokenFile((t) => (t.primitive.color.ink.$value = { colorSpace: "oklch", components: [0.2, 0.02, 260], hex: "#111827" }));
  ok(D, design({}, { tokens: withHex }));
});

test("design: a change log not in newest-first order is rejected", () => {
  bad(D, "change log is not newest first", design({ bodies: { "Change log": "- 2026-11-01: First.\n- 2026-11-02: Second.\n" } }));
});

test("design: a change log entry with no date is rejected", () => {
  bad(D, "change log entry has no date", design({ bodies: { "Change log": "- 2026-11-02: Second.\n- Something undated.\n" } }));
});

const TRENDS_IN_USE = (line) => ({ "Trends in use": `${line}\n` });
const USE = "- Frosted panels | reviewed 2026-11-01 | brief: A frosted panel behind the navigation.";
const withTrends = (line, entry = trendEntry(), asOf) =>
  [design({ bodies: TRENDS_IN_USE(line) }, { trendsText: trendsFile(entry) }), ["design", "DESIGN.md", "--trends", "TRENDS.md", ...(asOf ? ["--as-of", asOf] : [])]];

test("design: a Trends in use entry that points at a live entry with a brief line passes", () => {
  const [d, args] = withTrends(USE, trendEntry(), "2026-11-07");
  ok(args, d);
});

test("design: a Trends in use entry that points at a Retired entry is rejected", () => {
  const [d, args] = withTrends(USE, trendEntry("Frosted panels", { Status: "Retired" }), "2026-11-07");
  bad(args, 'Trends in use: "Frosted panels" is Retired', d);
});

test("design: a Trends in use entry that points at an overdue entry is rejected", () => {
  const [d, args] = withTrends(USE, trendEntry("Frosted panels", { "Review by": "2027-05-07" }), "2027-05-08");
  bad(args, 'Trends in use: "Frosted panels" is past its review-by date 2027-05-07', d);
});

test("design: a Trends in use entry that points at no entry is rejected", () => {
  const [d, args] = withTrends(USE.replace("Frosted panels", "Nowhere"), trendEntry(), "2026-11-07");
  bad(args, 'Trends in use: "Nowhere" is not an entry in TRENDS.md', d);
});

test("design: a Trends in use entry with no brief line is rejected", () => {
  const [d, args] = withTrends("- Frosted panels | reviewed 2026-11-01 | brief:", trendEntry(), "2026-11-07");
  bad(args, 'Trends in use: "Frosted panels" has no brief line', d);
});

test("design: a Trends in use entry with no reviewed date is rejected", () => {
  const [d, args] = withTrends("- Frosted panels | reviewed soon | brief: Yes.", trendEntry(), "2026-11-07");
  bad(args, '"soon" is not a date', d);
});

test("design: a Trends in use bullet with no pipes is an error, not skipped", () => {
  const [d, args] = withTrends("- Imaginary trend that does not exist", trendEntry(), "2026-11-07");
  bad(args, 'Trends in use: "Imaginary trend that does not exist" is not "<name> | reviewed <date> | brief: <sentence>"', d);
});

test("design: a Trends in use bullet with a pipe in the wrong shape is an error", () => {
  const [d, args] = withTrends("- Frosted panels | brief: Yes.", trendEntry(), "2026-11-07");
  bad(args, "is not \"<name> | reviewed <date> | brief: <sentence>\"", d);
});

test("design: without --as-of the overdue check is skipped and says so", () => {
  const [d, args] = withTrends(USE, trendEntry("Frosted panels", { "Review by": "2000-01-01" }));
  assert.match(ok(args, d).all, /no --as-of: review-by dates were not checked/);
});

test("design: a missing token file is rejected when pairs need it", () => {
  const d = dir({ "DESIGN.md": designMd() });
  bad(D, "d.tokens: no such file", d);
});

// ---- brief ----

const BRIEF_PARTS = {
  Audience: "New customers.",
  Job: "Say the account is ready.",
  Tone: "Plain and warm.",
  "Must not look like": "A newsletter template.",
  Surface: "HTML email",
  References: "- V1: Discipline in the grid.\n- W2: Contrast of 4.5:1 for text.\n- C3: Client support tables.",
  "Tells earned": "None.",
};
// A brief with `parts` replacing sections (null drops one).
const briefText = (parts = {}) =>
  `# Brief: welcome email\n\n${Object.entries({ ...BRIEF_PARTS, ...parts }).filter(([, v]) => v !== null).map(([k, v]) => `## ${k}\n\n${v}\n`).join("\n")}`;
const brief = (parts) => dir({ "brief.md": briefText(parts) });

test("brief: a valid brief passes", () => {
  ok(["brief", "brief.md"], brief());
});

for (const section of ["Audience", "Job", "Tone", "Must not look like", "Surface", "References"]) {
  test(`brief: a brief missing "${section}" is rejected`, () => {
    bad(["brief", "brief.md"], `missing section "${section}"`, brief({ [section]: null }));
  });
}

test("brief: an empty section is rejected", () => {
  bad(["brief", "brief.md"], 'section "Tone" is empty', brief({ Tone: "" }));
});

test("brief: a tell id that is not in TELLS.md is rejected", () => {
  bad(["brief", "brief.md"], "T99 is not a row of TELLS.md", brief({ "Tells earned": "- T99: Because." }));
});

test("brief: a tell named with a reason passes and one with no reason is rejected", () => {
  ok(["brief", "brief.md"], brief({ "Tells earned": "- T12: The brand uses tracked caps for its logotype." }));
  bad(["brief", "brief.md"], "T12 has no reason", brief({ "Tells earned": "- T12:" }));
});

test("brief: a lower minimum of references needs a reason, and the floor is one", () => {
  ok(["brief", "brief.md"], brief({ References: "- V1: One row.\n\nMinimum: 1. Reason: a logo mark needs fewer rows." }));
  bad(["brief", "brief.md"], "Minimum: 1 is below 3 and needs a Reason:", brief({ References: "- V1: One row.\n\nMinimum: 1" }));
  bad(["brief", "brief.md"], "Minimum: 0 is below the floor of one reference row", brief({ References: "Minimum: 0. Reason: none needed." }));
});

// ---- tells: file and text rows ----

const page = (css, body) => `<!doctype html><html><head><title>t</title><style>${css}</style></head><body>${body}</body></html>`;
// A PNG made in memory with zlib: a background, then filled rectangles { x, y, w, h, color }.
function png(width, height, background, rects = []) {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  const paint = (x, y, [r, g, b]) => raw.set([r, g, b], y * (width * 3 + 1) + 1 + x * 3);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) paint(x, y, background);
  for (const { x, y, w, h, color } of rects) for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) paint(i, j, color);
  const chunk = (type, data) => {
    const body = Buffer.concat([Buffer.from(type), data]);
    const out = Buffer.alloc(body.length + 8);
    out.writeUInt32BE(data.length, 0);
    body.copy(out, 4);
    out.writeUInt32BE(crc32(body), body.length + 4);
    return out;
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 2, 0, 0, 0], 8);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", header), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

function runTells({ html, brief = briefText(), brand, render, only, refs, name = "piece.html" }) {
  const files = { [name]: html, "brief.md": brief };
  if (brand !== undefined) files["brand.tokens"] = brand;
  if (refs !== undefined) files["REFERENCES.md"] = refs;
  const d = dir(files);
  if (render) writeFileSync(join(d, "render.png"), render);
  const args = ["tells", name, "--brief", "brief.md"];
  if (brand !== undefined) args.push("--brand", "brand.tokens");
  if (render) args.push("--render", "render.png");
  if (only) args.push("--only", only);
  if (refs !== undefined) args.push("--references", "REFERENCES.md");
  return ck(args, d);
}
const flagged = (r, row, count = 1) => {
  assert.equal(r.status, 1, r.all);
  assert.equal(r.first, `FAIL: ${count} tells`);
  assert.match(r.out, new RegExp(`^${row} `, "m"));
};
const clean = (r) => {
  assert.equal(r.status, 0, r.all);
  assert.equal(r.first, "PASS: no tells");
};

const ROWS = {
  T1: { flag: page("body{font-family:Inter,sans-serif}", "<p>Hi</p>"), pass: page('body{font-family:"IBM Plex Sans",sans-serif}', "<p>Hi</p>") },
  T2: { flag: page(".h{background:linear-gradient(90deg,#4f46e5,#9333ea)}", "<p>Hi</p>"), pass: page(".h{background:linear-gradient(90deg,#1f4e79,#d97757)}", "<p>Hi</p>") },
  T3: { flag: page(".t{background:linear-gradient(90deg,#f00,#00f);-webkit-background-clip:text}", "<p>Hi</p>"), pass: page(".t{color:#1f4e79}", "<p>Hi</p>") },
  T5: {
    flag: page(".card{border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.1)}", '<div class="card">a</div><div class="card">b</div><div class="card">c</div>'),
    pass: page(".card{border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.1)}", '<div class="card">a</div><div class="card">b</div>'),
  },
  T6: {
    flag: page(["a", "b", "c", "d", "e", "f"].map((c) => `.${c}{border-radius:8px;box-shadow:0 1px 2px #0003}`).join(""), "<p>Hi</p>"),
    pass: page(["a", "b", "c", "d", "e", "f"].map((c, i) => `.${c}{border-radius:${4 + (i % 2) * 8}px;box-shadow:0 1px 2px #0003}`).join(""), "<p>Hi</p>"),
  },
  T7: { flag: page(".c{border:1px solid #ddd;box-shadow:0 8px 24px rgba(0,0,0,.1)}", "<p>Hi</p>"), pass: page(".c{border:1px solid #ddd;box-shadow:0 1px 2px rgba(0,0,0,.1)}", "<p>Hi</p>") },
  T8: { flag: page(".alert{border-left:4px solid #f00}", "<p>Hi</p>"), pass: page(".alert{border-left:1px solid #ccc}", "<p>Hi</p>") },
  T9: { flag: page(".b{box-shadow:4px 4px 0 #000}", "<p>Hi</p>"), pass: page(".b{box-shadow:0 0 8px #000}", "<p>Hi</p>") },
  T10: { flag: page(".g{backdrop-filter:blur(8px)}", "<p>Hi</p>"), pass: page(".g{opacity:1}", "<p>Hi</p>") },
  T11: { flag: page("", "<button>Next →</button>"), pass: page("", "<button>Next</button>") },
  T12: {
    flag: page(".kicker{text-transform:uppercase;letter-spacing:.12em}", '<p class="kicker">New</p><h1>Hello there</h1>'),
    pass: page(".kicker{text-transform:uppercase;letter-spacing:.12em}", '<h1>Hello there</h1><p class="kicker">New</p>'),
  },
  T13: { flag: page("", "<p>Monday · 5 min · Design</p>"), pass: page("", "<p>Monday, five minutes, design</p>") },
  T14: { flag: page("", "<p>NEW — a better way</p>"), pass: page("", "<p>A better way — without delay</p>") },
  T15: { flag: page("", "<h3>01</h3><h3>02</h3><h3>03</h3>"), pass: page("", "<h3>One</h3><h3>Two</h3>") },
  T16: { flag: page("", "<h1>Design that <em>works</em> for you</h1>"), pass: page("", "<h1>Design that works for you</h1>") },
  T19: { flag: page("body{color:#111}", "<p>Hi</p>"), pass: page("body{color:#1f4e79}", "<p>Hi</p>") },
  T22: {
    flag: page(".reveal{animation:fade .6s ease}", '<section class="reveal">a</section><section class="reveal">b</section><section class="reveal">c</section>'),
    pass: page(".reveal{animation:fade .6s ease}", '<section class="reveal">a</section><section>b</section>'),
  },
  T23: { flag: page('.label{font-family:"SF Mono",monospace}', '<p class="label">Hi</p>'), pass: page("code{font-family:monospace}", "<code>x = 1</code>") },
  T24: { flag: page(".t{color:#999999;background:#ffffff}", "<p class='t'>Hi</p>"), pass: page(".t{color:#111827;background:#ffffff}", "<p class='t'>Hi</p>") },
  T25: { flag: page("", "<p>Lorem ipsum dolor sit amet.</p>"), pass: page("", "<p>Your balance is $40.</p>") },
  T26: { flag: page("", "<p>Unlock seamless growth today.</p>"), pass: page("", "<p>Your balance is $40.</p>") },
  T28: { flag: page(".bg{background:repeating-linear-gradient(45deg,#eee,#ddd 10px)}", "<p>Hi</p>"), pass: page(".bg{background:#eee}", "<p>Hi</p>") },
};
for (const [row, { flag, pass }] of Object.entries(ROWS)) {
  test(`tells ${row}: a piece that carries it is flagged and named`, () => {
    flagged(runTells({ html: flag, only: row }), row);
  });
  test(`tells ${row}: a piece that does not carry it passes the row`, () => {
    clean(runTells({ html: pass, only: row }));
  });
}

test("tells T1: the brand naming the font earns it", () => {
  const brand = tokenFile((t) => (t.primitive.font.body.$value = ["Inter", "sans-serif"]));
  clean(runTells({ html: ROWS.T1.flag, only: "T1", brand }));
});

test("tells T19: the brand naming the value earns it", () => {
  const brand = tokenFile((t) => (t.primitive.color.ink.$value = srgb("#111111")));
  clean(runTells({ html: ROWS.T19.flag, only: "T19", brand }));
});

test("tells T2: the brand palette having such a hue earns it", () => {
  const brand = tokenFile((t) => (t.primitive.color.blue.$value = srgb("#4f46e5")));
  clean(runTells({ html: ROWS.T2.flag, only: "T2", brand }));
});

test("tells T15: a brief that names a sequence earns it", () => {
  const brief = briefText({ "Tells earned": "- T15: The three numbered items are a stated sequence of steps." });
  clean(runTells({ html: ROWS.T15.flag, only: "T15", brief }));
});

test("tells T24: text under 12px and an outline removed with no replacement are flagged", () => {
  flagged(runTells({ html: page("p{font-size:10px}", "<p>Hi</p>"), only: "T24" }), "T24");
  flagged(runTells({ html: page("a:focus{outline:none}", "<a href='#'>Hi</a>"), only: "T24" }), "T24");
  clean(runTells({ html: page("a:focus{outline:none;box-shadow:0 0 0 2px #1f4e79}", "<a href='#'>Hi</a>"), only: "T24" }));
});

test("tells T26: more than one em dash per 150 words is flagged", () => {
  flagged(runTells({ html: page("", "<p>One thing — and another — and a third go here.</p>"), only: "T26" }), "T26");
});

test("tells T27: a paragraph with no specific is a warning and never changes the code", () => {
  const vague = "<p>We make things better for everyone who comes along to see what we are doing here.</p>";
  const r = runTells({ html: page("", vague), only: "T27" });
  clean(r);
  assert.match(r.out, /^warning T27 /m);
  assert.doesNotMatch(runTells({ html: page("", "<p>We opened 3 offices in Cebu last year and hired 40 people there.</p>"), only: "T27" }).out, /warning/);
});

test("tells T25 and T26 count toward the code and T27 does not", () => {
  flagged(runTells({ html: page("", "<p>Lorem ipsum. Unlock seamless growth.</p>"), only: "T25,T26,T27" }), "T25", 2);
});

test("tells T21: a font size outside the brand's type steps is flagged and one inside passes", () => {
  flagged(runTells({ html: page("p{font-size:17px}", "<p>Hi</p>"), only: "T21", brand: tokenFile() }), "T21");
  clean(runTells({ html: page("p{font-size:20px} h1{font-size:1.5625rem}", "<p>Hi</p>"), only: "T21", brand: tokenFile() }));
});

// ---- tells: the brief, the exit codes, the first line ----

const BOTH = page(".kicker{text-transform:uppercase;letter-spacing:.12em}", '<p class="kicker">New</p><h1>Hello there</h1><p>Mon · 5 min · Design</p>');

test("tells: a tell the brief names with a reason is not counted and one it does not name is", () => {
  const brief = briefText({ "Tells earned": "- T12: The brand uses tracked caps for its logotype." });
  const r = runTells({ html: BOTH, only: "T12,T13", brief });
  flagged(r, "T13");
  assert.doesNotMatch(r.out, /^T12 /m);
});

test("tells: a tell named with no reason does not excuse it, and the brief is refused", () => {
  const r = runTells({ html: BOTH, only: "T12,T13", brief: briefText({ "Tells earned": "- T12:" }) });
  assert.equal(r.status, 3);
  assert.match(r.first, /^FAIL: could not run: .*T12 has no reason/);
});

test("tells: two tells give n = 2 in the first line", () => {
  flagged(runTells({ html: BOTH, only: "T12,T13" }), "T12", 2);
});

test("tells exit 2: fewer reference rows than the brief needs, with the line as ruled", () => {
  const brief = briefText({ References: "- V1: One.\n- W2: Two." });
  const r = runTells({ html: page("", "<p>Your balance is $40.</p>"), only: "T25", brief });
  assert.equal(r.status, 2);
  assert.equal(r.first, "FAIL: 2 reference rows, needs 3");
});

test("tells exit 2: one row cited with a stated reason passes, and zero rows fails", () => {
  const html = page("", "<p>Your balance is $40.</p>");
  const reason = "Minimum: 1. Reason: a logo mark needs fewer rows.";
  clean(runTells({ html, only: "T25", brief: briefText({ References: `- V1: One.\n${reason}` }) }));
  const r = runTells({ html, only: "T25", brief: briefText({ References: reason }) });
  assert.equal(r.status, 2);
  assert.equal(r.first, "FAIL: 0 reference rows, needs 1");
});

test("tells: reference ids are resolved only when --references is given, and an id not in the file is not counted", () => {
  const html = page("", "<p>Your balance is $40.</p>");
  const refs = "| Id | Work |\n| --- | --- |\n| V1 | Canon |\n| W2 | WCAG |\n";
  const r = runTells({ html, only: "T25", refs });
  assert.equal(r.status, 2);
  assert.equal(r.first, "FAIL: 2 reference rows, needs 3");
  clean(runTells({ html, only: "T25", refs: `${refs}| C3 | caniemail |\n` }));
});

test("tells precedence: a missing reference (2) beats a tell (1)", () => {
  const brief = briefText({ References: "- V1: One." });
  assert.equal(runTells({ html: BOTH, only: "T12,T13", brief }).status, 2);
});

test("tells exit 3: an unsupported piece type", () => {
  const r = runTells({ html: "x", name: "piece.png", only: "T25" });
  assert.equal(r.status, 3);
  assert.equal(r.first, "FAIL: could not run: piece type .png is not supported (html and svg)");
});

test("tells exit 3: an invalid brief", () => {
  const r = runTells({ html: page("", "<p>Hi</p>"), only: "T25", brief: briefText({ Audience: null }) });
  assert.equal(r.status, 3);
  assert.match(r.first, /^FAIL: could not run: .*missing section "Audience"/);
});

test("tells exit 3: with no render, the render rows cannot run, and the code beats a tell", () => {
  const r = runTells({ html: BOTH, brand: tokenFile() });
  assert.equal(r.status, 3);
  assert.equal(r.first, "FAIL: could not run T4, T17, T18, T20 (no render given)");
  assert.match(r.out, /^T12 /m);
});

test("tells exit 3: a --render file that does not exist is a failure to run, not a crash", () => {
  const d = dir({ "piece.html": page("", "<p>Hi</p>"), "brief.md": briefText() });
  for (const only of ["T4", "T25"]) {
    const r = ck(["tells", "piece.html", "--brief", "brief.md", "--render", "missing.png", "--only", only], d);
    assert.equal(r.status, 3, r.all);
    assert.match(r.first, /^FAIL: could not run: .*missing\.png: no such file/);
    assert.doesNotMatch(r.all, /ENOENT|at .*node:/);
  }
});

test("tells exit 3: the grid and type rows cannot run without the brand's data, and a brief that names them earns them", () => {
  const html = page("", "<p>Hi</p>");
  const render = png(300, 100, [255, 255, 255], [{ x: 20, y: 20, w: 100, h: 10, color: [0, 0, 0] }]);
  const r = runTells({ html, only: "T20,T21", render });
  assert.equal(r.status, 3);
  assert.equal(r.first, "FAIL: could not run T20 (no grid in the brand data), T21 (no type steps in the brand data)");
  const brief = briefText({ "Tells earned": "- T20: The page is one column by design.\n- T21: The page uses the browser default sizes." });
  clean(runTells({ html, only: "T20,T21", render, brief }));
});

// ---- tells: render rows, with PNGs the test builds ----

const WHITE = [255, 255, 255];
const INK = [17, 24, 39];
const GREY = [221, 221, 221];
const GRID_BRAND = tokenFile();
const renderRun = (rects, { only, background = WHITE, brand = GRID_BRAND, w = 600, h = 600 } = {}) =>
  runTells({ html: page("", "<p>Hi</p>"), only, brand, render: png(w, h, background, rects) });

test("tells T4: a centred hero over three equal boxes is flagged and a left-aligned page is not", () => {
  const hero = { x: 200, y: 40, w: 200, h: 40, color: INK };
  const cards = [40, 230, 420].map((x) => ({ x, y: 200, w: 140, h: 120, color: GREY }));
  flagged(renderRun([hero, ...cards], { only: "T4" }), "T4");
  const left = { x: 40, y: 40, w: 300, h: 40, color: INK };
  clean(renderRun([left, ...cards], { only: "T4" }));
  clean(renderRun([hero, { x: 40, y: 200, w: 300, h: 120, color: GREY }, { x: 380, y: 200, w: 180, h: 120, color: GREY }], { only: "T4" }));
});

test("tells T17: a big numeral over a small caption is flagged and a headline over a paragraph is not", () => {
  flagged(renderRun([{ x: 40, y: 40, w: 120, h: 80, color: INK }, { x: 40, y: 130, w: 120, h: 12, color: INK }], { only: "T17" }), "T17");
  clean(renderRun([{ x: 40, y: 40, w: 400, h: 40, color: INK }, { x: 40, y: 90, w: 400, h: 12, color: INK }], { only: "T17" }));
});

test("tells T18: cream with terracotta, and near-black with one acid accent, are flagged", () => {
  flagged(renderRun([{ x: 40, y: 40, w: 200, h: 60, color: [217, 119, 87] }], { only: "T18", background: [244, 241, 234] }), "T18");
  flagged(renderRun([{ x: 40, y: 40, w: 200, h: 60, color: [198, 255, 0] }], { only: "T18", background: [11, 11, 11] }), "T18");
});

test("tells T18: white with a blue accent, and near-black with two accents, pass", () => {
  clean(renderRun([{ x: 40, y: 40, w: 200, h: 60, color: [31, 78, 121] }], { only: "T18" }));
  clean(renderRun([{ x: 40, y: 40, w: 200, h: 60, color: [198, 255, 0] }, { x: 300, y: 40, w: 200, h: 60, color: [255, 0, 90] }], { only: "T18", background: [11, 11, 11] }));
});

test("tells T20: more than six distinct left edges is flagged and edges on the grid pass", () => {
  const scattered = [24, 53, 91, 130, 172, 211, 263, 301].map((x, i) => ({ x, y: 20 + i * 40, w: 100, h: 12, color: INK }));
  flagged(renderRun(scattered, { only: "T20" }), "T20");
  const onGrid = [24, 71, 24, 71].map((x, i) => ({ x, y: 20 + i * 40, w: 30, h: 12, color: INK }));
  clean(renderRun(onGrid, { only: "T20" }));
});

test("tells T20: a piece centred in a wider render is measured against its own container, not the canvas", () => {
  // A 600 px container centred in a 640 px render: a full-bleed block at its edge, then blocks on the brand grid inside its margin.
  // Inner width 552, 12 columns, 16 px gutter: columns start at 44, 91.3, 138.7.
  const onItsGrid = [{ x: 20, y: 10, w: 600, h: 60, color: INK }, { x: 44, y: 90, w: 300, h: 12, color: INK }, { x: 44, y: 120, w: 200, h: 12, color: INK }, { x: 91, y: 150, w: 100, h: 12, color: INK }];
  clean(renderRun(onItsGrid, { only: "T20", w: 640, h: 300 }));
  const offItsGrid = [{ x: 20, y: 10, w: 600, h: 60, color: INK }, { x: 55, y: 90, w: 300, h: 12, color: INK }, { x: 77, y: 120, w: 200, h: 12, color: INK }, { x: 133, y: 150, w: 100, h: 12, color: INK }];
  flagged(renderRun(offItsGrid, { only: "T20", w: 640, h: 300 }), "T20");
});

test("tells T20: content that is not centred is still measured against the canvas", () => {
  const leftHeavy = [{ x: 20, y: 10, w: 300, h: 60, color: INK }, { x: 44, y: 90, w: 200, h: 12, color: INK }, { x: 44, y: 120, w: 200, h: 12, color: INK }, { x: 91, y: 150, w: 100, h: 12, color: INK }];
  flagged(renderRun(leftHeavy, { only: "T20", w: 640, h: 300 }), "T20");
});

test("tells: a clean piece with a clean render and the brand's data passes every row", () => {
  const html = page("p{font-size:20px;color:#111827;background:#ffffff}", "<h1>Your account is ready</h1><p>You can sign in now.</p>");
  const rects = [{ x: 24, y: 24, w: 300, h: 40, color: INK }, { x: 24, y: 80, w: 200, h: 12, color: INK }, { x: 71, y: 120, w: 100, h: 12, color: INK }];
  clean(runTells({ html, brand: GRID_BRAND, render: png(600, 300, WHITE, rects) }));
});

// ---- email ----

const GOOD_EMAIL = '<!doctype html><html><body><table width="600" style="width:600px;max-width:600px"><tr><td><h1>Your account is ready</h1><p>You can sign in now.</p><a href="https://example.com/in" style="color:#1f4e79">Sign in to your account</a><img src="https://example.com/logo.png" alt="Example logo" width="120"></td></tr></table></body></html>';
const LIMITS = `| Feature | Pattern | Client | Support | Test date | Source |
| --- | --- | --- | --- | --- | --- |
| CSS grid | \`display:\\s*grid\` | Outlook for Windows | none | 2023-05-01 | https://example.com/grid |
| Media queries | \`@media\` | Gmail app | partial | 2023-05-01 | https://example.com/media |
`;

test("email: a good email passes, and says the LIMITS.md rows were not read when none is given", () => {
  const r = ok(["email", "good.html"], dir({ "good.html": GOOD_EMAIL }));
  assert.match(r.out, /LIMITS\.md rows were not checked: no --limits file given/);
});

test("email: an image with no alt is rejected, and an empty alt is accepted", () => {
  bad(["email", "e.html"], "img with no alt", dir({ "e.html": GOOD_EMAIL.replace(' alt="Example logo"', "") }));
  ok(["email", "e.html"], dir({ "e.html": GOOD_EMAIL.replace('alt="Example logo"', 'alt=""') }));
});

test("email: a call to action that is only an image is rejected", () => {
  bad(["email", "e.html"], "call to action that is only an image", dir({ "e.html": GOOD_EMAIL.replace("Sign in to your account", '<img src="https://example.com/b.png" alt="Sign in">') }));
});

test("email: a body with no live text is rejected", () => {
  bad(["email", "e.html"], "no live text", dir({ "e.html": '<html><body><table width="600"><tr><td><img src="https://example.com/a.png" alt="A"></td></tr></table></body></html>' }));
});

test("email: a container wider than 640 px is rejected", () => {
  bad(["email", "e.html"], "wider than 640 px", dir({ "e.html": GOOD_EMAIL.replace('width="600"', 'width="700"') }));
  bad(["email", "e.html"], "wider than 640 px", dir({ "e.html": GOOD_EMAIL.replace("width:600px", "width:700px") }));
});

test("email: a tell a script can see is rejected, naming the row", () => {
  bad(["email", "e.html"], "T11", dir({ "e.html": GOOD_EMAIL.replace("Sign in to your account", "Sign in →") }));
});

test("email: a blocking row of the LIMITS.md that is given is applied", () => {
  const d = dir({ "e.html": GOOD_EMAIL.replace("<table", '<div style="display:grid"></div><table'), "LIMITS.md": LIMITS });
  bad(["email", "e.html", "--limits", "LIMITS.md"], "CSS grid (Outlook for Windows): none", d);
  const r = ok(["email", "good.html", "--limits", "LIMITS.md"], dir({ "good.html": GOOD_EMAIL, "LIMITS.md": LIMITS }));
  assert.doesNotMatch(r.out, /not checked/);
});

test("email: a LIMITS.md row with no test date or no source URL is rejected", () => {
  bad(["email", "good.html", "--limits", "LIMITS.md"], "CSS grid: no test date", dir({ "good.html": GOOD_EMAIL, "LIMITS.md": LIMITS.replace("2023-05-01 | https://example.com/grid", " | https://example.com/grid") }));
  bad(["email", "good.html", "--limits", "LIMITS.md"], "CSS grid: no source URL", dir({ "good.html": GOOD_EMAIL, "LIMITS.md": LIMITS.replace("2023-05-01 | https://example.com/grid", "2023-05-01 | ") }));
});

test("email: a colour pair that fails 4.5:1 is rejected", () => {
  bad(["email", "e.html"], "T24", dir({ "e.html": GOOD_EMAIL.replace("color:#1f4e79", "color:#999999;background:#ffffff") }));
});

// ---- email: the shipped LIMITS.md ----

const SHIPPED_LIMITS = join(here, "..", "skills", "tools", "email", "LIMITS.md");
const shippedLimits = () => readFileSync(SHIPPED_LIMITS, "utf8");
const limitRows = () =>
  shippedLimits().split("\n").filter((l) => l.startsWith("|") && !/^\|\s*(Feature|-)/.test(l)).map((l) => l.split(/\|(?=(?:[^`]*`[^`]*`)*[^`]*$)/).slice(1, -1).map((c) => c.trim()));
// An email page with `extra` inside the table, run against the shipped table.
const withShipped = (extra, replace) => {
  const html = replace ? GOOD_EMAIL.replace(...replace) : GOOD_EMAIL.replace("<table", `${extra}<table`);
  return dir({ "e.html": html });
};
const lint = (d, limits = SHIPPED_LIMITS) => ck(["email", "e.html", "--limits", limits], d);

test("LIMITS.md: the seed rows are the ones re-read from caniemail on 2026-11-07, with their test dates", () => {
  const rows = limitRows();
  const by = (re) => rows.find((r) => re.test(r[0]));
  const bg = by(/background-image/);
  const grid = by(/display:\s*grid|display: grid/);
  const dark = by(/prefers-color-scheme/);
  assert.ok(bg && grid && dark, "a seed row is missing");
  assert.deepEqual([bg[2], bg[3], bg[4], bg[5]].map((c) => c.replace(/\s+/g, " ")), ["Outlook for Windows 2007 to 2019", "none", "2023-07-24", "https://www.caniemail.com/features/css-background-image/"]);
  assert.deepEqual([grid[2], grid[3], grid[4], grid[5]].map((c) => c.replace(/\s+/g, " ")), ["Outlook for Windows 2007 to 2019 and Windows Mail", "none", "2019-02-28", "https://www.caniemail.com/features/css-display-grid/"]);
  assert.equal(dark[2], "Gmail on desktop webmail, iOS, Android and mobile webmail");
  assert.equal(dark[3], "ignored");
  assert.equal(dark[4], "2023-03-08");
  assert.equal(dark[5], "https://www.caniemail.com/features/css-at-media-prefers-color-scheme/");
});

test("LIMITS.md: every row has a date and a caniemail feature URL, and the support column uses a documented vocabulary", () => {
  const text = shippedLimits();
  for (const r of limitRows()) {
    assert.match(r[4], /^\d{4}-\d{2}-\d{2}$/, r[0]);
    assert.match(r[5], /^https:\/\/www\.caniemail\.com\/features\/[a-z0-9-]+\/$/, r[0]);
    assert.ok(["none", "ignored"].includes(r[3]), `${r[0]}: support "${r[3]}" is not in the vocabulary`);
  }
  assert.match(text, /`none` blocks/);
  assert.match(text, /`ignored`[^.]*note/i);
  assert.match(text, /re-read[^.]*caniemail/i);
});

test("email on the shipped LIMITS.md: background-image url( fails, background-color passes", () => {
  const r = lint(withShipped("", ['style="width:600px', 'style="background-image:url(https://example.com/bg.png);width:600px']));
  assert.equal(r.status, 1, r.all);
  assert.match(r.all, /background-image \(Outlook for Windows 2007 to 2019\): none support, and the email uses it/);
  assert.equal(lint(withShipped("", ['style="width:600px', 'style="background-color:#f3f4f6;width:600px'])).status, 0);
});

test("email on the shipped LIMITS.md: display:grid, display: grid and display :grid all fail", () => {
  for (const v of ["display:grid", "display: grid", "display :grid", "display : grid"]) {
    const r = lint(withShipped(`<div style="${v}"></div>`));
    assert.equal(r.status, 1, `${v}: ${r.all}`);
    assert.match(r.all, /display:grid/);
  }
  assert.equal(lint(withShipped('<div style="display:block"></div>')).status, 0);
});

test("email on the shipped LIMITS.md: a dark scheme with a legible light default passes with a note, not a failure", () => {
  const html = GOOD_EMAIL.replace("<body>", "<head><style>@media (prefers-color-scheme: dark){td{background:#111827}}</style></head><body>");
  const r = lint(dir({ "e.html": html }));
  assert.equal(r.status, 0, r.all);
  assert.match(r.out, /note: @media \(prefers-color-scheme\) \(Gmail[^)]*\): ignored/);
  assert.match(r.out, /legibility must not depend on it/);
});

test("email: the run says which LIMITS.md it read, on a pass and on a failure", () => {
  const pass = lint(dir({ "e.html": GOOD_EMAIL }));
  assert.match(pass.out, /limits read: .*LIMITS\.md \(3 rows\)/);
  const fail = lint(withShipped('<div style="display:grid"></div>'));
  assert.match(fail.out, /limits read: .*LIMITS\.md \(3 rows\)/);
});

test("email: a row with an invalid regex is a problem on its row, not a crash", () => {
  const limits = LIMITS.replace("`display:\\s*grid`", "`display:(grid`");
  const d = dir({ "e.html": GOOD_EMAIL, "LIMITS.md": limits });
  const r = lint(d, "LIMITS.md");
  assert.equal(r.status, 1, r.all);
  assert.match(r.all, /LIMITS\.md: CSS grid: pattern is not a valid regular expression/);
  assert.doesNotMatch(r.all, /SyntaxError|at .*node:/);
});

test("email: a pattern with a | inside backticks is one cell", () => {
  const limits = LIMITS.replace("`display:\\s*grid`", "`display:\\s*(?:grid|inline-grid)`");
  const d = dir({ "e.html": GOOD_EMAIL.replace("<table", '<div style="display:inline-grid"></div><table'), "LIMITS.md": limits });
  const r = lint(d, "LIMITS.md");
  assert.equal(r.status, 1, r.all);
  assert.match(r.all, /CSS grid \(Outlook for Windows\): none/);
});

// ---- the shipped files ----

const root = join(here, "..");
const shipped = (...parts) => readFileSync(join(root, ...parts), "utf8");
const designFiles = ["SKILL.md", "ARTCRAFT.md", "DESIGN-MD.md", "TELLS.md", "TRENDS.md"];

test("TELLS.md has 28 complete rows T1 to T28 and each one has a check that runs", () => {
  const rows = shipped("skills", "tools", "design", "TELLS.md").split("\n").filter((l) => /^\| T\d+ /.test(l)).map((l) => l.split("|").slice(1, -1).map((c) => c.trim()));
  assert.equal(rows.length, 28);
  rows.forEach((cells, i) => {
    assert.equal(cells.length, 6);
    assert.equal(cells[0], `T${i + 1}`);
    assert.ok(cells.every(Boolean), `${cells[0]} has an empty cell`);
    assert.ok(["file", "render", "text"].includes(cells[3]), `${cells[0]} type ${cells[3]}`);
    assert.match(cells[5], /^(?:proposed, not run|ran on \d+ real files?\b.*)$/, `${cells[0]} status "${cells[5]}"`);
  });
  const status = (id) => rows.find((r) => r[0] === id)[5];
  assert.ok(rows.filter((r) => r[5].startsWith("ran on ")).length >= 15, "the rows that ran on real files say so");
  for (const id of ["T2", "T3", "T5", "T6", "T7", "T8", "T9", "T10", "T22", "T28"]) assert.equal(status(id), "proposed, not run", `${id}: no real piece held its subject`);
  assert.match(status("T20"), /false positives?.*fixed/, "T20 had a false positive on a real file");
  assert.match(status("T26"), /inferred/);
  assert.match(status("T27"), /warning/);
  const text = shipped("skills", "tools", "design", "TELLS.md");
  assert.match(text, /^## False positives/m);
  assert.match(text.split(/^## False positives/m)[1], /T20[\s\S]*email\.html[\s\S]*landing\.html[\s\S]*T27[\s\S]*email\.html/);
  assert.match(text, /does not show that it catches/i, "a row with no hit is not claimed to catch the tell");
  assert.match(rows[25].join(" "), /inferred/);
  assert.match(rows[26].join(" "), /warning/);
  const render = png(300, 100, WHITE, [{ x: 24, y: 20, w: 100, h: 10, color: INK }]);
  for (const [id] of rows) {
    const r = runTells({ html: page("", "<p>Your balance is $40.</p>"), only: id, brand: GRID_BRAND, render });
    assert.ok([0, 1].includes(r.status), `${id} did not run: ${r.all}`);
  }
});

test("the shipped TRENDS.md passes on a fixed date and is overdue after its last review-by date", () => {
  ok(["trends", join(designDir, "TRENDS.md"), "--as-of", "2026-11-07"]);
  bad(["trends", join(designDir, "TRENDS.md"), "--as-of", "2027-05-08"], "is past on 2027-05-08");
});

test("the shipped TRENDS.md holds only Watch entries, each reviewed within six months, each with a URL", () => {
  const text = shipped("skills", "tools", "design", "TRENDS.md");
  const entries = text.split(/^## /m).slice(1);
  assert.ok(entries.length >= 8, `${entries.length} entries`);
  for (const e of entries) {
    assert.match(e, /^\*\*Status:\*\* Watch$/m);
    const review = /^\*\*Review by:\*\* (\d{4}-\d{2}-\d{2})$/m.exec(e)[1];
    assert.ok(review >= "2026-11-07" && review <= "2027-05-07", review);
    assert.match(e, /https:\/\/\S+/);
  }
  for (const phrase of ["Budiu", "2025-10-10", "n=521", "54%", "Not found", "Adobe", "usability"]) assert.ok(text.includes(phrase), `TRENDS.md lacks "${phrase}"`);
});

const BANNED_WORDS = /\b(ai|assistants?|agents?|cooks?|kitchens?|stations?|workflows?|head chef|claude|prompts?)\b/i;
const CAST = /albers|gropius|bayer|breuer|moholy|mies/i;
test("the method's files name no cast member, no banned word and no lending-only book", () => {
  for (const [name, text] of [...designFiles.map((f) => [f, shipped("skills", "tools", "design", f)]), ["docs/tools/design.md", shipped("docs", "tools", "design.md")]]) {
    const prose = text.replace(/https?:\/\/\S+/g, "").replace(/CLAUDE\.md|AGENTS\.md/g, "");
    assert.doesNotMatch(prose, BANNED_WORDS, name);
    assert.doesNotMatch(prose, CAST, name);
    assert.doesNotMatch(prose, /Interaction of Color|M[uü]ller-Brockmann|Ching|Mascelli|Katz|Pattern Language/, name);
    assert.doesNotMatch(prose, /\/suits:/, name);
  }
});

test("SKILL.md is the design tool: frontmatter, precedence, token plan, colour rules", () => {
  const skill = shipped("skills", "tools", "design", "SKILL.md");
  assert.match(skill, /^---\nname: design\ndescription: .+\n---/);
  const order = ["1. The project's own", "2. The brief", "3. `DESIGN.md`", "4. The defaults and bans", "5. Optional references"].map((s) => skill.indexOf(s));
  assert.ok(order.every((i) => i >= 0) && order.every((i, k) => k === 0 || i > order[k - 1]), `precedence list: ${order}`);
  assert.match(skill, /stop, name the rule \(file and heading\) and the brief line, and ask the owner/);
  assert.match(skill, /4 to 6 named colours/);
  assert.match(skill, /Read `DESIGN\.md` first/);
  assert.match(skill, /no `DESIGN\.md` yet/);
  assert.match(skill, /Only `brand` creates one/);
  assert.match(skill, /WCAG 2\.2/);
  assert.match(skill, /beside/);
  assert.match(skill, /`check\.mjs contrast/);
});

test("SKILL.md names ten bans, each with a TELLS.md row, and does not restate the 28", () => {
  const skill = shipped("skills", "tools", "design", "SKILL.md");
  const ids = shipped("skills", "tools", "design", "TELLS.md").match(/^\| (T\d+) /gm).map((l) => l.slice(2).trim());
  const bans = skill.split("\n").filter((l) => /^- \*\*.+\*\* \(T\d+/.test(l));
  assert.equal(bans.length, 10);
  for (const line of bans) for (const id of line.match(/T\d+/g)) assert.ok(ids.includes(id), `${id} in "${line}"`);
  assert.equal(skill.split("\n").filter((l) => /^\| T\d/.test(l)).length, 0);
  assert.match(skill, /TELLS\.md/);
});

test("ARTCRAFT.md carries the rules of the hand-off", () => {
  const text = shipped("skills", "tools", "design", "ARTCRAFT.md");
  for (const phrase of [
    "`figcraft`", "`vectorcraft`", "`pdfcraft`", "`artcraft-launcher`", "0.6.1", "0.14.1",
    "--automation-read-root", "--automation-write-root", "timeout 20", "--no-system-fonts",
    "`vectorcraft-cli run` takes no root flags", "absolute output path", "`pdfcraft-cli`", "not run",
  ]) assert.ok(text.includes(phrase), `ARTCRAFT.md lacks ${phrase}`);
  for (const job of ["`brand`", "`email`", "`screens`", "`critique`", "`design`"]) assert.ok(text.includes(job), `ARTCRAFT.md table lacks ${job}`);
});

test("the screens row of ARTCRAFT.md records that frame.presets was run, with the date, and still lists the PNG export", () => {
  const row = shipped("skills", "tools", "design", "ARTCRAFT.md").split("\n").find((l) => l.startsWith("| `screens` |"));
  assert.ok(row, "no screens row");
  assert.match(row, /`frame\.presets` run 2026-11-07/);
  assert.doesNotMatch(row, /frame\.presets`[^)]*not run/);
  assert.match(row, /export[^|]*--node[^|]*--format png/);
});

test("DESIGN-MD.md describes the front matter and the 11 sections in order", () => {
  const text = shipped("skills", "tools", "design", "DESIGN-MD.md");
  for (const key of ["project", "design-md", "tokens", "tokens-format", "rules-win"]) assert.ok(text.includes(`${key}:`), key);
  const at = SECTION_NAMES.map((name) => text.indexOf(`| ${name} |`));
  assert.ok(at.every((i) => i >= 0) && at.every((i, k) => k === 0 || i > at[k - 1]), `sections: ${at}`);
  for (const phrase of ["**Decided:**", "**Status:**", "Not to do", "brief", "Minimum:"]) assert.ok(text.includes(phrase), phrase);
});

test("the docs page has the four sections and is filled in", () => {
  const page = shipped("docs", "tools", "design.md");
  for (const title of ["What it does", "When to reach for it", "Common questions", "It's working if"]) assert.match(page, new RegExp(`^## ${title}$`, "m"));
  assert.ok(page.split(/\s+/).length > 150);
});

test("package.json adds test:artcraft and the plugin lists the design tool", () => {
  const pkg = JSON.parse(shipped("package.json"));
  assert.equal(pkg.scripts["test:artcraft"], "ARTCRAFT_REQUIRED=1 node --test --test-reporter=tap test/artcraft.test.mjs");
  assert.equal(pkg.dependencies, undefined);
  assert.equal(pkg.devDependencies, undefined);
  assert.ok(JSON.parse(shipped(".claude-plugin", "plugin.json")).skills.includes("./skills/tools/design"));
});

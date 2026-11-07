#!/usr/bin/env node
// The deterministic checks of the design method. No dependencies.
//
//   check.mjs contrast <fg> <bg> [--min <ratio>]
//   check.mjs tokens <file.tokens> [<mode file> ...]
//   check.mjs document-css <file.tokens>
//   check.mjs design <DESIGN.md> [--trends <TRENDS.md>] [--as-of <date>]
//   check.mjs trends <TRENDS.md> [--as-of <date>]
//   check.mjs brief <brief.md> [--tells <TELLS.md>]
//   check.mjs research <research.md>
//   check.mjs email <file.html> [--limits <LIMITS.md>]
//   check.mjs tells <piece.html> --brief <brief.md> [--brand <file.tokens>] [--render <file.png>]
//                    [--references <REFERENCES.md>] [--only T1,T2] [--tells <TELLS.md>]
//
// Every command exits 0 when its input passes and 1 when it does not. `tells`
// uses four codes: 0 no tell, 1 a tell, 2 too few reference rows, 3 a check
// could not run. Nothing here reads the clock: dates are arguments.

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { inflateSync } from "node:zlib";

const here = dirname(fileURLToPath(import.meta.url));
const commands = {};

class Failure extends Error {}
const fail = (message) => {
  throw new Failure(message);
};

// Flags that take a value. Anything else starting with "--" is an error.
const VALUE_FLAGS = new Set(["--min", "--as-of", "--trends", "--brief", "--brand", "--render", "--references", "--limits", "--only", "--tells"]);
function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      if (!VALUE_FLAGS.has(arg)) fail(`unknown option ${arg}`);
      if (i + 1 >= argv.length) fail(`${arg} needs a value`);
      flags[arg.slice(2)] = argv[++i];
    } else positional.push(arg);
  }
  return { positional, flags };
}

const readText = (path) => {
  if (!existsSync(path)) fail(`${path}: no such file`);
  return readFileSync(path, "utf8");
};

// A real calendar date, YYYY-MM-DD. Returns the same string, or fails.
function parseDate(text, what) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text ?? "");
  const d = m && new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  if (!m || d.getUTCFullYear() !== +m[1] || d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) fail(`${what}: "${text}" is not a date (YYYY-MM-DD)`);
  return text;
}
const isDate = (text) => {
  try {
    parseDate(text, "");
    return true;
  } catch {
    return false;
  }
};

// ---- colour and contrast (WCAG 2.2) ----

// Text needs 4.5 (SC 1.4.3). Large text and interface parts need 3 (SC 1.4.3, 1.4.11).
const THRESHOLD = { text: 4.5, large: 3, ui: 3 };

function parseColour(text) {
  const t = String(text).trim();
  if (/^#([0-9a-f]{4}|[0-9a-f]{8})$/i.test(t)) fail(`cannot compute a ratio over a translucent colour: "${t}"`);
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(t);
  if (!m) fail(`not a colour: "${t}" (write #rgb or #rrggbb)`);
  const h = m[1].length === 3 ? [...m[1]].map((c) => c + c).join("") : m[1];
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

// The one place a ratio is computed: the DESIGN.md pairs, the token pairs,
// `contrast` and the accessibility tell all call this.
function contrastRatio(foreground, background) {
  const lum = ([r, g, b]) => {
    const f = (c) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const [a, b] = [lum(parseColour(foreground)), lum(parseColour(background))];
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

// Two decimals, but a ratio below a threshold is never shown as the threshold:
// WCAG says do not round up.
function showRatio(ratio) {
  const rounded = Math.round(ratio * 100) / 100;
  for (const t of [3, 4.5]) {
    if (ratio < t && rounded >= t) {
      const finer = Math.round(ratio * 10000) / 10000;
      return String(finer < t ? finer : Math.floor(ratio * 1e6) / 1e6);
    }
  }
  return String(rounded);
}

function contrast({ positional, flags }) {
  if (positional.length !== 2) fail("usage: contrast <fg> <bg> [--min <ratio>]");
  const ratio = contrastRatio(positional[0], positional[1]);
  const verdict = (t) => (ratio >= t ? "pass" : "fail");
  const lines = [`${showRatio(ratio)}:1  text (4.5): ${verdict(4.5)}  large and ui (3): ${verdict(3)}`];
  if (flags.min !== undefined) {
    const min = Number(flags.min);
    if (!(min > 0)) fail(`--min: "${flags.min}" is not a ratio`);
    if (ratio < min) return { code: 1, out: lines };
  }
  return { code: 0, out: lines };
}
commands.contrast = contrast;

// ---- token files (DTCG format module 2025.10) ----

const TIERS = ["primitive", "semantic", "component", "document"];
const DATA_GROUPS = ["grid", "type", "space"];
const DOCUMENT_PROPERTIES = ["accent", "ink", "muted", "line", "tint", "font"];
const aliasOf = (value) => (typeof value === "string" ? /^\{([^{}]+)\}$/.exec(value)?.[1] : undefined);
const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

// Reads a token file into { tokens: Map(path to { path, value, type }), errors }.
function loadTokens(file) {
  let root;
  try {
    root = JSON.parse(readText(file));
  } catch (error) {
    if (error instanceof Failure) throw error;
    fail(`${file}: not valid JSON`);
  }
  const tokens = new Map();
  const errors = [];
  const walk = (node, path, inherited) => {
    const type = node.$type ?? inherited;
    if ("$value" in node) {
      tokens.set(path.join("."), { path: path.join("."), value: node.$value, type });
      return;
    }
    const children = Object.entries(node).filter(([key]) => !key.startsWith("$"));
    if (children.length === 0 && path.length > 0) errors.push(`${path.join(".")}: no $value`);
    for (const [key, child] of children) {
      if (isObject(child)) walk(child, [...path, key], type);
    }
  };
  if (!isObject(root)) fail(`${file}: not valid JSON`);
  walk(root, [], undefined);
  for (const top of Object.keys(root).filter((k) => !k.startsWith("$"))) {
    if (![...TIERS, ...DATA_GROUPS].includes(top)) errors.push(`top-level group "${top}" is not ${[...TIERS, ...DATA_GROUPS].join(", ")}`);
  }
  return { tokens, errors };
}

// Follows aliases to the token that holds a value. Fails on a missing token or a cycle.
function resolveToken(tokens, path) {
  const chain = [];
  let current = path;
  for (;;) {
    if (chain.includes(current)) fail(`alias cycle: ${[...chain, current].join(" -> ")}`);
    const token = tokens.get(current);
    if (!token) fail(`alias {${current}} does not resolve`);
    chain.push(current);
    const next = aliasOf(token.value);
    if (next === undefined) return token;
    current = next;
  }
}

// A colour token's value as #rrggbb. Needs a hex or srgb components; never guesses.
function colourHex(tokens, path) {
  const token = resolveToken(tokens, path);
  const v = token.value;
  if (!isObject(v)) fail(`cannot compute: ${token.path} is not a colour object`);
  if (v.alpha !== undefined && v.alpha < 1) fail(`cannot compute a ratio over a translucent colour: ${token.path}`);
  if (typeof v.hex === "string") {
    parseColour(v.hex);
    return v.hex.length === 4 ? `#${[...v.hex.slice(1)].map((c) => c + c).join("")}`.toLowerCase() : v.hex.toLowerCase();
  }
  if (v.colorSpace === "srgb" && Array.isArray(v.components) && v.components.length === 3 && v.components.every((c) => typeof c === "number")) {
    return `#${v.components.map((c) => Math.round(Math.min(1, Math.max(0, c)) * 255).toString(16).padStart(2, "0")).join("")}`;
  }
  fail(`cannot compute: ${token.path} is ${v.colorSpace ?? "a colour"} with no hex`);
}

const GENERIC_FAMILIES = new Set(["serif", "sans-serif", "monospace", "cursive", "fantasy", "system-ui", "ui-serif", "ui-sans-serif", "ui-monospace", "ui-rounded"]);
function fontStack(tokens, path) {
  const v = resolveToken(tokens, path).value;
  const families = Array.isArray(v) ? v : typeof v === "string" ? v.split(",").map((f) => f.trim().replace(/^["']|["']$/g, "")) : fail(`${path}: not a font family`);
  return families.map((f) => (GENERIC_FAMILIES.has(f) ? f : `"${f}"`)).join(", ");
}

// Every rule of the token file as a list of messages.
function tokenProblems({ tokens, errors }, file) {
  const problems = errors.map((e) => `${file}: ${e}`);
  const add = (message) => problems.push(`${file}: ${message}`);
  for (const token of tokens.values()) {
    const [top] = token.path.split(".");
    const target = aliasOf(token.value);
    if (target !== undefined) {
      try {
        resolveToken(tokens, token.path);
      } catch (error) {
        if (!(error instanceof Failure)) throw error;
        add(`${token.path}: ${error.message}`);
      }
    } else if (token.type === "color") {
      if (!isObject(token.value)) add(`${token.path}: a colour is an object with colorSpace and components`);
      else {
        if (!token.value.colorSpace) add(`${token.path}: colorSpace is missing`);
        if (!token.value.components) add(`${token.path}: components is missing`);
      }
    }
    const tier = { semantic: ["primitive", "primitive token"], component: ["semantic", "semantic token"], document: ["semantic", "semantic token"] }[top];
    if (tier && !(target !== undefined && target.startsWith(`${tier[0]}.`))) {
      add(`${token.path}: a ${top === "document" ? "document property" : `${top} token`} must be an alias to a ${tier[1]}`);
    }
  }
  for (const property of DOCUMENT_PROPERTIES) if (!tokens.has(`document.${property}`)) add(`document.${property} is missing`);
  return problems;
}

function tokensCommand({ positional }) {
  if (positional.length === 0) fail("usage: tokens <file.tokens> [<mode file> ...]");
  const problems = [];
  const loaded = positional.map((file) => ({ file, ...loadTokens(file) }));
  for (const l of loaded) problems.push(...tokenProblems(l, l.file));
  const [base, ...modes] = loaded;
  for (const mode of modes) {
    const missing = [...base.tokens.keys()].filter((p) => !mode.tokens.has(p));
    const extra = [...mode.tokens.keys()].filter((p) => !base.tokens.has(p));
    if (missing.length || extra.length) {
      problems.push(`${mode.file}: token paths differ from ${base.file}:${missing.length ? ` missing ${missing.join(", ")}` : ""}${extra.length ? ` extra ${extra.join(", ")}` : ""}`);
    }
  }
  if (problems.length) return { code: 1, err: problems };
  return { out: positional.map((f) => `ok: ${f}`) };
}
commands.tokens = tokensCommand;

function documentCss({ positional }) {
  if (positional.length !== 1) fail("usage: document-css <file.tokens>");
  const loaded = loadTokens(positional[0]);
  const values = {};
  const problems = [];
  for (const property of DOCUMENT_PROPERTIES) {
    const path = `document.${property}`;
    try {
      if (!loaded.tokens.has(path)) fail(`${path} is missing`);
      values[property] = property === "font" ? fontStack(loaded.tokens, path) : colourHex(loaded.tokens, path);
    } catch (error) {
      if (!(error instanceof Failure)) throw error;
      problems.push(`${positional[0]}: ${error.message}`);
    }
  }
  if (problems.length) return { code: 1, err: problems };
  return { out: [":root {", ...DOCUMENT_PROPERTIES.map((p) => `  --${p}: ${values[p]};`), "}"] };
}
commands["document-css"] = documentCss;

// ---- Markdown helpers ----

// `---` front matter: { fields: { key: string | string[] }, body } or undefined.
function frontMatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text);
  if (!m) return undefined;
  const fields = {};
  let list;
  for (const line of m[1].split(/\r?\n/)) {
    const item = /^\s+-\s+(.*)$/.exec(line);
    if (item && list) {
      list.push(item[1].trim());
      continue;
    }
    const kv = /^([\w-]+):\s*(.*)$/.exec(line);
    if (!kv) continue;
    const value = kv[2].replace(/\s+#.*$/, "").trim();
    fields[kv[1]] = value === "" ? (list = []) : ((list = undefined), value);
  }
  return { fields, body: text.slice(m[0].length) };
}

// Level-2 sections, with a leading "1. " dropped from the name.
function sectionsOf(body) {
  const sections = [];
  for (const part of body.split(/^## /m).slice(1)) {
    const [head, ...rest] = part.split("\n");
    sections.push({ name: head.trim().replace(/^\d+\.\s*/, ""), body: rest.join("\n") });
  }
  return sections;
}

// Level-3 entries inside a section body.
function entriesOf(body) {
  return body.split(/^### /m).slice(1).map((part) => {
    const [head, ...rest] = part.split("\n");
    return { name: head.trim(), text: rest.join("\n") };
  });
}

const bullets = (body) => body.split("\n").map((l) => /^\s*[-*]\s+(.*\S)\s*$/.exec(l)?.[1]).filter((l) => l !== undefined);
const boldField = (text, name) => new RegExp(`^\\*\\*${name}:\\*\\*[ \\t]*(.*)$`, "m").exec(text)?.[1]?.trim();

// ---- TELLS.md ----

const TELLS_FILE = join(here, "TELLS.md");
function parseTells(file = TELLS_FILE) {
  const rows = [];
  for (const line of readText(file).split("\n")) {
    const cells = /^\|\s*(T\d+)\s*\|(.*)\|\s*$/.exec(line) && line.split("|").slice(1, -1).map((c) => c.trim());
    if (cells && cells.length === 6) rows.push({ id: cells[0], tell: cells[1], check: cells[2], type: cells[3], source: cells[4], status: cells[5] });
  }
  return rows;
}

// ---- trends (TRENDS.md) ----

const TREND_FIELDS = ["What it is", "Originator and date", "Sources", "Counter-evidence", "Suits", "Status", "Review by"];
const TREND_STATUSES = ["Watch", "Trial", "Retired"];

function parseTrends(file) {
  return readText(file).split(/^## /m).slice(1).map((part) => {
    const [head, ...rest] = part.split("\n");
    const text = rest.join("\n");
    return { name: head.trim(), fields: Object.fromEntries(TREND_FIELDS.map((f) => [f, boldField(text, f)])) };
  });
}

function trendProblems(entries, asOf) {
  const problems = [];
  for (const { name, fields } of entries) {
    const add = (message) => problems.push(`entry "${name}": ${message}`);
    for (const field of TREND_FIELDS) if (!fields[field]) add(`missing "${field}"`);
    if (fields.Sources && !/https?:\/\/\S+/.test(fields.Sources)) add("Sources has no URL");
    if (fields.Status && !TREND_STATUSES.includes(fields.Status)) add(`status "${fields.Status}" is not Watch, Trial or Retired`);
    if (fields["Review by"]) {
      try {
        parseDate(fields["Review by"], "Review by");
        if (asOf && fields["Review by"] < asOf) add(`review-by ${fields["Review by"]} is past on ${asOf}`);
      } catch (error) {
        if (!(error instanceof Failure)) throw error;
        add(error.message);
      }
    }
  }
  return problems;
}

function trendsCommand({ positional, flags }) {
  if (positional.length !== 1) fail("usage: trends <TRENDS.md> [--as-of <date>]");
  const asOf = flags["as-of"] && parseDate(flags["as-of"], "--as-of");
  const entries = parseTrends(positional[0]);
  if (entries.length === 0) fail(`${positional[0]}: no entries (each is a ## heading)`);
  const problems = trendProblems(entries, asOf);
  if (problems.length) return { code: 1, err: problems.map((p) => `${positional[0]}: ${p}`) };
  return { out: [`ok: ${positional[0]}`, ...(asOf ? [] : ["no --as-of: review-by dates were not checked"])] };
}
commands.trends = trendsCommand;

// ---- DESIGN.md ----

const DESIGN_KEYS = ["project", "design-md", "tokens", "tokens-format", "rules-win"];
const DESIGN_SECTIONS = ["Brand and references", "Foundations as roles", "Token source", "Components and patterns in use", "Content and voice", "Accessibility floor", "Platform conformance", "Trends in use", "Decisions and evidence", "Change log", "Not to do"];
const COMPONENT_STATUSES = ["Trial", "Stable", "Deprecated"];
const PAIR = /^(text|large|ui):\s*(\S+)\s+on\s+(\S+?)(?:\s+=\s+([\d.]+))?$/;

function designCommand({ positional, flags }) {
  if (positional.length !== 1) fail("usage: design <DESIGN.md> [--trends <TRENDS.md>] [--as-of <date>]");
  const file = positional[0];
  const asOf = flags["as-of"] && parseDate(flags["as-of"], "--as-of");
  const problems = [];
  const add = (message) => problems.push(`${file}: ${message}`);
  const fm = frontMatter(readText(file));
  if (!fm) return { code: 1, err: [`${file}: front matter: missing (the file starts with ---)`] };
  for (const key of DESIGN_KEYS) if (!(key in fm.fields)) add(`front matter: missing "${key}"`);

  const sections = sectionsOf(fm.body);
  const body = (name) => sections.find((s) => s.name === name)?.body ?? "";
  const present = DESIGN_SECTIONS.filter((name) => sections.some((s) => s.name === name));
  for (const name of DESIGN_SECTIONS) if (!present.includes(name)) add(`missing section "${name}"`);
  const found = sections.map((s) => s.name).filter((name, i, all) => DESIGN_SECTIONS.includes(name) && all.indexOf(name) === i);
  const outOfOrder = found.findIndex((name, i) => name !== present[i]);
  if (outOfOrder >= 0) add(`section "${found[outOfOrder]}" is out of order (expected "${present[outOfOrder]}" here)`);

  for (const name of ["Foundations as roles", "Decisions and evidence"]) {
    for (const entry of entriesOf(body(name))) {
      const decided = boldField(entry.text, "Decided");
      if (!decided) add(`entry "${entry.name}": no **Decided:** date`);
      else if (!isDate(decided)) add(`entry "${entry.name}": Decided: "${decided}" is not a date (YYYY-MM-DD)`);
    }
  }
  for (const entry of entriesOf(body("Components and patterns in use"))) {
    const status = boldField(entry.text, "Status");
    if (!status) add(`component "${entry.name}": no **Status:**`);
    else if (!COMPONENT_STATUSES.includes(status)) add(`component "${entry.name}": status "${status}" is not Trial, Stable or Deprecated`);
  }

  // Accessibility pairs, resolved in the token file and computed.
  const pairs = bullets(body("Accessibility floor")).map((b) => ({ text: b, match: PAIR.exec(b) })).filter((p) => /^(text|large|ui):/.test(p.text));
  if (pairs.length && typeof fm.fields.tokens === "string") {
    let tokens;
    const tokenPath = resolve(dirname(file), fm.fields.tokens);
    try {
      tokens = loadTokens(tokenPath).tokens;
    } catch (error) {
      if (!(error instanceof Failure)) throw error;
      add(error.message);
    }
    for (const { text, match } of tokens ? pairs : []) {
      if (!match) {
        add(`pair "${text}" is not "<text|large|ui>: <role path> on <role path>"`);
        continue;
      }
      const [, kind, fgPath, bgPath, stated] = match;
      if (fgPath.startsWith("#") || bgPath.startsWith("#")) {
        add(`pair "${text}": write role paths, not values`);
        continue;
      }
      try {
        const hex = [fgPath, bgPath].map((path) => {
          if (!tokens.has(path) && !aliasOf(tokens.get(path)?.value)) fail(`${path} does not resolve to a colour in ${fm.fields.tokens}`);
          const token = resolveToken(tokens, path);
          if (token.type !== "color") fail(`${path} is not a colour`);
          return colourHex(tokens, path);
        });
        const ratio = contrastRatio(hex[0], hex[1]);
        if (ratio < THRESHOLD[kind]) add(`${kind} pair ${fgPath} on ${bgPath} is ${showRatio(ratio)}:1, needs ${THRESHOLD[kind]}`);
        if (stated !== undefined && Math.abs(Number(stated) - ratio) > 0.01) add(`pair ${fgPath} on ${bgPath}: stated ratio ${stated} differs from the computed ${showRatio(ratio)}`);
      } catch (error) {
        if (!(error instanceof Failure)) throw error;
        add(`pair ${fgPath} on ${bgPath}: ${error.message}`);
      }
    }
  }

  // Trends in use must point at live entries.
  const notes = [];
  const used = bullets(body("Trends in use"));
  if (used.length) {
    const trends = parseTrends(flags.trends ?? join(here, "TRENDS.md"));
    if (!asOf) notes.push("no --as-of: review-by dates were not checked");
    for (const line of used) {
      const [name, reviewed, brief] = line.split("|").map((p) => p.trim());
      const date = /^reviewed\s+(.*)$/.exec(reviewed ?? "")?.[1];
      const briefLine = /^brief:\s*(.*)$/.exec(brief ?? "")?.[1];
      if (date === undefined || briefLine === undefined) {
        add(`Trends in use: "${line}" is not "<name> | reviewed <date> | brief: <sentence>"`);
        continue;
      }
      if (!isDate(date)) add(`Trends in use: reviewed: "${date}" is not a date (YYYY-MM-DD)`);
      if (!briefLine) add(`Trends in use: "${name}" has no brief line`);
      const entry = trends.find((t) => t.name === name);
      if (!entry) add(`Trends in use: "${name}" is not an entry in TRENDS.md`);
      else if (entry.fields.Status === "Retired") add(`Trends in use: "${name}" is Retired`);
      else if (entry.fields.Status === "Watch") add(`Trends in use: "${name}" is Watch; only a Trial entry may be applied`);
      else if (asOf && entry.fields["Review by"] < asOf) add(`Trends in use: "${name}" is past its review-by date ${entry.fields["Review by"]} on ${asOf}`);
    }
  }

  // The change log is dated and newest first.
  const dates = [];
  for (const item of bullets(body("Change log"))) {
    const date = /^(\d{4}-\d{2}-\d{2})\b/.exec(item)?.[1];
    if (!date || !isDate(date)) add(`change log entry has no date: "${item}"`);
    else dates.push(date);
  }
  if (dates.some((d, i) => i > 0 && d > dates[i - 1])) add("change log is not newest first");

  if (problems.length) return { code: 1, err: problems };
  return { out: [`ok: ${file}`, ...notes] };
}
commands.design = designCommand;

// ---- brief ----

const BRIEF_SECTIONS = ["Audience", "Job", "Tone", "Must not look like", "Surface", "References"];
// The five sections the creative flow adds; a brief written to the old six fails until they are there.
const NEW_BRIEF_SECTIONS = ["Intake", "Idea", "Insight", "Story", "Research"];
const DEFAULT_MINIMUM = 3;
const MIN_BEATS = 3;
const MAX_BEATS = 5;

// The Idea ends in a "Two words:" line, the idea cut to exactly two words.
function twoWordsProblems(idea) {
  const line = idea.split("\n").map((l) => /^\s*Two words:(.*)$/.exec(l)).find(Boolean);
  if (!line) return ['section "Idea" has no "Two words:" line'];
  const count = line[1].trim().split(/\s+/).filter(Boolean).length;
  return count === 2 ? [] : [`Two words: needs exactly two words, found ${count}`];
}

// The Story is "Story: none. Reason: <why>" or 3 to 5 beats, each "- Beat n: <shown> | carried by: <what>".
function storyProblems(story) {
  const none = /^\s*Story:\s*none\b\.?\s*(?:Reason:\s*(.*))?$/im.exec(story);
  const beats = story.split("\n").map((l) => /^\s*[-*]\s+(Beat\s+\d+)\s*:\s*(.*)$/i.exec(l)).filter(Boolean);
  if (none) {
    if (!(none[1] ?? "").trim()) return ["Story: none needs a Reason:"];
    return beats.length ? ["Story: none and beats together"] : [];
  }
  const problems = [];
  if (beats.length < MIN_BEATS || beats.length > MAX_BEATS) problems.push(`Story: ${beats.length} beats, needs ${MIN_BEATS} to ${MAX_BEATS}`);
  for (const [, name, text] of beats) {
    if (!/\|\s*carried by:\s*\S/i.test(text)) problems.push(`Story: ${name} has no carried by`);
  }
  return problems;
}

function parseBrief(text, tellIds) {
  const sections = sectionsOf(text);
  const problems = [];
  const body = (name) => sections.find((s) => s.name === name)?.body ?? "";
  const lacking = NEW_BRIEF_SECTIONS.filter((name) => !sections.some((s) => s.name === name));
  if (lacking.length) problems.push(`the brief needs the creative sections: missing ${lacking.join(", ")}`);
  for (const name of [...BRIEF_SECTIONS, ...NEW_BRIEF_SECTIONS]) {
    if (!sections.some((s) => s.name === name)) problems.push(`missing section "${name}"`);
    else if (!body(name).trim()) problems.push(`section "${name}" is empty`);
  }
  if (body("Idea").trim()) problems.push(...twoWordsProblems(body("Idea")));
  if (body("Story").trim()) problems.push(...storyProblems(body("Story")));
  const references = [];
  let minimum = DEFAULT_MINIMUM;
  for (const item of bullets(body("References"))) {
    const id = /^([A-Za-z][\w.-]*):\s*\S/.exec(item)?.[1];
    if (id && !references.includes(id)) references.push(id);
  }
  for (const line of body("References").split("\n")) {
    const m = /^Minimum:\s*(\S+?)\.?\s*(?:Reason:\s*(.+))?$/.exec(line.trim());
    if (!m) continue;
    const n = Number(m[1]);
    if (!Number.isInteger(n) || n < 1) problems.push(`Minimum: ${m[1]} is below the floor of one reference row`);
    else if (n < DEFAULT_MINIMUM && !m[2]) problems.push(`Minimum: ${n} is below ${DEFAULT_MINIMUM} and needs a Reason:`);
    else minimum = n;
  }
  const earned = new Set();
  for (const item of bullets(body("Tells earned"))) {
    const m = /^(T\d+):\s*(.*)$/.exec(item);
    if (!m) continue;
    if (!tellIds.includes(m[1])) problems.push(`${m[1]} is not a row of TELLS.md`);
    else if (!m[2].trim()) problems.push(`${m[1]} has no reason (a tell is earned with a reason)`);
    else earned.add(m[1]);
  }
  return { problems, references, minimum, earned };
}

function briefCommand({ positional, flags }) {
  if (positional.length !== 1) fail("usage: brief <brief.md> [--tells <TELLS.md>]");
  const { problems } = parseBrief(readText(positional[0]), parseTells(flags.tells).map((r) => r.id));
  if (problems.length) return { code: 1, err: problems.map((p) => `${positional[0]}: ${p}`) };
  return { out: [`ok: ${positional[0]}`] };
}
commands.brief = briefCommand;

// ---- research ----

// The seven parts of a piece's visual research, then the closing lists, in this order (RESEARCH.md).
const RESEARCH_PARTS = [
  "P1. Sources",
  "P2. Source notes",
  "P3. Register",
  "P4. Not that",
  "P5. Gaps and substitutes",
  "P6. What the supplied pictures can carry",
  "P7. Output to craft",
];
const RESEARCH_OPENING = ["Job facts"];
const RESEARCH_CLOSING = ["Not checked", "Open"];
const P2_FIELDS = ["Alignment", "Type", "Colour and rhythm", "Subject", "Button", "Spacing", "Reads as", "How it tells"];
const P1_READ = ["opened", "summary only"];
const P1_FLOOR = 6;
const P1_MAKERS = 2;

// The rows of the first Markdown table in a body, as cell lists. The header and the divider are dropped.
const tableRows = (body) =>
  body
    .split("\n")
    .filter((l) => l.trim().startsWith("|"))
    .map((l) => l.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim()))
    .filter((cells, i) => i > 1 && cells.some((c) => c));

function researchProblems(text) {
  const problems = [];
  const sections = sectionsOf(text);
  const body = (name) => sections.find((s) => s.name === name)?.body ?? "";
  const head = text.split(/^## /m)[0];

  const date = /^Date:[ \t]*(.*)$/m.exec(head)?.[1]?.trim();
  if (date === undefined) problems.push("no Date: line");
  else if (!isDate(date)) problems.push(`Date: ${date} is not a date (YYYY-MM-DD)`);
  if (!/^Client:[ \t]*\S/m.test(head)) problems.push("no Client: line (write none when nothing was fetched)");

  const names = [...RESEARCH_OPENING, ...RESEARCH_PARTS, ...RESEARCH_CLOSING];
  for (const name of names) {
    if (!sections.some((s) => s.name === name)) problems.push(`missing section "${name}"`);
    else if (!body(name).trim()) problems.push(`section "${name}" is empty`);
  }
  const at = RESEARCH_PARTS.map((name) => sections.findIndex((s) => s.name === name));
  if (at.every((i) => i >= 0) && at.some((i, k) => k > 0 && i < at[k - 1])) problems.push("P1 to P7 are not in order");

  // P1: the sources.
  const p1 = body("P1. Sources");
  const rows = tableRows(p1);
  if (p1.trim()) {
    const makers = new Set();
    rows.forEach(([, maker, url, , read], i) => {
      if (!maker) problems.push(`P1 row ${i + 1}: no Maker`);
      else makers.add(maker);
      if (!url) problems.push(`P1 row ${i + 1}: no URL`);
      if (!P1_READ.includes(read)) problems.push(`P1 row ${i + 1}: Read "${read ?? ""}" is not opened or summary only`);
    });
    if (rows.length < P1_FLOOR) problems.push(`P1: ${rows.length} sources, needs ${P1_FLOOR}`);
    if (rows.length >= P1_FLOOR && makers.size < P1_MAKERS) problems.push(`P1: ${makers.size} maker, needs ${P1_MAKERS}`);
  }

  // P2: one entry for each source, every field filled.
  const p2 = entriesOf(body("P2. Source notes"));
  if (body("P2. Source notes").trim() && p2.length !== rows.length) problems.push(`P2 has ${p2.length} entries for ${rows.length} P1 sources`);
  for (const entry of p2) {
    for (const field of P2_FIELDS) {
      const value = boldField(entry.text, field);
      if (value === undefined) problems.push(`P2 source ${entry.name}: no "${field}" field`);
      else if (!value) problems.push(`P2 source ${entry.name}: "${field}" is empty`);
    }
  }

  // P4: a table of moves, or "no earlier piece".
  const p4 = body("P4. Not that");
  if (p4.trim() && !/no earlier piece/i.test(p4) && tableRows(p4).length === 0) problems.push('P4: no table of moves and no "no earlier piece" line');

  // P7: names the sources it takes from.
  const p7 = body("P7. Output to craft");
  if (p7.trim()) {
    const cited = [...p7.matchAll(/\bsources?\s+(\d+)(?:(?:\s*(?:,|and|&)\s*)(\d+))*/gi)].flatMap((m) => [...m[0].matchAll(/\d+/g)].map((n) => Number(n[0])));
    if (!cited.length) problems.push("P7 cites no source");
    for (const n of cited) if (n < 1 || n > rows.length) problems.push(`P7 cites source ${n}, which is not a P1 source`);
  }
  return problems;
}

function researchCommand({ positional }) {
  if (positional.length !== 1) fail("usage: research <research.md>");
  const problems = researchProblems(readText(positional[0]));
  if (problems.length) return { code: 1, err: problems.map((p) => `${positional[0]}: ${p}`) };
  return { out: [`ok: ${positional[0]}`] };
}
commands.research = researchCommand;

// ---- reading a piece (HTML or SVG) ----

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", middot: "·", mdash: "—", ndash: "–", rarr: "→", larr: "←" };
const decode = (s) =>
  s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d)).replace(/&(\w+);/g, (m, n) => ENTITIES[n] ?? m);

// Rules from <style> blocks and style="" attributes: { selector, decls: [[prop, value]] }.
function cssRules(html) {
  const rules = [];
  const declsOf = (text) => [...text.matchAll(/([\w-]+)\s*:\s*([^;]+)/g)].map((m) => [m[1].toLowerCase(), m[2].trim()]);
  const css = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1].replace(/\/\*[\s\S]*?\*\//g, "")).join("\n");
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) rules.push({ selector: m[1].trim(), decls: declsOf(m[2]) });
  for (const m of html.matchAll(/<(\w+)\b[^>]*\sstyle\s*=\s*"([^"]*)"/gi)) rules.push({ selector: `${m[1]}[style]`, decls: declsOf(m[2]) });
  return rules;
}

function readPiece(source) {
  const stripped = source.replace(/<!--[\s\S]*?-->/g, "").replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, "\0");
  const textNodes = stripped.replace(/<[^>]*>/g, "\0").split("\0").map((t) => decode(t).replace(/\s+/g, " ").trim()).filter(Boolean);
  return { source, rules: cssRules(source), textNodes, text: textNodes.join(" "), words: textNodes.join(" ").split(/\s+/).filter(Boolean) };
}

const decl = (rule, prop) => rule.decls.find(([p]) => p === prop)?.[1];
const declsNamed = (rule, ...props) => rule.decls.filter(([p]) => props.includes(p));
const classCount = (source, name) => [...source.matchAll(/\sclass\s*=\s*"([^"]*)"/gi)].filter((m) => m[1].split(/\s+/).includes(name)).length;
const toPx = (value) => {
  const m = /^(-?[\d.]+)(px|rem|em)?$/.exec(String(value).trim());
  return m ? (m[2] === "rem" || m[2] === "em" ? Number(m[1]) * 16 : Number(m[1])) : undefined;
};

// box-shadow: the [x, y, blur] of its first shadow.
function shadowOf(value) {
  const first = value.replace(/(rgba?|hsla?)\([^)]*\)|#[0-9a-f]+/gi, " ").split(",")[0];
  const [x = 0, y = 0, blur = 0] = [...first.matchAll(/-?[\d.]+(?:px)?\b/g)].map((m) => parseFloat(m[0]));
  return { x, y, blur };
}
const hueOf = (hex) => {
  const [r, g, b] = parseColour(hex).map((c) => c / 255);
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  if (d < 0.1) return undefined;
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return Math.round((h * 60 + 360) % 360);
};
const hexIn = (text) => [...text.matchAll(/#[0-9a-f]{6}\b|#[0-9a-f]{3}\b/gi)].map((m) => m[0].toLowerCase());
const longHex = (hex) => (hex.length === 4 ? `#${[...hex.slice(1)].map((c) => c + c).join("")}` : hex);

// ---- brand data (a token file) ----

function loadBrand(file) {
  const { tokens } = loadTokens(file);
  const brand = { fonts: new Set(), colours: [], grid: undefined, typeSteps: [] };
  for (const token of tokens.values()) {
    try {
      if (token.type === "fontFamily") {
        const v = resolveToken(tokens, token.path).value;
        for (const family of Array.isArray(v) ? v : [v]) brand.fonts.add(String(family).toLowerCase());
      } else if (token.type === "color") brand.colours.push(colourHex(tokens, token.path));
    } catch (error) {
      if (!(error instanceof Failure)) throw error;
    }
  }
  const number = (path) => {
    const v = tokens.has(path) ? resolveToken(tokens, path).value : undefined;
    return isObject(v) && "value" in v ? toPx(`${v.value}${v.unit ?? "px"}`) : typeof v === "number" ? v : undefined;
  };
  const [columns, gutter, margin] = ["grid.columns", "grid.gutter", "grid.margin"].map(number);
  if (columns > 0 && gutter !== undefined && margin !== undefined) brand.grid = { columns, gutter, margin };
  brand.typeSteps = [...tokens.keys()].filter((p) => p.startsWith("type.") && tokens.get(p).type === "dimension").map(number).filter((n) => n > 0);
  return brand;
}

// ---- the tells that read source and words ----

const DEFAULT_FONTS = ["inter", "roboto", "arial", "system-ui"];
const BUZZWORDS = /\b(empower(?:s|ed|ing)?|unlock(?:s|ed|ing)?|seamless(?:ly)?|robust|leverage[sd]?|leveraging)\b/i;
const MONO = /mono|courier|consolas|menlo/i;
const CODE_SELECTOR = /(^|[\s,>+~])(code|pre|kbd|samp|var|tt)\b|\.(code|data|num|figure)\b/;
const ANIMATION_WORDS = new Set(["ease", "ease-in", "ease-out", "ease-in-out", "linear", "infinite", "forwards", "backwards", "both", "normal", "reverse", "alternate", "none", "paused", "running"]);
const interactive = (selector) => /:(hover|focus|focus-visible|active)/.test(selector);

// Each check takes the piece and the context ({ brand }) and returns evidence strings.
const FILE_CHECKS = {
  T1: (p, { brand }) => {
    const found = new Set();
    for (const rule of p.rules) {
      const family = decl(rule, "font-family")?.split(",")[0].trim().replace(/['"]/g, "").toLowerCase();
      if (DEFAULT_FONTS.includes(family) && !brand?.fonts.has(family)) found.add(`font-family starts with ${family}`);
    }
    return [...found];
  },
  T2: (p, { brand }) => {
    const brandHasHue = brand?.colours.some((c) => (hueOf(c) ?? 0) >= 240 && hueOf(c) <= 290);
    const found = [];
    for (const rule of p.rules) {
      for (const [, value] of rule.decls) {
        const gradient = /linear-gradient\(([^;]*)/i.exec(value)?.[1];
        const hues = gradient ? hexIn(gradient).map(hueOf).filter((h) => h >= 240 && h <= 290) : [];
        if (hues.length >= 2 && !brandHasHue) found.push(`${rule.selector} has a gradient between hues ${hues.join(" and ")}`);
      }
    }
    return found;
  },
  T3: (p) => p.rules.filter((r) => declsNamed(r, "background-clip", "-webkit-background-clip").some(([, v]) => /text/i.test(v)) && r.decls.some(([, v]) => /gradient\(/i.test(v))).map((r) => `${r.selector} sets a gradient as text`),
  T5: (p) => {
    const found = [];
    for (const r of p.rules) {
      const name = /^\.([\w-]+)$/.exec(r.selector)?.[1];
      const radius = toPx(decl(r, "border-radius") ?? "0");
      const shadow = decl(r, "box-shadow");
      if (name && radius > 0 && shadow && !/^none$/i.test(shadow) && classCount(p.source, name) >= 3) found.push(`.${name} is used by ${classCount(p.source, name)} elements with a radius and a shadow`);
    }
    return found;
  },
  T6: (p) => {
    const both = p.rules.filter((r) => decl(r, "border-radius") && decl(r, "box-shadow") && toPx(decl(r, "border-radius")) > 0);
    const radii = new Set(both.map((r) => decl(r, "border-radius")));
    const shadows = new Set(both.map((r) => decl(r, "box-shadow")));
    return both.length > 5 && radii.size === 1 && shadows.size === 1 ? [`${both.length} surfaces share one radius and one shadow`] : [];
  },
  T7: (p) => p.rules.filter((r) => /(^|\s)1px\b/.test(decl(r, "border") ?? "") && decl(r, "box-shadow") && shadowOf(decl(r, "box-shadow")).blur >= 12).map((r) => `${r.selector} has a 1px border under a wide soft shadow`),
  T8: (p) =>
    p.rules.flatMap((r) =>
      declsNamed(r, "border-left", "border-right", "border-left-width", "border-right-width")
        .filter(([, v]) => !/none|transparent|^0/.test(v) && toPx(/-?[\d.]+(?:px|rem|em)?/.exec(v)?.[0] ?? "0") > 1)
        .map(([prop, v]) => `${r.selector} has ${prop}: ${v}`),
    ),
  T9: (p) => p.rules.filter((r) => decl(r, "box-shadow") && !/none/i.test(decl(r, "box-shadow"))).filter((r) => { const s = shadowOf(decl(r, "box-shadow")); return s.blur === 0 && (s.x !== 0 || s.y !== 0); }).map((r) => `${r.selector} has a hard offset shadow`),
  T10: (p) => p.rules.filter((r) => declsNamed(r, "backdrop-filter", "-webkit-backdrop-filter").length).map((r) => `${r.selector} uses backdrop-filter`),
  T11: (p) => {
    const m = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2900}-\u{297F}\u{2B00}-\u{2BFF}]/u.exec(p.text);
    return m ? [`the text has the glyph ${m[0]}`] : [];
  },
  T12: (p) => {
    const found = [];
    const heading = String.raw`\s*<h[1-3]\b`;
    for (const r of p.rules) {
      const caps = /^uppercase$/i.test(decl(r, "text-transform") ?? "");
      const spacing = decl(r, "letter-spacing") ?? "0";
      const em = /em$/.test(spacing) ? parseFloat(spacing) : toPx(spacing) / 16;
      if (!caps || !(em >= 0.08)) continue;
      const name = /^\.([\w-]+)$/.exec(r.selector)?.[1];
      const above = name
        ? new RegExp(String.raw`<(\w+)\b[^>]*class\s*=\s*"[^"]*\b${name}\b[^"]*"[^>]*>[^<]*</\1>${heading}`, "i").test(p.source)
        : /\[style\]$/.test(r.selector);
      if (above) found.push(`${r.selector} is tracked caps above a heading`);
    }
    return found;
  },
  T13: (p) => p.textNodes.filter((t) => /[^·•]+\s[·•]\s[^·•]+\s[·•]\s[^·•]+/.test(t)).map((t) => `"${t}" is a dot-joined meta line`),
  T14: (p) => p.textNodes.filter((t) => t.length < 40 && /^[A-Z][A-Z0-9&]+\s+[—–]\s+\S/.test(t)).map((t) => `"${t}" is a WORD, dash, fragment label`),
  T15: (p) => (p.textNodes.filter((t) => /^0\d$/.test(t)).length >= 2 ? ["numbered markers 01, 02 on items"] : []),
  T16: (p) => {
    const found = [];
    for (const m of p.source.matchAll(/<h([1-3])\b[^>]*>([\s\S]*?)<\/h\1>/gi)) {
      const children = [...m[2].matchAll(/<(em|strong|i|b|span)\b[^>]*>([^<]*)<\/\1>/gi)];
      const total = decode(m[2].replace(/<[^>]*>/g, "")).trim().split(/\s+/).length;
      if (children.length === 1 && children[0][2].trim().split(/\s+/).length === 1 && total > 1) found.push(`the heading "${decode(m[2].replace(/<[^>]*>/g, "")).trim()}" sets one word apart`);
    }
    return found;
  },
  T19: (p, { brand }) => {
    const named = new Set((brand?.colours ?? []).map(longHex));
    const found = new Set();
    for (const r of p.rules) {
      for (const [prop, value] of r.decls) {
        if (prop.startsWith("--") || !/^(color|background|background-color|fill|border-color)$/.test(prop)) continue;
        for (const hex of hexIn(value).map(longHex)) if ((hex === "#0b0b0b" || hex === "#111111") && !named.has(hex)) found.add(`${prop}: ${hex} stands in for black`);
      }
    }
    return [...found];
  },
  T21: (p, { brand }) => {
    const found = new Set();
    for (const r of p.rules) {
      const size = decl(r, "font-size");
      const px = size && /^[\d.]+(px|rem)$/.test(size) ? toPx(size) : undefined;
      if (px !== undefined && !brand.typeSteps.some((s) => Math.abs(s - px) < 0.5)) found.add(`font-size ${size} is not one of the type steps (${brand.typeSteps.join(", ")})`);
    }
    return [...found];
  },
  T22: (p) => {
    const byName = new Map();
    const found = [];
    for (const r of p.rules) {
      if (interactive(r.selector)) continue;
      const value = decl(r, "animation-name") ?? decl(r, "animation");
      const name = value?.split(/\s+/).find((t) => /^[a-z_][\w-]*$/i.test(t) && !ANIMATION_WORDS.has(t.toLowerCase()));
      if (!name) continue;
      byName.set(name, (byName.get(name) ?? 0) + 1);
      const cls = /^\.([\w-]+)$/.exec(r.selector)?.[1];
      if (cls && classCount(p.source, cls) >= 3) found.push(`.${cls} runs ${name} on ${classCount(p.source, cls)} elements`);
    }
    for (const [name, n] of byName) if (n >= 3) found.push(`animation ${name} is used by ${n} rules`);
    return found;
  },
  T23: (p) => p.rules.filter((r) => MONO.test(decl(r, "font-family") ?? "") && !CODE_SELECTOR.test(r.selector)).map((r) => `${r.selector} sets a monospace face`),
  T24: (p) => {
    const found = [];
    const focusSet = p.rules.some((r) => /:focus(-visible)?\b/.test(r.selector) && (decl(r, "box-shadow") || !/^(none|0)/.test(decl(r, "outline") ?? "none")));
    for (const r of p.rules) {
      const fg = hexIn(decl(r, "color") ?? "")[0];
      const bg = hexIn(decl(r, "background-color") ?? decl(r, "background") ?? "")[0];
      if (fg && bg) {
        const ratio = contrastRatio(fg, bg);
        if (ratio < THRESHOLD.text) found.push(`${r.selector}: ${fg} on ${bg} is ${showRatio(ratio)}:1, needs ${THRESHOLD.text}`);
      }
      const size = decl(r, "font-size");
      if (size && /^[\d.]+(px|rem)$/.test(size) && toPx(size) < 12) found.push(`${r.selector}: font-size ${size} is under 12px`);
      if (/^(none|0)\b/.test(decl(r, "outline") ?? "x") && !decl(r, "box-shadow") && !focusSet) found.push(`${r.selector}: outline removed with no replacement`);
    }
    return found;
  },
  T25: (p) => {
    const found = p.textNodes.filter((t) => /lorem ipsum|^your text\b|click here|^submit$/i.test(t)).map((t) => `"${t}" is placeholder copy`);
    return found;
  },
  T26: (p) => {
    const found = [];
    const word = BUZZWORDS.exec(p.text)?.[1];
    if (word) found.push(`the text uses "${word}"`);
    const dashes = (p.text.match(/—/g) ?? []).length;
    if (dashes > 1 && dashes / Math.max(p.words.length, 1) > 1 / 150) found.push(`${dashes} em dashes in ${p.words.length} words`);
    if (/\bnot just\b[^.]*\b(but|it's|it is)\b/i.test(p.text)) found.push('the text has a "not just ..., but" pattern');
    return found;
  },
  T29: (p) => {
    // Hairline rules, no rounded corner anywhere and three or more column tracks: the broadsheet look.
    const hairline = (v) => !/none|transparent/i.test(v) && /(?:^|\s)(?:0?\.\d+|[01])px\b/.test(v) && !/(?:^|\s)(?:[2-9]|[1-9]\d+)(?:\.\d+)?px\b/.test(v);
    const rules = p.rules.filter((r) => declsNamed(r, "border", "border-top", "border-bottom", "border-left", "border-right").some(([, v]) => hairline(v)));
    const rounded = p.rules.some((r) => declsNamed(r, "border-radius").some(([, v]) => v.split(/[\s/]+/).some((part) => toPx(part) > 0)));
    const tracks = (v) => {
      const repeat = /repeat\(\s*(\d+)\s*,/.exec(v)?.[1];
      return repeat ? +repeat : v.trim().split(/\s+/).filter((t) => t && !/^(none|subgrid)$/.test(t)).length;
    };
    const columns = Math.max(0, ...p.rules.flatMap((r) => [...declsNamed(r, "grid-template-columns").map(([, v]) => tracks(v)), ...declsNamed(r, "column-count").map(([, v]) => Number(v) || 0)]));
    return rules.length >= 3 && !rounded && columns >= 3 ? [`${rules.length} hairline rules, no rounded corner and ${columns} columns`] : [];
  },
  T28: (p) => (/feTurbulence|repeating-linear-gradient/i.test(p.source) ? ["the piece uses a noise filter or a stripe pattern"] : []),
};

// Warnings only: they never change the exit code.
const hasSpecific = (t) => /\d/.test(t) || /\b[A-Z][a-z]+/.test(t.replace(/(^|[.!?]\s+)[A-Z][a-z]*/g, "$1"));
const WARN_CHECKS = {
  T27: (p) => p.textNodes.filter((t) => t.split(/\s+/).length >= 12 && !hasSpecific(t)).map((t) => `"${t.slice(0, 50)}..." names nothing specific`),
};

// ---- the tells that read a render (a PNG passed with --render) ----

function decodePng(buffer) {
  if (buffer.length < 8 || buffer.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") fail("render: not a PNG file");
  let pos = 8;
  let header;
  const data = [];
  while (pos + 8 <= buffer.length) {
    const length = buffer.readUInt32BE(pos);
    const type = buffer.toString("latin1", pos + 4, pos + 8);
    const body = buffer.subarray(pos + 8, pos + 8 + length);
    if (type === "IHDR") header = { w: body.readUInt32BE(0), h: body.readUInt32BE(4), depth: body[8], ctype: body[9], interlace: body[12] };
    if (type === "IDAT") data.push(body);
    if (type === "IEND") break;
    pos += 12 + length;
  }
  const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[header?.ctype];
  if (!header || !channels || header.depth !== 8 || header.interlace !== 0) fail("render: only 8-bit PNG files that are not interlaced are read");
  const { w, h } = header;
  const raw = inflateSync(Buffer.concat(data));
  const stride = w * channels;
  const out = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const filter = raw[y * (stride + 1)];
    for (let i = 0; i < stride; i++) {
      const x = raw[y * (stride + 1) + 1 + i];
      const a = i >= channels ? out[y * stride + i - channels] : 0;
      const b = y > 0 ? out[(y - 1) * stride + i] : 0;
      const c = i >= channels && y > 0 ? out[(y - 1) * stride + i - channels] : 0;
      const paeth = () => {
        const p = a + b - c;
        const [pa, pb, pc] = [Math.abs(p - a), Math.abs(p - b), Math.abs(p - c)];
        return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      };
      const predictor = [0, a, b, (a + b) >> 1, paeth()][filter];
      if (predictor === undefined) fail("render: unknown PNG filter");
      out[y * stride + i] = (x + predictor) & 255;
    }
  }
  const pixel = (x, y) => {
    const o = y * stride + x * channels;
    return channels < 3 ? [out[o], out[o], out[o]] : [out[o], out[o + 1], out[o + 2]];
  };
  return { w, h, pixel };
}

// Bands (runs of rows with content) and, in each, blobs (runs of columns), found against the most common colour.
function layoutOf(image) {
  const { w, h, pixel } = image;
  const counts = new Map();
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const [r, g, b] = pixel(x, y);
      const key = (r << 16) | (g << 8) | b;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  const [top] = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const background = [top[0] >> 16, (top[0] >> 8) & 255, top[0] & 255];
  const content = (x, y) => {
    const p = pixel(x, y);
    return Math.max(Math.abs(p[0] - background[0]), Math.abs(p[1] - background[1]), Math.abs(p[2] - background[2])) > 20;
  };
  const rowHas = Array.from({ length: h }, (_, y) => {
    for (let x = 0; x < w; x++) if (content(x, y)) return true;
    return false;
  });
  const runs = (flags, gap = 1) => {
    const found = [];
    let start = -1;
    let last = -1;
    flags.forEach((on, i) => {
      if (!on) return;
      if (start >= 0 && i - last > gap) {
        found.push([start, last]);
        start = -1;
      }
      if (start < 0) start = i;
      last = i;
    });
    if (start >= 0) found.push([start, last]);
    return found;
  };
  const gap = Math.max(16, Math.round(w * 0.03));
  const bands = runs(rowHas).map(([y0, y1]) => {
    const cols = Array.from({ length: w }, (_, x) => {
      for (let y = y0; y <= y1; y++) if (content(x, y)) return true;
      return false;
    });
    const blobs = runs(cols, gap).map(([x0, x1]) => ({ x0, x1, w: x1 - x0 + 1 }));
    return { y0, y1, h: y1 - y0 + 1, blobs, left: blobs[0].x0, right: blobs.at(-1).x1 };
  });
  return { w, h, background, bands, counts, total: w * h };
}

const near = (rgb, target, tolerance) => rgb.every((c, i) => Math.abs(c - target[i]) <= tolerance);
const rgbOfHex = (hex) => parseColour(hex);
const unpack = (key) => [key >> 16, (key >> 8) & 255, key & 255];

// T20: content centred in a render counts as a container of its own only when it is narrower than the canvas by this many pixels.
const CONTAINER_MINIMUM = 40;

const RENDER_CHECKS = {
  T4: ({ w, bands }) => {
    const hero = bands[0];
    if (!hero || Math.abs((hero.left + hero.right) / 2 - w / 2) > w * 0.06 || hero.right - hero.left > w * 0.7) return [];
    for (const band of bands.slice(1, 4)) {
      const [a, b, c, ...more] = band.blobs;
      if (!c || more.length || band.h < 40 || [a, b, c].some((blob) => blob.w < w * 0.08)) continue;
      const widths = [a.w, b.w, c.w];
      if (Math.max(...widths) - Math.min(...widths) <= Math.max(...widths) * 0.1) return ["a centred hero is followed by a row of three equal boxes"];
    }
    return [];
  },
  T17: ({ w, bands }) => {
    for (let i = 0; i < Math.min(bands.length - 1, 4); i++) {
      const [b, next] = [bands[i], bands[i + 1]];
      if (b.h >= 40 && b.h >= next.h * 5 && b.right - b.left <= w * 0.35 && next.h <= 24) return [`a numeral ${b.h}px tall sits over a caption ${next.h}px tall`];
    }
    return [];
  },
  T18: ({ background, counts, total }, { brand }) => {
    const named = (rgb, tolerance) => brand?.colours.some((c) => near(rgbOfHex(c), rgb, tolerance));
    const share = (target, tolerance) => [...counts].filter(([k]) => near(unpack(k), target, tolerance)).reduce((n, [, c]) => n + c, 0) / total;
    if (near(background, [244, 241, 234], 12) && !named(background, 4) && share([217, 119, 87], 24) >= 0.005) return ["cream background with a terracotta accent"];
    const luma = 0.299 * background[0] + 0.587 * background[1] + 0.114 * background[2];
    if (luma < 30 && !named(background, 4)) {
      const buckets = new Map();
      for (const [key, count] of counts) {
        const [r, g, b] = unpack(key);
        const max = Math.max(r, g, b);
        const sat = max === 0 ? 0 : (max - Math.min(r, g, b)) / max;
        if (sat > 0.6 && max / 255 > 0.5) {
          const hue = hueOf(`#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`);
          buckets.set(Math.floor(hue / 30), (buckets.get(Math.floor(hue / 30)) ?? 0) + count);
        }
      }
      const live = [...buckets.values()].filter((n) => n / total >= 0.003);
      if (live.length === 1) return ["a near-black background with one saturated accent"];
    }
    return [];
  },
  T20: ({ w, bands }, { brand }) => {
    const edges = new Set(bands.flatMap((b) => b.blobs.map((blob) => Math.round(blob.x0 / 4) * 4)));
    const blobs = bands.flatMap((b) => b.blobs);
    // Content centred in a wider render sits in a container of its own (a 600 px email in a 640 px window): the grid is
    // measured from that container's edge, and the container's own edge counts as a line. Anything else is measured from the canvas.
    const left = Math.min(...blobs.map((b) => b.x0));
    const right = Math.max(...bands.flatMap((b) => b.blobs.map((blob) => blob.x1)));
    const centred = w - (right - left + 1) >= CONTAINER_MINIMUM && Math.abs(left - (w - 1 - right)) <= 8;
    const [origin, width] = centred ? [left, right - left + 1] : [0, w];
    const colWidth = (width - 2 * brand.grid.margin - (brand.grid.columns - 1) * brand.grid.gutter) / brand.grid.columns;
    const starts = Array.from({ length: brand.grid.columns }, (_, i) => origin + brand.grid.margin + i * (colWidth + brand.grid.gutter));
    if (centred) starts.push(origin);
    const off = blobs.filter((blob) => !starts.some((s) => Math.abs(s - blob.x0) <= 4)).length;
    const found = [];
    if (edges.size > 6) found.push(`${edges.size} distinct left edges`);
    else if (blobs.length >= 4 && off > blobs.length / 2) found.push(`${off} of ${blobs.length} blocks are off the brand's grid`);
    return found;
  },
};

// ---- tells ----

const PIECE_TYPES = [".html", ".svg"];

function tellsCommand({ positional, flags }) {
  if (positional.length !== 1 || !flags.brief) fail("usage: tells <piece.html> --brief <brief.md> [--brand <file.tokens>] [--render <file.png>] [--references <REFERENCES.md>] [--only T1,T2]");
  const piece = positional[0];
  const extension = piece.slice(piece.lastIndexOf(".")).toLowerCase();
  if (!PIECE_TYPES.includes(extension)) fail(`piece type ${extension} is not supported (html and svg)`);
  const rows = parseTells(flags.tells);
  const ids = rows.map((r) => r.id);
  const brief = parseBrief(readText(flags.brief), ids);
  if (brief.problems.length) fail(`brief: ${brief.problems.join("; ")}`);
  const selected = flags.only ? flags.only.split(",").map((s) => s.trim()) : ids;
  for (const id of selected) if (!ids.includes(id)) fail(`--only: ${id} is not a row of TELLS.md`);
  const run = rows.filter((r) => selected.includes(r.id) && !brief.earned.has(r.id));

  const p = readPiece(readText(piece));
  const brand = flags.brand ? loadBrand(flags.brand) : undefined;
  const context = { brand };
  if (flags.render && !existsSync(flags.render)) fail(`${flags.render}: no such file`);
  const image = flags.render && run.some((r) => r.type === "render") ? layoutOf(decodePng(readFileSync(flags.render))) : undefined;

  const tells = [];
  const warnings = [];
  const cannot = [];
  for (const row of run) {
    if (row.type === "render" && !image) {
      cannot.push({ id: row.id, why: "no render given" });
    } else if (row.id === "T20" && !brand?.grid) {
      cannot.push({ id: row.id, why: "no grid in the brand data" });
    } else if (row.id === "T21" && !brand?.typeSteps.length) {
      cannot.push({ id: row.id, why: "no type steps in the brand data" });
    } else if (WARN_CHECKS[row.id]) {
      for (const e of WARN_CHECKS[row.id](p, context)) warnings.push(`warning ${row.id} ${row.tell}: ${e}`);
    } else {
      const check = row.type === "render" ? (c) => RENDER_CHECKS[row.id](image, c) : (c) => FILE_CHECKS[row.id](p, c);
      for (const e of check(context)) tells.push({ id: row.id, line: `${row.id} ${row.tell}: ${e}` });
    }
  }

  // Reference rows: the ids the brief cites, kept only if the references file has them when one is given.
  let cited = brief.references;
  const notes = [];
  if (flags.references) {
    const file = readText(flags.references);
    cited = cited.filter((id) => new RegExp(`^\\|\\s*${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\|`, "m").test(file));
    for (const id of brief.references.filter((i) => !cited.includes(i))) notes.push(`reference ${id} is not in ${flags.references}`);
  }

  const countedTells = new Set(tells.map((t) => t.id)).size;
  const detail = [...tells.map((t) => t.line), ...warnings, ...cannot.map((c) => `${c.id} could not run: ${c.why}`), ...notes];
  let first;
  let code;
  if (cannot.length) {
    const groups = [];
    for (const c of cannot) {
      const group = groups.find((g) => g.why === c.why);
      if (group) group.ids.push(c.id);
      else groups.push({ why: c.why, ids: [c.id] });
    }
    first = `FAIL: could not run ${groups.map((g) => `${g.ids.join(", ")} (${g.why})`).join(", ")}`;
    code = 3;
  } else if (cited.length < brief.minimum) {
    first = `FAIL: ${cited.length} reference rows, needs ${brief.minimum}`;
    code = 2;
  } else if (countedTells > 0) {
    first = `FAIL: ${countedTells} tells`;
    code = 1;
  } else {
    first = "PASS: no tells";
    code = 0;
  }
  return { code, out: [first, ...detail] };
}
commands.tells = tellsCommand;

// ---- email ----

function limitsRows(file) {
  return readText(file)
    .split("\n")
    .filter((line) => line.startsWith("|") && !/^\|\s*(Feature|-)/.test(line))
    .map((line) => line.split(/\|(?=(?:[^`]*`[^`]*`)*[^`]*$)/).slice(1, -1).map((c) => c.trim()))
    .filter((cells) => cells.length >= 6);
}

function emailCommand({ positional, flags }) {
  if (positional.length !== 1) fail("usage: email <file.html> [--limits <LIMITS.md>]");
  const html = readText(positional[0]);
  const p = readPiece(html);
  const problems = [];
  const add = (message) => problems.push(`${positional[0]}: ${message}`);

  for (const img of html.match(/<img\b[^>]*>/gi) ?? []) if (!/\balt\s*=/i.test(img)) add(`img with no alt: ${img.slice(0, 60)}`);
  if (/<a\b[^>]*>\s*<img\b[^>]*>\s*<\/a>/i.test(html)) add("call to action that is only an image (an a whose only child is an img)");
  if (p.words.filter((w) => /[a-z]/i.test(w)).length < 3) add("no live text in the body");
  const wide = [
    ...[...html.matchAll(/<(?:table|td|div|center|body)\b[^>]*\swidth\s*=\s*"?(\d+)/gi)].map((m) => +m[1]),
    ...p.rules.flatMap((r) => declsNamed(r, "width", "max-width").map(([, v]) => (/^\d+px$/.test(v) ? parseInt(v, 10) : 0))),
  ].filter((n) => n > 640);
  if (wide.length) add(`a layout container is wider than 640 px (${Math.max(...wide)})`);

  // The tells a script can see in a file or in words, with no brand data.
  const row = (id) => parseTells(flags.tells).find((r) => r.id === id);
  for (const id of Object.keys(FILE_CHECKS).filter((i) => i !== "T21")) {
    for (const e of FILE_CHECKS[id](p, {})) add(`${id} ${row(id).tell}: ${e}`);
  }

  // A row whose support is `none` blocks the email. Any other support level is only a note.
  const notes = [];
  const read = [];
  if (flags.limits) {
    const rows = limitsRows(flags.limits);
    read.push(`limits read: ${flags.limits} (${rows.length} rows)`);
    for (const [feature, pattern, client, support, date, source] of rows) {
      if (!isDate(date)) problems.push(`${flags.limits}: ${feature}: no test date`);
      if (!/https?:\/\/\S+/.test(source ?? "")) problems.push(`${flags.limits}: ${feature}: no source URL`);
      let used;
      try {
        used = new RegExp(pattern.replace(/^`|`$/g, ""), "i").test(html);
      } catch (error) {
        problems.push(`${flags.limits}: ${feature}: pattern is not a valid regular expression (${error.message})`);
        continue;
      }
      if (!used) continue;
      if (support.toLowerCase() === "none") add(`${feature} (${client}): ${support} support, and the email uses it`);
      else notes.push(`note: ${feature} (${client}): ${support}; the email uses it, so legibility must not depend on it`);
    }
  } else {
    notes.push("LIMITS.md rows were not checked: no --limits file given");
  }
  if (problems.length) return { code: 1, out: [...read, ...notes], err: problems };
  return { out: [`ok: ${positional[0]}`, ...read, ...notes] };
}
commands.email = emailCommand;

// ---- main ----

function main(argv) {
  const [name, ...rest] = argv;
  const run = commands[name];
  const isTells = name === "tells";
  try {
    if (!run) fail(`usage: check.mjs <${Object.keys(commands).join("|")}> ...`);
    const { code = 0, out = [], err = [] } = run(parseArgs(rest)) ?? {};
    if (out.length) console.log(out.join("\n"));
    if (err.length) console.error(err.join("\n"));
    process.exit(code);
  } catch (error) {
    if (!(error instanceof Failure)) throw error;
    if (isTells) console.log(`FAIL: could not run: ${error.message}`);
    else console.error(error.message);
    process.exit(isTells ? 3 : 1);
  }
}

main(process.argv.slice(2));

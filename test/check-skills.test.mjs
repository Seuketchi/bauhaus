// scripts/check-skills.mjs: a good skill tree passes, and each rule fails a tree that differs from it by one defect.
// Every tree is built in a temporary directory and handed to the script as its root, so no fixture files live in the repo.
//
//   node --test test/check-skills.test.mjs
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("../scripts/check-skills.mjs", import.meta.url));
const scratch = mkdtempSync(join(tmpdir(), "bauhaus-check-"));
after(() => rmSync(scratch, { recursive: true, force: true }));

// A PATH that reaches git and nothing else, so the real `claude` never runs in a test.
const gitOnly = join(scratch, "git-only");
mkdirSync(gitOnly);
const gitPath = execFileSync("sh", ["-c", "command -v git"], { encoding: "utf8" }).trim();
symlinkSync(gitPath, join(gitOnly, "git"));

// A PATH with a stand-in `claude` that answers `plugin validate <root> --json` with the given report,
// whose file paths are relative to the root it is given.
let stubs = 0;
function pathWithClaude(report, exitCode = 0) {
  const bin = join(scratch, `claude-${stubs++}`);
  mkdirSync(bin);
  symlinkSync(gitPath, join(bin, "git"));
  const stub = join(bin, "claude");
  writeFileSync(
    stub,
    [
      `#!${process.execPath}`,
      `if (process.argv[2] === "--version") process.exit(0);`,
      `const report = ${JSON.stringify(report)};`,
      `for (const t of [report.manifest, ...report.contents]) t.file = require("node:path").join(process.argv[4], t.file);`,
      `console.log(JSON.stringify(report));`,
      `process.exit(${exitCode});`,
      "",
    ].join("\n"),
  );
  chmodSync(stub, 0o755);
  return bin;
}

const GOOD_DOC = (title) => `# ${title}\n\n## What it does\nText.\n\n## When to reach for it\nText.\n\n## Common questions\nText.\n\n## It's working if\nText.\n`;
const GOOD = {
  ".claude-plugin/plugin.json": JSON.stringify({ name: "bauhaus", skills: ["./skills/characters/alpha", "./skills/tools/beta"] }),
  "skills/characters/README.md":
    "# Characters\n\nThey call the [tools](../tools/README.md).\n\n## User-invoked\n\n- **[alpha](./alpha/SKILL.md)**: The first.\n\n## Model-invoked\n\nNone yet.\n",
  "skills/tools/README.md": "# Tools\n\n## User-invoked\n\nNone yet.\n\n## Model-invoked\n\n- **[beta](./beta/SKILL.md)**: The second.\n",
  "skills/characters/alpha/SKILL.md":
    "---\nname: alpha\ndescription: The first.\ndisable-model-invocation: true\n---\n\n# Alpha\n\n## When to call\n\nThe default is not to call.\n\n## Voice\n\nPlain.\n",
  "skills/tools/beta/SKILL.md": "---\nname: beta\ndescription: The second.\n---\n\n# Beta\n\nDoes a thing.\n",
  "docs/characters/alpha.md": GOOD_DOC("Alpha"),
  "docs/tools/beta.md": GOOD_DOC("Beta"),
};

let trees = 0;
// Builds GOOD with `changes` applied (a null value removes the file), tracks it in git, runs the script on it.
function check(changes = {}, { path = gitOnly } = {}) {
  const root = join(scratch, `tree-${trees++}`);
  const files = { ...GOOD, ...changes };
  for (const [name, content] of Object.entries(files)) {
    if (content === null) continue;
    mkdirSync(dirname(join(root, name)), { recursive: true });
    writeFileSync(join(root, name), content);
  }
  execFileSync("git", ["init", "-q"], { cwd: root });
  execFileSync("git", ["add", "-A"], { cwd: root });
  const run = spawnSync(process.execPath, [script, root], { encoding: "utf8", env: { PATH: path, HOME: scratch } });
  return { status: run.status, out: run.stdout, err: run.stderr, problems: run.stderr.split("\n").filter((l) => l && !/problem\(s\)/.test(l)) };
}

// The tree differs from the good one by one defect: the script exits 1 with exactly one problem line, which says `message`.
function fails(changes, message, options) {
  const r = check(changes, options);
  assert.equal(r.status, 1, `expected exit 1, got ${r.status}: ${r.err}`);
  assert.equal(r.problems.length, 1, `expected one problem line, got:\n${r.err}`);
  assert.ok(r.problems[0].includes(message), `expected "${message}" in:\n${r.problems[0]}`);
}

function passes(changes, options) {
  const r = check(changes, options);
  assert.equal(r.status, 0, r.err);
  return r;
}

test("a good tree passes, and the validator is skipped without `claude`", () => {
  const r = passes();
  assert.equal(r.out.trim(), "Skills check passed. plugin validate: skipped (no `claude` on PATH).");
});

// Listing rules

test("a skill folder with no SKILL.md is a problem", () => {
  fails(
    {
      "skills/tools/beta/SKILL.md": null,
      "skills/tools/beta/NOTES.txt": "x",
      "skills/tools/README.md": "# Tools\n\n## User-invoked\n\nNone yet.\n\n## Model-invoked\n\nNone yet.\n",
    },
    "skills/tools/beta: no SKILL.md",
  );
});

test("a frontmatter name that is not the folder is a problem", () => {
  fails({ "skills/tools/beta/SKILL.md": GOOD["skills/tools/beta/SKILL.md"].replace("name: beta", "name: gamma") }, 'frontmatter name is "gamma", folder is "beta"');
});

test("a skill with no description is a problem", () => {
  fails({ "skills/tools/beta/SKILL.md": GOOD["skills/tools/beta/SKILL.md"].replace("description: The second.\n", "") }, "skills/tools/beta: no description");
});

test("a skill missing from plugin.json is a problem", () => {
  fails({ ".claude-plugin/plugin.json": JSON.stringify({ name: "bauhaus", skills: ["./skills/characters/alpha"] }) }, "skills/tools/beta: not in plugin.json's skills");
});

test("a skill under the wrong heading of its bucket README is a problem", () => {
  fails(
    { "skills/tools/README.md": "# Tools\n\n## User-invoked\n\n- **[beta](./beta/SKILL.md)**: The second.\n\n## Model-invoked\n\nNone yet.\n" },
    'skills/tools/beta: should be under "Model-invoked" in skills/tools/README.md',
  );
});

test("a skill missing from its bucket README is a problem", () => {
  fails({ "skills/tools/README.md": "# Tools\n\n## User-invoked\n\nNone yet.\n\n## Model-invoked\n\nNone yet.\n" }, 'skills/tools/beta: should be under "Model-invoked"');
});

test("a skill with no docs page is a problem", () => {
  fails({ "docs/tools/beta.md": null }, "skills/tools/beta: no docs/tools/beta.md");
});

test("a docs page missing one of the four sections is a problem", () => {
  fails({ "docs/tools/beta.md": GOOD_DOC("Beta").replace("## Common questions\nText.\n\n", "") }, 'docs/tools/beta.md: no "Common questions" section');
});

test("a character with no Voice section is a problem", () => {
  fails({ "skills/characters/alpha/SKILL.md": GOOD["skills/characters/alpha/SKILL.md"].replace("## Voice\n\nPlain.\n", "") }, 'skills/characters/alpha: no "Voice" section');
});

test("a character with no When to call section is a problem", () => {
  fails(
    { "skills/characters/alpha/SKILL.md": GOOD["skills/characters/alpha/SKILL.md"].replace("## When to call\n\nThe default is not to call.\n\n", "") },
    'skills/characters/alpha: no "When to call" section',
  );
});

test("a plugin.json entry with no tracked skill folder is a problem", () => {
  fails(
    { ".claude-plugin/plugin.json": JSON.stringify({ name: "bauhaus", skills: ["./skills/characters/alpha", "./skills/tools/beta", "./skills/tools/ghost"] }) },
    "plugin.json: skills/tools/ghost is not a tracked skill folder",
  );
});

// A link from one skill folder into another. A skill folder is skills/<bucket>/<name>/; a bucket README is not one.
// Scope: every file inside a character folder or a tool folder, so tools are covered as well as characters.

test("a link from a character folder into a tool folder is a problem, naming file and target", () => {
  fails(
    { "skills/characters/alpha/SKILL.md": `${GOOD["skills/characters/alpha/SKILL.md"]}\nSee [beta](../../tools/beta/SKILL.md).\n` },
    "skills/characters/alpha/SKILL.md: link ../../tools/beta/SKILL.md leaves its skill folder, into skills/tools/beta",
  );
});

test("a link from a tool folder into a character folder is a problem", () => {
  fails(
    { "skills/tools/beta/SKILL.md": `${GOOD["skills/tools/beta/SKILL.md"]}\nSee [alpha](../../characters/alpha/SKILL.md).\n` },
    "skills/tools/beta/SKILL.md: link ../../characters/alpha/SKILL.md leaves its skill folder, into skills/characters/alpha",
  );
});

test("a link from one tool folder to a file in another tool folder is a problem", () => {
  const three = {
    ".claude-plugin/plugin.json": JSON.stringify({ name: "bauhaus", skills: ["./skills/characters/alpha", "./skills/tools/beta", "./skills/tools/gamma"] }),
    "skills/tools/README.md": "# Tools\n\n## User-invoked\n\nNone yet.\n\n## Model-invoked\n\n- **[beta](./beta/SKILL.md)**: The second.\n- **[gamma](./gamma/SKILL.md)**: The third.\n",
    "skills/tools/gamma/SKILL.md": "---\nname: gamma\ndescription: The third.\n---\n\n# Gamma\n",
    "skills/tools/gamma/REFERENCE.md": "Reference.\n",
    "docs/tools/gamma.md": GOOD_DOC("Gamma"),
    "skills/tools/beta/SKILL.md": `${GOOD["skills/tools/beta/SKILL.md"]}\nSee [the reference](../gamma/REFERENCE.md).\n`,
  };
  fails(three, "skills/tools/beta/SKILL.md: link ../gamma/REFERENCE.md leaves its skill folder, into skills/tools/gamma");
});

test("a link to a bare skill folder, with or without a trailing slash, is a problem", () => {
  const three = {
    ".claude-plugin/plugin.json": JSON.stringify({ name: "bauhaus", skills: ["./skills/characters/alpha", "./skills/tools/beta", "./skills/tools/gamma"] }),
    "skills/tools/README.md": "# Tools\n\n## User-invoked\n\nNone yet.\n\n## Model-invoked\n\n- **[beta](./beta/SKILL.md)**: The second.\n- **[gamma](./gamma/SKILL.md)**: The third.\n",
    "skills/tools/gamma/SKILL.md": "---\nname: gamma\ndescription: The third.\n---\n\n# Gamma\n",
    "docs/tools/gamma.md": GOOD_DOC("Gamma"),
  };
  fails({ ...three, "skills/tools/beta/SKILL.md": `${GOOD["skills/tools/beta/SKILL.md"]}\nSee [gamma](../gamma).\n` }, "skills/tools/beta/SKILL.md: link ../gamma leaves its skill folder, into skills/tools/gamma");
  fails({ ...three, "skills/tools/beta/SKILL.md": `${GOOD["skills/tools/beta/SKILL.md"]}\nSee [gamma](../gamma/).\n` }, "skills/tools/beta/SKILL.md: link ../gamma/ leaves its skill folder, into skills/tools/gamma");
  fails(
    { "skills/characters/alpha/SKILL.md": `${GOOD["skills/characters/alpha/SKILL.md"]}\nSee [beta](../../tools/beta).\n` },
    "skills/characters/alpha/SKILL.md: link ../../tools/beta leaves its skill folder, into skills/tools/beta",
  );
});

test("a link to its own bare folder, to a bucket directory or to the repo root is not a cross-folder link", () => {
  passes({ "skills/tools/beta/SKILL.md": `${GOOD["skills/tools/beta/SKILL.md"]}\n[own](../beta), [bucket](..), [other bucket](../../characters), [root](../../..).\n` });
});

test("a link to its own folder, to a bucket README or to a docs page is not a cross-folder link", () => {
  passes({
    "skills/tools/beta/NOTES.md": "Notes.\n",
    "skills/tools/beta/SKILL.md": `${GOOD["skills/tools/beta/SKILL.md"]}\n[own](./NOTES.md), [own again](NOTES.md#top), [bucket](../README.md), [other bucket](../../characters/README.md), [docs](../../../docs/tools/beta.md).\n`,
    "skills/characters/alpha/SKILL.md": `${GOOD["skills/characters/alpha/SKILL.md"]}\nSee the [tools](../../tools/README.md).\n`,
  });
});

test("a cross-folder link in backticks or a fenced block is not a link", () => {
  passes({
    "skills/characters/alpha/SKILL.md": `${GOOD["skills/characters/alpha/SKILL.md"]}\nWrite \`[x](../../tools/beta/SKILL.md)\` as text.\n\n\`\`\`\n[x](../../tools/beta/SKILL.md)\n\`\`\`\n`,
  });
});

test("a broken relative link is a problem", () => {
  fails({ "docs/tools/beta.md": `${GOOD_DOC("Beta")}\nSee [the gap](./missing.md).\n` }, "docs/tools/beta.md: broken link ./missing.md");
});

// Calls into other packages

const SUITS_CALL = "/suits:tdd";
const withText = (text) => ({ "skills/tools/beta/SKILL.md": `${GOOD["skills/tools/beta/SKILL.md"]}\n${text}\n` });

test("a /suits: call in plain prose is a problem", () => {
  fails(withText(`Run ${SUITS_CALL} first.`), `skills/tools/beta/SKILL.md: ${SUITS_CALL}`);
});

test("a /suits: call inside backticks is a problem", () => {
  fails(withText(`Run \`${SUITS_CALL}\` first.`), `skills/tools/beta/SKILL.md: ${SUITS_CALL}`);
});

test("a /suits: call inside a fenced block is a problem", () => {
  fails(withText(`\`\`\`\n${SUITS_CALL}\n\`\`\``), `skills/tools/beta/SKILL.md: ${SUITS_CALL}`);
});

test("a /suits: call in a docs page is a problem", () => {
  fails({ "docs/characters/alpha.md": `${GOOD_DOC("Alpha")}\nRun ${SUITS_CALL}.\n` }, `docs/characters/alpha.md: ${SUITS_CALL}`);
});

test("a call to any other package is a problem, and the message says it is not bauhaus", () => {
  fails(withText("Run `/other:thing` first."), "skills/tools/beta/SKILL.md: /other:thing");
});

test("a /bauhaus: call passes", () => {
  passes(withText("Run `/bauhaus:beta` first, or /bauhaus:alpha."));
});

test("paths, URLs, times and PATH-like text are not calls", () => {
  passes(withText("See https://github.com/Seuketchi/suits and scripts/check-skills.mjs:118 at 10:30. Set PATH=/a:/b and /usr/bin:/bin. The file is /var/log:12."));
});

test("specs, test and scripts may name /suits: calls", () => {
  passes({ "specs/design-package.md": `No ${SUITS_CALL} here.\n`, "test/x.test.mjs": `// ${SUITS_CALL}\n`, "scripts/y.mjs": `// ${SUITS_CALL}\n` });
});

// The one allowed foreign call

const UIUX = "/ui-ux-pro-max:ui-ux-pro-max";

test("the ui-ux-pro-max call passes in the screens skill", () => {
  const screens = "---\nname: screens\ndescription: Screens.\n---\n\n# Screens\n";
  passes({
    ".claude-plugin/plugin.json": JSON.stringify({ name: "bauhaus", skills: ["./skills/characters/alpha", "./skills/tools/beta", "./skills/tools/screens"] }),
    "skills/tools/README.md": `${GOOD["skills/tools/README.md"]}- **[screens](./screens/SKILL.md)**: Screens.\n`,
    "skills/tools/screens/SKILL.md": `${screens}\nFor ideas, call ${UIUX}.\n`,
    "docs/tools/screens.md": GOOD_DOC("Screens"),
  });
});

test("the ui-ux-pro-max call is a problem in any other skill", () => {
  fails(withText(`For ideas, call ${UIUX}.`), `skills/tools/beta/SKILL.md: ${UIUX}`);
});

test("naming ui-ux-pro-max without a call passes", () => {
  passes(withText("An optional lookup, ui-ux-pro-max, may be installed."));
});

// ui-ux-pro-max data

test("a ui-ux-pro-max CSV under skills/ is a problem", () => {
  fails({ "skills/tools/beta/ux-guidelines.csv": "a,b\n" }, "skills/tools/beta/ux-guidelines.csv");
});

test("a ui-ux-pro-max search script under skills/ is a problem", () => {
  fails({ "skills/tools/beta/search.py": "print(1)\n" }, "skills/tools/beta/search.py");
});

test("the ui-ux-pro-max copyright holder named in a skill is a problem", () => {
  fails(withText("Data from Next Level Builder."), "skills/tools/beta/SKILL.md: Next Level Builder");
});

// The validator

const ok = (extra = {}) => ({ errors: [], warnings: [], ...extra });
const accepted = [
  { path: "version", message: "No version specified. Claude Code will version this plugin by commit." },
  { path: "CLAUDE.md", message: "CLAUDE.md at the plugin root is not loaded as project context." },
];

test("the validator's accepted warnings alone pass", () => {
  const report = { manifest: ok({ file: ".claude-plugin/plugin.json", warnings: accepted }), contents: [ok({ file: "skills" })] };
  const r = passes({}, { path: pathWithClaude(report) });
  assert.equal(r.out.trim(), "Skills check passed. plugin validate: ran.");
});

test("any other validator warning is a problem", () => {
  const warning = { path: "author", message: "No author specified" };
  const report = { manifest: ok({ file: ".claude-plugin/plugin.json", warnings: [...accepted, warning] }), contents: [] };
  fails({}, "plugin validate: .claude-plugin/plugin.json: author: No author specified", { path: pathWithClaude(report) });
});

test("a validator error is a problem, even when the validator exits 1", () => {
  const error = { path: "skills", message: "Bad entry" };
  const report = { manifest: ok({ file: ".claude-plugin/plugin.json", warnings: accepted }), contents: [ok({ file: "skills/a", errors: [error] })] };
  fails({}, "plugin validate: skills/a: skills: Bad entry", { path: pathWithClaude(report, 1) });
});

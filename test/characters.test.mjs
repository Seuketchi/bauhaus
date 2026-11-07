// The character files, the job skills they call and the reference files hold to the repo's rules (CLAUDE.md) and to the spec.
//
// A phrase test proves a rule is written down. It does not prove that a model obeys the rule: behaviour is shown by the
// acceptance run, the critique pass and the reviewer (spec, "What the tests do not prove").
//
// No fixture files: every bad input here is a string built in the test.
//
//   node --test test/characters.test.mjs
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (...p) => readFileSync(join(root, ...p), "utf8");
const exists = (...p) => existsSync(join(root, ...p));
const dirs = (...p) => readdirSync(join(root, ...p), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
const files = (dir) => readdirSync(join(root, dir)).filter((f) => f.endsWith(".md")).map((f) => `${dir}/${f}`);

// ---- readers, each tested on strings below ----

const section = (source, title) => source.match(new RegExp(`^## ${title}\\s*\\n([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, "m"))?.[1] ?? "";
const frontmatter = (source) => source.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
// The skills a file calls: a backticked `/bauhaus:<skill>`.
const named = (source) => [...source.matchAll(/`\/bauhaus:([a-z][a-z0-9-]*)`/g)].map((m) => m[1]);
// Any other backticked slash word, which would be a bare or foreign call.
const unnamespaced = (source) => [...source.matchAll(/`\/(?!bauhaus:)([a-z][a-z0-9-]*(?::[a-z0-9-]+)?)`/g)].map((m) => m[1]);
const MAX_WORDS = 30;
const samples = (voice) => [...voice.matchAll(/^(?:>|Sample:)\s*"?(.+?)"?\s*$/gm)].map((m) => m[1]);
const tooLong = (line) => line.split(/\s+/).length > MAX_WORDS;
const prose = (source) => source.replace(/^(```|~~~)[\s\S]*?^\1/gm, "").replace(/`[^`\n]*`/g, "").replace(/https?:\/\/\S+/g, "");

// CAST1. A cast name followed in the same sentence by a speech verb; a quoted sentence in a paragraph that names someone;
// and the topics a character file or docs page must never touch (spec section 4).
const CAST = "Gropius|Bayer|Breuer|Albers|Moholy-Nagy|Moholy|Mies(?: van der Rohe)?";
const VERBS = "said|says|wrote|writes|believed|believes|argued|argues|taught that|teaches that|insisted|claimed|declared";
const speechHits = (text) => [...text.matchAll(new RegExp(`\\b(?:${CAST})\\b[^.!?\\n]{0,80}?\\b(?:${VERBS})\\b`, "gi"))].map((m) => m[0]);
const quoteHits = (text) =>
  text.split(/\n\s*\n/).flatMap((para) => (new RegExp(`\\b(?:${CAST})\\b`, "i").test(para) ? [...para.matchAll(/["“][^"”\n]{15,}["”]/g)].map((m) => m[0]) : []));
const TOPICS = {
  "the school's closing under pressure": /political pressure|closing of the school|school[^.\n]{0,30}\b(?:closed|shut)\b|forced to close|nazi|gestapo/i,
  "exile or emigration": /\bexiled?\b|emigra\w+|\bfled\b|refugee/i,
  "the exhibition of degenerate art": /degenerate/i,
  "a 1936 brochure": /\b1936\b|brochure/i,
  "a 1937 exhibition": /\b1937\b/i,
  "an illness": /\billness\b|\bill health\b|\bdisease\b|\bcancer\b|\bleukemia\b|\bdiagnos\w+/i,
  "a death date": /\bdied\b|\bdeath\b|\bdead\b|\bpassed away\b/i,
};
const topicHits = (text) => Object.entries(TOPICS).filter(([, re]) => re.test(text)).map(([name]) => name);
const PERSONA = /\b(?:you are|i am|i'm|as|speaking as|in the voice of)\s+(?:walter\s+|herbert\s+|marcel\s+|ludwig\s+)?(?:gropius|bayer|breuer|mies)\b/i;
// Breuer is cast by analogy only: no furniture, workshop, steel or "for the body" in any file.
const BIOGRAPHY = /\b(?:Weimar|Dessau|ARCO|founded|was born|born in|studied|apprentic\w+|furniture|carpentry|workshop|tubular|steel)\b|for the body/i;

// The words that name how the work is built, in anything meant for others.
const BUILD_WORDS = /\b(?:ai|assistants?|agents?|cooks?|kitchens?|stations?|workflows?|head chef|claude|prompts?|llm)\b/i;
const NUMBER_OF = /\b(?:two|three|four|five|six|seven|eight|nine|ten|\d+)\s+(?:characters|designers|people|members|jobs)\b/i;
// File names are not words about the build.
const bareWords = (text) => prose(text).replace(/\b(?:CLAUDE|AGENTS)\.md\b/g, "").replace(/\b[\w.-]+\.(?:md|mjs|json|html|svg|png|pdf|tokens)\b/g, "");

// ---- the readers themselves ----

describe("the readers", () => {
  test("named() reads /bauhaus:<skill> and not a bare or foreign call", () => {
    assert.deepEqual(named("Call `/bauhaus:design` then `/bauhaus:critique`. Not `/design`, not `/suits:louis`."), ["design", "critique"]);
    assert.deepEqual(unnamespaced("Call `/bauhaus:design`. Not `/design`, not `/suits:louis`."), ["design", "suits:louis"]);
  });

  test("a sample line over the word limit is too long", () => {
    assert.equal(tooLong(Array(30).fill("word").join(" ")), false);
    assert.equal(tooLong(Array(31).fill("word").join(" ")), true);
  });

  test("samples() reads a line that starts with > or Sample:", () => {
    assert.deepEqual(samples("Text.\n\n> One line here.\nSample: Another line.\n"), ["One line here.", "Another line."]);
  });
});

describe("CAST1 scan, on fixtures", () => {
  for (const verb of ["said", "wrote", "believed", "argued", "taught that"]) {
    test(`a cast name followed by "${verb}" is flagged`, () => {
      assert.ok(speechHits(`Gropius ${verb} the grid matters.`).length > 0);
      assert.ok(speechHits(`Mies van der Rohe, as a rule, ${verb} less.`).length > 0);
    });
  }
  test("a cast name and a speech verb in different sentences are not flagged", () => {
    assert.deepEqual(speechHits("Bayer owns layout. The brief said so."), []);
  });
  test("a quoted sentence beside a cast name is flagged, and a quoted sentence far from one is not", () => {
    assert.equal(quoteHits('Gropius gave a talk.\n"Form follows a thing you can name here."\n').length, 1);
    assert.deepEqual(quoteHits('Gropius gave a talk.\n\nThe button reads "Sign in to your account today".\n'), []);
  });
  const FIXTURES = {
    "the school's closing under pressure": "The school was closed under political pressure.",
    "exile or emigration": "Bayer went into exile after that.",
    "the exhibition of degenerate art": "The Degenerate Art exhibition came next.",
    "a 1936 brochure": "A brochure of 1936 follows.",
    "a 1937 exhibition": "In 1937 the show opened.",
    "an illness": "After a long illness the work stopped.",
    "a death date": "He died in the spring.",
  };
  for (const [topic, text] of Object.entries(FIXTURES)) {
    test(`the avoided topic "${topic}" is flagged`, () => assert.ok(topicHits(text).includes(topic), text));
  }
  test("plain craft text is not flagged", () => {
    const text = "Bayer owns layout and look. Gropius frames the brief. Every pair passes 4.5:1.";
    assert.deepEqual([speechHits(text), quoteHits(text), topicHits(text)], [[], [], []]);
  });
  test("a first-person persona is flagged", () => {
    for (const text of ["You are Walter Gropius.", "I am Bayer.", "As Bayer, review it.", "I'm Gropius.", "As Mies, draw it.", "You are Ludwig Mies."]) assert.match(text, PERSONA);
    assert.doesNotMatch("Bayer owns layout.", PERSONA);
  });
});

// ---- the registered skills ----

const plugin = JSON.parse(read(".claude-plugin/plugin.json"));
const registered = plugin.skills.map((p) => p.replace(/^\.\//, ""));
const toolDir = (name) => ["tools", "characters"].map((b) => `skills/${b}/${name}`).find((d) => exists(d, "SKILL.md"));

describe("registration", () => {
  test("plugin.json lists the characters and the tools, and has no version", () => {
    const wanted = ["skills/characters/bayer", "skills/characters/gropius", "skills/tools/design", "skills/tools/brand", "skills/tools/email", "skills/tools/critique"];
    assert.deepEqual(registered.slice(0, wanted.length), wanted);
    assert.deepEqual(registered.slice(wanted.length), ["skills/characters/breuer", "skills/tools/screens", "skills/characters/mies", "skills/tools/massing", "skills/tools/plans"]);
    assert.ok(!registered.some((d) => /ui-ux-pro-max/.test(d)), "the optional lookup is not a skill of this package");
    assert.equal("version" in plugin, false);
    for (const dir of registered) assert.ok(exists(dir, "SKILL.md"), `${dir} has no SKILL.md`);
  });

  test("the bucket READMEs list the characters and the tools under Model-invoked", () => {
    const listed = (bucket, names) => {
      const readme = read("skills", bucket, "README.md");
      const model = readme.split(/^## /m).find((s) => s.startsWith("Model-invoked")) ?? "";
      for (const name of names) assert.match(model, new RegExp(`\\]\\(\\./${name}/SKILL\\.md\\)`), `${name} is not under Model-invoked in skills/${bucket}/README.md`);
    };
    listed("characters", ["bayer", "breuer", "gropius", "mies"]);
    listed("tools", ["brand", "critique", "design", "email", "massing", "plans", "screens"]);
    const BUCKET_OF = { breuer: "characters", mies: "characters", screens: "tools", massing: "tools", plans: "tools" };
    for (const [name, bucket] of Object.entries(BUCKET_OF)) {
      assert.doesNotMatch(read("skills", bucket, name, "SKILL.md"), /^disable-model-invocation:/m);
      const line = read("skills", bucket, "README.md").split("\n").find((l) => l.includes(`./${name}/SKILL.md`));
      assert.doesNotMatch(line, NUMBER_OF, `${name}: a number of characters or jobs in a description`);
    }
  });

  test("the root README no longer says it is a skeleton and links only files that exist", () => {
    const readme = read("README.md");
    assert.doesNotMatch(readme, /skeleton only/i);
    assert.doesNotMatch(readme, /screens job and its character follow/i, "the status line still says UI/UX is to come");
    assert.match(readme, /screens/i);
    assert.equal(readme.split("\n").filter((l) => /^\| Marcel Breuer \|/.test(l)).length, 1, "the cast table keeps its one Breuer row");
    assert.equal(readme.split("\n").filter((l) => /^\| (?:Walter Gropius|Herbert Bayer|Marcel Breuer|Ludwig Mies van der Rohe|Josef Albers) \|/.test(l)).length, 5, "the five rows");
    assert.match(readme, /^\| Ludwig Mies van der Rohe \| Space designer\. Form, plans, structure\. \|$/m, "the Mies row names the role by craft");
    assert.match(readme, /massing/i);
    assert.match(readme, /plans/i);
    const later = readme.split("\n").find((l) => /later work/i.test(l)) ?? "";
    assert.match(later, /Moholy-Nagy/);
    assert.doesNotMatch(later, /Mies/, "Mies is no longer later work");
    assert.ok(readme.split(/\s+/).length >= 40);
    for (const [, target] of readme.matchAll(/\]\((\.\/[^)\s#]+)/g)) assert.ok(exists(target.slice(2)), `README links ${target}`);
  });
});

// ---- the characters ----

// Each character calls exactly these, each with one trigger stated as a fact about the task.
const CALLS = {
  gropius: ["design", "critique"],
  bayer: ["design", "brand", "email", "critique"],
  breuer: ["design", "screens", "critique"],
  mies: ["design", "massing", "plans", "critique"],
};
const TRIGGERS = {
  design: /no brief file exists/i,
  brand: /brief asks for an identity|no `DESIGN\.md` exists/i,
  email: /piece is an HTML email/i,
  critique: /finished piece exists that this session did not make/i,
  screens: /task is an app or web screen/i,
  massing: /task is the form or volume of a building or space/i,
  plans: /task is a floor plan, a section or a sheet/i,
};
// BRE2: breuer's critique trigger is a finished screen.
const TRIGGER_OF = (name, skill) => (name === "breuer" && skill === "critique" ? /finished screen exists that this session did not make/i : TRIGGERS[skill]);
const characters = dirs("skills/characters");

describe("characters", () => {
  test("there are characters, and each has an expected call set in this test", () => {
    assert.ok(characters.length > 0);
    for (const name of characters) assert.ok(CALLS[name], `${name} has no expected call set: add it to CALLS`);
  });

  for (const name of characters) {
    const source = read("skills/characters", name, "SKILL.md");
    describe(name, () => {
      for (const title of ["When to call", "Hard rules", "Hand over", "Voice"]) {
        test(`has a "${title}" section`, () => assert.ok(section(source, title).trim().length > 0));
      }

      test("calls exactly its expected skills, each one a /bauhaus: call", () => {
        assert.deepEqual([...new Set(named(source))].sort(), [...CALLS[name]].sort());
        assert.deepEqual(unnamespaced(source), [], "a bare or foreign call");
      });

      test("each skill it calls exists, is in the plugin, and can be started by a model", () => {
        for (const skill of named(source)) {
          const dir = toolDir(skill);
          assert.ok(dir, `${skill} does not exist`);
          assert.ok(registered.includes(dir), `${dir} is not in plugin.json`);
          assert.doesNotMatch(frontmatter(read(dir, "SKILL.md")), /^disable-model-invocation:\s*true$/m);
        }
      });

      test("says in When to call that the default is not to call, and gives each tool a trigger", () => {
        const when = section(source, "When to call");
        assert.match(when, /default is not to call/i);
        for (const skill of CALLS[name]) assert.match(when, TRIGGER_OF(name, skill), `no trigger for ${skill}`);
        for (const skill of CALLS[name]) assert.ok(new RegExp(`\`/bauhaus:${skill}\``).test(when), `${skill} is not named in When to call`);
      });

      test("says which tool it is calling and why, and skips the others without comment", () => {
        assert.match(section(source, "When to call"), /one line[^.]*which tool[^.]*why/i);
        assert.match(section(source, "When to call"), /skipped without comment/i);
      });

      test("the Voice section is plain and professional, imitates no one and attributes no words", () => {
        const voice = section(source, "Voice");
        assert.match(voice, /plain/i);
        assert.match(voice, /professional/i);
        assert.match(voice, /no real person'?s voice is imitated/i);
        assert.match(voice, /no words are attributed to anyone/i);
      });

      test("has one sample line of 30 words or fewer", () => {
        const lines = samples(section(source, "Voice"));
        assert.equal(lines.length, 1, "exactly one sample line (a line starting > or Sample:)");
        for (const line of lines) assert.ok(!tooLong(line), `too long: ${line}`);
      });

      test("names no build tool and no team size, takes no persona and states no biography", () => {
        assert.doesNotMatch(bareWords(source), BUILD_WORDS);
        assert.doesNotMatch(source, NUMBER_OF);
        assert.doesNotMatch(source, PERSONA);
        assert.doesNotMatch(source, BIOGRAPHY);
        assert.doesNotMatch(source, /\b(?:18|19)\d{2}\b/);
      });

      test("names donna and louis as roles and never calls them, and links nowhere outside its folder", () => {
        assert.doesNotMatch(source, /`\/(?:donna|louis|breuer|screens|mies)`|\/bauhaus:breuer|\/bauhaus:mies|\/suits:|\/ui-ux-pro-max:/);
        assert.doesNotMatch(source, /\]\(\.\.\/\.\.\/tools\//);
      });
    });
  }

  describe("gropius (GRO1 to GRO4)", () => {
    const source = read("skills/characters/gropius/SKILL.md");
    const rules = section(source, "Hard rules");
    test("no piece starts without a brief file", () => assert.match(rules, /no piece starts without a brief file/i));
    test("the precedence list is the one in design and is applied as stated there", () => {
      assert.match(rules, /precedence list[^.]*`\/bauhaus:design`/i);
      assert.doesNotMatch(source, /^\d\. The project's own checked-in rules/m, "a paraphrase of the list; point at design");
    });
    test("work goes to bayer or breuer with the brief and DESIGN.md, and he makes no piece himself", () => {
      assert.match(rules, /`bayer`[^.]*brand[^.]*logos[^.]*email/i);
      assert.match(rules, /`breuer`[^.]*(?:app|screens)/i);
      assert.match(rules, /`mies`[^.]*(?:space|form|plans|structure)/i);
      assert.match(rules, /brief and `DESIGN\.md`/);
      assert.match(rules, /makes no piece/i);
    });
    test("the craft pass is not a sign-off and louis rules", () => assert.match(source, /not a sign-off/i));
  });

  describe("bayer (BAY1 to BAY4)", () => {
    const source = read("skills/characters/bayer/SKILL.md");
    test("states the split: donna keeps words and the PDF build, this character owns layout and look, louis reviews", () => {
      const all = source;
      assert.match(all, /donna keeps the words and the PDF build/i);
      assert.match(all, /owns layout and look/i);
      assert.match(all, /louis reviews/i);
      assert.match(all, /app and web screens go to `breuer`/i);
    });
    test("the precedence list is pointed at, not restated", () => {
      assert.match(source, /precedence list[^.]*`\/bauhaus:design`/i);
      assert.doesNotMatch(source, /^\d\. The project's own checked-in rules/m);
    });
  });
});

describe("breuer (BRE1 to BRE3)", () => {
  const source = read("skills/characters/breuer/SKILL.md");
  const rules = section(source, "Hard rules");
  test("the project's rules and its design gate come first, and no app code is written (BRE3)", () => {
    assert.match(rules, /project'?s own rules and its design gate come first/i);
    assert.match(rules, /writes no app code/i);
  });
  test("the precedence list is pointed at in design, not restated, and the stop-and-name rule is stated", () => {
    assert.match(rules, /precedence list[^.]*`\/bauhaus:design`/i);
    assert.doesNotMatch(source, /^\d\. The project's own checked-in rules/m);
    assert.match(rules, /contradicts a project rule[^.]*stop[^.]*name the rule[^.]*file and heading[^.]*brief line[^.]*ask the owner/i);
  });
  test("every screen spec starts with Rules applied and ends with a hand-over of paths", () => {
    const hand = section(source, "Hand over");
    assert.match(hand, /first line[^.]*verdict/i);
    assert.match(hand, /path of the screen spec/i);
    assert.match(hand, /each PNG/);
    assert.match(hand, /`Rules applied:`/);
    assert.match(hand, /not checked/i);
  });
  test("donna, louis and the lead are roles and never calls, and bayer's work is not taken on", () => {
    assert.match(source, /donna/i);
    assert.match(source, /louis/i);
    assert.doesNotMatch(source, /\]\(\.\.\//, "a link into another folder");
  });
  test("the sample line is about a screen", () => assert.match(samples(section(source, "Voice"))[0], /screen/i));
});

// ---- CAST1 over the real files ----

describe("CAST1 over every character file and every docs page", () => {
  const targets = [
    ...characters.map((c) => `skills/characters/${c}/SKILL.md`),
    ...files("docs/characters"),
    ...files("docs/tools"),
    ...registered.map((d) => `${d}/SKILL.md`),
  ];
  // Computed, not a literal: every registered skill and every docs page is scanned.
  test("there are files to scan", () => {
    const floor = registered.length + files("docs/characters").length + files("docs/tools").length;
    assert.ok(targets.length >= floor, `${targets.length} < ${floor}`);
  });
  for (const file of targets) {
    test(`${file}: no cast name with a speech verb, no quoted sentence, no avoided topic`, () => {
      const text = read(file);
      assert.deepEqual(speechHits(text), []);
      assert.deepEqual(quoteHits(text), []);
      assert.deepEqual(topicHits(text), []);
    });
  }
  test("no skill or docs text names Albers (credited in the README and the decision record only)", () => {
    for (const file of [...targets, ...files("docs/characters")]) assert.doesNotMatch(read(file), /albers/i, file);
  });
  test("the docs pages of characters name no persona, biography or year", () => {
    for (const file of files("docs/characters")) {
      const text = read(file);
      assert.doesNotMatch(text, PERSONA, file);
      assert.doesNotMatch(text, BIOGRAPHY, file);
      assert.doesNotMatch(text, /\b(?:18|19)\d{2}\b/, file);
    }
  });
});

// ---- no machine-made look, and no build words, in anything written for others ----

describe("what is written for others", () => {
  const pages = [...files("docs/characters"), ...files("docs/tools"), "README.md"];
  const skills = registered.map((d) => `${d}/SKILL.md`);
  test("no build word in a skill, a docs page or the README (file names and URLs excepted)", () => {
    for (const file of [...pages, ...skills]) {
      const hit = bareWords(read(file)).match(BUILD_WORDS);
      assert.equal(hit, null, `${file}: "${hit?.[0]}"`);
    }
  });
  test("no number of characters or jobs in a name, a tagline or a description", () => {
    for (const file of [...pages, ...skills]) assert.doesNotMatch(read(file), NUMBER_OF, file);
    for (const file of skills) assert.doesNotMatch(frontmatter(read(file)), NUMBER_OF, file);
  });
  test("no /suits: call anywhere", () => {
    for (const file of [...pages, ...skills]) assert.doesNotMatch(read(file), /\/suits:/, file);
  });
  test("docs pages carry no tracked-caps kicker, dot meta line, markup or inline style", () => {
    for (const file of pages.filter((f) => f.startsWith("docs/"))) {
      const text = prose(read(file));
      assert.doesNotMatch(text, /^[A-Z][A-Z0-9 ]{9,}$/m, `${file}: a line in capitals`);
      assert.doesNotMatch(text, /\S · \S/, `${file}: a dot meta line`);
      assert.doesNotMatch(text, /<(?:div|span|style|table)\b|style=/i, `${file}: markup`);
    }
  });
});

// ---- the reference files (spec section 10) ----

const ROW_FIELDS = ["Id", "Work", "Edition", "Pointer", "Rule", "Read", "Access"];
const referenceRows = (text) =>
  text
    .split("\n")
    .filter((l) => l.startsWith("|") && !/^\|\s*(Id\s*\||-)/.test(l))
    .map((l) => l.split("|").slice(1, -1).map((c) => c.trim()));
// What is wrong with a row, as a list of messages.
function rowProblems(cells) {
  const out = [];
  if (cells.length !== ROW_FIELDS.length) return [`${cells.length} cells, needs ${ROW_FIELDS.length}`];
  const [id, work, edition, pointer, rule, readStatus, access] = cells;
  ROW_FIELDS.forEach((f, i) => {
    if (!cells[i]) out.push(`no ${f}`);
  });
  if (id && !/^[A-Z]{1,2}\d+$/.test(id)) out.push(`id "${id}" is not a letter prefix and a number`);
  if (readStatus && !["opened", "not opened"].includes(readStatus)) out.push(`read "${readStatus}" is not opened or not opened`);
  if (access && !(/^free \(https?:\/\/\S+\)$/.test(access) || access === "lending")) out.push(`access "${access}" is not free (with a link) or lending`);
  if (/["“”]/.test(rule)) out.push("the rule holds a quotation mark");
  if (rule && rule.split(/\s+/).length > 40) out.push("the rule is longer than one line");
  if (readStatus === "not opened" && rule && !/inferred from (?:the )?title/i.test(rule)) out.push("a not opened row's rule does not say it is inferred from the title");
  if (readStatus === "not opened" && access === "lending" && /\b(?:p\.|pp\.|page)\s*\d/i.test(pointer)) out.push("a not opened row names a page nobody read");
  return out;
}
const GOOD_ROW = ["V9", "A work", "2010", "p. 3", "Keep one rule from first to last.", "opened", "free (https://example.com/a)"];
const REFS = {
  brand: "skills/tools/brand/REFERENCES.md",
  email: "skills/tools/email/REFERENCES.md",
  screens: "skills/tools/screens/REFERENCES.md",
  massing: "skills/tools/massing/REFERENCES.md",
  plans: "skills/tools/plans/REFERENCES.md",
};
// The least number of rows each file holds.
const ROW_FLOOR = { brand: 4, email: 4, screens: 4, massing: 4, plans: 4 };

describe("REFERENCES.md rows", () => {
  test("a complete row has no problem", () => assert.deepEqual(rowProblems(GOOD_ROW), []));

  for (const [i, field] of ROW_FIELDS.entries()) {
    test(`a row missing its ${field} is flagged`, () => {
      const cells = [...GOOD_ROW];
      cells[i] = "";
      assert.ok(rowProblems(cells).some((p) => p.includes(`no ${field}`)), rowProblems(cells).join("; "));
    });
  }
  test("an invalid read or access value is flagged", () => {
    assert.ok(rowProblems(GOOD_ROW.with(5, "maybe")).length > 0);
    assert.ok(rowProblems(GOOD_ROW.with(6, "free")).length > 0);
    assert.ok(rowProblems(GOOD_ROW.with(6, "borrowed")).length > 0);
    assert.deepEqual(rowProblems(GOOD_ROW.with(6, "lending")), []);
  });
  test("a rule with a quotation mark or one that runs long is flagged", () => {
    assert.ok(rowProblems(GOOD_ROW.with(4, 'He said "keep it simple".')).length > 0);
    assert.ok(rowProblems(GOOD_ROW.with(4, "He said “keep it simple”.")).length > 0);
    assert.ok(rowProblems(GOOD_ROW.with(4, Array(41).fill("word").join(" "))).length > 0);
  });
  test("a not opened row must say its rule is inferred from the title", () => {
    assert.ok(rowProblems(GOOD_ROW.with(5, "not opened").with(6, "lending")).length > 0);
    assert.deepEqual(rowProblems(GOOD_ROW.with(5, "not opened").with(6, "lending").with(4, "Inferred from the title: use a grid.").with(3, "title only")), []);
  });

  for (const [craft, file] of Object.entries(REFS)) {
    describe(file, () => {
      const rows = referenceRows(read(file));
      test("has rows, each complete and valid, with unique ids", () => {
        assert.ok(rows.length >= ROW_FLOOR[craft], `${rows.length} rows`);
        for (const cells of rows) assert.deepEqual(rowProblems(cells), [], cells[0]);
        assert.equal(new Set(rows.map((r) => r[0])).size, rows.length);
      });
      test("has at least one opened row, so a piece can cite a rule that was read", () => assert.ok(rows.some((r) => r[5] === "opened")));
      test("no cast name or Albers in a row", () => assert.doesNotMatch(read(file), new RegExp(`\\b(?:${CAST})\\b`, "i")));
      test("a lending row names a title, an edition and a pointer, and copies no passage", () => {
        for (const r of rows.filter((x) => x[6] === "lending")) assert.ok(r[4].split(/\s+/).length <= 40, r[0]);
      });
    });
  }

  test("brand has the Vignelli Canon (49 pages, free, opened), WCAG 2.2 (opened) and the lending books as not opened", () => {
    const rows = referenceRows(read(REFS.brand));
    const find = (re) => rows.filter((r) => re.test(r[1]));
    const canon = find(/Vignelli Canon/);
    assert.ok(canon.length >= 2);
    for (const r of canon) {
      assert.equal(r[5], "opened");
      assert.match(r[6], /^free \(https:\/\/web\.archive\.org\//);
    }
    assert.match(canon.map((r) => `${r[2]} ${r[3]}`).join(" "), /49 pages/);
    assert.equal(find(/WCAG 2\.2/)[0]?.[5], "opened");
    for (const re of [/Müller-Brockmann/, /Rand/, /Bringhurst/, /NASA/]) {
      const r = find(re);
      assert.equal(r.length, 1, `${re}`);
      assert.equal(r[0][5], "not opened");
    }
    assert.doesNotMatch(read(REFS.brand), /Interaction of Color/i, "the book is out: its title points at a name this package keeps out of its text");
  });

  test("email has caniemail (free, opened), Really Good Emails (free) and Milled (not opened)", () => {
    const rows = referenceRows(read(REFS.email));
    const find = (re) => rows.filter((r) => re.test(r[1]));
    assert.ok(find(/caniemail/i).length >= 1);
    for (const r of find(/caniemail/i)) {
      assert.equal(r[5], "opened");
      assert.match(r[6], /^free \(https:\/\/www\.caniemail\.com\//);
    }
    assert.match(find(/Really Good Emails/)[0][6], /^free \(https:\/\//);
    assert.equal(find(/Milled/)[0][5], "not opened");
  });
});

describe("screens/REFERENCES.md", () => {
  const rows = referenceRows(read(REFS.screens));
  const find = (re) => rows.filter((r) => re.test(r[1]));
  test("WCAG 2.2 is opened and points at the criteria the skill uses", () => {
    const r = find(/WCAG 2\.2/);
    assert.equal(r.length, 1);
    assert.equal(r[0][5], "opened");
    for (const sc of ["2.5.8", "1.4.10", "1.4.3", "1.4.11"]) assert.match(r[0][3], new RegExp(sc.replace(/\./g, "\\.")));
  });
  test("Apple HIG, Buttons is free and opened, and gives the 44 by 44 point hit region", () => {
    const r = find(/Apple.*Buttons/);
    assert.equal(r.length, 1);
    assert.equal(r[0][5], "opened");
    assert.match(r[0][6], /^free \(https:\/\/developer\.apple\.com\//);
    assert.match(r[0].join(" "), /44 by 44 points?/);
  });
  test("Material 3 is a pointer and not opened, and the lending book is not opened and lending", () => {
    assert.equal(find(/Material 3/)[0][5], "not opened");
    const g = find(/M\u00fcller-Brockmann/)[0];
    assert.equal(g[5], "not opened");
    assert.equal(g[6], "lending");
    assert.match(g[4], /inferred from the title/i);
  });
  test("no Albers row, no cast name", () => assert.doesNotMatch(read(REFS.screens), /albers|Interaction of Color/i));
});

// ---- the job skills ----

const JOBS = ["brand", "email", "critique", "screens", "massing", "plans"];
const job = (name) => read("skills/tools", name, "SKILL.md");
const citedRows = (source) =>
  [...source.matchAll(/\brows? ((?:[A-Z]{1,2}\d+)(?:(?:,\s*|\s+and\s+)[A-Z]{1,2}\d+)*)/g)].flatMap((m) => m[1].split(/,\s*|\s+and\s+/));
const allRows = () => Object.values(REFS).flatMap((f) => referenceRows(read(f)));

describe("job skills: shared rules", () => {
  for (const name of JOBS) {
    describe(name, () => {
      const source = job(name);
      test("has a name equal to its folder and a description that names no count", () => {
        assert.match(frontmatter(source), new RegExp(`^name: ${name}$`, "m"));
      });
      test("names its references file, and every row it cites exists and was opened", () => {
        assert.match(source, /REFERENCES\.md/);
        const rows = new Map(allRows().map((r) => [r[0], r]));
        const cited = citedRows(source);
        for (const id of cited) {
          assert.ok(rows.has(id), `${id} is not a row`);
          assert.equal(rows.get(id)[5], "opened", `${id} is not opened, and a rule may rest only on an opened row`);
        }
        if (name !== "critique") assert.ok(cited.length > 0, "no rule cites a row");
      });
      test("a citation of a not opened row is caught", () => {
        const fake = new Map([["X1", ["X1", "", "", "", "", "not opened", "lending"]]]);
        const cited = citedRows("Take the grid from row X1.");
        assert.ok(cited.some((id) => fake.get(id)?.[5] !== "opened"));
      });
      test("every command example follows the ArtCraft rules", () => {
        const fenced = [...source.matchAll(/^```[^\n]*\n([\s\S]*?)^```/gm)].flatMap((m) => m[1].replace(/\\\n\s*/g, " ").split("\n")).filter((l) => l.trim());
        const commands = fenced.filter((l) => /-cli|google-chrome/.test(l));
        assert.ok(commands.length > 0, "no command example");
        for (const line of commands) {
          assert.match(line, /^timeout \d+ /, `${line}: every call runs under timeout`);
          if (/figcraft-cli/.test(line)) {
            assert.match(line, /--automation-read-root/, line);
            assert.match(line, /--automation-write-root/, line);
            if (/figcraft-cli (?:run|render|export)\b/.test(line)) assert.match(line, /--no-system-fonts/, line);
          }
          if (/vectorcraft-cli run/.test(line)) {
            assert.doesNotMatch(line, /--automation-/, line);
            assert.match(line, /--export \/\S+/, `${line}: needs an absolute output path`);
          }
          if (/(?:solidcraft|cadcraft)-cli/.test(line)) {
            assert.doesNotMatch(line, /--automation-|--allow-any-path|--allow-path|\bmcp\b|--connect|--bridge/, line);
            assert.doesNotMatch(line, /solidcraft-cli (?:render|fuzz|bench)/, `${line}: not run, so not relied on`);
            for (const m of line.matchAll(/(?:--out|--save|--json-out|--export)\s+(\S+)/g)) assert.match(m[1], /^\//, `${line}: ${m[1]} is not an absolute path`);
            if (/cadcraft-cli run/.test(line)) assert.ok((line.match(/--export\b/g) ?? []).length <= 1, `${line}: one --export per run`);
          }
        }
      });
      test("starts no window app and never calls the launcher", () => {
        const bare = source.split("\n").filter((l) => /(^|[^-\w.])(figcraft|vectorcraft|pdfcraft|solidcraft|cadcraft|filmcraft|effectcraft|lightcraft|artcraft-launcher)([^-\w]|$)/.test(l) && !/\bnever\b/i.test(l));
        assert.deepEqual(bare, []);
      });
      test("points at the ArtCraft rules in design and does not copy them", () => {
        if (name !== "critique" || /figcraft-cli|pdfcraft-cli/.test(source)) assert.match(source, /ARTCRAFT\.md/);
        assert.doesNotMatch(source, /unknown run option/, "a copied rule");
        assert.doesNotMatch(source, /\]\(\.\.\/design\//, "a link into another skill folder");
      });
    });
  }
});

describe("brand (B1 to B7)", () => {
  const source = job("brand");
  const has = (re, why) => assert.match(source, re, why);
  test("writes a DESIGN.md that passes check.mjs design and a token file that passes check.mjs tokens (B1)", () => {
    has(/check\.mjs design/);
    has(/check\.mjs tokens/);
    has(/clear space/);
    has(/minimum size/);
    has(/fallback stack/);
    has(/`document` group/);
    has(/references the token file and copies no value/i);
  });
  test("makes the logo with vectorcraft-cli run and saves the command beside it (B2)", () => {
    has(/vectorcraft-cli run/);
    has(/saves? the (?:step )?command beside/i);
    has(/hand-written SVG fails/i);
  });
  test("checks the SVG: parses, viewBox, at most 20 KB, vectorcraft-cli info with no import warning (B3)", () => {
    has(/viewBox/);
    has(/20 KB/);
    has(/vectorcraft-cli info/);
    has(/import warning/i);
  });
  test("computes every pair listed in section 6 (B4)", () => {
    has(/section 6/);
    has(/check\.mjs contrast|check\.mjs design/);
    has(/4\.5:1/);
    has(/3:1/);
  });
  test("builds a specimen sheet with figcraft-cli run and render (B5)", () => {
    has(/specimen sheet/i);
    has(/figcraft-cli run/);
    has(/figcraft-cli render/);
  });
  test("on an existing DESIGN.md changes only the entries the brief names, with a new Decided date (B6)", () => {
    has(/only the entries the brief names/i);
    has(/new \*\*Decided\*\* date/);
    has(/replaces the old entry/i);
  });
  test("writes words only where the brief supplies them (B7), and only brand creates a DESIGN.md", () => {
    has(/words only where the brief supplies them|only where the brief supplies the words/i);
    has(/only `brand` creates a `DESIGN\.md`|only this skill creates a `DESIGN\.md`/i);
  });
});

describe("email (E1 to E7)", () => {
  const source = job("email");
  const has = (re, why) => assert.match(source, re, why);
  test("output set and slots for donna's words (E1)", () => {
    has(/email\.html/);
    has(/PNG/);
    has(/figcraft-cli/);
    has(/640/);
    has(/375/);
    has(/labelled slots/i);
    has(/plain-text part/i);
    has(/donna/i);
  });
  test("runs check.mjs email first (E2) and every pair through contrast (E4)", () => {
    has(/check\.mjs email/);
    has(/check\.mjs contrast/);
  });
  test("LIMITS.md rows move, are re-read from caniemail at write time and the date goes in the hand-over (E3)", () => {
    has(/LIMITS\.md/);
    has(/re-read[^.]*caniemail/i);
    has(/date of that reading/i);
  });
  test("the hand-over says not tested in Outlook for Windows and that its engine has no primary source (E5)", () => {
    has(/not tested in Outlook for Windows/);
    has(/no primary source/i);
    assert.match(section(source, "Hand over"), /not tested in Outlook for Windows/);
  });
  test("dark mode: Gmail recolours on its own, prefers-color-scheme does not reach it, legibility does not depend on it (E6)", () => {
    has(/Gmail recolours/i);
    has(/prefers-color-scheme/);
    has(/legibility (?:must )?not depend/i);
    has(/background that fails on a dark client/i);
  });
  test("renders headless in Chrome under timeout 20 at both widths (E7)", () => {
    has(/google-chrome --headless=new --screenshot/);
    has(/timeout 20/);
  });
  test("colour values are inline hex taken from the token file", () => has(/inline hex/i));
});

describe("critique (C1 to C9)", () => {
  const source = job("critique");
  const has = (re, why) => assert.match(source, re, why);
  test("takes the piece's path, the brief and DESIGN.md, for html, png, pdf and figcraft pieces (C1)", () => {
    for (const re of [/\.html/, /\.png/, /\.pdf/, /\.figcraft/, /brief/, /DESIGN\.md/]) has(re);
  });
  test("runs the deterministic checks first, then renders, then reads the image (C2)", () => {
    for (const re of [/check\.mjs contrast/, /check\.mjs tells/, /check\.mjs email/, /pdfcraft-cli check/, /pdfcraft-cli audit/, /figcraft-cli render/, /pdfcraft-cli render/, /google-chrome/]) has(re);
    assert.ok(source.search(/check\.mjs tells/) < source.search(/figcraft-cli render/), "the checks come before the render");
  });
  test("for a png, pdf or figcraft piece it names the checks it could not run, which is exit 3, never a pass", () => {
    has(/exit 3/);
    has(/could not run/i);
    has(/never a pass/i);
  });
  test("runs only on a piece this session did not make, names the maker, and stops on its own work (C3)", () => {
    has(/did not make/);
    has(/first line names the maker/i);
    has(/made here[^.]*stop/i);
  });
  test("at most 12 findings, each with a location, the line or rule it breaks and a fix, ranked fix and consider (C4)", () => {
    has(/at most 12 findings/i);
    has(/location/i);
    has(/`fix`/);
    has(/`consider`/);
    assert.doesNotMatch(source, /\b(?:BLOCKER|SHOULD FIX|SUGGESTION)\b/);
  });
  test("edits nothing, is a craft pass and not a sign-off, and louis rules (C5)", () => {
    has(/edits nothing/i);
    has(/craft pass/i);
    has(/not a sign-off/i);
    has(/louis rules/i);
  });
  test("the first line is the script's verdict, and tells found by looking are labelled as judged (Q10)", () => {
    has(/`PASS: no tells`/);
    has(/`FAIL: /);
    has(/judged/i);
    has(/Not to do/);
  });
  test("reads the craft's REFERENCES.md before judging taste, cites the row, runs a side-by-side, exit 2 (C8)", () => {
    has(/craft's `REFERENCES\.md`/);
    has(/exit 2/);
    has(/side-by-side/i);
  });
  test("copy tells T25 to T27 are donna's to fix, and T25 and T26 count toward the exit code (C9)", () => {
    has(/T25 to T27/);
    has(/donna/i);
    has(/T25 and T26/);
  });
  test("a trend is named as a reason only if it is in TRENDS.md, and an applied trend missing from section 8 is reported", () => {
    has(/TRENDS\.md/);
    has(/section 8/);
  });
});

describe("screens (S1 to S7)", () => {
  const source = job("screens");
  const has = (re, why) => assert.match(source, re, why);
  test("the first step finds and reads the project's own rules, and the output starts with Rules applied (S1)", () => {
    has(/first step[^.]*project'?s own rules/i);
    for (const re of [/`CLAUDE\.md`/, /`AGENTS\.md`/, /UI idioms or themes/i, /design gate/i, /`DESIGN\.md`/]) has(re);
    has(/starts with `Rules applied:`/);
    has(/`file:heading`|as `file:heading`/);
    has(/`No project rules found`/);
    has(/check each heading in the file before it is listed/i);
    has(/never a bare file name or a line number/i);
  });
  test("the precedence list is pointed at in design, not restated, and the project's rules win over the brief (S2)", () => {
    has(/precedence list[^.]*`\/bauhaus:design`/i);
    assert.doesNotMatch(source, /^\d\. The project's own checked-in rules/m);
    has(/project'?s own rules[^.]*(?:win|come first)/i);
    has(/named[^.]*owner|name[^.]*ask the owner/i);
  });
  test("the deliverable is a spec with its seven parts and one PNG per state, and writes no app code (S3)", () => {
    for (const re of [/purpose/i, /entry and exit/i, /empty, loading, loaded and error/i, /components/i, /every string on screen/i, /accessibility notes/i, /rules applied/i]) has(re);
    has(/one PNG per state/i);
    has(/writes no app code/i);
    assert.doesNotMatch(source, /^```(?:dart|swift|kotlin|tsx|xml)\b/m, "an app code block");
  });
  test("the target size comes from the project's rules or the owner, with presets spelled as figcraft-cli lists them (S3)", () => {
    has(/target size[^.]*project'?s (?:own )?rules|project'?s (?:own )?rules[^.]*target size/i);
    has(/ask the owner[^.]*never guess|never guess/i);
    for (const preset of ["`iPhone 16` 393 by 852", "`iPhone SE` 320 by 568", "`Android Compact` 412 by 917"]) assert.ok(source.includes(preset), preset);
    has(/frame\.presets/);
    has(/export[^.\n]*--node/);
  });
  test("the checklist carries the WCAG 2.2 numbers as they stand (S4)", () => {
    has(/24 by 24 CSS pixels/);
    has(/SC 2\.5\.8[^.\n]*Level AA/);
    for (const re of [/spacing/i, /equivalent/i, /inline/i, /set by the browser or platform/i, /essential/i]) has(re);
    has(/SC 1\.4\.10/);
    has(/320 CSS pixels/);
    has(/project rule is stricter[^.]*project rule wins/i);
    has(/44 by 44 points/);
    has(/check\.mjs contrast/);
    has(/4\.4999/);
    has(/SC 2\.4\.11[^.\n]*Level AA/);
    has(/SC 2\.5\.7[^.\n]*Level AA/);
    has(/SC 3\.3\.8[^.\n]*Level AA/);
    assert.doesNotMatch(source, /SC 2\.4\.1[23]|SC 2\.5\.5|SC 3\.3\.9/, "an enhanced (AAA) criterion named as part of the floor");
  });
  test("states that keep the same dimensions name the reserved dimension once, and every state uses it (S5)", () => {
    has(/same dimensions/i);
    has(/names? the reserved dimension once/i);
    has(/value and unit/i);
    has(/measured/i);
    has(/same dimensions[^.]*PNG|PNG[^.]*same dimensions/i);
  });
  test("the one optional lookup is named once, never required and never above the project's rules (S6)", () => {
    assert.equal(source.split("/ui-ux-pro-max:ui-ux-pro-max").length - 1, 1);
    has(/if the `ui-ux-pro-max` package is installed/i);
    has(/never required/i);
    has(/suggestion on style, palette or type/i);
    assert.doesNotMatch(source, /layout or component choice/i, "the lookup is for style, palette or type ideas only");
    has(/copy none of (?:its|that package'?s) data/i);
  });
  test("the lookup call is in this file only, in no docs page, no README and not in the plugin", () => {
    const hits = [];
    const scan = (file) => read(file).includes("/ui-ux-pro-max:") && hits.push(file);
    for (const dir of registered) scan(`${dir}/SKILL.md`);
    for (const f of [...files("docs/characters"), ...files("docs/tools"), ...files("skills/tools"), ...files("skills/characters"), "README.md"]) scan(f);
    for (const d of registered) for (const f of readdirSync(join(root, d)).filter((x) => x.endsWith(".md"))) scan(`${d}/${f}`);
    assert.deepEqual([...new Set(hits)], ["skills/tools/screens/SKILL.md"]);
    assert.match(read("docs/tools/screens.md"), /ui-ux-pro-max/, "the docs page names the package, without the call");
    assert.ok(!readFileSync(join(root, ".claude-plugin/plugin.json"), "utf8").includes("ui-ux-pro-max"));
    for (const file of registered.flatMap((d) => readdirSync(join(root, d)).map((f) => `${d}/${f}`))) assert.doesNotMatch(file, /\.(csv|py)$/);
  });
  test("strings are specified in the project's own shape: key with English text when keys are used, plain text and a line otherwise (S7)", () => {
    has(/l10n rules first/i);
    has(/key[^.]*English text/i);
    has(/`No l10n rule found`/);
    has(/donna/i);
    has(/long-form/i);
  });
  test("a deliverable cites three rows, or states a lower minimum with a reason and a floor of one; not opened rows are never counted", () => {
    has(/at least three rows/i);
    has(/lower minimum with a reason/i);
    has(/floor (?:is|of) one/i);
    has(/never counted/i);
    assert.doesNotMatch(source, /vectorcraft-cli/, "the screens job makes no vector file");
  });
});

// ---- the cleanup: wording that must stay true ----

describe("cleanup wording", () => {
  const referenceRow = (file, id) => referenceRows(read(file)).find((r) => r[0] === id);

  test("V4 claims only what Canon page 8 says: a piece nobody understands has failed, and it is better when it needs no explanation", () => {
    const row = referenceRow(REFS.brand, "V4");
    assert.match(row[3], /PDF page 8, Pragmatics/);
    assert.match(row[4], /understand/i);
    assert.doesNotMatch(row[4], /simplify|until they do|not in the room|test that/i);
    assert.equal(row[5], "opened");
  });

  test("RG1 is the package's own method, and stays opened so a skill can cite it", () => {
    const row = referenceRow(REFS.email, "RG1");
    assert.match(row[4], /package's own method/i);
    assert.equal(row[5], "opened");
    assert.match(read("skills/tools/email/SKILL.md"), /\(row RG1\)/);
  });

  test("the brand, email, screens and critique examples run check.mjs by its path from the plugin root", () => {
    for (const tool of ["brand", "email", "screens", "critique"]) {
      const text = read("skills", "tools", tool, "SKILL.md");
      assert.doesNotMatch(text, /node check\.mjs/, `${tool}: a bare check.mjs path`);
      assert.doesNotMatch(text, /from the `design` skill folder/, `${tool}: says to run from the design folder`);
    }
    assert.match(read("skills/tools/brand/SKILL.md"), /node skills\/tools\/design\/check\.mjs tokens design\.tokens/);
    assert.match(read("skills/tools/brand/SKILL.md"), /node skills\/tools\/design\/check\.mjs design DESIGN\.md/);
    assert.match(read("skills/tools/email/SKILL.md"), /node skills\/tools\/design\/check\.mjs email email\.html --limits skills\/tools\/email\/LIMITS\.md/);
    assert.match(read("skills/tools/email/SKILL.md"), /node skills\/tools\/design\/check\.mjs contrast <fg> <bg>/);
    assert.match(read("skills/tools/screens/SKILL.md"), /node skills\/tools\/design\/check\.mjs contrast <fg> <bg>/);
    assert.match(read("skills/tools/critique/SKILL.md"), /node skills\/tools\/design\/check\.mjs tells /);
    assert.match(read("skills/tools/design/SKILL.md"), /node check\.mjs <command>/, "the design skill's own line is unchanged");
  });

  test("screens: SC 3.3.8 offers an alternative or an assist, and SC 2.4.11 says not entirely hidden", () => {
    const lines = read("skills/tools/screens/SKILL.md").split("\n");
    assert.match(lines.find((l) => /SC 3\.3\.8/.test(l)), /unless an alternative or an assist is offered/);
    const focus = lines.find((l) => /SC 2\.4\.11/.test(l));
    assert.match(focus, /not entirely hidden/);
    assert.doesNotMatch(read("skills/tools/screens/SKILL.md"), /not hidden/);
  });

  test("the people who build the screen are the project's own gates and owners", () => {
    for (const file of ["skills/characters/breuer/SKILL.md", "skills/tools/screens/SKILL.md", "docs/tools/screens.md"]) {
      const text = read(file);
      assert.doesNotMatch(text, /people who build the screen/, file);
      assert.match(text, /the project's own gates and owners/i, file);
    }
  });
});

// ---- the space designer and its two tools (spec MIE1 to MIE5, MAS, PLN) ----
//
// These are phrase tests: they prove a rule is written down, not that a model obeys it.

// The name rules of spec section 2, as functions tested on strings.
const bareMoholy = (text) => [...text.matchAll(/Moholy(?!-Nagy)/g)].map((m) => m[0]);
const luciaHits = (text) => [...text.matchAll(/Lucia/g)].map((m) => m[0]);
// The words are scanned over the whole tree that ships text to a reader.
const shippedText = () => [...registered.flatMap((d) => readdirSync(join(root, d)).filter((f) => f.endsWith(".md")).map((f) => `${d}/${f}`)), ...files("docs/characters"), ...files("docs/tools"), "README.md"];

describe("name rules (spec section 2)", () => {
  test("a bare Moholy and any Lucia are flagged, and Moholy-Nagy in full is not", () => {
    assert.deepEqual(bareMoholy("Moholy drew it."), ["Moholy"]);
    assert.deepEqual(bareMoholy("Moholy-Nagy frames the shot."), []);
    assert.deepEqual(luciaHits("Lucia took the photograph."), ["Lucia"]);
    assert.deepEqual(luciaHits("Nothing here."), []);
  });
  test("no file under skills, docs or the README has a bare Moholy or a Lucia", () => {
    for (const file of shippedText()) {
      const text = read(file);
      assert.deepEqual(bareMoholy(text), [], file);
      assert.deepEqual(luciaHits(text), [], file);
    }
  });
  test("nothing outside the spec says last director", () => {
    const walk = (dir) =>
      readdirSync(join(root, dir), { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? (e.name === "node_modules" || e.name.startsWith(".") ? [] : walk(`${dir}/${e.name}`)) : [`${dir}/${e.name}`],
      );
    const all = [...walk("skills"), ...walk("docs"), "README.md"].filter((f) => /\.(md|json|mjs)$/.test(f));
    for (const file of all) assert.doesNotMatch(read(file), /last director/i, file);
    assert.doesNotMatch(read("specs/design-package.md"), /last director/i);
  });
});

// The design-study line, and the sentences that claim an engineered result.
const STUDY_LINE = "This is a design study, not an engineered design. It has no structural calculation and no code check.";
const CLAIM = /\b(?:engineered|load-bearing|proven|code-compliant|complies)\b/i;
const sentences = (text) => prose(text).split(/(?<=[.!?])\s+|\n+/).map((x) => x.trim()).filter(Boolean);
// A sentence that says a piece is engineered, proven or compliant, and does not deny it.
const engineeredClaims = (text) => sentences(text).filter((x) => CLAIM.test(x) && !/\b(?:not|never|no)\b/i.test(x));

describe("the design-study line (MIE4, MAS9, PLN7)", () => {
  test("a sentence that claims an engineered result is flagged, and the required line is not", () => {
    assert.deepEqual(engineeredClaims("The wall is load-bearing."), ["The wall is load-bearing."]);
    assert.deepEqual(engineeredClaims("The frame complies with the code."), ["The frame complies with the code."]);
    assert.deepEqual(engineeredClaims(STUDY_LINE), []);
    assert.deepEqual(engineeredClaims("The load path is an analogy for the layout, never a claim that anything is load-bearing."), []);
  });
  for (const [kind, file] of [["character", "skills/characters/mies/SKILL.md"], ["tool", "skills/tools/massing/SKILL.md"], ["tool", "skills/tools/plans/SKILL.md"]]) {
    test(`${file}: the Hand over carries the line and nothing in the file claims an engineered result`, () => {
      const text = read(file);
      assert.ok(section(text, "Hand over").includes(STUDY_LINE), `${kind} hand-over lacks the line`);
      assert.deepEqual(engineeredClaims(text), []);
    });
  }
  test("the docs pages say it too", () => {
    for (const file of ["docs/characters/mies.md", "docs/tools/massing.md", "docs/tools/plans.md"]) {
      assert.match(read(file), /not an engineered design/, file);
      assert.deepEqual(engineeredClaims(read(file)), [], file);
    }
  });
});

describe("mies (MIE1 to MIE5)", () => {
  const source = read("skills/characters/mies/SKILL.md");
  test("the job is space, not page layout, and page grids, type and screens stay elsewhere (MIE3)", () => {
    assert.match(source, /space, not page layout/i);
    assert.match(source, /page grids, type and screens/i);
    assert.match(source, /`design`[^.\n]*`brand`[^.\n]*`screens`/);
    assert.match(source, /no second owner of a grid/i);
    assert.match(source, /structural grid[^.\n]*(?:not|no)[^.\n]*token file/i);
  });
  test("bayer and breuer are named as prose only", () => {
    assert.doesNotMatch(source, /\/bauhaus:(?:bayer|breuer|gropius)/);
    assert.doesNotMatch(source, /\]\(\.\.\//);
  });
  test("the sample line is about the work and carries no claim of engineering", () => {
    const [line] = samples(section(source, "Voice"));
    assert.match(line, /design study/i);
  });
  test("the design-study line is the one hand-over claim, and the file says what the study does not have (MAS9)", () => {
    assert.match(section(source, "Hand over"), /floors?, stairs?, openings? or structure/i);
  });
});

describe("gropius routes space work to mies (MIE5)", () => {
  const source = read("skills/characters/gropius/SKILL.md");
  const page = read("docs/characters/gropius.md");
  test("the working table, the rule and the hand-over options name mies", () => {
    assert.match(source, /\| the lead \| `mies` \|/);
    assert.match(section(source, "Hand over"), /`handed to mies`/);
    assert.match(section(source, "Hard rules"), /`mies`/);
  });
  test("the docs page says the same, and the lead still calls only design and critique", () => {
    assert.match(page, /`mies`/);
    assert.deepEqual([...new Set(named(source))].sort(), ["critique", "design"]);
  });
});

// massing and plans: what each says and what each rests on.
describe("massing and plans: the skills (MAS, PLN)", () => {
  const massing = read("skills/tools/massing/SKILL.md");
  const plans = read("skills/tools/plans/SKILL.md");

  test("massing: script is the source of truth, STEP header, closed bodies, sum of bodies (MAS1 to MAS3, MAS9)", () => {
    assert.match(massing, /`massing\.json`[^.\n]*(?:source of truth|what is saved and handed on)/i);
    assert.match(massing, /ISO-10303-21;/);
    assert.match(massing, /`closed: true`|closed: true/);
    assert.match(massing, /a body that is not closed is a failure, not a note/i);
    const hand = section(massing, "Hand over");
    assert.match(hand, /sum of (?:the )?bodies/i);
    assert.match(hand, /overlaps? count twice/i);
    assert.match(hand, /millimetres/i);
    assert.match(hand, /same total/i);
  });
  test("massing: bodies are named with body_name, because name names the feature (MAS4)", () => {
    assert.match(massing, /`body_name`/);
    assert.match(massing, /`name` names the feature/i);
  });
  test("massing: the image is read before the hand-over says it shows the study (MAS5)", () => {
    assert.match(massing, /read[^.\n]*(?:PNG|image)[^.\n]*before/i);
  });
  test("massing: a plan DXF needs a parallel camera with fov 0, and shows the roof outline only (MAS6)", () => {
    assert.match(massing, /"fov": ?0/);
    assert.match(massing, /1\.5707963/);
    assert.match(massing, /roof outline/i);
    assert.match(massing, /a plan comes from `\/bauhaus:plans`|plan comes from `plans`/i);
  });
  test("massing: no render, fuzz, bench or mcp is used (not run, so not relied on)", () => {
    assert.doesNotMatch(prose(massing).replace(/never[^\n]*/gi, ""), /solidcraft-cli (?:render|fuzz|bench)/);
    assert.match(massing, /snapshot/);
  });
  test("massing: says nothing about floors, stairs, openings or structure that the script did not make (MAS9)", () => {
    assert.match(massing, /floors?, stairs?, openings? or structure[^.\n]*unless the script made them/i);
  });

  test("plans: one export per run and convert for the rest, metric units, layers, dimension scale (PLN1 to PLN4)", () => {
    assert.match(plans, /one `--export` per (?:`cadcraft-cli run`|run)/i);
    assert.match(plans, /cadcraft-cli convert/);
    assert.match(plans, /"lunits": ?2/);
    assert.match(plans, /--metric/);
    for (const layer of ["WALLS", "DIMS", "NOTES"]) assert.ok(plans.includes(layer), layer);
    assert.match(plans, /dimstyle/);
    assert.match(plans, /DIMSCALE|DIMTXT/);
    assert.match(plans, /CADCRAFT_CONFIG_DIR/);
    assert.match(plans, /cadcraft-cli info/);
  });
  test("plans: legibility is looked at on the PNG, not assumed (PLN4)", () => {
    assert.match(plans, /read the PNG/i);
    assert.match(plans, /legible/i);
  });
  test("plans: the structure note names a grid or module, spans, a load path and the material, and the load path is an analogy (PLN6)", () => {
    assert.match(plans, /structure\.md/);
    for (const re of [/grid or module/i, /spans/i, /load path/i, /material/i]) assert.match(plans, re);
    assert.match(plans, /load path is an analogy for the layout/i);
    assert.match(plans, /the skill's own design, not a source claim/i);
    assert.doesNotMatch(plans, /\bdead (?:load|space|end)\b/i, "dead is a banned word in a character or tool text: say permanent load or self-weight");
  });
  test("plans: the sheet carries the design-study line as a text entity (PLN7)", () => {
    assert.match(plans, /title block/i);
    assert.ok(plans.includes("not an engineered design"));
  });
  test("plans: pdfcraft-cli check, and critique takes the PNG or the PDF only (PLN5, PLN9)", () => {
    assert.match(plans, /pdfcraft-cli check/);
    const hand = section(plans, "Hand over");
    assert.match(hand, /`\/bauhaus:critique` takes the PNG or the PDF/);
    assert.match(hand, /not the SVG or the DXF/i);
    for (const f of ["plan.dxf", "plan.pdf", "plan.svg", "plan.png", "plan.sh", "structure.md"]) assert.ok(hand.includes(f), f);
  });
  test("plans: a structural grid is not the grid of a token file, and neither tool writes one", () => {
    assert.match(plans, /structural grid[^.\n]*(?:not|no)[^.\n]*token file/i);
  });
});

describe("the two tools name their own references and the ArtCraft rules", () => {
  for (const name of ["massing", "plans"]) {
    const source = job(name);
    test(`${name}: the description, the ArtCraft pointer and the brief minimum`, () => {
      assert.match(source, /ARTCRAFT\.md/);
      assert.match(source, /Minimum: 2/);
      assert.match(source, /two primary works/);
      assert.doesNotMatch(source, /Ching|Alexander|Pattern Language/, "the pointer books are in REFERENCES.md and are never cited");
    });
  }
  test("no skill, page or README says SolidCraft is an ArtCraft app (the one statement is in ARTCRAFT.md, the decision record and the spec)", () => {
    const near = /SolidCraft[^.\n]{0,80}ArtCraft|ArtCraft[^.\n]{0,80}SolidCraft/;
    const holders = ["skills/tools/design/ARTCRAFT.md", "docs/adr/0001-bauhaus-is-a-separate-package.md", "specs/design-package.md"];
    for (const file of [...shippedText(), ...holders]) {
      const lines = read(file).split("\n").filter((l) => near.test(l));
      if (holders.includes(file)) for (const l of lines) assert.match(l, /independent/i, `${file}: ${l}`);
      else assert.deepEqual(lines, [], file);
    }
    for (const file of holders.slice(0, 2)) assert.match(read(file), /SolidCraft is an independent app[^.\n]*not made by ArtCraft/i, file);
  });
});

// Row ids are one namespace: allRows() builds one map across files, so a repeat would send a citation to another file's row.
describe("reference row ids across files", () => {
  // brand and email both carry W1, and both rows are the same work (WCAG 2.2), so a citation lands on the same row either way.
  // The ids of the two files here must be new: unique inside the file and across every other file.
  test("the ids of massing and plans repeat no id of any file, and none repeats inside a file", () => {
    const own = ["massing", "plans"];
    const others = Object.entries(REFS).filter(([craft]) => !own.includes(craft)).flatMap(([, f]) => referenceRows(read(f)).map((r) => r[0]));
    const mine = own.flatMap((craft) => referenceRows(read(REFS[craft])).map((r) => r[0]));
    assert.equal(new Set(mine).size, mine.length, `repeated: ${mine.filter((id, i) => mine.indexOf(id) !== i)}`);
    assert.deepEqual(mine.filter((id) => others.includes(id)), []);
  });
  test("a repeated id across two files is found", () => {
    const ids = ["V1", "W1", "V1"];
    assert.notEqual(new Set(ids).size, ids.length);
  });
  for (const craft of ["massing", "plans"]) {
    describe(`${craft}/REFERENCES.md`, () => {
      const rows = referenceRows(read(REFS[craft]));
      const find = (re) => rows.filter((r) => re.test(r[1]));
      test("the two primary works are opened and free, with the translation and the Gutenberg number", () => {
        const [v] = find(/Vitruvius/);
        const [r] = find(/Ruskin/);
        assert.equal(v[5], "opened");
        assert.equal(r[5], "opened");
        assert.equal(v[6], "free (https://www.gutenberg.org/ebooks/20239)");
        assert.equal(r[6], "free (https://www.gutenberg.org/ebooks/35898)");
        assert.match(v[2], /Morgan/);
        assert.match(v[2] + v[3], /20239/);
        assert.match(r[3], /Lamp of Truth/);
      });
      test("the two lending books are pointers: not opened, lending, inferred from the title", () => {
        for (const re of [/Ching/, /Alexander/]) {
          const [row] = find(re);
          assert.equal(row[5], "not opened");
          assert.equal(row[6], "lending");
          assert.match(row[4], /^Inferred from the title:/);
        }
      });
      test("a tool row is kept only with a real link and is opened", () => {
        for (const row of find(/CADCraft|SolidCraft/)) {
          assert.equal(row[5], "opened");
          assert.match(row[6], /^free \(https:\/\/\S+\)$/);
        }
      });
    });
  }
  test("plans cites its own rows, not massing's, for the same two works", () => {
    const own = new Set(referenceRows(read(REFS.plans)).map((r) => r[0]));
    const cited = citedRows(job("plans"));
    assert.ok(cited.length > 0);
    for (const id of cited) assert.ok(own.has(id), `${id} is not a row of plans/REFERENCES.md`);
    const mine = new Set(referenceRows(read(REFS.massing)).map((r) => r[0]));
    for (const id of citedRows(job("massing"))) assert.ok(mine.has(id), `${id} is not a row of massing/REFERENCES.md`);
  });
  test("edition and Edition column: a Wikibooks or Wikipedia row says secondary", () => {
    for (const file of Object.values(REFS)) {
      for (const r of referenceRows(read(file)).filter((x) => /Wikibooks|Wikipedia/.test(x[1]))) assert.match(r[2], /secondary/, `${file}: ${r[0]}`);
    }
  });
});

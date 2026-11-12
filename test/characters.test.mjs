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
const CAST = "Gropius|Bayer|Breuer|Albers|Ogilvy|Moholy-Nagy|Moholy|Mies(?: van der Rohe)?";
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
const PERSONA = /\b(?:you are|i am|i'm|as|speaking as|in the voice of)\s+(?:walter\s+|herbert\s+|marcel\s+|ludwig\s+|david\s+|laszlo\s+)?(?:gropius|bayer|breuer|mies|ogilvy|moholy-nagy|peterhans)\b/i;
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
    assert.deepEqual(registered.slice(wanted.length), ["skills/characters/breuer", "skills/tools/screens", "skills/tools/handoff", "skills/characters/mies", "skills/tools/massing", "skills/tools/plans", "skills/characters/ogilvy", "skills/tools/concept", "skills/characters/moholy-nagy", "skills/tools/shots", "skills/tools/storyboard", "skills/tools/motion", "skills/characters/peterhans", "skills/tools/develop", "skills/tools/ground"]);
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
    listed("characters", ["bayer", "breuer", "gropius", "mies", "moholy-nagy", "ogilvy", "peterhans"]);
    listed("tools", ["brand", "concept", "critique", "design", "develop", "email", "ground", "handoff", "massing", "motion", "plans", "screens", "shots", "storyboard"]);
    const BUCKET_OF = { breuer: "characters", mies: "characters", ogilvy: "characters", "moholy-nagy": "characters", peterhans: "characters", develop: "tools", screens: "tools", handoff: "tools", massing: "tools", plans: "tools", concept: "tools", shots: "tools", storyboard: "tools", motion: "tools" };
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
    assert.equal(readme.split("\n").filter((l) => /^\| (?:Walter Gropius|Herbert Bayer|Marcel Breuer|Ludwig Mies van der Rohe|László Moholy-Nagy|Walter Peterhans|Josef Albers|David Ogilvy) \|/.test(l)).length, 8, "one row for each person");
    assert.match(readme, /^\| David Ogilvy \| Writer\. The idea, the story and the words\. \|$/m, "the Ogilvy row names the role by craft");
    assert.match(readme, /not only people of the school|a writer from outside the school/i, "the README says the cast is no longer only the school's");
    assert.doesNotMatch(readme, /The cast are historical designers/, "the cast line no longer says designers only");
    assert.match(readme, /^\| Ludwig Mies van der Rohe \| Space designer\. Form, plans, structure\. \|$/m, "the Mies row names the role by craft");
    assert.match(readme, /^\| László Moholy-Nagy \| Shot and motion designer\. Shots, storyboards, animated titles\. \|$/m, "the Moholy-Nagy row names the role by craft");
    assert.match(readme, /massing/i);
    assert.match(readme, /plans/i);
    for (const word of ["shots", "storyboard", "motion"]) assert.match(readme, new RegExp(word, "i"));
    const later = readme.split("\n").find((l) => /later work/i.test(l)) ?? "";
    assert.doesNotMatch(later, /Moholy-Nagy|Mies/, "Mies and Moholy-Nagy are no longer later work");
    assert.ok(readme.split(/\s+/).length >= 40);
    for (const [, target] of readme.matchAll(/\]\((\.\/[^)\s#]+)/g)) assert.ok(exists(target.slice(2)), `README links ${target}`);
  });
});

// ---- the characters ----

// Each character calls exactly these, each with one trigger stated as a fact about the task.
const CALLS = {
  ogilvy: ["concept"],
  gropius: ["design", "critique"],
  bayer: ["design", "brand", "email", "ground", "critique"],
  breuer: ["design", "screens", "handoff", "critique"],
  mies: ["design", "massing", "plans", "critique"],
  "moholy-nagy": ["design", "shots", "storyboard", "motion", "critique"],
  peterhans: ["design", "develop", "critique"],
};
const TRIGGERS = {
  design: /no brief file exists/i,
  brand: /brief asks for an identity|no `DESIGN\.md` exists/i,
  email: /piece is an HTML email/i,
  ground: /brief names a ground or a dither/i,
  critique: /finished piece exists that this session did not make/i,
  screens: /task is an app or web screen/i,
  handoff: /accepted pages are to go into a Figma file or to a developer/i,
  massing: /task is the form or volume of a building or space/i,
  plans: /task is a floor plan, a section or a sheet/i,
  shots: /task is the shots of a film or a sequence/i,
  storyboard: /task is the frames of a film in order, or an animatic/i,
  motion: /task is an animated title, graphic or effect/i,
  develop: /task is a photograph to develop or prepare/i,
  concept: /brief has an `Intake` and no `Idea` yet|piece needs words that no `words\.md` holds/i,
};
// BRE2: breuer's critique trigger is a finished screen.
const TRIGGER_OF = (name, skill) => (name === "breuer" && skill === "critique" ? /finished screen exists that this session did not make/i : name === "moholy-nagy" && skill === "critique" ? /finished frame exists that this session did not make/i : name === "peterhans" && skill === "critique" ? /finished image exists that this session did not make/i : TRIGGERS[skill]);
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
        assert.doesNotMatch(source, /`\/(?:donna|louis|breuer|screens|mies)`|\/bauhaus:breuer|\/bauhaus:mies|\/bauhaus:moholy-nagy|\/bauhaus:peterhans|\/suits:|\/ui-ux-pro-max:/);
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
      assert.match(rules, /brief, the words file and `DESIGN\.md`/);
      assert.match(rules, /makes no piece/i);
    });
    test("the craft pass is not a sign-off and louis rules", () => assert.match(source, /not a sign-off/i));
  });

  describe("gropius runs the intake and hands the concept to the writer (I1, BRF1, flow)", () => {
    const source = read("skills/characters/gropius/SKILL.md");
    const rules = section(source, "Hard rules");
    const page = read("docs/characters/gropius.md");
    test("a brief means all eleven sections: Intake and Research before the writer, Idea, Insight and Story the writer's", () => {
      assert.match(rules, /Intake, Idea, Insight, Story and Research/);
      assert.match(rules, /all eleven sections/i);
      assert.match(rules, /Idea, Insight and Story are the writer's/i);
    });
    test("asks the owner the intake questions once, through design, and keeps the answers word for word", () => {
      assert.match(source, /\| Someone asks for a visual piece \|[^\n]*asks the owner[^\n]*once[^\n]*`\/bauhaus:design`/i);
      assert.match(source, /word for word/i);
    });
    test("copies none of the intake questions, which live in design", () => {
      for (const q of ["Who are you?", "Where are you going?", "What is special?", "How should it feel?"]) assert.ok(!source.includes(q) && !page.includes(q), q);
    });
    test("hands the concept to the writer, and the writer hands on to the designer", () => {
      assert.match(source, /\| the lead \| the writer \|/);
      assert.match(rules, /hand the (?:brief|piece) to the writer before a designer|the writer takes the brief before a designer/i);
      assert.match(section(source, "Hand over"), /`handed to ogilvy`/);
      assert.doesNotMatch(source, /\/bauhaus:ogilvy/, "the writer is named, never called");
    });
    test("the writer hands brief and words.md straight to the designer: the lead has one route to a designer, the skipped intake (I5, WRT3)", () => {
      assert.doesNotMatch(source, /writer has handed the brief and the words file back/i);
      assert.doesNotMatch(page, /writer[^.]*and then hands the piece to `bayer`/, "the docs page gives the one route too");
      assert.match(page, /who hands it with the words to `bayer`[^.]*`breuer`[^.]*`mies`[^.]*only when the intake is skipped/);
      assert.doesNotMatch(source, /\| the writer \| the lead \| the brief with Idea/);
      const table = section(source, "What the lead does");
      const toDesigner = table.split("\n").filter((l) => /hands the piece to the designer/.test(l));
      assert.equal(toDesigner.length, 1);
      assert.match(toDesigner[0], /named the designer[^|]*complete brief|complete brief[^|]*named the designer/i);
      const others = section(source, "Working with the others").split("\n");
      for (const to of ["bayer", "breuer", "mies"]) assert.match(others.find((l) => l.includes(`| the lead | \`${to}\``)), /intake is skipped|skipped intake/i, to);
      assert.match(others.find((l) => /^\| the writer \| the lead/.test(l)), /only[^|]*open|open[^|]*only/i);
      assert.deepEqual([...new Set(named(source))].sort(), ["critique", "design"]);
    });
    test("skips the intake when the owner named the designer and a complete brief exists, and says what complete means", () => {
      assert.match(source, /skip the intake/i);
      assert.match(source, /complete brief[^.\n]*all eleven sections|all eleven sections[^.\n]*complete/i);
    });
    test("the docs page says the same", () => {
      assert.match(page, /intake/i);
      assert.match(page, /`ogilvy`/);
      assert.match(page, /eleven sections/i);
    });
  });

  describe("bayer (BAY1 to BAY4)", () => {
    const source = read("skills/characters/bayer/SKILL.md");
    test("states the split: the writer owns the words of pieces made here, donna keeps long documents and the PDF build, this character owns layout and look, louis reviews", () => {
      const all = source;
      assert.match(all, /writer owns the idea and the words of the pieces made here/i);
      assert.match(all, /donna keeps long documents and the PDF build/i);
      assert.match(all, /owns layout and look/i);
      assert.match(all, /louis reviews/i);
      assert.match(all, /app and web screens go to `breuer`/i);
    });
    test("takes the words from words.md, writes none, and leaves no labelled slots for donna", () => {
      assert.match(section(source, "Hard rules"), /take the words from `words\.md`; write none/i);
      assert.match(section(source, "Hard rules"), /names and taglines are the writer's/i);
      assert.doesNotMatch(source, /labelled slots|leave the words to donna/i);
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
  test("the split names the writer, and donna keeps long documents and the PDF build", () => {
    assert.match(source, /writer owns the words of the pieces made here/i);
    assert.match(source, /donna keeps long documents and the PDF build/i);
    assert.doesNotMatch(source, /donna keeps the words/i);
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
  shots: "skills/tools/shots/REFERENCES.md",
  storyboard: "skills/tools/storyboard/REFERENCES.md",
  motion: "skills/tools/motion/REFERENCES.md",
  develop: "skills/tools/develop/REFERENCES.md",
  concept: "skills/tools/concept/REFERENCES.md",
};
// The least number of rows each file holds.
const ROW_FLOOR = { brand: 4, email: 4, screens: 4, massing: 4, plans: 4, concept: 5, shots: 5, storyboard: 4, motion: 3, develop: 9 };

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

const JOBS = ["brand", "email", "critique", "screens", "massing", "plans", "shots", "storyboard", "motion", "develop"];
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

// ---- the registers (Q3, RES4, RES5) ----

const REGISTER_FILES = {
  email: ["Sports", "Tech", "Fashion", "Beauty and personal care", "Food and drink", "Finance and fintech", "E-commerce and retail", "Travel"],
  screens: ["Mobile app screens", "Landing and product pages"],
  brand: ["Brand identity sheets"],
};

describe("REGISTERS.md in email, screens and brand", () => {
  for (const [craft, names] of Object.entries(REGISTER_FILES)) {
    const file = `skills/tools/${craft}/REGISTERS.md`;
    test(`${file} holds exactly its registers, each with a date, a review-by date and a source`, () => {
      const text = read(file);
      const registers = text.split(/^## /m).slice(1);
      assert.deepEqual(registers.map((r) => r.split("\n")[0].trim()), names);
      for (const r of registers) {
        assert.match(r, /^Date: 2026-11-07$/m);
        assert.match(r, /^Review by: 2027-05-07$/m, "six months after the date, as TRENDS.md");
        assert.match(r, /https?:\/\/\S+/);
        for (const h of ["Layout", "Type", "Colour", "Story", "CTA", "Sources"]) assert.match(r, new RegExp(`^### ${h}$`, "m"), `${r.split("\n")[0]}: ${h}`);
      }
    });
    test(`${file} says a register is a starting point and ranks as an optional reference, and copies no picture`, () => {
      const text = read(file);
      assert.match(text, /starting point, not a template/i);
      assert.match(text, /names the register it used and what it departs from/i);
      assert.match(text, /optional reference/i);
      assert.match(text, /No (?:picture|page) is copied/i);
      assert.doesNotMatch(text, /!\[[^\]]*\]\(/, "an embedded image");
    });
    test(`${file} names no studio that was kept out, no build word and no cast name`, () => {
      const text = bareWords(read(file));
      assert.doesNotMatch(text, /jh[- ]?studios/i);
      assert.doesNotMatch(text, BUILD_WORDS);
      assert.doesNotMatch(text, new RegExp(`\\b(?:${CAST})\\b`, "i"));
      assert.doesNotMatch(text, /\/suits:/);
    });
    test(`${craft}/SKILL.md names its REGISTERS.md and says the brief names the register used (RES5)`, () => {
      const source = job(craft);
      assert.match(source, /REGISTERS\.md/);
      assert.match(source, /names? the register (?:it|the piece) used|register used/i);
    });
  }
  test("no picture is shipped under skills or docs", () => {
    const walk = (dir) => readdirSync(join(root, dir), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${dir}/${e.name}`) : [`${dir}/${e.name}`]));
    assert.deepEqual([...walk("skills"), ...walk("docs")].filter((f) => /\.(png|jpe?g|gif|webp|bmp)$/i.test(f)), []);
  });
  test("the email registers cover eight categories and leave out the studio kept as reference only", () => {
    assert.equal(REGISTER_FILES.email.length, 8);
    assert.doesNotMatch(read("skills/tools/email/REGISTERS.md"), /jh/i);
  });
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
  test("names and taglines come from the writer's words.md (B7), and only brand creates a DESIGN.md", () => {
    has(/names and taglines come from the writer's `words\.md`/i);
    has(/writes? none of its own/i);
    has(/only `brand` creates a `DESIGN\.md`|only this skill creates a `DESIGN\.md`/i);
  });
});

describe("email (E1 to E7)", () => {
  const source = job("email");
  const has = (re, why) => assert.match(source, re, why);
  test("output set, and words taken from words.md with no slots left for anyone (E1)", () => {
    has(/email\.html/);
    has(/PNG/);
    has(/figcraft-cli/);
    has(/640/);
    has(/375/);
    has(/words come from `words\.md`/i);
    has(/plain-text part/i);
    has(/writes none of the words/i);
    assert.doesNotMatch(source, /labelled slots|donna/i);
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
  test("renders headless in Chrome under timeout 60 at both widths (E7)", () => {
    has(/google-chrome --headless=new --screenshot/);
    const render = section(source, "Render");
    const chrome = render.split("\n").filter((l) => /google-chrome /.test(l) && /--window-size=/.test(l));
    assert.equal(chrome.length, 2, "one call per width");
    for (const line of chrome) assert.match(line, /^timeout 60 google-chrome /, "Chrome is not an ArtCraft app: its calls get 60 seconds");
    assert.match(render, /under `timeout 60`/);
  });
  test("does not say the PNG export with a scale has not been run, which ARTCRAFT.md records as run", () => {
    assert.doesNotMatch(source, /export[^.\n]*(?:scale|--scale)[^.\n]*has not been run/i);
    assert.match(source, /`--scale 2` doubles the pixels and does not sharpen a small source/);
  });
  test("the render window is taller than one screen, and the skill says the shot is cut at the window height and how to tell", () => {
    const render = section(source, "Render");
    const heights = [...render.matchAll(/--window-size=(?:640|375),(\d+)/g)].map((m) => Number(m[1]));
    for (const browser of ["google-chrome", "firefox"]) {
      const widths = render.split("\n").filter((l) => l.startsWith(`timeout 60 ${browser} `)).map((l) => l.match(/--window-size=(\d+),/)?.[1]);
      assert.deepEqual(widths, ["640", "375"], `${browser}: one window per width`);
    }
    for (const h of heights) assert.ok(h >= 8000, `a ${h} px window crops a long email`);
    assert.match(render, /cut at the window height/i);
    assert.match(render, /blank (?:page )?ground/i);
    assert.match(render, /raise the height/i);
  });
  test("colour values are inline hex taken from the token file", () => has(/inline hex/i));
});

describe("email starts as a comp (CMP1 to CMP7, CMP-B)", () => {
  const source = job("email");
  const has = (re, why) => assert.match(source, re, why);
  test("a whole-page comp in FigCraft, 600 px wide, comes first, and the HTML is built after the owner sees it (CMP1, CMP2)", () => {
    has(/starts as a whole-page comp in FigCraft, 600 px wide/i);
    has(/owner sees the comp before the HTML is built/i);
    has(/gate/i);
  });
  test("the comp's type, sizes and button are the spec for the HTML, in a 600 px container, with live text and a real button, rendered beside the comp (CMP3)", () => {
    has(/comp'?s type, sizes and button are the spec for the HTML/i);
    has(/600 px container/i);
    has(/render[^.\n]*beside the comp at the same width/i);
  });
  test("the lint and the tells check run on the HTML, never on the comp, and the comp's contrast pairs are checked one by one (CMP4)", () => {
    has(/lint[^.\n]*tells check run on the HTML, never on the comp/i);
    has(/looked at by eye/i);
    has(/check\.mjs contrast[^.\n]*--min|--min[^.\n]*pair/i);
  });
  test("a tells run that exits 3 on a comp is reported as not run, never as a pass (CMP5)", () => {
    has(/exits 3 on a comp is reported as `not run`, never as a pass/i);
  });
  test("the output set is the comp, its export, research.md, then email.html, the assets and the two renders (CMP6)", () => {
    const out = section(source, "Output");
    for (const f of ["comp.figcraft", "comp.png", "research.md", "email.html", "words.md"]) assert.ok(out.includes(f), f);
    assert.ok(out.indexOf("comp.figcraft") < out.indexOf("email.html"), "the comp comes first");
    assert.match(out, /render[^.\n]*640 px[^.\n]*375 px|640[^.\n]*375/i);
  });
  test("pictures are used at the size they were supplied, and the ceiling comes from P6 of the research (CMP7)", () => {
    has(/not enlarged past the size[^.\n]*P6/i);
    has(/`--scale 2` doubles the pixels and does not sharpen a small source/);
  });
  test("the docs page says the email starts as a 600 px comp that the owner sees first", () => {
    const page = read("docs/tools/email.md");
    assert.match(page, /starts as a whole-page comp[^.\n]*600 px/i);
    assert.match(page, /owner sees the comp before the HTML is built/i);
    assert.match(page, /comp\.figcraft/);
  });
  test("still says not tested in Outlook for Windows (CMP-B, E5)", () => {
    has(/not tested in Outlook for Windows/);
    assert.match(section(source, "Hand over"), /not tested in Outlook for Windows/);
  });
  test("the 640 limit of the lint still stands, and the comp's width is the owner's 600", () => {
    has(/at 640 px or narrower|640 px/);
    has(/600/);
  });
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
  test("says in one line what this session is: the conversation the piece was made in", () => {
    const who = section(source, "Who made it");
    assert.match(who, /"This session" is this conversation: a piece made in it was made here\./);
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
  test("copy tells T25 to T27 are the writer's to fix, and T25 and T26 count toward the exit code (C9)", () => {
    has(/T25 to T27/);
    has(/the writer's to fix/i);
    has(/T25 and T26 still count toward the exit code/);
    has(/T27 (?:is|stays) a warning/);
    assert.doesNotMatch(source, /donna/i);
  });
  test("also judges the piece against the brief's Idea and Story, as a judged finding with no new exit code (O10)", () => {
    has(/Idea/);
    has(/judges? the piece against the brief's `Idea` and `Story`/i);
    has(/two words/i);
    has(/beat[^.\n]*carried by/i);
    has(/judged[^.\n]*no (?:new )?exit code|no (?:new )?exit code[^.\n]*judged/i);
  });
  test("reads a built email against its comp and reports a move that was lost (CMP-C)", () => {
    has(/built email against (?:its|the) comp/i);
    has(/move that was lost/i);
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
    has(/words\.md/);
    has(/donna/i);
    has(/document-length/i);
    assert.doesNotMatch(source, /long-form/i);
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

describe("film and motion work goes from the writer to moholy-nagy, and the lead has no route back", () => {
  const gropius = read("skills/characters/gropius/SKILL.md");
  const ogilvy = read("skills/characters/ogilvy/SKILL.md");
  test("gropius names moholy-nagy in the rule, the working table and the hand-over options, and still calls only design and critique", () => {
    assert.match(section(gropius, "Hard rules"), /`moholy-nagy`[^.\n]*(?:film|motion|shots)/i);
    assert.match(gropius, /\| the lead \| `moholy-nagy` \|/);
    assert.match(section(gropius, "Hand over"), /`handed to moholy-nagy`/);
    assert.match(read("docs/characters/gropius.md"), /`moholy-nagy`/);
    assert.deepEqual([...new Set(named(gropius))].sort(), ["critique", "design"]);
  });
  test("the writer hands the brief and words.md to moholy-nagy, and no row sends it back through the lead", () => {
    assert.match(ogilvy, /\| the writer \| `moholy-nagy` \|[^\n]*(?:shots|storyboard|animated)/);
    assert.match(section(ogilvy, "Hand over"), /`handed to moholy-nagy`/);
    assert.match(read("docs/characters/ogilvy.md"), /`moholy-nagy` for film and motion work/);
    assert.doesNotMatch(gropius, /\| the writer \| the lead \| the brief with Idea/);
    assert.doesNotMatch(gropius, /\/bauhaus:moholy-nagy/, "the film designer is named, never called");
  });
});

describe("a photograph goes from the writer to peterhans, and the lead has no route back", () => {
  const gropius = read("skills/characters/gropius/SKILL.md");
  const ogilvy = read("skills/characters/ogilvy/SKILL.md");
  test("gropius names peterhans in the rule, the working table and the hand-over options, and still calls only design and critique", () => {
    assert.match(section(gropius, "Hard rules"), /`peterhans`[^.\n]*photograph/i);
    assert.match(gropius, /\| the lead \| `peterhans` \|/);
    assert.match(section(gropius, "Hand over"), /`handed to peterhans`/);
    assert.match(read("docs/characters/gropius.md"), /`peterhans`/);
    assert.deepEqual([...new Set(named(gropius))].sort(), ["critique", "design"]);
  });
  test("the writer hands the brief and words.md to peterhans, and the photographer is named, never called", () => {
    assert.match(ogilvy, /\| the writer \| `peterhans` \|[^\n]*photograph/);
    assert.match(section(ogilvy, "Hand over"), /`handed to peterhans`/);
    assert.match(read("docs/characters/ogilvy.md"), /`peterhans` for a photograph/);
    assert.doesNotMatch(gropius, /\/bauhaus:peterhans/);
    assert.doesNotMatch(ogilvy, /\/bauhaus:peterhans/);
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

// ---- peterhans and develop (PH1, DEV1 to DEV9, STN1 to STN4 for this character) ----
//
// This block reads its own files, so it holds whether or not the shared tables above list them yet.

const PHOTO_CHARACTER = "skills/characters/peterhans/SKILL.md";
const PHOTO_TOOL = "skills/tools/develop/SKILL.md";
const PHOTO_REFS = "skills/tools/develop/REFERENCES.md";
const PHOTO_PAGES = ["docs/characters/peterhans.md", "docs/tools/develop.md"];
const headings = (source) => [...source.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
// The lines of a section that carry text: a Stance is counted in these.
const textLines = (body) => body.split("\n").map((l) => l.trim()).filter(Boolean);

describe("peterhans: the character file (PH1)", () => {
  const source = read(PHOTO_CHARACTER);

  test("the name is its folder, the description says what it does and names no count", () => {
    assert.match(frontmatter(source), /^name: peterhans$/m);
    const description = frontmatter(source).match(/^description: (.+)$/m)?.[1] ?? "";
    assert.ok(description.split(/\s+/).length >= 12, "a description that says when to use it");
    assert.doesNotMatch(description, NUMBER_OF);
  });

  test("has When to call, Hard rules, Hand over, Stance and Voice, in that order", () => {
    const order = ["When to call", "Hard rules", "Hand over", "Stance", "Voice"].map((t) => headings(source).indexOf(t));
    assert.ok(order.every((i) => i >= 0), `a section is missing: ${order}`);
    assert.deepEqual([...order].sort((a, b) => a - b), order, "Stance sits after Hard rules and Hand over and before Voice");
  });

  test("calls design, develop and critique, each as a /bauhaus: call, and nothing else", () => {
    assert.deepEqual([...new Set(named(source))].sort(), ["critique", "design", "develop"]);
    assert.deepEqual(unnamespaced(source), []);
    for (const skill of ["design", "develop", "critique"]) assert.ok(toolDir(skill), `${skill} does not exist`);
  });

  test("When to call: the default is not to call, and each tool has one trigger stated as a fact", () => {
    const when = section(source, "When to call");
    assert.match(when, /default is not to call/i);
    assert.match(when, /one line[^.]*which tool[^.]*why/i);
    assert.match(when, /skipped without comment/i);
    const row = (skill) => when.split("\n").find((l) => l.includes(`\`/bauhaus:${skill}\``)) ?? "";
    assert.match(row("design"), /no brief file exists/i);
    assert.match(row("develop"), /task is a photograph to develop or prepare/i);
    assert.match(row("critique"), /finished image exists that this session did not make/i);
  });

  test("Hard rules: the project's rules first, the source file untouched, the catalogue, the app's figures, the saved command", () => {
    const rules = section(source, "Hard rules");
    assert.match(rules, /precedence list[^.]*`\/bauhaus:design`/i);
    assert.doesNotMatch(source, /^\d\. The project's own checked-in rules/m, "a paraphrase of the list; point at design");
    assert.match(rules, /source (?:photograph|file)[^.\n]*never (?:changed|written)/i);
    assert.match(rules, /`develop\.controls`/);
    assert.match(rules, /(?:min|range)[^.\n]*(?:max|clamp)/i);
    assert.match(rules, /every figure is the app'?s/i);
    assert.match(rules, /command that made it/i);
    assert.match(rules, /contradicts a project rule[^.]*stop[^.]*name the rule[^.]*file and heading[^.]*brief line[^.]*ask the owner/i);
    assert.match(rules, /never mark(?:s)? own work|never marks? (?:its|their) own work/i);
  });

  test("Hard rules: the job is the still image after capture, so capture advice is a note and not an action", () => {
    const rules = section(source, "Hard rules");
    assert.match(rules, /after capture/i);
    assert.match(rules, /aperture, shutter(?: speed)? and ISO are not controls/i);
    assert.match(rules, /capture advice is a note/i);
  });

  test("the brief's Story beats are the input, and the character invents no story", () => {
    assert.match(source, /`Story` beats?/);
    assert.match(source, /invents? no story|does not invent the story/i);
  });

  test("Hand over: the verdict with its command, the files by path, the figures as the app printed them, what was not checked", () => {
    const hand = section(source, "Hand over");
    assert.match(hand, /first line[^.]*verdict/i);
    assert.match(hand, /developed/i);
    assert.match(hand, /preview/i);
    assert.match(hand, /command/i);
    assert.match(hand, /as the app printed/i);
    assert.match(hand, /not checked/i);
    assert.match(hand, /not approval|not a sign-off/i);
  });

  test("Stance: three to six lines, each plain and third-person, with no quote, no first person and no speech verb (STN1, STN2, STN4)", () => {
    const lines = textLines(section(source, "Stance"));
    assert.ok(lines.length >= 3 && lines.length <= 6, `${lines.length} lines`);
    for (const line of lines) {
      assert.match(line, /^- /, `a stance line is a list item: ${line}`);
      assert.doesNotMatch(line, /["“”]/, `a quotation mark: ${line}`);
      assert.doesNotMatch(line, /\b(?:I|me|my|we|our|us)\b/, `first person: ${line}`);
      assert.doesNotMatch(line, new RegExp(`\\b(?:${VERBS})\\b`, "i"), `a verb that attributes: ${line}`);
      assert.doesNotMatch(line, /\bPeterhans\b/, `the name has no place in a stance line: ${line}`);
      assert.doesNotMatch(line, /\b(?:Chicago|Illinois|Institute|Ulm|Berlin|Leipzig|Folkwang)\b/, `a place: ${line}`);
      assert.doesNotMatch(line, /\b(?:18|19|20)\d{2}\b/, `a date: ${line}`);
      assert.ok(!tooLong(line) || line.split(/\s+/).length <= 45, `a stance line is one plain statement: ${line}`);
    }
  });

  test("Stance is a method sheet: it holds the variables still, compares side by side and judges against a range, and refuses a verdict that stops at liking", () => {
    const stance = section(source, "Stance");
    assert.match(stance, /variables? still|same (?:size|finish|way up|orientation)/i);
    assert.match(stance, /side by side/i);
    assert.match(stance, /range/i);
    assert.match(stance, /refuses?[^.\n]*(?:like|liking)/i);
  });

  test("Voice: plain, professional, no real person's voice, no attributed words, one sample line of 30 words or fewer about the work (DEV9)", () => {
    const voice = section(source, "Voice");
    assert.match(voice, /plain/i);
    assert.match(voice, /professional/i);
    assert.match(voice, /no real person'?s voice is imitated/i);
    assert.match(voice, /no words are attributed to anyone/i);
    const lines = samples(voice);
    assert.equal(lines.length, 1);
    assert.ok(!tooLong(lines[0]), lines[0]);
    assert.match(lines[0], /exposure|temperature|developed/i);
    assert.doesNotMatch(lines[0], /\b(?:18|19|20)\d{2}\b/);
  });

  test("the name only: no biography word, no year, no persona, no build word, no team size, no link into another folder", () => {
    for (const re of [BIOGRAPHY, /\b(?:18|19)\d{2}\b/, NUMBER_OF, /Lucia/]) assert.doesNotMatch(source, re);
    assert.doesNotMatch(source, /\b(?:you are|i am|i'm|as|speaking as|in the voice of)\s+(?:walter\s+)?peterhans\b/i);
    assert.doesNotMatch(bareWords(source), BUILD_WORDS);
    assert.doesNotMatch(source, /\/suits:|\/ui-ux-pro-max:|\]\(\.\.\//);
    assert.deepEqual(topicHits(source), []);
    assert.doesNotMatch(source, /\bPeterhans\b[^.!?\n]{0,80}?\b(?:said|says|wrote|writes|believed|believes|argued|argues|taught that|teaches that|insisted|claimed|declared)\b/i);
  });

  test("the character file shows no image", () => assert.doesNotMatch(source, /!\[[^\]]*\]\([^)]*\)/));
});

describe("develop: the tool file (DEV1 to DEV9)", () => {
  const source = read(PHOTO_TOOL);
  const hand = section(source, "Hand over");
  const rows = referenceRows(read(PHOTO_REFS));
  const own = new Map(rows.map((r) => [r[0], r]));

  test("the name is its folder, and it names its references and the ArtCraft rules", () => {
    assert.match(frontmatter(source), /^name: develop$/m);
    assert.match(frontmatter(source), /^description: .{40,}$/m);
    assert.doesNotMatch(frontmatter(source), NUMBER_OF);
    assert.match(source, /REFERENCES\.md/);
    assert.match(source, /ARTCRAFT\.md/);
    assert.doesNotMatch(source, /\]\(\.\.\/design\//, "a link into another skill folder");
  });

  test("every row it cites exists in its own references and was opened (DEV8)", () => {
    const cited = citedRows(source);
    assert.ok(cited.length >= 6, `${cited.length} rows cited`);
    for (const id of cited) {
      assert.ok(own.has(id), `${id} is not a row of develop/REFERENCES.md`);
      assert.equal(own.get(id)[5], "opened", `${id} is not opened`);
    }
  });

  test("the craft rules are limited to the six DEV8 names, each citing a row", () => {
    for (const re of [/exposure[^.\n]*stops?/i, /direction[^.\n]*hardness|hardness[^.\n]*direction/i, /kelvin/i, /thirds/i, /tone curve/i, /crop and straighten|straighten/i]) {
      assert.match(source, re, String(re));
    }
  });

  test("it says plainly that it has no rule on product or tabletop lighting setups and none on non-destructive editing as a concept", () => {
    assert.match(source, /no rule on (?:product|tabletop)[^.\n]*(?:setups?|lighting)/i);
    assert.match(source, /no source[^.\n]*opened/i);
    assert.doesNotMatch(source, /\bsoftbox|\bflags?\b[^.\n]*reflection|\bbeauty dish/i, "no lighting-setup rule");
    assert.doesNotMatch(source, /non-destructive/i, "no source for it as a concept was opened: the source file is never changed, which is a rule of this job");
  });

  test("a rule that rests only on a partly fitting row says the row is short or thin", () => {
    const thin = [...own.keys()].filter((id) => /short|thin/i.test(own.get(id)[4]));
    assert.ok(thin.length >= 4, `${thin.length} short or thin rows`);
    const lines = source.split("\n").filter((l) => thin.some((id) => new RegExp(`\\b${id}\\b`).test(l)));
    assert.ok(lines.length > 0, "a thin row is cited");
    for (const line of lines) assert.match(line, /short|thin/i, line);
  });

  test("the brief minimum: three by default, two for an editing brief and two for a still-life or tabletop brief, each with its reason", () => {
    assert.match(source, /Minimum: 2\. Reason: editing sources are thin: two secondary rows and the vendor README as a tool row/);
    assert.match(source, /Minimum: 2\. Reason: no product-lighting source opened: the still-life and light-tent pages are short/);
    assert.match(source, /three(?: opened)? rows|at least three/i);
  });

  test("the control flow: the catalogue first, develop.auto before manual sets, a value checked against min and max, and the app clamps without an error (DEV3)", () => {
    assert.match(source, /develop\.controls/);
    assert.match(source, /develop\.auto/);
    assert.match(source, /develop\.auto[^.\n]*(?:first|before)[^.\n]*(?:manual|develop\.set)|(?:manual|develop\.set)[^.\n]*after[^.\n]*develop\.auto/i);
    assert.match(source, /develop\.auto[^.\n]*replaces[^.\n]*develop\.set|replaces[^.\n]*earlier[^.\n]*develop\.set/i);
    assert.match(source, /`min` and `max`/);
    assert.match(source, /clamps?[^.\n]*(?:without|no)[^.\n]*error/i);
    assert.match(source, /refused before the run|before the run/i);
  });

  test("the controls: exposure in stops against light.exposure, temperature in kelvin against wb.temp, and which way wb.temp moves the picture", () => {
    assert.match(source, /`light\.exposure`/);
    assert.match(source, /`wb\.temp`/);
    assert.match(source, /higher value[^.\n]*warm/i);
    assert.match(source, /lower value[^.\n]*cool/i);
    assert.match(source, /light'?s own[^.\n]*not an error|warm cast[^.\n]*not an error/i);
  });

  test("the source photograph is never changed: its hash is taken before and after, the output differs from the input, and format=original is never used (DEV4)", () => {
    assert.match(source, /hash[^.\n]*before and after/i);
    assert.match(source, /output path differs from the input|never the input/i);
    assert.match(source, /never[^.\n]*`format=original`|`format=original`[^.\n]*never/i);
    assert.match(source, /sidecar/i);
  });

  test("it writes a PNG preview of at most 2000 pixels, because critique takes PNG and not JPG (DEV6)", () => {
    assert.match(source, /2000 pixels|2000 px/i);
    assert.match(source, /`\/bauhaus:critique` takes (?:the )?PNG/);
    assert.match(source, /not (?:a )?(?:JPG|JPEG)|not the JPG|and not (?:the )?JPG/i);
  });

  test("the command is saved beside every output so the develop can be redone (DEV5)", () => {
    assert.match(source, /develop\.sh/);
    assert.match(source, /so the develop can be (?:done|made|redone) again|so the develop can be redone/i);
  });

  test("never merge, denoise-serve, snapshot, mcp, --connect or --bridge, and the side files are listed (DEV7)", () => {
    for (const word of ["merge", "denoise-serve", "snapshot", "mcp", "--connect"]) assert.match(source, new RegExp(`never[^\\n]*${word}|${word}[^\\n]*never`, "i"), word);
    assert.match(source, /catalog\.\*/);
    assert.match(source, /view\.json/);
    assert.match(source, /XDG_CACHE_HOME/);
  });

  test("it takes the brief's Story beats and writes no words", () => {
    assert.match(source, /`Story` beats?/);
    assert.match(source, /invents? no story|does not invent the story/i);
  });

  test("Hand over: the files by name, the figures as the app printed them, the side files, and what was not checked", () => {
    for (const f of ["develop.sh", "developed", "preview"]) assert.match(hand, new RegExp(f, "i"), f);
    assert.match(hand, /as the app printed/i);
    assert.match(hand, /hash/i);
    assert.match(hand, /not checked/i);
  });

  test("no biography, year, cast name, Lucia or build word, and nothing that claims more than was run", () => {
    assert.doesNotMatch(source, BIOGRAPHY);
    assert.doesNotMatch(source, /\b(?:18|19)\d{2}\b/);
    assert.doesNotMatch(source, /Lucia|Peterhans/);
    assert.doesNotMatch(bareWords(source), BUILD_WORDS);
    assert.doesNotMatch(source, NUMBER_OF);
    assert.doesNotMatch(source, /\/suits:/);
  });
});

describe("develop/REFERENCES.md (spec section 5)", () => {
  const text = read(PHOTO_REFS);
  const rows = referenceRows(text);
  const byWork = (re) => rows.filter((r) => re.test(`${r[1]} ${r[3]}`));
  const otherIds = Object.entries(REFS).filter(([craft]) => craft !== "develop").flatMap(([, f]) => referenceRows(read(f)).map((r) => r[0]));

  test("every row is complete and valid, ids are unique, and none repeats an id of another file", () => {
    assert.ok(rows.length >= 15, `${rows.length} rows`);
    for (const cells of rows) assert.deepEqual(rowProblems(cells), [], cells[0]);
    assert.equal(new Set(rows.map((r) => r[0])).size, rows.length);
    assert.deepEqual(rows.map((r) => r[0]).filter((id) => otherIds.includes(id)), []);
  });

  test("every row is opened, and there are no lending rows and no pointer rows (no primary craft book was found)", () => {
    for (const r of rows) {
      assert.equal(r[5], "opened", r[0]);
      assert.match(r[6], /^free \(https:\/\/\S+\)$/, r[0]);
    }
  });

  test("a Wikibooks or Wikipedia row says secondary in its Edition, and its Pointer names a revision date and a part of the page", () => {
    const wiki = rows.filter((r) => /Wikibooks|Wikipedia/.test(r[1]));
    assert.ok(wiki.length >= 14, `${wiki.length} wiki rows`);
    for (const r of wiki) {
      assert.match(r[2], /secondary/, r[0]);
      assert.match(r[3], /revision \d{4}-\d{2}-\d{2}/, `${r[0]}: the pointer has no revision date`);
      assert.match(r[3], /section|opening|lead|whole page/i, `${r[0]}: the pointer says no part of the page`);
    }
  });

  test("the works of spec section 5 are all there", () => {
    for (const re of [
      /Exposure controls/, /Exposure \(photography\)/, /Modern Photography, Composition/, /Modern Photography, Light/, /Rule of thirds/,
      /Photographic lighting/, /Golden hour/, /Color temperature/, /Color balance/, /Still life photography/, /Light tent/, /Curve \(tonality\)/,
      /Modern Photography, Editing/, /Digital processing/,
    ]) assert.ok(byWork(re).length >= 1, String(re));
  });

  test("the partly fitting rows say short or thin in their rule", () => {
    for (const re of [/Still life photography/, /Light tent/, /Curve \(tonality\)/, /Modern Photography, Editing/, /Digital processing/]) {
      const [row] = byWork(re);
      assert.match(row[4], /short|thin/i, row[0]);
    }
  });

  test("the LightCraft README is a tool row: mechanics only, opened, free, never a craft rule", () => {
    const [tool] = byWork(/LightCraft/);
    assert.ok(tool, "no LightCraft row");
    assert.match(tool[4], /^Tool row, for mechanics only:/);
    assert.match(tool[6], /^free \(https:\/\/github\.com\/storytold\/lightcraft\)$/);
    assert.ok(!citedRows(read(PHOTO_TOOL)).some((id) => id === tool[0] && /craft rule/i.test(read(PHOTO_TOOL).split("\n").find((l) => l.includes(id)) ?? "")), "the tool row is cited for a craft rule");
  });

  test("no cast name, no Lucia, and the introduction says what a lending book is and that none is here", () => {
    assert.doesNotMatch(text, new RegExp(`\\b(?:${CAST}|Peterhans|Lucia)\\b`, "i"));
    assert.match(text, /no primary craft book/i);
  });
});

describe("the photograph's pages (docs/characters/peterhans.md, docs/tools/develop.md)", () => {
  for (const file of PHOTO_PAGES) {
    const page = read(file);
    describe(file, () => {
      test("has the four standard sections, in order", () => {
        assert.deepEqual(headings(page).slice(0, 4).length, 4);
        assert.deepEqual(headings(page).filter((h) => ["What it does", "When to reach for it", "Common questions", "It's working if"].includes(h)), ["What it does", "When to reach for it", "Common questions", "It's working if"]);
        assert.ok(section(page, "It's working if").trim().length > 0);
      });
      test("no year, persona, biography, avoided topic, build word, number of jobs or markup", () => {
        assert.doesNotMatch(page, /\b(?:18|19)\d{2}\b/);
        assert.doesNotMatch(page, BIOGRAPHY);
        assert.doesNotMatch(page, /Lucia/);
        assert.doesNotMatch(bareWords(page), BUILD_WORDS);
        assert.doesNotMatch(page, NUMBER_OF);
        assert.deepEqual([speechHits(page), quoteHits(page), topicHits(page)], [[], [], []]);
        assert.doesNotMatch(page, /!\[[^\]]*\]\(/);
        assert.doesNotMatch(prose(page), /<(?:div|span|style|table)\b|style=|\S · \S|^[A-Z][A-Z0-9 ]{9,}$/m);
      });
      test("calls only bauhaus skills", () => {
        assert.deepEqual(unnamespaced(page), []);
        assert.doesNotMatch(page, /\/suits:/);
      });
    });
  }
  test("the character page says it is the name only and the photograph is the owner's, and the tool page says the source is never changed", () => {
    assert.match(read(PHOTO_PAGES[0]), /`develop`/);
    assert.match(read(PHOTO_PAGES[0]), /stance/i);
    assert.match(read(PHOTO_PAGES[1]), /never changed|never written/i);
    assert.match(read(PHOTO_PAGES[1]), /`develop\.controls`/);
  });
});

describe("the package ships no image of anyone's work and never names Lucia", () => {
  const walk = (dir) =>
    readdirSync(join(root, dir), { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? (e.name === "node_modules" || e.name.startsWith(".") ? [] : walk(`${dir}/${e.name}`)) : [`${dir}/${e.name}`],
    );
  const tree = [...walk("skills"), ...walk("docs")];
  test("no image file under skills or docs", () => {
    assert.deepEqual(tree.filter((f) => /\.(?:jpe?g|png|gif|webp|tiff?|dng|raw|cr2|cr3|arw|nef|svg)$/i.test(f)), []);
  });
  test("no Markdown image, and no Lucia, in any text file under skills, docs or the README", () => {
    for (const file of [...tree.filter((f) => /\.(?:md|json|mjs)$/.test(f)), "README.md"]) {
      const text = read(file);
      assert.doesNotMatch(text, /!\[[^\]]*\]\([^)]*\)/, `${file}: an image`);
      assert.deepEqual(luciaHits(text), [], file);
    }
  });
  test("an image link and Lucia are caught", () => {
    assert.match("![a](b.png)", /!\[[^\]]*\]\([^)]*\)/);
    assert.deepEqual(luciaHits("Lucia"), ["Lucia"]);
  });
});

// ---- the writer and the concept tool (spec WRT, W1 to W10, I4, ADR 0002) ----

describe("the writer", () => {
  const source = read("skills/characters/ogilvy/SKILL.md");
  const rules = section(source, "Hard rules");
  const hand = section(source, "Hand over");

  test("is the writer: owns the idea, the insight, the story and the words of every piece made here (W1)", () => {
    assert.match(frontmatter(source), /^name: ogilvy$/m);
    assert.match(source, /owns the idea, the insight, the story and the words/i);
    assert.match(rules, /owns the idea, the insight, the story and the words of every piece made here/i);
    assert.doesNotMatch(frontmatter(source), NUMBER_OF);
  });
  test("reads Intake and works from it, never asks the owner again, and lists what is missing for the lead (I4)", () => {
    assert.match(rules, /reads `Intake`/);
    assert.match(rules, /does not ask the owner again/i);
    assert.match(rules, /list[^.\n]*open[^.\n]*lead[^.\n]*ask/i);
  });
  test("takes the brief from the lead and hands brief and words.md to the designer by name, and calls no character", () => {
    assert.match(source, /\| the lead \| the writer \|/);
    assert.match(source, /\| the writer \| `bayer` \|/);
    assert.match(source, /\| the writer \| `breuer` \|/);
    assert.match(source, /\| the writer \| `mies` \|/);
    assert.match(source, /\| the writer \| `moholy-nagy` \|/);
    assert.match(source, /\| the writer \| `peterhans` \|/);
    for (const to of ["bayer", "breuer", "mies", "moholy-nagy", "peterhans"]) assert.match(hand, new RegExp(`\`handed to ${to}\``));
    assert.match(hand, /`open questions for gropius`/, "the I4 case has its own first-line value");
    assert.match(source, /\| the writer \| the lead \|/);
    assert.match(hand, /first line/i);
    assert.match(hand, /`words\.md`/);
    assert.match(hand, /not checked/i);
    assert.doesNotMatch(source, /\/bauhaus:(?:bayer|breuer|mies|gropius|ogilvy)/);
  });
  test("the designer may send a line back, and the writer changes the line and does not argue the layout (W9)", () => {
    assert.match(rules, /designer may send a line back/i);
    assert.match(rules, /changes the line and does not argue the layout/i);
  });
  test("the words are a file with slot ids, not slots left open (W10)", () => {
    assert.match(rules, /`words\.md`[^.\n]*slot id/i);
    assert.match(rules, /designer places them and writes none/i);
  });
  test("the split with donna is stated: documents and the PDF build stay with donna, the precedence list is pointed at", () => {
    assert.match(rules, /donna keeps (?:long )?documents and the PDF build/i);
    assert.match(rules, /precedence list[^.\n]*`design`/i);
    assert.doesNotMatch(source, /^\d\. The project's own checked-in rules/m);
  });
  test("a conflict between the brief and a project rule is named and put to the owner, and screen strings follow the project's l10n shape", () => {
    assert.match(rules, /contradicts a project rule[^.\n]*stop[^.\n]*name the rule[^.\n]*ask the owner/i);
    assert.match(rules, /l10n/i);
  });
  test("the sample line is about the work", () => {
    const [line] = samples(section(source, "Voice"));
    assert.match(line, /words\.md|idea/i);
  });
});

describe("the concept tool", () => {
  const source = read("skills/tools/concept/SKILL.md");
  const has = (re, why) => assert.match(source, re, why);
  test("name equals folder, the description names the work, and it names its references", () => {
    has(/^---\nname: concept\ndescription: .+\n---/);
    has(/REFERENCES\.md/);
    assert.doesNotMatch(frontmatter(source), NUMBER_OF);
  });
  test("every row it cites exists in its own REFERENCES.md and was opened", () => {
    const rows = new Map(referenceRows(read(REFS.concept)).map((r) => [r[0], r]));
    const cited = citedRows(source);
    assert.ok(cited.length >= 4, `cites ${cited.length} rows`);
    for (const id of cited) {
      assert.ok(rows.has(id), `${id} is not a row of concept/REFERENCES.md`);
      assert.equal(rows.get(id)[5], "opened");
    }
  });
  test("the idea comes from a fact found in the research, and the insight names its research row (W2)", () => {
    has(/idea comes from a fact/i);
    has(/never from (?:the writer's )?taste alone/i);
    has(/insight[^.\n]*research row/i);
  });
  test("the idea is cut to two words, and an idea that cannot be is not yet one (W3)", () => {
    has(/two words/i);
    has(/`Two words: <word> <word>`/);
    has(/not yet one idea/i);
  });
  test("the story is 3 to 5 beats, each with what carries it, and reads from pictures, crops and order before copy (W4)", () => {
    has(/3 to 5 beats/);
    has(/carried by/);
    has(/pictures, crops and order before it reads from the copy/i);
    has(/`Story: none\. Reason: <why>`/);
  });
  test("a formula does not replace an idea (W5)", () => {
    has(/formula does not replace an idea/i);
    has(/defended only because it follows the rules[^.\n]*fails/i);
  });
  test("plain words: as people speak, short, no jargon, read aloud the next morning and edit (W6)", () => {
    has(/the way people speak/i);
    has(/short words, short sentences/i);
    has(/no jargon/i);
    has(/aloud/i);
    has(/next morning/i);
  });
  test("says plainly what the reader should do (W7)", () => {
    has(/says? plainly what the reader should do/i);
  });
  test("claims only what was checked: no spec, date, figure or performance claim without a research row (W8)", () => {
    has(/no spec, date, figure or performance claim/i);
    has(/unless a research row backs it/i);
  });
  test("words.md holds each line with the slot id the layout uses, and the research row for any claim (W10)", () => {
    has(/`words\.md`/);
    has(/slot id/i);
    has(/\| Slot \| Words \| Research row \|/);
    has(/designer places them and writes none/i);
  });
  test("checks the brief with check.mjs by its path from the plugin root", () => {
    has(/node skills\/tools\/design\/check\.mjs brief/);
  });
  test("long documents and the PDF build are donna's, screen strings follow the project's l10n shape, and the project's rules win", () => {
    has(/donna/i);
    has(/l10n/i);
    has(/project'?s own rules[^.\n]*(?:win|outrank|come first)/i);
  });
  test("names no cast member, no build word, no call into another package, and no lending-only book", () => {
    const text = bareWords(source);
    assert.doesNotMatch(text, BUILD_WORDS);
    assert.doesNotMatch(text, new RegExp(`\\b(?:${CAST})\\b`, "i"));
    assert.doesNotMatch(source, /\/suits:|\/ui-ux-pro-max:/);
    assert.doesNotMatch(source, /\]\(\.\.\//, "a link into another folder");
  });
});

describe("concept/REFERENCES.md", () => {
  const rows = referenceRows(read(REFS.concept));
  const find = (re) => rows.filter((r) => re.test(r[1]));
  test("holds the five opened sources, each with a free link, and no lending-only book", () => {
    assert.equal(rows.length, 5);
    for (const r of rows) {
      assert.equal(r[5], "opened", r[0]);
      assert.match(r[6], /^free \(https:\/\//, r[0]);
    }
    assert.equal(find(/How to Write/).length, 1, "the memo on plain writing");
    assert.equal(find(/Letter of 15 May/).length, 1, "the letter on persuasion");
    assert.equal(find(/D&AD/).length, 1, "the two-words exercise");
    assert.equal(find(/Collins/).length, 1);
    assert.equal(find(/Koto/).length, 1);
  });
  test("its ids repeat no id of any other references file", () => {
    const others = Object.entries(REFS).filter(([craft]) => craft !== "concept").flatMap(([, f]) => referenceRows(read(f)).map((r) => r[0]));
    assert.deepEqual(rows.map((r) => r[0]).filter((id) => others.includes(id)), []);
  });
});

describe("ADR 0002, the writer and the cast", () => {
  const adr = read("docs/adr/0002-the-writer-and-the-cast.md");
  test("has a date, a context, a decision and consequences", () => {
    assert.match(adr, /^# .+/m);
    assert.match(adr, /^Date: 2026-11-07$/m);
    for (const title of ["Context", "Decision", "Consequences"]) assert.match(adr, new RegExp(`^## ${title}$`, "m"));
  });
  test("records the theme change, the gate that Kállai failed and the name chosen", () => {
    assert.match(adr, /theme change/i);
    assert.match(adr, /not only people of the school|no longer only/i);
    assert.match(adr, /Kállai/);
    assert.match(adr, /gate/i);
    assert.match(adr, /Ogilvy/);
    assert.match(adr, /plain-writing method|memo/i);
  });
  test("says what the name gives and what it does not: a method for words, a stance for ideas, from two opened texts", () => {
    assert.match(adr, /method for (?:the )?words/i);
    assert.match(adr, /stance for (?:the )?ideas?/i);
    assert.match(adr, /two writers' opened texts|two opened texts/i);
  });
  test("keeps the rules for a real person: craft only, no biography, no quoted words, names as names only", () => {
    assert.match(adr, /craft only/i);
    assert.match(adr, /no biography/i);
    assert.match(adr, /never quoted|paraphrase/i);
  });
  test("adds the writer to the casting rationale and says the rights position is the private repo of ADR 0001", () => {
    assert.match(adr, /^\| David Ogilvy \| Writer \|/m);
    assert.match(adr, /0001/);
    assert.match(adr, /public release re-opens/i);
  });
  test("is a decision record and not a character file: it holds the person's death year, which no character file may", () => {
    assert.match(adr, /\b1999\b/);
  });
});

describe("the words boundary (Q7)", () => {
  const pages = [...registered.map((d) => `${d}/SKILL.md`), ...files("docs/characters"), ...files("docs/tools")];
  test("no skill or page still says the words are donna's, or leaves slots for her", () => {
    for (const file of pages) {
      const text = read(file);
      assert.doesNotMatch(text, /donna keeps the words|the words stay donna|leave the words to donna|labelled slots|words come from donna|\bwrites? the email copy\?\*\* Donna/i, file);
    }
  });
  test("gropius: the words come from the writer, except documents and the PDF build, which are donna's", () => {
    const rules = section(read("skills/characters/gropius/SKILL.md"), "Hard rules");
    assert.match(rules, /words come from the writer, except documents and the PDF build, which are donna's/i);
    const page = read("docs/characters/gropius.md");
    assert.match(page, /\*\*Who writes the words\?\*\* The writer[^\n]*except documents and the PDF build, which are donna's/i);
  });
  test("every designer page and character says who owns the words", () => {
    for (const name of ["bayer", "breuer", "mies", "moholy-nagy", "peterhans"]) {
      assert.match(read("skills/characters", name, "SKILL.md"), /writer owns the (?:idea and the )?words of the pieces made here/i, name);
      assert.match(read("docs/characters", `${name}.md`), /writer owns the words of the pieces made here/i, name);
      assert.match(read("docs/characters", `${name}.md`), /donna keeps long documents and the PDF build/i, name);
    }
  });
  test("the email, brand and critique pages name the writer", () => {
    for (const page of ["email", "brand", "critique"]) assert.match(read("docs/tools", `${page}.md`), /writer/i, page);
  });
});

// ---- the spec edits for the writer and the flow (spec section 11 of the amendment) ----

describe("specs/design-package.md carries the writer and the flow", () => {
  const spec = read("specs/design-package.md");
  const solution = spec.split(/^## Solution$/m)[1].split(/^## User Stories$/m)[0];
  const stories = spec.split(/^## User Stories$/m)[1].split(/^## Implementation Decisions$/m)[0];
  const three = spec.split(/^### 3\./m)[1].split(/^### 4\./m)[0];
  const cast = spec.split(/^### 4\./m)[1].split(/^### 5\./m)[0];
  const tree = spec.split(/^### 8\./m)[1].split(/^### 9\./m)[0];
  const acceptance = spec.split(/^### 9\./m)[1].split(/^### 10\./m)[0];

  test("the solution gives the flow and the writer, and the words boundary replaces donna keeps the words", () => {
    assert.match(solution, /grill, research, concept and story, craft, crit|grill[^.\n]*research[^.\n]*concept and story[^.\n]*craft[^.\n]*crit/i);
    assert.match(solution, /\*\*David Ogilvy\*\* is the writer/);
    assert.match(solution, /`concept`/);
    assert.match(solution, /research step/i);
    assert.doesNotMatch(solution, /Donna keeps the words and the PDF build/);
    assert.match(solution, /The writer owns the words of the pieces made here; donna keeps long documents and the PDF build/);
  });
  test("user story 26 is the writer's, and there are stories for the intake, the idea, the story and the comp", () => {
    assert.match(stories, /26\. As the writer, I want the designer to take the words from my file/);
    assert.doesNotMatch(stories, /As donna, I want the designer to leave the words/);
    for (const re of [/intake/i, /one idea[^.\n]*two words|two words/i, /story[^.\n]*beats/i, /comp/i]) assert.match(stories.split("32. ")[1] ?? "", re);
  });
  test("section 3 has the new blocks: concept, intake, research, the brief, the comp and the writer", () => {
    for (const id of ["BRF1", "BRF2", "BRF3", "RES1", "RES2", "RES3", "RES4", "RES5", "RES6", "CMP1", "CMP7", "CMP-A", "CMP-B", "CMP-C", "W1", "W10", "I1", "I6", "D16"]) assert.ok(three.includes(`- ${id} `) || three.includes(`**${id}`), id);
    assert.match(three, /\*\*`concept`/);
  });
  test("D13 is replaced by BRF1, E1 takes its words from words.md, B7 and C9 name the writer, S7 keeps document text with donna", () => {
    assert.match(three, /- D13 [^\n]*[Rr]eplaced by BRF1/);
    assert.match(three, /- E1 [^\n]*words come from `words\.md`/);
    assert.doesNotMatch(three, /labelled slots/);
    assert.match(three, /- B7 [^\n]*come from the writer's file/);
    assert.match(three, /- C9 [^\n]*writer to fix/);
    assert.match(three, /- S7 [^\n]*document-length/i);
    assert.match(spec, /18\. \*\*harvey\.\*\* Copy tells \(T25 to T27\)[^\n]*writer's to fix/);
  });
  test("section 4 adds the writer's row and says the cast is no longer only the school's, with ADR 0002", () => {
    assert.match(cast, /^\| David Ogilvy, 1911 to 1999 \| Writer/m);
    assert.match(cast, /0002/);
    assert.match(cast, /theme change/i);
  });
  test("section 8 lists the ten new files, and the PR-F row holds them under the cap", () => {
    for (const f of ["skills/characters/ogilvy/SKILL.md", "docs/characters/ogilvy.md", "skills/tools/concept/SKILL.md", "skills/tools/concept/REFERENCES.md", "docs/tools/concept.md", "skills/tools/design/RESEARCH.md", "skills/tools/email/REGISTERS.md", "skills/tools/screens/REGISTERS.md", "skills/tools/brand/REGISTERS.md", "docs/adr/0002-the-writer-and-the-cast.md"]) assert.ok(tree.includes(f), f);
    assert.match(tree, /\| 6\. The writer and the flow[^\n]*\| 10 \|/);
  });
  test("section 9 adds the acceptance step for the flow", () => {
    assert.match(acceptance, /^12\. /m);
    assert.match(acceptance, /five questions in one message/);
    assert.match(acceptance, /check\.mjs research/);
    assert.match(acceptance, /600 px comp/);
  });
  test("the testing decisions name the research check, the brief and the writer's scans, and question 5 is closed with the boundary sentence", () => {
    const testing = spec.split(/^## Testing Decisions$/m)[1].split(/^## Out of Scope$/m)[0];
    assert.match(testing, /`research`|research file/i);
    assert.match(testing, /writer/i);
    assert.match(spec, /5\. \*\*harvey\.\*\* Who owns the strings[^\n]*Closed:[^\n]*The writer owns the words of the pieces made here; donna keeps long documents and the PDF build/);
    assert.match(spec, /^21\. \*\*owner\.\*\*[^\n]*Closed/m);
  });
});

// ---- the stance (spec amendment section 8: STN1 to STN4; STN5 is the owner's to judge) ----

// A character whose own text has not been opened yet has no stance. The list shrinks as stances are written.
const STANCE_LATER = {
  breuer: "none of his own text was opened, so the stance waits for an opened text",
};
// A character added by a later branch (peterhans) writes its stance in its own PR; until it exists it is not here.
const STANCE_NOW = ["bayer", "gropius", "mies", "moholy-nagy", "ogilvy", "peterhans"];
const stanceLines = (source) => section(source, "Stance").split("\n").map((l) => l.trim()).filter(Boolean);
const FIRST_PERSON = /\b(?:i|me|my|mine|we|us|our|ours)\b/i;
const ATTRIBUTING = /\b(?:said|says|wrote|believed|believes|argued|argues|insisted|claimed|declared|quoted)\b/i;
const PLACES = /\b(?:Weimar|Dessau|Berlin|Chicago|Vienna|London|Harvard|Germany|America|Europe)\b/;
const YEAR = /\b(?:18|19|20)\d{2}\b/;
// A stance line is dirty when any of the scans of the rest of the file finds something in it.
const stanceHits = (text) => [
  ...speechHits(text).map(() => "speech verb"),
  ...quoteHits(text).map(() => "quote"),
  ...topicHits(text).map((t) => `topic: ${t}`),
  ...(PERSONA.test(text) ? ["persona"] : []),
  ...(BIOGRAPHY.test(text) ? ["biography"] : []),
  ...(BUILD_WORDS.test(bareWords(text)) ? ["build word"] : []),
  ...(NUMBER_OF.test(text) ? ["number of people"] : []),
  ...(FIRST_PERSON.test(text) ? ["first person"] : []),
  ...(ATTRIBUTING.test(text) ? ["attributing verb"] : []),
  ...(PLACES.test(text) ? ["place"] : []),
  ...(YEAR.test(text) ? ["year"] : []),
];

describe("the stance readers, on fixtures", () => {
  test("stanceLines() reads the non-empty lines of the Stance section only", () => {
    const src = "## Hand over\n\nOne.\n\n## Stance\n\n- A.\n- B.\n\n## Voice\n\nText.\n";
    assert.deepEqual(stanceLines(src), ["- A.", "- B."]);
    assert.deepEqual(stanceLines("## Voice\n\nText.\n"), []);
  });
  const DIRTY = {
    "a speech verb": "Gropius said the whole comes first.",
    "a quote": 'Mies used a phrase for it: "less is a thing you can name here".',
    "a topic": "Keeps working after the exile.",
    "a persona": "As Bayer, drop the second alphabet.",
    "biography": "Studied the trades first.",
    "a build word": "Hands the work to the next agent.",
    "first person": "I ask what can be dropped.",
    "an attributing verb": "Wrote that the whole comes first.",
    "a place": "Plans the series in Weimar.",
    "a year": "Planned the series in 1923.",
  };
  for (const [what, text] of Object.entries(DIRTY)) {
    test(`stanceHits() flags ${what}`, () => assert.ok(stanceHits(text).length > 0, text));
  }
  test("a plain craft line is clean", () => assert.deepEqual(stanceHits("Asks what can be dropped, and uses one system where one will do."), []));
});

describe("the stance (STN1 to STN4)", () => {
  test("STN1: the characters that must have a stance are in the cast, and STANCE_LATER names only real characters with a reason", () => {
    for (const name of STANCE_NOW) assert.ok(characters.includes(name), `${name} is not a character`);
    for (const [name, reason] of Object.entries(STANCE_LATER)) {
      assert.ok(characters.includes(name), `${name} in STANCE_LATER is not a character`);
      assert.ok(reason.trim().length > 0, `${name} has no reason`);
      assert.equal(stanceLines(read("skills/characters", name, "SKILL.md")).length, 0, `${name} has a Stance: remove it from STANCE_LATER`);
    }
  });

  for (const name of characters) {
    const source = read("skills/characters", name, "SKILL.md");
    if (name in STANCE_LATER) continue;
    describe(`${name} stance`, () => {
      test("STN1: has a Stance section of 3 to 6 lines", () => {
        const lines = stanceLines(source);
        assert.ok(lines.length >= 3 && lines.length <= 6, `${lines.length} lines`);
      });
      test("STN2: the Stance passes the same scans as the rest of the file", () => {
        assert.deepEqual(stanceHits(section(source, "Stance")), []);
      });
      test("STN3: the Voice section is unchanged in kind: one sample line of 30 words or fewer, none in the Stance", () => {
        assert.equal(samples(section(source, "Voice")).length, 1);
        assert.equal(samples(section(source, "Stance")).length, 0);
        assert.equal(samples(source).length, 1, "a second sample line elsewhere in the file");
        for (const line of samples(section(source, "Voice"))) assert.ok(!tooLong(line), line);
        assert.match(section(source, "Voice"), /no real person'?s voice is imitated/i);
        assert.match(section(source, "Voice"), /no words are attributed to anyone/i);
      });
      test("STN4: the Stance comes after Hard rules and Hand over, before Voice, and sits inside neither", () => {
        const at = (title) => source.indexOf(`\n## ${title}\n`);
        assert.ok(at("Hard rules") > 0 && at("Hand over") > at("Hard rules"), "Hard rules, then Hand over");
        assert.ok(at("Stance") > at("Hand over"), "Stance after Hand over");
        assert.ok(at("Voice") > at("Stance"), "Voice after Stance");
        assert.doesNotMatch(section(source, "Hard rules"), /^## Stance/m);
        assert.doesNotMatch(section(source, "Hand over"), /^## Stance/m);
        assert.equal((source.match(/^## Stance$/gm) ?? []).length, 1);
      });
    });
  }
});

describe("ADR 0003, a stance in place of a voice", () => {
  const adr = exists("docs/adr/0003-a-stance-in-place-of-a-voice.md") ? read("docs/adr/0003-a-stance-in-place-of-a-voice.md") : "";
  const rows = adr.split("\n").filter((l) => /^\|/.test(l));
  test("the ADR exists with a context, a decision and consequences", () => {
    assert.ok(adr.length > 0, "docs/adr/0003-a-stance-in-place-of-a-voice.md is missing");
    for (const title of ["Context", "Decision", "Consequences"]) assert.ok(section(adr, title).trim().length > 0, title);
  });
  test("it says a stance is not a voice, and that breuer waits for an opened text", () => {
    assert.match(adr, /not a voice/i);
    assert.match(adr, /breuer/i);
    assert.match(adr, /STANCE_LATER/);
    assert.match(adr, /STN5/);
  });
  for (const name of STANCE_NOW) {
    test(`${name}: every stance line is a table row that names its research row`, () => {
      for (const line of stanceLines(read("skills/characters", name, "SKILL.md"))) {
        const text = line.replace(/^-\s*/, "");
        const row = rows.find((r) => r.includes(text));
        assert.ok(row, `no table row for: ${text}`);
        assert.match(row, /\bCGR\s+(?:1b?\.?\d*|2|4)\b[^|]*\br\d+|\bCGR[^|]*\bwould refuse\b/i, `no research row in: ${row}`);
        assert.match(row, new RegExp(`\\b${name}\\b`, "i"), `row does not name ${name}`);
      }
    });
  }
  test("the table gives each row's status, and marks the secondary one", () => {
    assert.match(adr, /secondary/i);
    assert.match(adr, /opened/i);
  });
});

describe("the spec carries the stance (section 4 voice rule, STN1 to STN5, the PR-S row)", () => {
  const spec = read("specs/design-package.md");
  const three = spec.split(/^### 3\./m)[1].split(/^### 4\./m)[0];
  const cast = spec.split(/^### 4\./m)[1].split(/^### 5\./m)[0];
  const tree = spec.split(/^### 8\./m)[1].split(/^### 9\./m)[0];
  test("section 4 defines a stance, says it is not a voice, and keeps the avoided topics", () => {
    assert.match(cast, /\*\*The stance\.\*\*/);
    assert.match(cast, /stance[^\n]*is not a voice|not a voice/i);
    assert.match(cast, /## Stance/);
    assert.match(cast, /0003/);
    assert.match(cast, /\*\*The voice rule\.\*\*[^\n]*closing of the school under political pressure[^\n]*any death date/);
  });
  test("section 3 lists STN1 to STN5, with STN5 left to the owner", () => {
    for (const id of ["STN1", "STN2", "STN3", "STN4", "STN5"]) assert.match(three, new RegExp(`- ${id} \\[`), id);
    assert.match(three, /- STN5 \[J\][^\n]*owner/);
    assert.match(three, /STANCE_LATER/);
  });
  test("section 8 has the PR-S row with its one new file", () => {
    assert.match(tree, /\| 7\. The stance[^\n]*0003[^\n]*\| 1 \|/);
    assert.ok(tree.includes("docs/adr/0003-a-stance-in-place-of-a-voice.md"));
  });
});

describe("the stance is mentioned once in the READMEs and on each affected docs page", () => {
  test("README.md and the characters README have a line on the stance", () => {
    assert.match(read("README.md"), /stance/i);
    assert.match(read("skills/characters/README.md"), /stance/i);
  });
  for (const name of STANCE_NOW) {
    test(`docs/characters/${name}.md has one line on the stance, in "What it does"`, () => {
      const page = read("docs/characters", `${name}.md`);
      assert.match(section(page, "What it does"), /stance/i);
      assert.equal((page.match(/stance/gi) ?? []).length >= 1, true);
    });
  }
  test("breuer's docs page does not claim a stance yet", () => {
    assert.doesNotMatch(read("docs/characters/breuer.md"), /stance/i);
  });
});

// RES8. Each designer runs the visual research for their own piece, from their craft's row of the places to look in
// RESEARCH.md; the lead runs only the job layer.
const CRAFTS = {
  bayer: ["Brand and logos", "Email", "Diagrams"],
  breuer: ["Screens"],
  mies: ["Space"],
  "moholy-nagy": ["Shots and motion"],
  peterhans: ["Photograph"],
};
describe("each designer researches their own piece (RES8)", () => {
  const where = section(read("skills/tools/design/RESEARCH.md"), "Where to look");
  const crafts = [...where.matchAll(/^\| \*\*([^*|]+)\*\* \|/gm)].map((m) => m[1]);
  for (const [name, own] of Object.entries(CRAFTS)) {
    test(`${name} calls the method for the visual research when the piece has none, from its craft's row`, () => {
      const when = section(read("skills/characters", name, "SKILL.md"), "When to call");
      const row = when.split("\n").find((l) => l.startsWith("| `/bauhaus:design` |")) ?? "";
      assert.match(row, /no visual research/i);
      assert.match(row, /P1 to P7/);
      for (const craft of own) {
        assert.ok(row.includes(`**${craft}**`), `${name} does not name the ${craft} row`);
        assert.ok(crafts.includes(craft), `RESEARCH.md has no ${craft} row`);
      }
    });
  }
  test("every craft row in RESEARCH.md belongs to a designer", () => {
    assert.deepEqual([...crafts].sort(), Object.values(CRAFTS).flat().sort());
  });
  test("the lead runs only the job layer and leaves the piece layer to the designer", () => {
    const when = section(read("skills/characters/gropius/SKILL.md"), "When to call");
    assert.match(when, /job layer/i);
    assert.match(when, /designer[^.\n]*piece layer|piece layer[^.\n]*designer/i);
  });
});

// QS3 to QS5. A small job starts from a one-page proposal (design/PROPOSAL.md) in place of the eleven-section brief.
describe("a small job starts from a proposal (QS3 to QS5)", () => {
  const gropius = read("skills/characters/gropius/SKILL.md");
  test("the lead writes a proposal for a small job, shows it to the owner unless the owner is away, and says so in the hand-over (QS3)", () => {
    const does = section(gropius, "What the lead does");
    assert.match(does, /small job[^\n]*proposal/i);
    const when = section(gropius, "When to call").split("\n").find((l) => l.startsWith("| `/bauhaus:design` |")) ?? "";
    assert.match(when, /small job[^.]*proposal/i);
    assert.match(section(gropius, "Hard rules"), /brief file, or for a small job a proposal/i);
    assert.match(section(gropius, "Hard rules"), /owner is away/i);
    assert.match(section(gropius, "Hand over"), /`proposal written`/);
  });
  test("the writer writes only the missing lines of a small job's proposal, with no idea, insight or story (QS4)", () => {
    const ogilvy = read("skills/characters/ogilvy/SKILL.md");
    const row = section(ogilvy, "When to call").split("\n").find((l) => l.startsWith("| `/bauhaus:concept` |")) ?? "";
    assert.match(row, /proposal[^.]*`Words`[^.]*(?:missing|empty)/i);
    assert.match(ogilvy, /no idea, insight or story/i);
  });
  for (const name of Object.keys(CRAFTS)) {
    test(`${name} takes a small job from its proposal and gathers its three examples (QS5)`, () => {
      const row = section(read("skills/characters", name, "SKILL.md"), "When to call").split("\n").find((l) => l.startsWith("| `/bauhaus:design` |")) ?? "";
      assert.match(row, /three examples[^.]*proposal|proposal[^.]*three examples/i);
    });
  }
});

// SO3 to SO5. Sign-off is the owner's alone; a locked file changes only under a change request.
describe("sign-off is the owner's and locks the stage (SO3 to SO5)", () => {
  test("the lead records the owner's sign-off and logs later feedback as change requests (SO3)", () => {
    const g = read("skills/characters/gropius/SKILL.md");
    assert.match(section(g, "What the lead does"), /owner approves a stage[^\n]*approvals\.md/i);
    assert.match(section(g, "What the lead does"), /change request/i);
    assert.match(section(g, "Hard rules"), /only the owner signs off/i);
    assert.match(section(g, "Hard rules"), /past the rounds[^.\n]*extra[^.\n]*waits/i);
  });
  for (const name of Object.keys(CRAFTS)) {
    test(`${name} changes a locked file only under a change request, and never calls work approved (SO4)`, () => {
      const rules = section(read("skills/characters", name, "SKILL.md"), "Hard rules");
      assert.match(rules, /locked/i);
      assert.match(rules, /change request[^.\n]*reopens/i);
      assert.match(rules, /never[^.\n]*approved/i);
    });
  }
  test("the craft pass points to the owner's sign-off (SO5)", () => {
    const c = read("skills/tools/critique/SKILL.md");
    assert.match(section(c, "Hard rules"), /sign-off is the owner's[^.\n]*approvals\.md/i);
  });
});

// LIB5, LIB6. Designers read their library first; the lead files the library at the final sign-off and keeps the owner's taste notes.
describe("designers improve with use (LIB5, LIB6)", () => {
  test("the lead files the library at the final sign-off and records the owner's taste notes (LIB5)", () => {
    const g = read("skills/characters/gropius/SKILL.md");
    assert.match(section(g, "What the lead does"), /final[^\n]*library/i);
    assert.match(section(g, "What the lead does"), /taste/i);
  });
  for (const name of Object.keys(CRAFTS)) {
    test(`${name} reads its library before research (LIB6)`, () => {
      const row = section(read("skills/characters", name, "SKILL.md"), "When to call").split("\n").find((l) => l.startsWith("| `/bauhaus:design` |")) ?? "";
      assert.match(row, /library/i);
    });
  }
});

// RES9. Diagrams and infographics are bayer's.
describe("diagrams belong to the graphic designer (RES9)", () => {
  test("bayer's description and table take diagrams, and the lead hands diagrams to bayer", () => {
    const b = read("skills/characters/bayer/SKILL.md");
    assert.match(frontmatter(b), /diagram/i);
    assert.match(section(b, "What the designer does"), /\*\*Diagrams\*\*/);
    assert.match(section(read("skills/characters/gropius/SKILL.md"), "Hard rules"), /`bayer` \([^)]*diagrams/i);
  });
});

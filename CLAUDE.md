## What this is

A private plugin of design skills. Characters live in `skills/characters/`, the tools they call in `skills/tools/`. Every skill is promoted: it is in `.claude-plugin/plugin.json`'s `skills`, listed in its bucket's `README.md` under **User-invoked** or **Model-invoked**, and has a docs page at `docs/<bucket>/<skill>.md` with four sections: **What it does**, **When to reach for it**, **Common questions**, **It's working if**.

Run `npm run check-skills` after adding, moving or renaming a skill, and `npm test` after changing the check. CI runs both on every pull request.

There are no releases or versions: the plugin has no `version`, so Claude Code versions it by commit. Do not add one.

The spec is [specs/design-package.md](./specs/design-package.md). Work to it; a change it does not ask for is a change to ask about first.

## Calls

- Every call is namespaced: `/bauhaus:<skill>`, never a bare name.
- No call into suits: no `/suits:` anywhere. A link in either direction needs a new decision in `docs/adr/`.
- The one call into another package is the optional lookup the `screens` skill may name once, and it is never required. The check enforces both rules.
- No data or text from another package is copied into this one.

## Rules for characters

- A character calls tools of this package and nothing else, never copies a tool's text and never links across skill folders. A tool's shared reference material lives inside the tool that owns it.
- Every character's `SKILL.md` has a **When to call** section: one trigger per tool, stated as a fact about the task. The default is not to call.
- Every character's `SKILL.md` has a **Voice** section: the register, what it avoids, one sample line of plain professional register about the work.
- The precedence list (the project's own rules first) is stated once, in the `design` tool, and the same way everywhere. See section 2 of the spec.
- Name no number of characters or jobs in a name, a tagline or a description: the cast may grow.

## Real people

- The cast are real people. Use their names as names only. Paraphrase, never quote, and never put words in anyone's mouth.
- Describe each by craft, in a plain professional register. Imitate no voice.
- The topics to keep out of every character file and docs page are in section 4 of the spec. Do not list them elsewhere.

## Writing

- Never mention assistants, agents, cooks, kitchens, stations, workflows or any other build tool in commits, pull requests or skill text meant for others.
- Conventional commits. No attribution lines. English only.
- Documents and emails a character writes carry no machine-made look: no tracked-caps kickers, hero titles, dot meta lines, side bars or tinted cards.
- A pull request adds at most 14 new files. A bigger change is split.

## Decisions

Decisions that bind the repo are in `docs/adr/`.

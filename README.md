# Bauhaus

A design package. It holds one method, the jobs that apply it, and characters who brief those jobs and hand work on. The method names the generic defaults a piece must not fall into, asks for a plan checked against the brief before anything is built, and puts the project's own rules above its own taste.

Status: the method, the brand, email, critique, screens, massing, plans, concept, shots, storyboard, motion, develop, ground and handoff jobs, and the lead, the graphic designer, the screen designer, the space designer, the shot and motion designer, the writer and the photographer are in.

## Install

```
claude plugin marketplace add Seuketchi/bauhaus
claude plugin install bauhaus@bauhaus
```

Calls are always namespaced, for example `/bauhaus:design`, because a bare name can clash with another package.

## The cast

The cast are real people, now dead, and their names are used as names only. Each role is described by craft. The designers are people of the school; the writer is a writer from outside the school, not only people of the school, and ADR 0002 records why.

| Person | Role |
| --- | --- |
| Walter Gropius | Lead. Frames the brief, hands work on, runs the craft pass. |
| Herbert Bayer | Graphic designer. Brand, logos, email. |
| Marcel Breuer | UI/UX designer. App and web screens, and finished pages handed to Figma and to a developer. |
| Ludwig Mies van der Rohe | Space designer. Form, plans, structure. |
| David Ogilvy | Writer. The idea, the story and the words. |
| László Moholy-Nagy | Shot and motion designer. Shots, storyboards, animated titles. |
| Walter Peterhans | Photographer. The still image and its development. |
| Josef Albers | Colour science, inside the method. Credited here and in the decision record. |

Each character file carries a short stance: what the craft puts first and what it refuses, in plain lines. It is not a voice, and ADR 0003 records the rows each line rests on.

More characters and jobs are later work, each after a source pass. The cast may grow.

## Layout

- [skills/characters](./skills/characters/README.md): the characters.
- [skills/tools](./skills/tools/README.md): the tools they call.
- [specs/design-package.md](./specs/design-package.md): the spec this package is built to.
- [docs/adr](./docs/adr): the decisions that bind the repo.

## Checks

`npm run check-skills` checks the listing rules, the docs pages, the links, the calls into other packages and `claude plugin validate`. `npm test` runs the tests of that check. CI runs both on every pull request.

Rules for working here are in [CLAUDE.md](./CLAUDE.md).

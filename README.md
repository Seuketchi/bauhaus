# Bauhaus

A design package. It holds one method, the jobs that apply it, and characters who brief those jobs and hand work on. The method names the generic defaults a piece must not fall into, asks for a plan checked against the brief before anything is built, and puts the project's own rules above its own taste.

Status: the method, the brand, email, critique and screens jobs, and the lead, the graphic designer and the screen designer are in.

## Install

```
claude plugin marketplace add Seuketchi/bauhaus
claude plugin install bauhaus@bauhaus
```

Calls are always namespaced, for example `/bauhaus:design`, because a bare name can clash with another package.

## The cast

The cast are historical designers. Their names are used as names only, and each role is described by craft.

| Person | Role |
| --- | --- |
| Walter Gropius | Lead. Frames the brief, hands work on, runs the craft pass. |
| Herbert Bayer | Graphic designer. Brand, logos, email. |
| Marcel Breuer | UI/UX designer. App and web screens. |
| Josef Albers | Colour science, inside the method. Credited here and in the decision record. |

Moholy-Nagy and Mies van der Rohe are later work: each needs a source pass first. The cast may grow.

## Layout

- [skills/characters](./skills/characters/README.md): the characters.
- [skills/tools](./skills/tools/README.md): the tools they call.
- [specs/design-package.md](./specs/design-package.md): the spec this package is built to.
- [docs/adr](./docs/adr): the decisions that bind the repo.

## Checks

`npm run check-skills` checks the listing rules, the docs pages, the links, the calls into other packages and `claude plugin validate`. `npm test` runs the tests of that check. CI runs both on every pull request.

Rules for working here are in [CLAUDE.md](./CLAUDE.md).

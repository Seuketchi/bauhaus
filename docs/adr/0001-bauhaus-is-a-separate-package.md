# Bauhaus is a separate package

Date: 2026-11-07

## Context

No one owns the look across a brand, an HTML email, a logo and an app screen, so each piece is styled from scratch and a second piece of the same brand does not match the first. The owner wants one designer for all of it, in a package of its own beside suits. Suits holds the specialists for building, review and documents, and its tools do not cover identity or HTML email. ui-ux-pro-max is a general lookup for screens that knows nothing of a project's own rules, and it ships skills named `design` and `brand`.

## Decision

- **Separate repo.** `bauhaus` is its own repo and plugin, beside suits. Suits is unchanged, and no file in suits names bauhaus.
- **Namespaced calls.** Every call is `/bauhaus:<skill>`, never a bare name, because a bare `design` or `brand` clashes with ui-ux-pro-max.
- **No call into suits, for now.** A one-way link may come later, a designer calling a suits skill, and it needs a new decision. Review of this package's work happens from outside it.
- **ui-ux-pro-max is optional.** The `screens` skill may name it once as a lookup. It is never a dependency, never above a project's rules, and none of its data or text is taken. Taking data would owe the MIT notice and a refresh path. Whether a call to an absent package resolves is UNVERIFIED.
- **No `version`.** Claude Code versions the plugin by commit, as it does for suits.
- **The name stays for now.** `bauhaus` is kept while the repo is private and has no releases. Before any public release, search the DPMA, EUIPO and USPTO registers, and check the cast names for estate or foundation terms. Neither was searched, so no clash is stated as fact either way.
- **The cast.** Real people, used as names only, described by craft and never quoted. The colour science (contrast, how a colour reads beside another) is part of the method in `design`, and it is credited to Josef Albers here and in the README cast table only. Marcel Breuer takes UI/UX, and Ludwig Mies van der Rohe takes space: form, plans and structure.
- **Later work.** Moholy-Nagy is named and not specified. It needs a source pass first, and the film canon is lending-only, so the owner may need to supply books.
- **SolidCraft.** SolidCraft is an independent app (its package says so) that the owner uses alongside the ArtCraft suite; it is not made by ArtCraft. The `massing` tool drives its command line, and no skill, page or README calls it an ArtCraft app.

The casting rationale below is from English Wikipedia pages, which are a lead and not a primary source. Each fit is secondary, and the fits marked inferred are inferred.

| Person | Role | Why |
| --- | --- | --- |
| Walter Gropius | Lead | An architect who founded the school and led it; its aim was to combine the crafts and the fine arts. Technology standing in for science is inferred. |
| Herbert Bayer | Graphic designer | Directed printing and advertising at the school; known for an all-lowercase sans-serif and for corporate branding. Strong for brand and logos; email is inferred from printed-matter work. |
| Marcel Breuer | UI/UX designer | Headed the carpentry shop; tubular-steel furniture. An analogy only, objects built for the body, so the fit is inferred. |
| Josef Albers | Colour science inside the method | Taught the preliminary course; author of a book on colour explored by experiment. Strong for colour. |
| Moholy-Nagy | Director, later | Photograms and light-based work, and a few short films. Strong on light, weaker on directing. |
| Mies van der Rohe | Architect | Architect: space, form and structure. Strong. |

## Consequences

- Review of this package's work comes from outside it, and nothing here depends on suits being installed.
- A rename is cheap while the name sits only in the manifests, the README, the ADR and the `/bauhaus:` calls.
- Whether one marketplace may hold two plugins is UNVERIFIED and does not matter, because each plugin has its own.
- The package keeps suits's text rules: no mention of how the work is built, English only, conventional commits.
- A release is a later decision. Until then the repo stays private.

# Trends

One dated file for every trend the design method knows. A trend is applied only when the brief asks for it, and only when its status is `Trial`. Nothing here is a default.

How to read an entry:

- **Status** is `Watch` (recorded, not applied), `Trial` (may be applied when the brief asks) or `Retired` (never applied). An entry moves from `Watch` to `Trial` only by the owner's decision.
- **Review by** is a date. Review the entry before each use, and at least every six months. `check.mjs trends <this file> --as-of <date>` fails an entry past its date.
- The accessibility floor outranks any trend: a trend that breaks 4.5:1 for small text or 3:1 for large text and graphics, or the user's reduce-motion or reduce-transparency settings, is rejected and not weighed.
- A platform's own material is conformance and is recorded in section 7 of `DESIGN.md`, so no platform default is listed here.
- An entry is written only from a page that was opened. Each source below was fetched and read on 2026-11-07. Press and search snippets are not evidence.

## Translucent Liquid Glass materials

**What it is:** A translucent material that reflects and refracts what is behind it, used for controls and navigation above content.
**Originator and date:** Apple, announced 2025-06-09.
**Sources:** https://www.apple.com/newsroom/2025/06/apple-introduces-a-delightful-and-elegant-new-software-design/ and https://www.nngroup.com/articles/liquid-glass/
**Counter-evidence:** Nielsen Norman Group (Budiu, 2025-10-10) finds text drawn over text illegible, tap targets crowded and smaller, and controls that change size and place as context changes.
**Suits:** Media and photo-led surfaces. Poor for dense text, forms and data. On iOS 26 it is the platform default, which makes it conformance and not a trend.
**Status:** Watch
**Review by:** 2027-05-07

## Expressive physics-based motion and morphing shape

**What it is:** Springs and shape morphing for interactions and transitions, with larger choices of shape, size, colour and motion.
**Originator and date:** Google, Material 3 Expressive, May 2025 (press coverage 2025-05-28).
**Sources:** https://design.google/library/expressive-material-design-google-research and https://www.dezeen.com/2025/05/28/google-ushers-in-age-of-expressive-interfaces-with-material-design-update/
**Counter-evidence:** Google's own post says expressive design can lead to poor usability when basic interaction patterns are broken, and that what works in a media player may not suit a banking interface.
**Suits:** Consumer and media surfaces, onboarding. Not banking or payment flows.
**Status:** Watch
**Review by:** 2027-05-07

## Navigation chrome that collapses on scroll

**What it is:** Tab bars and toolbars that shrink or collapse while the user scrolls, to give content the space.
**Originator and date:** Apple, iOS 26, announced 2025-06-09.
**Sources:** https://www.apple.com/newsroom/2025/06/apple-introduces-a-delightful-and-elegant-new-software-design/ and https://www.nngroup.com/articles/liquid-glass/
**Counter-evidence:** Nielsen Norman Group (Budiu, 2025-10-10) reports that controls which appear, vanish, collapse and expand with context make an interface harder to learn and less predictable.
**Suits:** Reading, media and feed surfaces. Weak for tools with fixed controls.
**Status:** Watch
**Review by:** 2027-05-07

## Bold type and colour inside expressive systems

**What it is:** A wider choice of type and palette, used more dynamically than before, inside an expressive design system.
**Originator and date:** Google, reported by Dezeen on 2025-05-28.
**Sources:** https://www.dezeen.com/2025/05/28/google-ushers-in-age-of-expressive-interfaces-with-material-design-update/
**Counter-evidence:** Evidence is partial: one press report of one vendor's announcement.
**Suits:** Brand, editorial and marketing surfaces.
**Status:** Watch
**Review by:** 2027-05-07

## Keyframe motion authored in the design tool

**What it is:** A timeline with keyframes, presets and easing inside the design tool, with the timing and easing readable in code.
**Originator and date:** Figma, Config 2026, 2026-06-24.
**Sources:** https://www.figma.com/blog/config-2026-recap/
**Counter-evidence:** Not found. Searched on 2026-11-07: the vendor's own recap post, which carries no criticism. No other source was searched.
**Suits:** Prototypes, marketing pages, motion tokens in a design system.
**Status:** Watch
**Review by:** 2027-05-07

## Instruction- and automation-driven design

**What it is:** Design work started from written instructions to generative tools, which produce screens and prototypes.
**Originator and date:** Figma, 2026; Nielsen Norman Group survey, 2026-10-23 (n=521).
**Sources:** https://www.nngroup.com/articles/ai-in-ux-survey-26/ and https://www.figma.com/solutions/ai-brand-guideline-generator/
**Counter-evidence:** In the survey 54% cite output quality as a barrier, and respondents describe fixing "slop". Production UI needs human review.
**Suits:** Prototypes, exploration and internal tools.
**Status:** Watch
**Review by:** 2027-05-07

## Bespoke type and motion identities

**What it is:** An identity built around a custom typeface and a motion language.
**Originator and date:** Pentagram project pages for Firaxis Games and Rugiet, read 2026-11-07. The project dates were not read.
**Sources:** https://www.pentagram.com/work/firaxis-games and https://www.pentagram.com/work/rugiet
**Counter-evidence:** Two projects of one studio, listed by the studio. This is not a trend report.
**Suits:** Games, entertainment and voice-led consumer brands.
**Status:** Watch
**Review by:** 2027-05-07

## Maximal, surreal imagery

**What it is:** Larger-than-life, playful and surreal imagery.
**Originator and date:** Adobe, Creative Trends 2026, 2026-01-08 (the Surreal Silliness trend).
**Sources:** https://blog.adobe.com/en/publish/2026/01/08/how-creators-leveraging-adobe-2026-creative-trends
**Counter-evidence:** Adobe sells stock imagery and Firefly against it: the post links Adobe's own collections for the trend.
**Suits:** Entertainment and social campaigns. Not regulated or civic work.
**Status:** Watch
**Review by:** 2027-05-07

## Brand systems built to flex for generated output

**What it is:** A brand kept as a system of shared parts that flexes across products, with its guidelines tied to a design system so tools can generate on-brand work from it.
**Originator and date:** Pentagram's Pfizer system and Figma's brand guidelines page, both read 2026-11-07 and both undated on the page.
**Sources:** https://www.pentagram.com/work/pfizer and https://www.figma.com/solutions/ai-brand-guideline-generator/
**Counter-evidence:** Undated sources. The Pentagram page does not mention generated output: that link rests on the vendor's own product page.
**Suits:** Multi-market brands and product lines.
**Status:** Watch
**Review by:** 2027-05-07

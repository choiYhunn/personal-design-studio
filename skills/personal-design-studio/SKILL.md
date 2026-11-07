---
name: personal-design-studio
description: Create or revise CVs, research slides, reports and dashboards from user documents in the local Personal Design Studio; verify facts and rendered layout before delivery.
---

# Personal Design Studio

Use the studio for a requested CV, resume, portfolio, presentation, report or dashboard. Determine whether “CV” means curriculum vitae or computer vision before selecting an artifact. Read `README.md` for supported formats and `docs/DEVELOPMENT.md` when changing studio code.

## Work with source material

- Preserve the user's claims, names, dates and numbers. Mark unknowns instead of inventing achievements. Keep private CVs, company data and research files outside this public repository.
- For TXT, MD, DOCX, PDF or PPTX input, use `node bin/studio.mjs import <file> --type <cv|slides|report|dashboard> -o <new-project.json>`. This extracts content locally. Read `sourceDocuments`, parser warnings and `provenance`; review the extraction before designing. A scanned PDF may have no text, and PPTX layout is not reconstructed.
- Existing v0.1 and v2 project JSON can be used directly with `audit` and `build`. Do not overwrite a user's project without their direction. An imported project is a new draft, not a verified factual rewrite.

## Design and verification

1. Clarify audience, document purpose, format and any privacy boundary from the request. For substantial work, render two meaningfully different directions using the same factual content.
2. Select typography and layout for reading order, density, print size and language. The browser editor at `npm start` and CLI use the same project model and renderer. Use the browser for ordinary item editing and visual review; JSON is optional advanced editing.
3. Run `node bin/studio.mjs audit <project.json>` and `node bin/studio.mjs build <project.json> -o <output.html>`. If code changed, run `npm test` and `npm run check`.
4. Inspect the actual rendered output, including first, densest and last slide or printed A4 pages. Check clipping, font fallback, contrast, links, chart units/denominators/time windows and source notes. An audit pass is not visual approval.
5. Deliver the editable JSON and standalone HTML. Provide PDF only after checking its pagination. Do not claim editable DOCX/PPTX output; the studio does not provide it.

`node bin/studio.mjs fonts list` shows available local font pairings. Browser and exported HTML use self-hosted fonts with OFL notices. Optional Oh My Design and slides-grab are separate, nonessential workflows in `docs/INTEGRATIONS.md`; detect their installation before proposing a command that depends on them. The agent may be discovered automatically, but `$personal-design-studio` or `/personal-design-studio` remains the explicit route.

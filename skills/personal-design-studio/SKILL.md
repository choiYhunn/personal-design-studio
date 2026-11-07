---
name: personal-design-studio
description: Create and critically review CVs, research presentations, reports, and dashboards from verified material using a reproducible local-first design workflow.
---

# /design — evidence-led personal studio

## Routing

- CV, resume, academic CV, personal portfolio → `cv`.
- Presentation, seminar, research talk, project pitch, card-style slides → `slides`.
- Memo, design review, technical report, proposal → `report`.
- Dashboard, metric visual, experiment overview → `dashboard`.
- If `CV` refers to *computer vision* rather than a curriculum vitae, determine the requested artifact first; do not assume it is a resume.

## Workflow

1. **Preflight.** Read the request and available documents, their privacy boundaries, current project, language, audience, and deliverable. Preserve stated constraints. If critical information is missing, mark it as unknown; never fill with fabricated specifics.
2. **Evidence ledger.** List each important factual assertion or number and its source. Distinguish user-provided claims, external references, and illustrative figures. Do not reproduce private company data in a public repo.
3. **Frame.** Write a single-sentence decision goal, primary reader, medium, content priority, and expensive-to-misread detail.
4. **Explore.** Offer two distinct aesthetic directions where warranted; compare layout, hierarchy, type scale, density, color, print and editing constraints. Avoid surface-only variations.
5. **Build.** Create a project JSON per `examples/*.json`; choose theme from `editorial`, `technical`, `classic`, `signal`. Build with `node bin/studio.mjs build project.json -o output.html`. Prefer reusable data arrays and consistent spacing.
6. **Deterministic audit.** Run `node bin/studio.mjs audit project.json --strict`. Fix errors and explicitly judge whether warnings should block publication. Run `npm test` if code is changed.
7. **Visual review.** Open the rendered HTML in a browser, inspect typography, clipping, hierarchy, page balance, print mode, and mobile viewport where relevant. Screenshot and compare revisions if browser support exists. Audit results are *not* visual approval.
8. **Deliver.** Include editable JSON, self-contained HTML, PDF if reliable, sources/evidence ledger, and a short limitation note. PPTX or DOCX must be tested independently; never imply that an image-only PPTX is editable.

## Medium-specific bar

### CV

- Use role-relevant claims with dates and outcomes, but only when verified.
- Keep reading order linear; use unambiguous section headings and text, not rasterized biography.
- Do not add invented percentile, GPA, impact statistics, or company endorsement.
- Inspect actual printed A4 page count. Links must be user-confirmed.

### Slides

- State a takeaway in each title. Prefer legible slide density and essential visuals.
- Support every number or research claim with a visible reference or source note.
- During review inspect at least first, densest and final slides at 16:9.
- If converting to PPTX, check opening, fonts, layout, and editability in a presentation app.

### Report

- Maintain argument structure: question → method → evidence → limits → decision.
- Preserve source citations, chart units and caveats.

### Dashboard

- Label measured vs illustrative data; never let a decorative KPI imply live integration.
- Verify axes, denominators, time windows, chart scales, and contrast.

## Integration

Optional OMD and slides-grab tools can be installed separately to add reference discovery or region-based editing. They are *not* automatic dependencies. See `docs/INTEGRATIONS.md`.

# Optional upstream integrations

The studio works without either dependency. The integrations below are **opt-in workflows**, not integrations executed by its core renderer.

## Oh My Design

Upstream: https://github.com/3x-haust/oh-my-design (MIT)

Use upstream `/ultradesign` when implementing or critiquing a whole website, dashboard or interactive app. It offers a broader process for framing, reference analysis, rendering and independent critique. Keep user-sensitive data local and review what host installation modifies.

```bash
npm install -g @3xhaust/oh-my-design
oh-my-design install
oh-my-design doctor
omd doctor
```

Check current upstream instructions before installing. The **scoped** package is important.

## slides-grab

Upstream: https://github.com/NomaDamas/slides-grab (MIT)

Use slides-grab when a generated HTML slide deck needs area selection, direct visual edits, linting or conversion. This studio supplies standalone HTML 16:9 slides, but it does *not* reimplement the slides-grab visual editor.

```bash
npm install slides-grab
npx playwright install chromium
```

Use the upstream installation guide to add its agent skills and run `npx slides-grab --help` for current commands. Conversion to PPTX has limitations; visually inspect every page and verify whether objects remain editable. If precise editable PPTX is mandatory, write to a native presentation object model instead of rasterizing all slides.

## Compatibility boundary

- OMD is for workflow/critique of apps; it is not required to create a CV.
- slides-grab is for HTML slide editing; it is not a general CV layout engine.
- Neither upstream project is bundled, forked, or automatically invoked by this studio.
- If new integrations are added, pin a known-good version, write tests, and preserve upstream MIT copyright notices for any copied code.

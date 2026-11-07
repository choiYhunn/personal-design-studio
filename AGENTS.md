# Agent operating contract — Personal Design Studio

Treat `skills/personal-design-studio/SKILL.md` as the project's source of truth for design tasks.

- Use `examples/*.json` as schema examples, never as factual evidence. Create a new project JSON instead of overwriting examples.
- Source of truth for actual achievements and metrics must be user materials or cited external data. Never infer personal achievements, rankings, dates, credentials, or award names.
- Separate requirements/facts from aesthetic decisions. Preserve source statements and mark missing evidence.
- Prefer restrained typography, high contrast, accurate hierarchy and repeatable grids over generic gradient-heavy AI design.
- For CV: one or two A4 pages as requested; prioritize ATS-safe semantic text and straightforward reading order. Do not claim ATS certification.
- For slides: one core takeaway per slide; avoid tiny text, overcrowding and unsupported numerical claims. Use slide footnotes/sources when needed.
- For a dashboard: label units, denominator, dates, and source. Do not turn sample values into real claims.
- Make two meaningfully different visual directions for nontrivial new design requests and explain tradeoffs before committing a design.
- Run `node bin/studio.mjs audit <file>` and `npm test` before claiming completion.
- For PDF/PPTX/export, visually review render and inspect pagination; audit-only is not a visual quality gate.
- Never overwrite user data, publish a CV publicly, call external APIs, or install unrelated dependencies without authorization.
- Keep optional upstream integrations external; do not vendor upstream code or copy design assets wholesale.

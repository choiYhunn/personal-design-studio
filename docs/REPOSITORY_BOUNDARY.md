# Repository authority and migration
This repository is the **sole source of truth for Personal Design Studio's implementation**.

- Owns: app, templates, documentation, examples, CLI, tests, GitHub Actions, future adapters and tool-specific work.
- Does not own: private CVs, employer information, personal profiles, raw research material, or global AI Shared Brain memory.
- Deployment/PDF/PPTX accuracy claims require independently checked output; current v0.1 provides HTML/JSON and environment-dependent browser PDF. No editable PPTX or DOCX is claimed.
- Personal project files should stay untracked locally in `workspaces/` or `.private/` and remain out of this public repository.

## Transfer record
- Date: 2026-11-07 (KST).
- Source: private `choiYhunn/ai-shared-brain` Draft PR #321, branch `feat/personal-design-studio-v0-1`, implementation folder `tools/personal-design-studio/`.
- Destination: public `choiYhunn/personal-design-studio`, root of this repository.
- Baseline: 18 textual source files; CI paths updated for root; ignore patterns strengthened for personal data and secrets.
- The old Draft PR is migration provenance, not an active development source.
- Shared Brain retains only a small project pointer in `sources/GITHUB_REPOS.md`.

## Work on this tool
Any future feature, template, integration, issue, PR, code, test, asset, or release belongs here, **not** in Shared Brain. Shared Brain may store durable user decisions or repo pointers but must never vendor or mirror this implementation.

# Repository authority and migration
This repository is the **sole source of truth for Personal Design Studio's implementation**.

- Owns: app, templates, documentation, examples, CLI, tests, GitHub Actions, future adapters and tool-specific work.
- Does not own: private CVs, employer information, personal profiles, raw research material, or global AI Shared Brain memory.
- Deployment/PDF/PPTX accuracy claims require independently checked output; current v0.1 provides HTML/JSON and environment-dependent browser PDF. No editable PPTX or DOCX is claimed.
- Personal project files should stay untracked locally in `workspaces/` or `.private/` and remain out of this public repository.

## Transfer record
- Date: 2026-11-07 (KST).
- Source: private staging repository (identifiers intentionally omitted from the public project).
- Destination: public `choiYhunn/personal-design-studio`, root of this repository.
- Baseline: 18 textual source files; CI paths updated for root; ignore patterns strengthened for personal data and secrets.
- The staging PR was closed without merge and its branch reset; prior source commits remain in private Git history.
- The user's private cross-model memory repository will retain only a small source-of-truth pointer.

## Work on this tool
Any future feature, template, integration, issue, PR, code, test, asset, or release belongs here, **not** in Shared Brain. Shared Brain may store durable user decisions or repo pointers but must never vendor or mirror this implementation.

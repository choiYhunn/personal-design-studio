# Developer notes

The existing Node static server and dependency-light renderer remain the application core. No framework or backend was introduced. The server binds only to `127.0.0.1`; `src/request-path.mjs` still restricts repository file routes and the server explicitly allowlists parser/font assets. Windows path resolution is covered by its original regression test.

## Shared model

`src/project.mjs` normalizes v0.1 `{type,theme,data}` projects to `schemaVersion: 2` without changing `data`. The v2 envelope adds `metadata`, `sourceDocuments`, `preset`, `themeTokens`, `typography`, `page`, `assets`, `exportSettings`, `revisions`, and `provenance`. Both the browser and CLI call the same normalizer and `src/engine.mjs` renderer/auditor. The browser creates a new ID for an imported project; its old `pds:<type>` storage entries are copied, not deleted. Exported JSON can be loaded by either side.

`sourceDocuments` contains the extracted text, structural blocks, slide/notes metadata when available, warnings, and `originalStored:false`. It does **not** contain the original DOCX/PDF/PPTX bytes. It may contain private text; never commit real imported output to this public repository. Attached PNG/JPG references, by contrast, are embedded as data URIs in `assets`, with a separate 3 MiB limit. SVG is metadata only. `provenance.reviewed:false` marks a newly transformed document as needing factual review. No AI generation is performed by the studio.

## Import and security

`src/importer.mjs` is shared by browser and CLI. Mammoth extracts DOCX text and structure; PDF.js extracts text per PDF page; fflate reads PPTX slide/notes OOXML. The import path checks input size, ZIP central directory size/count, expanded size, compression ratio, encryption, and archive paths **before** decompression. These limits reduce common archive abuse but do not make arbitrary documents risk-free. Raw DOCX HTML is reduced to text blocks and never injected into the editor. SVG text is not rendered. The parser does not follow external links or call an AI service. Scanned PDFs and image text need OCR outside the current product.

The parser is text-centric. PDF line grouping, DOCX heading styles, PPTX notes/image associations, and inferred CV sections need user review. Import is not a layout restoration engine. `projectFromImport` creates a new draft and preserves the source text for correction. The browser supports staging multiple files, inspecting errors, creating new projects, or attaching additional sources to the current project. CLI `import` refuses to overwrite an existing output file.

## Type and fonts

`src/design.mjs` defines independent color, font and layout measurements. Font pair choices resolve to self-hosted Fontsource Noto Sans KR, Noto Serif KR, Inter, Source Serif 4 and IBM Plex Mono packages. Each is OFL-1.1; package licenses are present in `node_modules/@fontsource/*/LICENSE`. `src/export.mjs` embeds the used WOFF2 subsets and their full license text into standalone HTML. Browser preview loads those same assets from the local server. CSS restricts numeric values and color overrides before interpolation. CJK and Latin coverage depends on the included Korean and Latin subsets; missing glyphs fall back to local system fonts.

## Running checks

```bash
npm ci
npm test
npm run check
npm audit --omit=dev --audit-level=high
```

`tests/fixtures` contains only generated, fictional documents. Tests verify parsing, malformed input, v0.1 migration, renderer output, font embedding and the Windows Forbidden regression. CI runs on Linux Node 22. Browser screenshot review and Windows CLI execution remain manual quality gates; the deterministic audit does not prove that every page is visually balanced or fits when fonts/content change.

## Current boundaries

- HTML and JSON are editable/exportable. PDF uses browser print or a locally installed Chrome/Chromium. There is no editable DOCX/PPTX output.
- The gallery currently uses four legacy themes. It does not yet provide 24 distinct layout presets.
- The browser's local storage is convenience autosave, not a backup; exported JSON is the portable project file.
- Oh My Design and slides-grab remain optional external workflows described in `docs/INTEGRATIONS.md`.

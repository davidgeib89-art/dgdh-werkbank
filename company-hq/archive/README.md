# Archive Notes

This folder stores historical company-hq documents that are not part of the default active context.

Current snapshot archive:

- `2026-03-18-legacy/`

Usage rule:

- Do not load archive docs by default in new AI sessions.
- Load archive docs only when a task needs historical reconstruction, migration context, or decision provenance.

If a document from archive becomes active again, move it back to `company-hq/` root and add it to:

- `AI-CONTEXT-START-HERE.md`
- `README.md`

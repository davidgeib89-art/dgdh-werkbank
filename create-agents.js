const fs = require("fs");
const path = "C:/Users/holyd/.factory/missions/ea5fae04-90a9-4b0f-a144-7950080fa122/AGENTS.md";
const content = `# AGENTS.md for KB Pipeline

## Mission Boundaries

- CLI-only project, no services
- Off-limits: no external RAG libs, no web UI, keep markdown-first

## Conventions

- CLI in cli/src/commands/kb.ts
- ESM imports with .js extension
- File operations local only

## Baseline Commands

- typecheck: pnpm -r typecheck
- test: pnpm test:run

## Sample Data

C:\\Users\\holyd\\DGDH\\worktrees\\dgdh-droid-sandbox\\company-hq\\kb\\raw\\_samples\\claude-export\\
`;
fs.writeFileSync(path, content);
console.log("Created AGENTS.md");

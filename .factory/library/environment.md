# Environment

**Node Version:** >=20 (repo requirement)

**Package Manager:** pnpm@9.15.4

**Module System:** ESM ("type": "module")

**Runtime:** Port 3100 (canonical DGDH instance)

**Company ID:** 44850e08-61ce-44de-8ccd-b645c1f292be

**Issue Prefix:** DAV (David Geib)

**Next Issue Counter:** 171 (as of 2026-03-28)

## External Dependencies

**Required Services:**
- Paperclip API server on localhost:3100

**Optional External:**
- GitHub API (for PR operations)
- Gemini API (for agent runs)

## Environment Variables

**Paperclip CLI:**
- `PAPERCLIP_API_KEY` - API authentication
- `PAPERCLIP_RUN_ID` - Current run context
- `PAPERCLIP_CLI_CWD` - Repo root for CLI operations

**Git:**
- Standard git environment (no special vars required)

## Setup Notes

**Windows Specific:**
- `git config core.longpaths true` required for deep worktrees
- PowerShell curl may conflict with native curl - use `Invoke-RestMethod`

**Local Identity:**
- Repo-local `.paperclip/.env` and `.paperclip/config.json` take precedence
- Falls back to `~/.paperclip/instances/default` if no local context

# CLAUDE.md — patchpilots-mcp

## Project overview

MCP server that exposes PatchPilots security agent and dependency scanner as tools for Claude Code, Cursor, and any MCP-compatible IDE. Uses stdio transport.

## Commands

```bash
npm run dev          # Run via tsx (development)
npm run build        # Compile TypeScript to dist/
```

## Architecture

- `src/index.ts` — MCP server entry point, registers tools, handles API key resolution
- `src/tools/security.ts` — OWASP Top 10 security scan (same prompt as patchpilots CLI SecurityAgent)
- `src/tools/deps.ts` — Supply chain dependency scanner (analyzes package.json)
- `src/files.ts` — File collector utility (reads source files for scanning)

## Key patterns

- **Stdio transport** — spawned as a child process by the IDE
- **Structured outputs** — Zod schemas + `json_schema` output format via Anthropic SDK
- **Adaptive thinking** — temperature must be 1
- **Prompt caching** — system prompts use `cache_control: { type: "ephemeral" }`
- **`<UNTRUSTED_FILE>` boundary tags** — all file content wrapped to mitigate prompt injection
- **API key resolution** — `ANTHROPIC_API_KEY` env var > `~/.patchpilots.json` apiKey field

## Publishing to npm

```bash
npm version patch --no-git-tag-version
npm publish
git add package.json package-lock.json && git commit -m "chore: bump version" && git push
```

## Related

- [patchpilots](https://github.com/alavesa/patchpilots) — CLI + GitHub Action with all 8 agents

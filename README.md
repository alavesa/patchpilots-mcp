# patchpilots-mcp

[![npm version](https://img.shields.io/npm/v/patchpilots-mcp)](https://www.npmjs.com/package/patchpilots-mcp)
[![license](https://img.shields.io/npm/l/patchpilots-mcp)](https://github.com/alavesa/patchpilots-mcp/blob/main/LICENSE)

PatchPilots security and accessibility agents as an MCP server. Catch supply chain attacks, security anti-patterns, and accessibility issues inside Claude Code, Cursor, and any MCP-compatible IDE.

## What it does

Three tools, one server:

| Tool | What it scans |
|------|--------------|
| `security_scan` | OWASP Top 10 audit — injection, XSS, auth flaws, secrets, crypto issues, misconfigurations. Returns findings with CWE references. |
| `scan_dependencies` | Supply chain risk scanner — typosquatting, postinstall scripts, scope changes, unmaintained packages, known vulnerabilities. |
| `design_audit` | WCAG 2.1 AA accessibility audit — color contrast, semantic HTML, keyboard navigation, ARIA, focus management, design tokens, CSS consistency. Returns findings with WCAG success criterion references. |

All return structured JSON with severity, impact, and remediation for every finding.

## Install

### Claude Code

```json
// ~/.claude.json or project .claude.json
{
  "mcpServers": {
    "patchpilots": {
      "command": "npx",
      "args": ["-y", "patchpilots-mcp"],
      "env": {
        "ANTHROPIC_API_KEY": "sk-ant-..."
      }
    }
  }
}
```

### Cursor

```json
// .cursor/mcp.json
{
  "mcpServers": {
    "patchpilots": {
      "command": "npx",
      "args": ["-y", "patchpilots-mcp"],
      "env": {
        "ANTHROPIC_API_KEY": "sk-ant-..."
      }
    }
  }
}
```

### VS Code

```json
// .vscode/mcp.json
{
  "servers": {
    "patchpilots": {
      "command": "npx",
      "args": ["-y", "patchpilots-mcp"],
      "env": {
        "ANTHROPIC_API_KEY": "sk-ant-..."
      }
    }
  }
}
```

## API key

The server looks for your Anthropic API key in this order:

1. `ANTHROPIC_API_KEY` environment variable
2. `apiKey` field in `~/.patchpilots.json`

If you already use [PatchPilots CLI](https://github.com/alavesa/patchpilots), your global config works automatically.

## Tools

### security_scan

```
path:     string   — file or directory to scan
severity: string   — minimum severity: "critical" | "high" | "medium" | "low" (default: "medium")
roast:    boolean? — brutally honest commentary (default: false)
model:    string?  — Claude model (default: claude-sonnet-4-6)
```

Returns:
```json
{
  "findings": [
    {
      "file": "src/auth.ts",
      "line": 42,
      "severity": "critical",
      "category": "injection",
      "cwe": "CWE-89",
      "title": "SQL injection in user lookup",
      "description": "User input concatenated into SQL query...",
      "impact": "Full database access...",
      "remediation": "Use parameterized queries..."
    }
  ],
  "riskScore": "critical",
  "summary": "Found 3 security issues..."
}
```

### scan_dependencies

```
path:   string   — path to package.json or project root
model:  string?  — Claude model (default: claude-sonnet-4-6)
```

Returns:
```json
{
  "risks": [
    {
      "package": "event-stream",
      "severity": "critical",
      "category": "known-vulnerability",
      "title": "Compromised package with malicious code",
      "description": "...",
      "remediation": "Remove and replace with..."
    }
  ],
  "riskScore": "high",
  "summary": "Found 2 supply chain risks...",
  "stats": {
    "totalDeps": 15,
    "totalDevDeps": 8,
    "risksFound": 2
  }
}
```

### design_audit

```
path:     string   — file or directory to audit
severity: string   — minimum severity: "critical" | "high" | "medium" | "low" (default: "medium")
roast:    boolean? — brutally honest commentary (default: false)
model:    string?  — Claude model (default: claude-sonnet-4-6)
```

Returns:
```json
{
  "findings": [
    {
      "file": "src/components/Button.tsx",
      "line": 15,
      "severity": "high",
      "category": "accessibility",
      "wcagRef": "WCAG 2.1 SC 4.1.2",
      "title": "div with onClick instead of button element",
      "description": "Interactive element uses div with onClick...",
      "remediation": "Replace <div onClick=...> with <button>..."
    }
  ],
  "designHealthScore": "high",
  "summary": "Found 4 accessibility issues..."
}
```

## Fun features

**Risk emojis** — every scan shows a visual risk score: 🟢 none 🟡 low 🟠 medium 🔴 high 💀 critical

**Clean scan badges** — pass with no findings and get a README badge:

```markdown
[![Reviewed by PatchPilots](https://img.shields.io/badge/reviewed%20by-PatchPilots%20🔒-blueviolet)](https://github.com/alavesa/patchpilots)
```

**Roast mode** — set `roast=true` on `security_scan` or `design_audit` for brutally honest, funny commentary on your findings. Same structured output, spicier language. Try asking your IDE:

> "roast the accessibility of my code"

## When to use what

| | CLI | GitHub Action | MCP (this) |
|---|---|---|---|
| **When** | You run it manually | Every PR automatically | On demand in conversation |
| **Where** | Terminal | GitHub CI | Inside your IDE |
| **Agents** | All 8 | All 8 | Security + deps + design |
| **Follow-up** | Read output, act yourself | Read PR comment, act yourself | Ask assistant to explain and fix |
| **Safety net** | No — you remember to run it | Yes — always runs | No — only when IDE is open |

**Need the full crew?** Use the [PatchPilots CLI](https://github.com/alavesa/patchpilots) — all 8 agents in one command:

```bash
npx patchpilots audit ./src --write
```

**Want automatic PR reviews?** Add the [PatchPilots GitHub Action](https://github.com/alavesa/patchpilots):

```yaml
- uses: alavesa/patchpilots@v1
  with:
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
```

All three use the same analysis. The MCP server is for real-time, conversational security and accessibility scanning while you code. The CLI and Action cover the rest.

## License

MIT

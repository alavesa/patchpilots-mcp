#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { readFileSync, statSync, chmodSync } from "node:fs";
import { resolve } from "node:path";
import { homedir } from "node:os";
import { z } from "zod";
import { runSecurityScan } from "./tools/security.js";
import { runDepsScan } from "./tools/deps.js";
import { runDesignAudit } from "./tools/designer.js";
import { riskEmoji, securityBadge, designBadge, depsBadge } from "./format.js";

const DEFAULT_MODEL = "claude-sonnet-4-6";

function getApiKey(): string {
  if (process.env.ANTHROPIC_API_KEY) {
    return process.env.ANTHROPIC_API_KEY;
  }

  try {
    const globalPath = resolve(homedir(), ".patchpilots.json");
    const config = JSON.parse(readFileSync(globalPath, "utf-8"));
    if (config.apiKey) {
      // Warn via stderr (doesn't interfere with stdio MCP transport)
      process.stderr.write(
        "[patchpilots-mcp] API key loaded from config file. For better security, use ANTHROPIC_API_KEY environment variable instead.\n"
      );
      // Auto-fix file permissions to owner-only
      try {
        const mode = statSync(globalPath).mode & 0o777;
        if (mode !== 0o600) chmodSync(globalPath, 0o600);
      } catch {
        // Skip if permissions can't be changed
      }
      return config.apiKey;
    }
  } catch {
    // No global config
  }

  throw new Error(
    "Missing API key. Set ANTHROPIC_API_KEY environment variable or add apiKey to ~/.patchpilots.json"
  );
}

const server = new McpServer({
  name: "patchpilots-mcp",
  version: "0.1.0",
});

server.tool(
  "security_scan",
  "OWASP Top 10 security audit — finds injection, XSS, auth flaws, secrets, crypto issues, and misconfigurations. Returns structured findings with CWE references, severity, impact, and remediation. Set roast=true for brutally honest commentary.",
  {
    path: z.string().describe("File or directory path to scan"),
    severity: z
      .enum(["critical", "high", "medium", "low"])
      .default("medium")
      .describe("Minimum severity to report"),
    roast: z
      .boolean()
      .default(false)
      .describe("Roast mode — brutally honest and funny commentary on findings"),
    model: z
      .string()
      .optional()
      .describe("Claude model to use (default: claude-sonnet-4-6)"),
  },
  async ({ path, severity, roast, model }) => {
    try {
      const apiKey = getApiKey();
      const result = await runSecurityScan(path, severity, apiKey, model ?? DEFAULT_MODEL, roast);
      const badge = securityBadge(result.riskScore);
      result.riskScore = riskEmoji(result.riskScore) as typeof result.riskScore;
      let output = JSON.stringify(result, null, 2);
      if (badge) output += badge;
      return {
        content: [{ type: "text" as const, text: output }],
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text" as const, text: `Error: ${msg}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  "scan_dependencies",
  "Supply chain risk scanner — analyzes package.json for typosquatting, postinstall scripts, scope changes, unmaintained packages, known vulnerabilities, and suspicious versioning.",
  {
    path: z
      .string()
      .describe("Path to package.json or project root directory"),
    model: z
      .string()
      .optional()
      .describe("Claude model to use (default: claude-sonnet-4-6)"),
  },
  async ({ path, model }) => {
    try {
      const apiKey = getApiKey();
      const result = await runDepsScan(path, apiKey, model ?? DEFAULT_MODEL);
      const badge = depsBadge(result.riskScore);
      result.riskScore = riskEmoji(result.riskScore) as typeof result.riskScore;
      let output = JSON.stringify(result, null, 2);
      if (badge) output += badge;
      return {
        content: [{ type: "text" as const, text: output }],
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text" as const, text: `Error: ${msg}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  "design_audit",
  "WCAG 2.1 AA accessibility audit + design system consistency — checks color contrast, semantic HTML, keyboard navigation, ARIA, focus management, design tokens, CSS consistency, and component markup. Returns findings with WCAG success criterion references. Set roast=true for brutally honest commentary.",
  {
    path: z.string().describe("File or directory path to audit"),
    severity: z
      .enum(["critical", "high", "medium", "low"])
      .default("medium")
      .describe("Minimum severity to report"),
    roast: z
      .boolean()
      .default(false)
      .describe("Roast mode — brutally honest and funny commentary on findings"),
    model: z
      .string()
      .optional()
      .describe("Claude model to use (default: claude-sonnet-4-6)"),
  },
  async ({ path, severity, roast, model }) => {
    try {
      const apiKey = getApiKey();
      const result = await runDesignAudit(path, severity, apiKey, model ?? DEFAULT_MODEL, roast);
      const badge = designBadge(result.designHealthScore);
      result.designHealthScore = riskEmoji(result.designHealthScore) as typeof result.designHealthScore;
      let output = JSON.stringify(result, null, 2);
      if (badge) output += badge;
      return {
        content: [{ type: "text" as const, text: output }],
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text" as const, text: `Error: ${msg}` }],
        isError: true,
      };
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);

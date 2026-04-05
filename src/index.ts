#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { homedir } from "node:os";
import { z } from "zod";
import { runSecurityScan } from "./tools/security.js";
import { runDepsScan } from "./tools/deps.js";

const DEFAULT_MODEL = "claude-sonnet-4-6";

function getApiKey(): string {
  if (process.env.ANTHROPIC_API_KEY) {
    return process.env.ANTHROPIC_API_KEY;
  }

  try {
    const globalPath = resolve(homedir(), ".patchpilots.json");
    const config = JSON.parse(readFileSync(globalPath, "utf-8"));
    if (config.apiKey) return config.apiKey;
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
  "OWASP Top 10 security audit — finds injection, XSS, auth flaws, secrets, crypto issues, and misconfigurations. Returns structured findings with CWE references, severity, impact, and remediation.",
  {
    path: z.string().describe("File or directory path to scan"),
    severity: z
      .enum(["critical", "high", "medium", "low"])
      .default("medium")
      .describe("Minimum severity to report"),
    model: z
      .string()
      .optional()
      .describe("Claude model to use (default: claude-sonnet-4-6)"),
  },
  async ({ path, severity, model }) => {
    try {
      const apiKey = getApiKey();
      const result = await runSecurityScan(path, severity, apiKey, model ?? DEFAULT_MODEL);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
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
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
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

import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

const depsResultSchema = z.object({
  risks: z.array(
    z.object({
      package: z.string(),
      severity: z.enum(["critical", "high", "medium", "low"]),
      category: z.enum([
        "typosquat",
        "postinstall-script",
        "scope-change",
        "unmaintained",
        "excessive-permissions",
        "known-vulnerability",
        "suspicious-version",
        "obfuscated-code",
      ]),
      title: z.string(),
      description: z.string(),
      remediation: z.string(),
    })
  ),
  riskScore: z.enum(["critical", "high", "medium", "low", "none"]),
  summary: z.string(),
  stats: z.object({
    totalDeps: z.number(),
    totalDevDeps: z.number(),
    risksFound: z.number(),
  }),
});

export type DepsResult = z.infer<typeof depsResultSchema>;

const SYSTEM_PROMPT = `You are a supply chain security analyst specializing in npm/Node.js ecosystem threats. Analyze package.json dependencies for supply chain risks.

Check for these threat categories:

**Typosquatting**
- Package names that are near-misspellings of popular packages
- Scoped packages that mimic unscoped popular ones (e.g., @user/lodash)

**Postinstall Scripts**
- Dependencies that run scripts during installation (postinstall, preinstall, prepare)
- These are a primary vector for supply chain attacks

**Scope Changes**
- Packages that recently moved from unscoped to scoped or vice versa
- Ownership transfers on popular packages

**Unmaintained Packages**
- Very old version ranges that suggest abandoned packages
- Packages with known successors (e.g., request → got/node-fetch)

**Excessive Permissions**
- Packages that shouldn't need network/filesystem access based on their purpose
- Utility packages with suspiciously broad dependency trees

**Known Vulnerabilities**
- Packages or version ranges with known CVEs
- Outdated versions with published security advisories

**Suspicious Versioning**
- Exact pinning to unusual patch versions (could indicate hijacked releases)
- Pre-release versions in production dependencies

For each risk:
- Classify severity based on exploitability and blast radius
- Explain specifically why this is suspicious
- Provide a concrete remediation (upgrade, replace, or remove)

If dependencies look clean, return an empty risks array with riskScore "none".`;

function buildUserMessage(packageJson: string, lockContent?: string): string {
  const parts = ["Analyze this package.json for supply chain risks:\n"];
  parts.push("```json");
  parts.push(packageJson);
  parts.push("```\n");

  if (lockContent) {
    // Only send a truncated portion of the lock file to stay within token limits
    const truncated = lockContent.slice(0, 20_000);
    parts.push("Partial package-lock.json (first 20KB for context):\n");
    parts.push("```json");
    parts.push(truncated);
    parts.push("```\n");
  }

  return parts.join("\n");
}

export async function runDepsScan(
  path: string,
  apiKey: string,
  model: string,
): Promise<DepsResult> {
  const absPath = resolve(path);
  const pkgPath = absPath.endsWith("package.json")
    ? absPath
    : resolve(absPath, "package.json");

  if (!existsSync(pkgPath)) {
    return {
      risks: [],
      riskScore: "none",
      summary: `No package.json found at ${pkgPath}`,
      stats: { totalDeps: 0, totalDevDeps: 0, risksFound: 0 },
    };
  }

  const packageJson = readFileSync(pkgPath, "utf-8");
  const pkg = JSON.parse(packageJson);

  // Try to find lock file for extra context
  const lockPath = resolve(pkgPath, "..", "package-lock.json");
  const lockContent = existsSync(lockPath)
    ? readFileSync(lockPath, "utf-8")
    : undefined;

  const client = new Anthropic({ apiKey });
  const jsonSchema = zodToJsonSchema(depsResultSchema);

  const response = await client.messages.create({
    model,
    max_tokens: 8192,
    temperature: 1,
    thinking: { type: "adaptive" as const },
    system: [
      {
        type: "text" as const,
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" as const },
      },
    ],
    messages: [{ role: "user", content: buildUserMessage(packageJson, lockContent) }],
    output_config: {
      format: {
        type: "json_schema" as const,
        schema: jsonSchema as Record<string, unknown>,
      },
    },
  });

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n");

  const result = depsResultSchema.parse(JSON.parse(text));
  result.stats = {
    totalDeps: Object.keys(pkg.dependencies ?? {}).length,
    totalDevDeps: Object.keys(pkg.devDependencies ?? {}).length,
    risksFound: result.risks.length,
  };

  return result;
}

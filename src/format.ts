const RISK_EMOJI: Record<string, string> = {
  critical: "💀 critical",
  high: "🔴 high",
  medium: "🟠 medium",
  low: "🟡 low",
  none: "🟢 none",
};

export function riskEmoji(score: string): string {
  return RISK_EMOJI[score] ?? score;
}

export function securityBadge(riskScore: string): string | null {
  if (riskScore !== "none") return null;
  return `\n---\n✅ Reviewed by PatchPilots — OWASP Clean\n\nBadge for your README:\n\`\`\`markdown\n[![Reviewed by PatchPilots](https://img.shields.io/badge/reviewed%20by-PatchPilots%20🔒-blueviolet)](https://github.com/alavesa/patchpilots)\n\`\`\``;
}

export function designBadge(healthScore: string): string | null {
  if (healthScore !== "none") return null;
  return `\n---\n✅ Reviewed by PatchPilots — WCAG 2.1 AA Clean\n\nBadge for your README:\n\`\`\`markdown\n[![Reviewed by PatchPilots](https://img.shields.io/badge/reviewed%20by-PatchPilots%20🎨-blueviolet)](https://github.com/alavesa/patchpilots)\n\`\`\``;
}

export function depsBadge(riskScore: string): string | null {
  if (riskScore !== "none") return null;
  return `\n---\n✅ Reviewed by PatchPilots — Supply Chain Clean\n\nBadge for your README:\n\`\`\`markdown\n[![Reviewed by PatchPilots](https://img.shields.io/badge/reviewed%20by-PatchPilots%20📦-blueviolet)](https://github.com/alavesa/patchpilots)\n\`\`\``;
}

import { readFileSync, statSync } from "node:fs";
import { resolve, extname, relative } from "node:path";
import { glob } from "glob";

export interface FileContent {
  path: string;
  content: string;
  language: string;
}

const LANGUAGE_MAP: Record<string, string> = {
  ".ts": "typescript",
  ".tsx": "typescript",
  ".js": "javascript",
  ".jsx": "javascript",
  ".py": "python",
  ".go": "go",
  ".rs": "rust",
  ".java": "java",
  ".rb": "ruby",
  ".php": "php",
  ".c": "c",
  ".cpp": "cpp",
  ".h": "c",
  ".hpp": "cpp",
  ".cs": "csharp",
  ".swift": "swift",
  ".kt": "kotlin",
  ".html": "html",
  ".css": "css",
  ".scss": "scss",
  ".vue": "vue",
  ".svelte": "svelte",
};

const INCLUDE = ["**/*.ts", "**/*.js", "**/*.tsx", "**/*.jsx", "**/*.py", "**/*.go", "**/*.rs", "**/*.java", "**/*.html", "**/*.css"];
const EXCLUDE = ["node_modules/**", "dist/**", ".git/**", "*.min.js", "*.bundle.js"];
const MAX_FILE_SIZE = 100_000;
const MAX_FILES = 20;

function inferLanguage(filePath: string): string {
  return LANGUAGE_MAP[extname(filePath)] ?? "plaintext";
}

export async function collectFiles(targetPath: string): Promise<FileContent[]> {
  const absPath = resolve(targetPath);
  const stat = statSync(absPath);

  if (stat.isFile()) {
    const content = readFileSync(absPath, "utf-8");
    return [{ path: relative(process.cwd(), absPath), content, language: inferLanguage(absPath) }];
  }

  const matches = await glob(INCLUDE, {
    cwd: absPath,
    ignore: EXCLUDE,
    nodir: true,
    absolute: true,
  });

  const files: FileContent[] = [];

  for (const match of matches) {
    if (files.length >= MAX_FILES) break;

    try {
      const fileStat = statSync(match);
      if (fileStat.size > MAX_FILE_SIZE) continue;

      const content = readFileSync(match, "utf-8");
      files.push({
        path: relative(process.cwd(), match),
        content,
        language: inferLanguage(match),
      });
    } catch {
      // Skip unreadable files
    }
  }

  return files;
}

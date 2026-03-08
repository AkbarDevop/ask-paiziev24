import * as fs from "fs";
import * as path from "path";

const DEFAULT_CHUNK_SIZE = 600;
const DEFAULT_CHUNK_OVERLAP = 100;
const CHARS_PER_TOKEN = 4;

type ChunkOptions = {
  chunkSize?: number;
  chunkOverlap?: number;
};

export function loadLocalEnv(filename = ".env.local"): void {
  const envPath = path.join(process.cwd(), filename);
  if (!fs.existsSync(envPath)) return;

  const raw = fs.readFileSync(envPath, "utf-8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    if (!key) continue;

    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    value = value.replace(/\\n/g, "\n");

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

export function parseCliArgs(argv = process.argv.slice(2)): Record<string, string | boolean> {
  const args: Record<string, string | boolean> = {};

  for (const arg of argv) {
    if (!arg.startsWith("--")) continue;

    const withoutPrefix = arg.slice(2);
    const separatorIndex = withoutPrefix.indexOf("=");

    if (separatorIndex === -1) {
      args[withoutPrefix] = true;
      continue;
    }

    const key = withoutPrefix.slice(0, separatorIndex);
    const value = withoutPrefix.slice(separatorIndex + 1);
    args[key] = value;
  }

  return args;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function collectFilesRecursive(
  rootDir: string,
  extensions = new Set([".txt", ".md"])
): string[] {
  if (!fs.existsSync(rootDir)) return [];

  const files: string[] = [];

  function walk(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;

      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }

      if (extensions.has(path.extname(entry.name).toLowerCase())) {
        files.push(fullPath);
      }
    }
  }

  walk(rootDir);
  return files.sort();
}

export function chunkText(text: string, options: ChunkOptions = {}): string[] {
  const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const chunkOverlap = options.chunkOverlap ?? DEFAULT_CHUNK_OVERLAP;
  const chunkChars = chunkSize * CHARS_PER_TOKEN;
  const overlapChars = chunkOverlap * CHARS_PER_TOKEN;
  const chunks: string[] = [];

  let start = 0;
  while (start < text.length) {
    let end = start + chunkChars;

    if (end < text.length) {
      const slice = text.slice(start, end + 200);
      const paragraphBreak = slice.lastIndexOf("\n\n");
      const sentenceBreak = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf("! "), slice.lastIndexOf("? "));

      if (paragraphBreak > chunkChars * 0.7) {
        end = start + paragraphBreak + 2;
      } else if (sentenceBreak > chunkChars * 0.7) {
        end = start + sentenceBreak + 2;
      }
    }

    const chunk = text.slice(start, end).trim();
    if (chunk.length > 50) {
      chunks.push(chunk);
    }

    start = end - overlapChars;
  }

  return chunks;
}

export function detectLanguageHeuristic(text: string): "en" | "uz" | "ru" {
  const normalized = ` ${text.toLowerCase()} `;
  const cyrillicCount = (text.match(/\p{Script=Cyrillic}/gu) || []).length;

  if (cyrillicCount >= 20) {
    return "ru";
  }

  const uzHints = [
    " uchun ",
    " bilan ",
    " bugun ",
    " qanday ",
    " nima ",
    " bozor ",
    " startap ",
    " jamoa ",
    " kompaniya ",
    " men ",
    " siz ",
    " yangi ",
  ];

  const enHints = [
    " the ",
    " and ",
    " with ",
    " startup ",
    " team ",
    " product ",
    " founder ",
    " market ",
    " customer ",
    " ai ",
  ];

  const uzScore = uzHints.reduce((score, hint) => score + (normalized.includes(hint) ? 1 : 0), 0);
  const enScore = enHints.reduce((score, hint) => score + (normalized.includes(hint) ? 1 : 0), 0);

  if (uzScore > enScore) return "uz";
  if (enScore > uzScore) return "en";

  return /[A-Za-z]/.test(text) ? "uz" : "en";
}

export function decodeHtmlEntities(input: string): string {
  const namedEntities: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
  };

  return input
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (match, name) => namedEntities[name.toLowerCase()] ?? match);
}

export function sanitizeUnicode(input: string): string {
  let output = "";

  for (let index = 0; index < input.length; index += 1) {
    const code = input.charCodeAt(index);

    if (code === 0) {
      continue;
    }

    if (code >= 0xd800 && code <= 0xdbff) {
      const nextCode = input.charCodeAt(index + 1);
      if (nextCode >= 0xdc00 && nextCode <= 0xdfff) {
        output += input[index] + input[index + 1];
        index += 1;
      }
      continue;
    }

    if (code >= 0xdc00 && code <= 0xdfff) {
      continue;
    }

    output += input[index];
  }

  return output;
}

export function htmlToPlainText(html: string): string {
  const withBreaks = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href: string, inner: string) => {
      const text = decodeHtmlEntities(inner.replace(/<[^>]+>/g, "").trim());
      if (!text) return href;
      if (text === href || text.startsWith("@")) return text;
      return `${text} (${href})`;
    })
    .replace(/<\/?(strong|b)>/gi, "")
    .replace(/<\/?(em|i)>/gi, "")
    .replace(/<[^>]+>/g, "");

  return sanitizeUnicode(
    decodeHtmlEntities(withBreaks)
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
  );
}

export function parseStructuredDocument(raw: string): {
  metadata: Record<string, string>;
  body: string;
} {
  const lines = raw.replace(/\r/g, "").split("\n");
  const metadata: Record<string, string> = {};
  let index = 0;

  while (index < lines.length) {
    const line = lines[index].trim();
    if (!line) {
      index += 1;
      break;
    }

    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) break;

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    if (!key || !value) break;

    metadata[key] = value;
    index += 1;
  }

  return {
    metadata,
    body: sanitizeUnicode(lines.slice(index).join("\n").trim()),
  };
}

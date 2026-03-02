/**
 * Data ingestion script: reads text files from data/ directory,
 * chunks them, and inserts into Supabase.
 *
 * Usage:
 *   npx tsx scripts/chunk-and-embed.ts
 *
 * Place your source text files in a data/ directory at the project root.
 * Each file should be named like: interview_the-tech.txt, article_tribune.txt, etc.
 * The part before the underscore becomes the source_type.
 *
 * Embedding generation uses Gemini text-embedding-004 (free, 768D).
 * Requires GOOGLE_GENERATIVE_AI_API_KEY in environment.
 */

import { createClient } from "@supabase/supabase-js";
import { embedMany } from "ai";
import { google } from "@ai-sdk/google";
import * as fs from "fs";
import * as path from "path";

// --- Config ---
const CHUNK_SIZE = 600; // target tokens per chunk (approx 4 chars/token)
const CHUNK_OVERLAP = 100;
const CHARS_PER_TOKEN = 4;
const DATA_DIR = path.join(process.cwd(), "data");

// --- Supabase client (service role for inserts) ---
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
  );
  console.error("Make sure .env.local is loaded. Run with:");
  console.error(
    '  source <(grep -v "^#" .env.local | grep "=" | sed \'s/^/export /\') && npx tsx scripts/chunk-and-embed.ts'
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// --- Gemini embeddings (free, 768D) ---
let embedBatch: ((texts: string[]) => Promise<number[][]>) | null = null;

async function initEmbeddings() {
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    const model = google.embedding("gemini-embedding-001");
    const providerOptions = { google: { outputDimensionality: 768 } };
    embedBatch = async (texts: string[]) => {
      const { embeddings } = await embedMany({ model, values: texts, providerOptions });
      return embeddings;
    };
    console.log("Embeddings: ENABLED (Gemini gemini-embedding-001, 768D)\n");
  } else {
    console.log(
      "Embeddings: DISABLED (no GOOGLE_GENERATIVE_AI_API_KEY)\n"
    );
  }
}

// --- Chunking ---
function chunkText(text: string): string[] {
  const chunkChars = CHUNK_SIZE * CHARS_PER_TOKEN;
  const overlapChars = CHUNK_OVERLAP * CHARS_PER_TOKEN;
  const chunks: string[] = [];

  let start = 0;
  while (start < text.length) {
    let end = start + chunkChars;

    // Try to break at a paragraph or sentence boundary
    if (end < text.length) {
      const slice = text.slice(start, end + 200);
      const paragraphBreak = slice.lastIndexOf("\n\n");
      const sentenceBreak = slice.lastIndexOf(". ");

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

// --- Source type from filename ---
function parseFilename(filename: string): {
  sourceType: string;
  sourceUrl: string | null;
  language: string;
} {
  // Handle youtube/ subdirectory files
  if (filename.startsWith("youtube/") || filename.startsWith("youtube\\")) {
    return { sourceType: "youtube", sourceUrl: null, language: "uz" };
  }

  const name = path.basename(filename, path.extname(filename));
  const parts = name.split("_");
  const sourceType = parts[0] || "article";
  const language = parts.includes("uz") ? "uz" : "en";

  return { sourceType, sourceUrl: null, language };
}

function extractUrl(content: string): string | null {
  const match = content.match(/URL:\s*(https?:\/\/\S+)/);
  return match ? match[1] : null;
}

function detectLanguage(content: string): string | null {
  const match = content.match(/Language:\s*(\S+)/);
  if (match) {
    const lang = match[1].toLowerCase();
    if (lang.includes("russian") || lang === "ru") return "ru";
    if (lang.includes("english") || lang === "en") return "en";
  }
  return null;
}

// --- Main ---
async function main() {
  await initEmbeddings();

  if (!fs.existsSync(DATA_DIR)) {
    console.log(`Creating data/ directory at ${DATA_DIR}`);
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log(
      "Place your source text files in data/ and run this script again."
    );
    return;
  }

  // Collect files from data/ and data/youtube/
  const topFiles = fs
    .readdirSync(DATA_DIR)
    .filter((f) => f.endsWith(".txt") || f.endsWith(".md"))
    .map((f) => path.join(DATA_DIR, f));

  const ytDir = path.join(DATA_DIR, "youtube");
  const ytFiles = fs.existsSync(ytDir)
    ? fs
        .readdirSync(ytDir)
        .filter((f) => f.endsWith(".txt"))
        .map((f) => path.join(ytDir, f))
    : [];

  const allFiles = [...topFiles, ...ytFiles];

  if (allFiles.length === 0) {
    console.log("No .txt or .md files found in data/ directory.");
    return;
  }

  console.log(`Found ${allFiles.length} file(s) to process (${topFiles.length} top-level + ${ytFiles.length} youtube).\n`);

  // Clear existing data to avoid duplicates on re-ingestion
  console.log("Clearing existing documents...");
  const { error: delError } = await supabase.from("documents").delete().gte("id", 0);
  if (delError) {
    console.error(`Warning: could not clear existing data: ${delError.message}`);
  } else {
    console.log("Cleared existing documents.\n");
  }

  let totalChunks = 0;

  for (const filePath of allFiles) {
    const file = path.relative(DATA_DIR, filePath);
    const content = fs.readFileSync(filePath, "utf-8");
    const parsed = parseFilename(file);
    const sourceType = parsed.sourceType;
    const language = detectLanguage(content) || parsed.language;
    const sourceUrl = extractUrl(content);

    console.log(
      `Processing: ${file} (type: ${sourceType}, lang: ${language})`
    );

    const chunks = chunkText(content);
    console.log(`  → ${chunks.length} chunks`);

    // Process in batches of 20
    const BATCH_SIZE = 20;
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);

      // Generate embeddings if available (gracefully skip on quota errors)
      let embeddings: number[][] | null = null;
      if (embedBatch) {
        try {
          embeddings = await embedBatch(batch);
        } catch {
          console.log("  Embedding quota exceeded — inserting without embeddings");
          embedBatch = null; // Disable for remaining batches
        }
      }

      const rows = batch.map((chunk, j) => ({
        content: chunk,
        embedding: embeddings ? JSON.stringify(embeddings[j]) : null,
        source_type: sourceType,
        source_url: sourceUrl,
        language,
        metadata: { file, chunk_index: i + j },
      }));

      const { error } = await supabase.from("documents").insert(rows);
      if (error) {
        console.error(`  Error inserting batch: ${error.message}`);
      } else {
        console.log(
          `  Inserted batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(chunks.length / BATCH_SIZE)}`
        );
      }
    }

    totalChunks += chunks.length;
  }

  console.log(`\nDone! Inserted ${totalChunks} total chunks.`);
}

main().catch(console.error);

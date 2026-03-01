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
 * Embedding generation is optional — set OPENAI_API_KEY to enable.
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// --- Config ---
const CHUNK_SIZE = 600; // target tokens per chunk (approx 4 chars/token)
const CHUNK_OVERLAP = 100;
const CHARS_PER_TOKEN = 4;
const DATA_DIR = path.join(process.cwd(), "data");

// --- Supabase client (service role for inserts) ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
  );
  console.error("Make sure .env.local is loaded. Run with:");
  console.error(
    '  source <(grep -v "^#" .env.local | grep "=" | sed \'s/^/export /\') && npx tsx scripts/chunk-and-embed.ts'
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// --- Optional: OpenAI for embeddings ---
let embedBatch: ((texts: string[]) => Promise<number[][]>) | null = null;

async function initEmbeddings() {
  if (process.env.OPENAI_API_KEY) {
    const { default: OpenAI } = await import("openai");
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    embedBatch = async (texts: string[]) => {
      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: texts,
      });
      return response.data.map((d) => d.embedding);
    };
    console.log("Embeddings: ENABLED (OpenAI text-embedding-3-small)\n");
  } else {
    console.log("Embeddings: DISABLED (no OPENAI_API_KEY — text-only mode)\n");
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
  const name = path.basename(filename, path.extname(filename));
  const parts = name.split("_");
  const sourceType = parts[0] || "article";
  const language = parts.includes("uz") ? "uz" : "en";

  // Try to extract URL from first line of file
  return { sourceType, sourceUrl: null, language };
}

function extractUrl(content: string): string | null {
  const match = content.match(/URL:\s*(https?:\/\/\S+)/);
  return match ? match[1] : null;
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

  const files = fs
    .readdirSync(DATA_DIR)
    .filter((f) => f.endsWith(".txt") || f.endsWith(".md"));

  if (files.length === 0) {
    console.log("No .txt or .md files found in data/ directory.");
    return;
  }

  console.log(`Found ${files.length} file(s) to process.\n`);

  let totalChunks = 0;

  for (const file of files) {
    const filePath = path.join(DATA_DIR, file);
    const content = fs.readFileSync(filePath, "utf-8");
    const { sourceType, language } = parseFilename(file);
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

      // Generate embeddings if available
      let embeddings: number[][] | null = null;
      if (embedBatch) {
        embeddings = await embedBatch(batch);
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

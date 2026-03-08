import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";
import {
  chunkText,
  loadLocalEnv,
  parseCliArgs,
  parseStructuredDocument,
  sanitizeUnicode,
  sleep,
} from "./lib/ingestion-utils";
import { getGeminiEmbeddings } from "./lib/gemini-embeddings";

const DEFAULT_CHANNEL = "paiziev24";
const DEFAULT_BATCH_SIZE = 20;
const MAX_RETRIES = 4;
const RETRY_BASE_DELAY_MS = 1200;

type Row = {
  content: string;
  embedding: string | null;
  source_type: "telegram_post";
  source_url: string;
  language: "en" | "uz" | "ru";
  metadata: Record<string, string | number>;
};

function getStringArg(
  args: Record<string, string | boolean>,
  key: string,
  fallback: string
): string {
  const value = args[key];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function getNumberArg(
  args: Record<string, string | boolean>,
  key: string,
  fallback: number
): number {
  const value = args[key];
  if (typeof value !== "string") return fallback;

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function buildChunkContent(
  channel: string,
  postId: string,
  publishedAt: string,
  url: string,
  textChunk: string
): string {
  return sanitizeUnicode([
    `Telegram channel post from @${channel}`,
    `Post ID: ${postId}`,
    `Date: ${publishedAt}`,
    `URL: ${url}`,
    "",
    textChunk,
  ].join("\n"));
}

async function withRetry<T>(label: string, fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === MAX_RETRIES) break;

      const delayMs = RETRY_BASE_DELAY_MS * attempt;
      console.warn(`${label} failed (attempt ${attempt}/${MAX_RETRIES}). Retrying in ${delayMs}ms...`);
      await sleep(delayMs);
    }
  }

  throw lastError;
}

async function main() {
  const args = parseCliArgs();
  const channel = getStringArg(args, "channel", DEFAULT_CHANNEL);
  const batchSize = getNumberArg(args, "batch-size", DEFAULT_BATCH_SIZE);
  const dryRun = args["dry-run"] === true;

  loadLocalEnv();

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const googleApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  }

  if (!googleApiKey && !dryRun) {
    throw new Error("Missing GOOGLE_GENERATIVE_AI_API_KEY in .env.local");
  }

  const inputDir = path.join(process.cwd(), "data", "telegram_posts", channel);
  if (!fs.existsSync(inputDir)) {
    throw new Error(
      `No Telegram post files found in ${path.relative(process.cwd(), inputDir)}. Run fetch-telegram-channel.ts first.`
    );
  }

  const files = fs
    .readdirSync(inputDir)
    .filter((file) => file.endsWith(".md"))
    .sort();

  if (files.length === 0) {
    throw new Error(`No Markdown post files found in ${path.relative(process.cwd(), inputDir)}.`);
  }

  const rows: Omit<Row, "embedding">[] = [];

  for (const file of files) {
    const fullPath = path.join(inputDir, file);
    const raw = fs.readFileSync(fullPath, "utf-8");
    const { metadata, body } = parseStructuredDocument(raw);

    const url = metadata.URL;
    const publishedAt = metadata.Date;
    const postId = metadata["Post ID"];
    const language = (metadata.Language || "uz") as "en" | "uz" | "ru";

    if (!url || !publishedAt || !postId || !body) {
      console.warn(`Skipping malformed file: ${file}`);
      continue;
    }

    const textChunks = chunkText(body, {
      chunkSize: 450,
      chunkOverlap: 75,
    });

    for (let index = 0; index < textChunks.length; index += 1) {
      rows.push({
        content: buildChunkContent(channel, postId, publishedAt, url, textChunks[index]),
        source_type: "telegram_post",
        source_url: url,
        language,
        metadata: {
          channel,
          file: sanitizeUnicode(file),
          post_id: Number(postId),
          published_at: sanitizeUnicode(publishedAt),
          views: sanitizeUnicode(metadata.Views ?? ""),
          chunk_index: index,
        },
      });
    }
  }

  if (rows.length === 0) {
    throw new Error(`No valid Telegram chunks were generated from ${files.length} files.`);
  }

  console.log(`Prepared ${rows.length} chunks from ${files.length} Telegram posts.`);

  if (dryRun) {
    console.log("Dry run complete. No database changes were made.");
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log(`Deleting existing telegram_post rows for @${channel}...`);
  const { error: deleteError } = await supabase
    .from("documents")
    .delete()
    .eq("source_type", "telegram_post")
    .like("source_url", `https://t.me/${channel}/%`);

  if (deleteError) {
    throw new Error(`Failed to clear previous Telegram posts: ${deleteError.message}`);
  }

  for (let index = 0; index < rows.length; index += batchSize) {
    const batch = rows.slice(index, index + batchSize);
    const embeddings = await withRetry("Telegram embedding batch", () =>
      getGeminiEmbeddings(
        batch.map((row) => row.content),
        {
          outputDimensionality: 768,
          taskType: "RETRIEVAL_DOCUMENT",
          title: "Akmal Paiziev Telegram post",
        }
      )
    );

    const insertRows: Row[] = batch.map((row, rowIndex) => ({
      ...row,
      embedding: JSON.stringify(embeddings[rowIndex]),
    }));

    await withRetry("Telegram insert batch", async () => {
      const { error } = await supabase.from("documents").insert(insertRows);
      if (error) {
        throw new Error(error.message);
      }
    });

    console.log(
      `Inserted batch ${Math.floor(index / batchSize) + 1}/${Math.ceil(rows.length / batchSize)}`
    );

    await sleep(150);
  }

  console.log(`Imported ${rows.length} Telegram chunks into Supabase.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

/**
 * Backfill embeddings for existing documents that have embedding = NULL.
 * Uses Gemini text-embedding-004 (free, 768D).
 *
 * Usage:
 *   source <(grep -v "^#" .env.local | grep "=" | sed 's/^/export /') && npx tsx scripts/backfill-embeddings.ts
 */

import { createClient } from "@supabase/supabase-js";
import { embedMany } from "ai";
import { google } from "@ai-sdk/google";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
  console.error("Missing GOOGLE_GENERATIVE_AI_API_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const model = google.embedding("gemini-embedding-001");
const providerOptions = { google: { outputDimensionality: 768 } };
const BATCH_SIZE = 20;

async function main() {
  // Fetch all rows with NULL embeddings
  const { data: rows, error } = await supabase
    .from("documents")
    .select("id, content")
    .is("embedding", null)
    .order("id");

  if (error) {
    console.error("Failed to fetch documents:", error.message);
    process.exit(1);
  }

  if (!rows || rows.length === 0) {
    console.log("All documents already have embeddings.");
    return;
  }

  console.log(`Found ${rows.length} documents without embeddings.\n`);

  let updated = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const texts = batch.map((r) => r.content);

    try {
      const { embeddings } = await embedMany({ model, values: texts, providerOptions });

      // Update each row
      for (let j = 0; j < batch.length; j++) {
        const { error: updateErr } = await supabase
          .from("documents")
          .update({ embedding: JSON.stringify(embeddings[j]) })
          .eq("id", batch[j].id);

        if (updateErr) {
          console.error(
            `  Error updating id=${batch[j].id}: ${updateErr.message}`
          );
        } else {
          updated++;
        }
      }

      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(rows.length / BATCH_SIZE);
      console.log(
        `Batch ${batchNum}/${totalBatches} done (${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length})`
      );
    } catch (err) {
      const msg = String(err);
      if (msg.includes("quota") || msg.includes("rate") || msg.includes("429")) {
        console.log(`\n  Quota/rate limit hit after ${updated} embeddings. Run again later.`);
        break;
      }
      console.error(`  Embedding API error on batch ${i}:`, msg.slice(0, 200));
    }

    // Delay to stay within Gemini free tier rate limit
    // Each batch of 20 texts = 20 embed requests. Free tier ~1500/min but daily cap too.
    await new Promise((r) => setTimeout(r, 4000));
  }

  console.log(`\nBackfill complete. Updated ${updated}/${rows.length} documents.`);
}

main().catch(console.error);

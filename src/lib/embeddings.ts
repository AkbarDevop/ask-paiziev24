import { embed, embedMany } from "ai";
import { google } from "@ai-sdk/google";

const embeddingModel = google.embedding("gemini-embedding-001");

const providerOptions = {
  google: { outputDimensionality: 768 },
};

/**
 * Generate embedding for a single text string.
 * Returns a 768-dimensional vector (Gemini gemini-embedding-001).
 */
export async function getEmbedding(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: embeddingModel,
    value: text,
    providerOptions,
  });
  return embedding;
}

/**
 * Generate embeddings for multiple texts in batch.
 * Returns array of 768-dimensional vectors.
 */
export async function getEmbeddings(texts: string[]): Promise<number[][]> {
  const { embeddings } = await embedMany({
    model: embeddingModel,
    values: texts,
    providerOptions,
  });
  return embeddings;
}

type EmbeddingTaskType =
  | "RETRIEVAL_QUERY"
  | "RETRIEVAL_DOCUMENT"
  | "SEMANTIC_SIMILARITY"
  | "CLASSIFICATION"
  | "CLUSTERING"
  | "QUESTION_ANSWERING"
  | "FACT_VERIFICATION"
  | "CODE_RETRIEVAL_QUERY";

type EmbedOptions = {
  outputDimensionality?: number;
  taskType?: EmbeddingTaskType;
  title?: string;
};

const GEMINI_EMBED_MODEL = "models/gemini-embedding-001";
const GEMINI_EMBED_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:batchEmbedContents";

export async function getGeminiEmbeddings(
  texts: string[],
  options: EmbedOptions = {}
): Promise<number[][]> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GOOGLE_GENERATIVE_AI_API_KEY");
  }

  if (texts.length === 0) {
    return [];
  }

  const response = await fetch(GEMINI_EMBED_ENDPOINT, {
    method: "POST",
    signal: AbortSignal.timeout(30_000),
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      requests: texts.map((text) => ({
        model: GEMINI_EMBED_MODEL,
        content: {
          parts: [{ text }],
        },
        taskType: options.taskType ?? "RETRIEVAL_DOCUMENT",
        title: options.title,
        outputDimensionality: options.outputDimensionality ?? 768,
      })),
    }),
  });

  const payload = (await response.json()) as {
    embeddings?: Array<{ values?: number[] }>;
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(payload.error?.message || `Gemini embedding request failed (${response.status})`);
  }

  const embeddings = payload.embeddings?.map((embedding) => embedding.values || []) || [];
  if (embeddings.length !== texts.length || embeddings.some((embedding) => embedding.length === 0)) {
    throw new Error("Gemini returned an invalid embedding payload");
  }

  return embeddings;
}

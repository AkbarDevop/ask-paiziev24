import { createUIMessageStreamResponse, createUIMessageStream, streamText } from "ai";
import { google } from "@ai-sdk/google";
import { getSupabase } from "@/lib/supabase";
import { getEmbedding } from "@/lib/embeddings";
import { AKMAL_SYSTEM_PROMPT } from "@/lib/prompts";

export const maxDuration = 60;

// --- Rate limiter (in-memory, per-IP, resets on redeploy) ---
const rateMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 30; // max requests
const RATE_WINDOW = 60_000; // per 60 seconds

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT;
}

// --- Input sanitization ---
const MAX_MESSAGE_LENGTH = 2000;
const MAX_MESSAGES = 50;

function sanitizeInput(body: unknown): {
  ok: true;
  messages: { role: "user" | "assistant"; content: string }[];
} | { ok: false; error: string } {
  if (!body || typeof body !== "object" || !Array.isArray((body as { messages?: unknown }).messages)) {
    return { ok: false, error: "Invalid request body" };
  }

  const raw = (body as { messages: unknown[] }).messages;

  if (raw.length > MAX_MESSAGES) {
    return { ok: false, error: `Too many messages (max ${MAX_MESSAGES})` };
  }

  const messages = raw.map(
    (m: unknown) => {
      const msg = m as {
        role?: string;
        content?: string;
        parts?: { type: string; text: string }[];
      };
      const role = msg.role === "assistant" ? "assistant" as const : "user" as const;
      let content =
        typeof msg.content === "string"
          ? msg.content
          : (msg.parts
              ?.filter((p) => p.type === "text")
              .map((p) => p.text)
              .join("") ?? "");

      // Truncate overly long messages
      if (content.length > MAX_MESSAGE_LENGTH) {
        content = content.slice(0, MAX_MESSAGE_LENGTH);
      }

      return { role, content };
    }
  );

  return { ok: true, messages };
}

// --- Keyword extraction (safe, alphanumeric only) ---
const stopWords = new Set([
  "what", "how", "why", "when", "where", "who", "did", "do", "does", "is",
  "are", "was", "were", "the", "a", "an", "and", "or", "but", "in", "on",
  "at", "to", "for", "of", "with", "by", "from", "you", "your", "about",
  "can", "could", "would", "should", "tell", "me", "us", "it", "its",
  "that", "this", "have", "has", "had", "been", "be", "will", "shall",
]);

function buildRetrievalQuery(
  messages: { role: "user" | "assistant"; content: string }[]
): string {
  const recentUserMessages = messages
    .filter((message) => message.role === "user")
    .slice(-3)
    .map((message) => message.content.trim())
    .filter(Boolean);

  return recentUserMessages.join("\n");
}

function extractKeywords(text: string): string[] {
  const words = text.toLowerCase().match(/[\p{L}\p{N}]{3,30}/gu) ?? [];

  return [...new Set(words)]
    .filter((word) => !stopWords.has(word))
    .slice(0, 12);
}

type Chunk = {
  content: string;
  source_type: string;
  source_url: string;
};

function selectContextChunks(chunks: Chunk[]): Chunk[] {
  const deduped: Chunk[] = [];
  const seen = new Set<string>();

  for (const chunk of chunks) {
    const dedupeKey = `${chunk.source_url}::${chunk.content}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    deduped.push(chunk);
  }

  const selected: Chunk[] = [];
  const sourceCounts = new Map<string, number>();
  const typeCounts = new Map<string, number>();
  const preferredTelegram = deduped.filter((chunk) =>
    ["telegram", "telegram_post"].includes(chunk.source_type)
  );

  function tryAdd(chunk: Chunk): boolean {
    const sourceKey = chunk.source_url || chunk.source_type;
    const perSource = sourceCounts.get(sourceKey) || 0;
    const perType = typeCounts.get(chunk.source_type) || 0;

    if (perSource >= 2 || perType >= 5) {
      return false;
    }

    selected.push(chunk);
    sourceCounts.set(sourceKey, perSource + 1);
    typeCounts.set(chunk.source_type, perType + 1);
    return true;
  }

  for (const chunk of preferredTelegram) {
    if (selected.length >= 2) break;
    tryAdd(chunk);
  }

  for (const chunk of deduped) {
    if (selected.length >= 12) break;
    tryAdd(chunk);
  }

  return selected;
}

function getSourceTitle(sourceType: string, url: string): string {
  if (sourceType === "telegram_post") {
    const postId = url.match(/\/(\d+)(?:\?|$)/)?.[1];
    return postId ? `Telegram #${postId}` : "Telegram";
  }

  return SOURCE_LABELS[sourceType] || sourceType;
}

// --- Source type labels ---
const SOURCE_LABELS: Record<string, string> = {
  youtube: "YouTube",
  youtube_transcript: "YouTube",
  interview: "Interview",
  article: "Article",
  bio: "Bio",
  telegram: "Telegram",
  telegram_post: "Telegram",
  linkedin_post: "LinkedIn",
};

export async function POST(req: Request) {
  // --- Rate limiting ---
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  if (isRateLimited(ip)) {
    return new Response(
      JSON.stringify({ error: "Too many requests. Please wait a moment." }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  // --- Validate & sanitize input ---
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const parsed = sanitizeInput(body);
  if (!parsed.ok) {
    return new Response(
      JSON.stringify({ error: parsed.error }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { messages } = parsed;
  const userMessage = messages[messages.length - 1]?.content || "";
  const retrievalQuery = buildRetrievalQuery(messages) || userMessage;

  // --- Fetch context: vector search (primary) + keyword fallback ---
  let chunks: Chunk[] | null = null;

  // 1. Try vector similarity search via match_documents RPC
  try {
    const queryEmbedding = await getEmbedding(retrievalQuery);

    const { data, error } = await getSupabase().rpc("match_documents", {
      query_embedding: JSON.stringify(queryEmbedding),
      match_threshold: 0.3,
      match_count: 24,
    });

    if (!error && data && data.length > 0) {
      chunks = data as Chunk[];
    }
  } catch (err) {
    console.error("Vector search failed, falling back to keyword search:", err);
  }

  // 2. Fallback: keyword ILIKE search
  if (!chunks || chunks.length < 3) {
    const keywords = extractKeywords(retrievalQuery);

    if (keywords.length > 0) {
      const orFilter = keywords
        .map((k) => `content.ilike.%${k}%`)
        .join(",");

      const { data } = await getSupabase()
        .from("documents")
        .select("content, source_type, source_url")
        .or(orFilter)
        .order("id")
        .limit(30);

      if (data && data.length > 0) {
        // Merge: vector results first, then keyword results (deduplicated)
        const existing = new Set((chunks || []).map((c) => c.content));
        const newChunks = (data as Chunk[]).filter((c) => !existing.has(c.content));
        chunks = [...(chunks || []), ...newChunks].slice(0, 24);
      }
    }

    // 3. Last resort: generic fallback
    if (!chunks || chunks.length < 3) {
      const { data: fallback } = await getSupabase()
        .from("documents")
        .select("content, source_type, source_url")
        .in("source_type", ["bio", "interview", "article", "telegram_post"])
        .order("id")
        .limit(15);
      chunks = [...(chunks || []), ...((fallback as Chunk[]) || [])];
    }
  }

  const selectedChunks = chunks?.length ? selectContextChunks(chunks) : [];

  // --- Build context ---
  const context = selectedChunks.length
    ? selectedChunks
        .map(
          (c) => `[Source: ${c.source_type}]\n${c.content}`
        )
        .join("\n\n---\n\n")
    : "No relevant context found.";

  const systemPrompt = AKMAL_SYSTEM_PROMPT.replace(
    "{retrieved_context}",
    context
  );

  // Collect unique sources for UI citations
  const uniqueSources: { id: string; type: string; url: string; title: string }[] = [];
  if (selectedChunks.length) {
    const seen = new Set<string>();
    for (const c of selectedChunks) {
      const sourceKey = c.source_url || c.source_type;
      if (!seen.has(sourceKey)) {
        seen.add(sourceKey);
        let url = c.source_url || "";
        if (["telegram", "telegram_post"].includes(c.source_type) && !url.startsWith("http")) {
          url = "https://t.me/paiziev24";
        }
        uniqueSources.push({
          id: `${c.source_type}:${sourceKey}`,
          type: c.source_type,
          url,
          title: getSourceTitle(c.source_type, url),
        });
      }

      if (uniqueSources.length >= 5) break;
    }
  }

  try {
    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        // Send source data for expandable UI toggle
        for (const src of uniqueSources) {
          writer.write({
            type: "source-url",
            sourceId: src.id,
            sourceType: src.type,
            url: src.url || src.type,
            title: src.title,
          });
        }

        const result = streamText({
          model: google("gemini-2.5-flash"),
          system: systemPrompt,
          messages,
        });

        writer.merge(result.toUIMessageStream());
      },
    });

    return createUIMessageStreamResponse({ stream });
  } catch (err) {
    console.error("LLM error:", err);
    return new Response(
      JSON.stringify({ error: "Something went wrong. Please try again." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

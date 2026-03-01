import { streamText } from "ai";
import { google } from "@ai-sdk/google";
import { getSupabase } from "@/lib/supabase";
import { AKMAL_SYSTEM_PROMPT } from "@/lib/prompts";

export const maxDuration = 60;

export async function POST(req: Request) {
  const body = await req.json();

  // Normalize messages from useChat v6 format
  const messages = body.messages.map(
    (m: {
      role: string;
      content?: string;
      parts?: { type: string; text: string }[];
    }) => ({
      role: m.role as "user" | "assistant",
      content:
        typeof m.content === "string"
          ? m.content
          : m.parts
              ?.filter((p: { type: string }) => p.type === "text")
              .map((p: { text: string }) => p.text)
              .join("") ?? "",
    })
  );

  const userMessage = messages[messages.length - 1]?.content || "";

  // Extract keywords from user message for filtering
  const stopWords = new Set([
    "what", "how", "why", "when", "where", "who", "did", "do", "does", "is",
    "are", "was", "were", "the", "a", "an", "and", "or", "but", "in", "on",
    "at", "to", "for", "of", "with", "by", "from", "you", "your", "about",
    "can", "could", "would", "should", "tell", "me", "us", "it", "its",
    "that", "this", "have", "has", "had", "been", "be", "will", "shall",
  ]);

  const keywords = userMessage
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((w: string) => w.length > 2 && !stopWords.has(w));

  // Fetch relevant chunks using keyword matching in SQL
  let chunks;
  if (keywords.length > 0) {
    // Build a text search query — find chunks containing any keyword
    const searchCondition = keywords
      .map((k: string) => `content ILIKE '%${k.replace(/'/g, "''")}%'`)
      .join(" OR ");

    const { data } = await getSupabase().rpc("search_documents", {
      search_query: searchCondition,
      result_limit: 20,
    });
    chunks = data;

    // If keyword search returns too few results, supplement with recent chunks
    if (!chunks || chunks.length < 5) {
      const { data: fallback } = await getSupabase()
        .from("documents")
        .select("content, source_type, source_url")
        .order("id")
        .limit(15);
      chunks = [...(chunks || []), ...(fallback || [])];
    }
  } else {
    // Generic question — return a mix of bio + key interview chunks
    const { data } = await getSupabase()
      .from("documents")
      .select("content, source_type, source_url")
      .in("source_type", ["bio", "interview", "article"])
      .order("id")
      .limit(15);
    chunks = data;
  }

  // Format context with source attribution
  const context = chunks?.length
    ? chunks
        .map(
          (c: { source_type: string; source_url: string; content: string }) =>
            `[Source: ${c.source_type}${c.source_url ? ` — ${c.source_url}` : ""}]\n${c.content}`
        )
        .join("\n\n---\n\n")
    : "No relevant context found.";

  const systemPrompt = AKMAL_SYSTEM_PROMPT.replace(
    "{retrieved_context}",
    context
  );

  const result = streamText({
    model: google("gemini-2.5-flash"),
    system: systemPrompt,
    messages,
  });

  return result.toUIMessageStreamResponse();
}

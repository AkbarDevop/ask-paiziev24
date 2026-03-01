import { streamText } from "ai";
import { google } from "@ai-sdk/google";
import { getSupabase } from "@/lib/supabase";
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

function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "") // strip everything except alphanumeric + space
    .split(/\s+/)
    .filter((w) => w.length > 2 && w.length < 30 && !stopWords.has(w))
    .slice(0, 10); // cap at 10 keywords
}

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
  const keywords = extractKeywords(userMessage);

  // --- Fetch context (safe parameterized queries via Supabase client) ---
  let chunks;
  if (keywords.length > 0) {
    // Build safe OR filter using Supabase's .or() — fully parameterized, no raw SQL
    const orFilter = keywords
      .map((k) => `content.ilike.%${k}%`)
      .join(",");

    const { data } = await getSupabase()
      .from("documents")
      .select("content, source_type, source_url")
      .or(orFilter)
      .order("id")
      .limit(20);
    chunks = data;

    // Supplement if too few results
    if (!chunks || chunks.length < 5) {
      const { data: fallback } = await getSupabase()
        .from("documents")
        .select("content, source_type, source_url")
        .order("id")
        .limit(15);
      chunks = [...(chunks || []), ...(fallback || [])];
    }
  } else {
    const { data } = await getSupabase()
      .from("documents")
      .select("content, source_type, source_url")
      .in("source_type", ["bio", "interview", "article"])
      .order("id")
      .limit(15);
    chunks = data;
  }

  // --- Build context ---
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

  try {
    const result = streamText({
      model: google("gemini-2.5-flash"),
      system: systemPrompt,
      messages,
    });

    return result.toUIMessageStreamResponse();
  } catch (err) {
    console.error("LLM error:", err);
    return new Response(
      JSON.stringify({ error: "Something went wrong. Please try again." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

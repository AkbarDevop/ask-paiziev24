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
const UZBEK_RESPONSE_PREFIX = /^\[Respond in Uzbek \/ O'zbek tilida javob bering\]\n/u;

function stripLanguageDirective(text: string): string {
  return text.replace(UZBEK_RESPONSE_PREFIX, "").trim();
}

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
  "know", "known", "anything", "anyone", "someone", "named", "person", "people",
  "latest", "recent", "recently", "lately", "last", "month", "months", "week",
  "weeks", "year", "years", "today", "yesterday", "telegram", "channel",
  "post", "posts", "posted", "march", "april", "may", "june", "july", "august",
  "september", "october", "november", "december", "january", "february",
  "mart", "yanvar", "fevral", "iyun", "iyul", "avgust", "sentyabr", "oktyabr",
  "noyabr", "dekabr", "songgi", "so'nggi", "oxirgi", "oy", "kanal",
]);

const TELEGRAM_QUERY_PATTERN = /\b(telegram|channel|post|posted|t\.me|kanal|postlar)\b/iu;
const RECENT_QUERY_PATTERN = /\b(latest|recent|recently|lately|current|currently|these days|right now|past month|last month|last week|this month)\b/iu;
const MONTH_LOOKUP: Record<string, number> = {
  january: 0,
  jan: 0,
  yanvar: 0,
  february: 1,
  feb: 1,
  fevral: 1,
  march: 2,
  mar: 2,
  mart: 2,
  april: 3,
  apr: 3,
  may: 4,
  june: 5,
  jun: 5,
  iyun: 5,
  july: 6,
  jul: 6,
  iyul: 6,
  august: 7,
  aug: 7,
  avgust: 7,
  september: 8,
  sep: 8,
  sentyabr: 8,
  october: 9,
  oct: 9,
  oktyabr: 9,
  november: 10,
  nov: 10,
  noyabr: 10,
  december: 11,
  dec: 11,
  dekabr: 11,
};

const LONG_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

const MONTH_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

type QueryDateScope = {
  start: Date;
  end: Date;
  label: string;
  explicit: boolean;
};

function buildRetrievalQuery(
  messages: { role: "user" | "assistant"; content: string }[]
): string {
  const recentUserMessages = messages
    .filter((message) => message.role === "user")
    .slice(-3)
    .map((message) => stripLanguageDirective(message.content))
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
  id?: number;
  content: string;
  source_type: string;
  source_url: string;
  metadata?: Record<string, unknown> | null;
};

function startOfUtcDay(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day));
}

function addUtcDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function addUtcMonths(date: Date, months: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
}

function parseQueryDateScope(query: string, now = new Date()): QueryDateScope | null {
  const normalized = query.toLowerCase();
  const today = startOfUtcDay(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

  const isoMatch = normalized.match(/\b(20\d{2})-(\d{2})(?:-(\d{2}))?\b/u);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]) - 1;
    const day = isoMatch[3] ? Number(isoMatch[3]) : null;

    if (month >= 0 && month <= 11) {
      if (day && day >= 1 && day <= 31) {
        const start = startOfUtcDay(year, month, day);
        return {
          start,
          end: addUtcDays(start, 1),
          label: LONG_DATE_FORMATTER.format(start),
          explicit: true,
        };
      }

      const start = startOfUtcDay(year, month, 1);
      return {
        start,
        end: addUtcMonths(start, 1),
        label: new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(start),
        explicit: true,
      };
    }
  }

  const monthNames = Object.keys(MONTH_LOOKUP).join("|");
  const monthDayYearMatch = normalized.match(
    new RegExp(`\\b(${monthNames})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,)?\\s+(20\\d{2})\\b`, "iu")
  );
  if (monthDayYearMatch) {
    const month = MONTH_LOOKUP[monthDayYearMatch[1]];
    const day = Number(monthDayYearMatch[2]);
    const year = Number(monthDayYearMatch[3]);
    const start = startOfUtcDay(year, month, day);
    return {
      start,
      end: addUtcDays(start, 1),
      label: LONG_DATE_FORMATTER.format(start),
      explicit: true,
    };
  }

  const monthYearMatch = normalized.match(
    new RegExp(`\\b(${monthNames})\\s+(20\\d{2})\\b`, "iu")
  );
  if (monthYearMatch) {
    const month = MONTH_LOOKUP[monthYearMatch[1]];
    const year = Number(monthYearMatch[2]);
    const start = startOfUtcDay(year, month, 1);
    return {
      start,
      end: addUtcMonths(start, 1),
      label: new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(start),
      explicit: true,
    };
  }

  if (/\b(last month|past month|last month or so)\b/iu.test(normalized) || /so'nggi oy|o'tgan oy|oxirgi oy/iu.test(normalized)) {
    const start = addUtcDays(today, -30);
    return {
      start,
      end: addUtcDays(today, 1),
      label: `${MONTH_DATE_FORMATTER.format(start)} to ${MONTH_DATE_FORMATTER.format(today)}`,
      explicit: false,
    };
  }

  if (/\b(this month|current month)\b/iu.test(normalized) || /shu oy/iu.test(normalized)) {
    const start = startOfUtcDay(today.getUTCFullYear(), today.getUTCMonth(), 1);
    return {
      start,
      end: addUtcMonths(start, 1),
      label: new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(start),
      explicit: false,
    };
  }

  if (/\b(last week|past week)\b/iu.test(normalized) || /so'nggi hafta|o'tgan hafta/iu.test(normalized)) {
    const start = addUtcDays(today, -7);
    return {
      start,
      end: addUtcDays(today, 1),
      label: `${MONTH_DATE_FORMATTER.format(start)} to ${MONTH_DATE_FORMATTER.format(today)}`,
      explicit: false,
    };
  }

  if (RECENT_QUERY_PATTERN.test(normalized)) {
    const start = addUtcDays(today, -60);
    return {
      start,
      end: addUtcDays(today, 1),
      label: `${MONTH_DATE_FORMATTER.format(start)} to ${MONTH_DATE_FORMATTER.format(today)}`,
      explicit: false,
    };
  }

  return null;
}

function shouldPreferTelegram(userMessage: string): boolean {
  return TELEGRAM_QUERY_PATTERN.test(userMessage) || RECENT_QUERY_PATTERN.test(userMessage);
}

function readMetadataValue(chunk: Chunk, key: string): string | null {
  const value = chunk.metadata?.[key];
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number") return String(value);
  return null;
}

function getChunkPublishedAt(chunk: Chunk): string | null {
  const fromMetadata = readMetadataValue(chunk, "published_at");
  if (fromMetadata) return fromMetadata;

  const match = chunk.content.match(/^Date:\s*(.+)$/mu);
  return match?.[1]?.trim() || null;
}

function getChunkPublishedAtMs(chunk: Chunk): number {
  const value = getChunkPublishedAt(chunk);
  if (!value) return 0;

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getChunkIndex(chunk: Chunk): number {
  const value = Number(readMetadataValue(chunk, "chunk_index"));
  return Number.isFinite(value) ? value : 0;
}

function scoreChunkAgainstKeywords(chunk: Chunk, keywords: string[]): number {
  if (keywords.length === 0) return 0;

  const haystack = chunk.content.toLowerCase();
  return keywords.reduce((score, keyword) => {
    if (!haystack.includes(keyword)) return score;
    return score + (keyword.length >= 6 ? 3 : 2);
  }, 0);
}

function chunkMentionsKeyword(chunk: Chunk, keyword: string): boolean {
  const haystack = [
    chunk.content,
    chunk.source_url,
    readMetadataValue(chunk, "title") || "",
  ]
    .join("\n")
    .toLowerCase();

  return haystack.includes(keyword);
}

function shouldAttachSources(
  chunks: Chunk[],
  userMessage: string,
  options: { dateScope: QueryDateScope | null; telegramFocused: boolean }
): boolean {
  if (chunks.length === 0) return false;

  if (options.dateScope) return true;

  if (
    options.telegramFocused &&
    chunks.some((chunk) => chunk.source_type === "telegram_post")
  ) {
    return true;
  }

  const keywords = extractKeywords(userMessage)
    .filter((keyword) => keyword.length >= 4)
    .slice(0, 6);

  if (keywords.length === 0) return false;

  const coveredKeywords = new Set<string>();

  for (const keyword of keywords) {
    if (chunks.some((chunk) => chunkMentionsKeyword(chunk, keyword))) {
      coveredKeywords.add(keyword);
    }
  }

  if (coveredKeywords.size === 0) return false;

  return coveredKeywords.size >= 2 || coveredKeywords.size / keywords.length >= 0.34;
}

async function fetchSupplementalTelegramChunks(
  userMessage: string,
  scope: QueryDateScope | null
): Promise<Chunk[]> {
  if (!shouldPreferTelegram(userMessage) && !scope) {
    return [];
  }

  const limit = scope?.explicit ? 1400 : 450;
  const { data } = await getSupabase()
    .from("documents")
    .select("id, content, source_type, source_url, metadata")
    .eq("source_type", "telegram_post")
    .order("id", { ascending: false })
    .limit(limit);

  const rows = (data as Chunk[] | null) ?? [];
  if (rows.length === 0) return [];

  const keywords = extractKeywords(userMessage);
  const now = new Date();
  const today = startOfUtcDay(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const effectiveScope = scope ?? {
    start: addUtcDays(today, -60),
    end: addUtcDays(today, 1),
    label: `${MONTH_DATE_FORMATTER.format(addUtcDays(today, -60))} to ${MONTH_DATE_FORMATTER.format(today)}`,
    explicit: false,
  };
  const filtered = rows.filter((chunk) => {
    const publishedAtMs = getChunkPublishedAtMs(chunk);
    if (!publishedAtMs) return false;
    return publishedAtMs >= effectiveScope.start.getTime() && publishedAtMs < effectiveScope.end.getTime();
  });

  const bySource = new Map<string, { chunk: Chunk; score: number; publishedAtMs: number; chunkIndex: number }>();

  for (const chunk of filtered) {
    const sourceKey = chunk.source_url || String(chunk.id || "");
    const candidate = {
      chunk,
      score: scoreChunkAgainstKeywords(chunk, keywords),
      publishedAtMs: getChunkPublishedAtMs(chunk),
      chunkIndex: getChunkIndex(chunk),
    };
    const existing = bySource.get(sourceKey);

    if (
      !existing ||
      candidate.score > existing.score ||
      (candidate.score === existing.score && candidate.publishedAtMs > existing.publishedAtMs) ||
      (candidate.score === existing.score &&
        candidate.publishedAtMs === existing.publishedAtMs &&
        candidate.chunkIndex < existing.chunkIndex)
    ) {
      bySource.set(sourceKey, candidate);
    }
  }

  return [...bySource.values()]
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      if (right.publishedAtMs !== left.publishedAtMs) return right.publishedAtMs - left.publishedAtMs;
      return left.chunkIndex - right.chunkIndex;
    })
    .slice(0, scope?.explicit ? 8 : 6)
    .map((entry) => entry.chunk);
}

function selectContextChunks(
  chunks: Chunk[],
  options: { telegramReserve?: number; maxTotal?: number } = {}
): Chunk[] {
  const deduped: Chunk[] = [];
  const seen = new Set<string>();
  const telegramReserve = options.telegramReserve ?? 2;
  const maxTotal = options.maxTotal ?? 12;

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
    if (selected.length >= telegramReserve) break;
    tryAdd(chunk);
  }

  for (const chunk of deduped) {
    if (selected.length >= maxTotal) break;
    tryAdd(chunk);
  }

  return selected;
}

function getSourceTitle(chunk: Chunk): string {
  if (chunk.source_type === "telegram_post") {
    const publishedAtMs = getChunkPublishedAtMs(chunk);
    const postId = chunk.source_url.match(/\/(\d+)(?:[/?#]|$)/)?.[1];
    const dateLabel = publishedAtMs
      ? MONTH_DATE_FORMATTER.format(new Date(publishedAtMs))
      : null;

    if (dateLabel && postId) {
      return `${dateLabel} · Post #${postId}`;
    }
    if (dateLabel) {
      return dateLabel;
    }
    if (postId) {
      return `Post #${postId}`;
    }
    return "Telegram post";
  }

  if (chunk.source_type === "telegram") {
    return "Telegram archive";
  }

  return SOURCE_LABELS[chunk.source_type] || chunk.source_type;
}

// --- Source type labels ---
const SOURCE_LABELS: Record<string, string> = {
  youtube: "YouTube",
  youtube_transcript: "YouTube",
  interview: "Interview",
  article: "Article",
  bio: "Bio",
  telegram: "Telegram archive",
  telegram_post: "Telegram post",
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
  const userMessage = stripLanguageDirective(messages[messages.length - 1]?.content || "");
  const retrievalQuery = buildRetrievalQuery(messages) || userMessage;
  const userDateScope = parseQueryDateScope(userMessage);
  const telegramFocusedQuestion = TELEGRAM_QUERY_PATTERN.test(userMessage);

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

  const supplementalTelegramChunks = await fetchSupplementalTelegramChunks(userMessage, userDateScope);
  if (supplementalTelegramChunks.length > 0) {
    const merged = [...supplementalTelegramChunks, ...(chunks || [])];
    const seen = new Set<string>();
    chunks = merged.filter((chunk) => {
      const key = `${chunk.source_url}::${chunk.content}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
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
        .select("content, source_type, source_url, metadata")
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
        .select("content, source_type, source_url, metadata")
        .in("source_type", ["bio", "interview", "article", "telegram_post"])
        .order("id")
        .limit(15);
      chunks = [...(chunks || []), ...((fallback as Chunk[]) || [])];
    }
  }

  if (telegramFocusedQuestion && chunks?.some((chunk) => chunk.source_type === "telegram_post")) {
    const telegramOnly = chunks.filter((chunk) =>
      ["telegram_post", "telegram"].includes(chunk.source_type)
    );

    if (telegramOnly.length >= 2) {
      chunks = telegramOnly;
    }
  }

  const selectedChunks = chunks?.length
    ? selectContextChunks(chunks, {
        telegramReserve: userDateScope ? 6 : supplementalTelegramChunks.length > 0 ? 4 : 2,
      })
    : [];

  // --- Build context ---
  const context = selectedChunks.length
    ? selectedChunks
        .map(
          (c) => `[Source: ${c.source_type}]\n${c.content}`
        )
        .join("\n\n---\n\n")
    : "No relevant context found.";

  const todayLabel = LONG_DATE_FORMATTER.format(new Date());
  const promptGuidance = [
    `Today is ${todayLabel}.`,
    telegramFocusedQuestion
      ? "The user is specifically asking about Telegram content. Prefer telegram_post context and avoid mixing in YouTube or interviews when Telegram context is sufficient."
      : "",
    userDateScope
      ? `The user is asking about Telegram content from ${userDateScope.label}. Do not answer with posts from outside that window.`
      : "",
    !userDateScope && supplementalTelegramChunks.length > 0
      ? "The user is asking about recent or latest thinking. Prioritize the freshest dated Telegram posts in the context."
      : "",
  ].filter(Boolean);

  const systemPrompt = [
    AKMAL_SYSTEM_PROMPT.replace("{retrieved_context}", context),
    "TEMPORAL GUIDANCE:",
    ...promptGuidance.map((line) => `- ${line}`),
  ].join("\n");

  // Collect unique sources for UI citations
  const uniqueSources: { id: string; type: string; url: string; title: string }[] = [];
  const attachSources = shouldAttachSources(selectedChunks, userMessage, {
    dateScope: userDateScope,
    telegramFocused: telegramFocusedQuestion,
  });

  if (attachSources && selectedChunks.length) {
    const seen = new Set<string>();
    const hasTelegramPost = selectedChunks.some((chunk) => chunk.source_type === "telegram_post");
    for (const c of selectedChunks) {
      if (hasTelegramPost && c.source_type === "telegram") {
        continue;
      }

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
          title: getSourceTitle(c),
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

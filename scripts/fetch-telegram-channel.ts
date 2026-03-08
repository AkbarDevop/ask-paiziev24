import * as fs from "fs";
import * as path from "path";
import {
  detectLanguageHeuristic,
  htmlToPlainText,
  parseCliArgs,
  parseStructuredDocument,
  sanitizeUnicode,
  sleep,
} from "./lib/ingestion-utils";

type TelegramPost = {
  channel: string;
  postId: number;
  url: string;
  publishedAt: string;
  views: string | null;
  language: "en" | "uz" | "ru";
  text: string;
};

const DEFAULT_CHANNEL = "paiziev24";
const DEFAULT_MAX_PAGES = 15;
const DEFAULT_MAX_POSTS = 250;
const PAGE_DELAY_MS = 500;
const MAX_SAFE_PAGES = 500;

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

function loadExistingPosts(manifestPath: string): TelegramPost[] {
  if (!fs.existsSync(manifestPath)) return [];

  try {
    const parsed = JSON.parse(fs.readFileSync(manifestPath, "utf-8")) as TelegramPost[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadExistingPostsFromFiles(outputDir: string, channel: string): TelegramPost[] {
  if (!fs.existsSync(outputDir)) return [];

  const files = fs
    .readdirSync(outputDir)
    .filter((file) => file.endsWith(".md"))
    .sort();

  const posts: TelegramPost[] = [];

  for (const file of files) {
    const raw = fs.readFileSync(path.join(outputDir, file), "utf-8");
    const { metadata, body } = parseStructuredDocument(raw);
    const postId = Number(metadata["Post ID"]);
    const publishedAt = metadata.Date;
    const url = metadata.URL;
    const language = metadata.Language as "en" | "uz" | "ru" | undefined;

    if (!Number.isFinite(postId) || !publishedAt || !url || !body) {
      continue;
    }

    posts.push({
      channel,
      postId,
      url,
      publishedAt,
      views: metadata.Views ?? null,
      language: language || detectLanguageHeuristic(body),
      text: sanitizeUnicode(body),
    });
  }

  return posts;
}

async function fetchArchivePage(channel: string, before?: string): Promise<string> {
  const suffix = before ? `?before=${before}` : "";
  const response = await fetch(`https://t.me/s/${channel}${suffix}`, {
    signal: AbortSignal.timeout(15_000),
    headers: {
      "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    },
  });

  if (!response.ok) {
    throw new Error(`Telegram archive request failed (${response.status})`);
  }

  return response.text();
}

function extractNextBeforeCursor(html: string): string | null {
  const match = html.match(/class="tme_messages_more[^"]*"[^>]*data-before="(\d+)"/);
  return match?.[1] ?? null;
}

function parsePostsFromHtml(html: string, channel: string): TelegramPost[] {
  const blocks = html
    .split('<div class="tgme_widget_message_wrap js-widget_message_wrap">')
    .slice(1);

  const posts: TelegramPost[] = [];

  for (const block of blocks) {
    const idMatch = block.match(new RegExp(`data-post="${channel}\\/(\\d+)"`));
    const textMatch = block.match(/class="tgme_widget_message_text js-message_text"[^>]*>([\s\S]*?)<\/div>/);
    const urlMatch = block.match(/class="tgme_widget_message_date" href="([^"]+)"/);
    const dateMatch = block.match(/<time datetime="([^"]+)"/);
    const viewsMatch = block.match(/class="tgme_widget_message_views">([^<]+)</);

    if (!idMatch || !textMatch || !urlMatch || !dateMatch) {
      continue;
    }

    const plainText = htmlToPlainText(textMatch[1])
      .replace(new RegExp(`(^|\\n)@${channel}\\s*$`, "gi"), "")
      .trim();

    if (plainText.length < 35) {
      continue;
    }

    const postId = Number(idMatch[1]);
    if (!Number.isFinite(postId)) {
      continue;
    }

    posts.push({
      channel,
      postId,
      url: urlMatch[1],
      publishedAt: dateMatch[1],
      views: viewsMatch?.[1]?.trim() ?? null,
      language: detectLanguageHeuristic(plainText),
      text: sanitizeUnicode(plainText),
    });
  }

  return posts;
}

function buildPostDocument(post: TelegramPost): string {
  const lines = [
    "Source: Telegram Channel Post",
    `Channel: @${post.channel}`,
    `Post ID: ${post.postId}`,
    `Date: ${post.publishedAt}`,
    `Language: ${post.language}`,
    `URL: ${post.url}`,
  ];

  if (post.views) {
    lines.push(`Views: ${post.views}`);
  }

  lines.push("", post.text);
  return `${sanitizeUnicode(lines.join("\n"))}\n`;
}

async function main() {
  const args = parseCliArgs();
  const channel = getStringArg(args, "channel", DEFAULT_CHANNEL);
  const fetchAll = args.all === true;
  const replace = args.replace === true;
  const maxPages = fetchAll
    ? MAX_SAFE_PAGES
    : getNumberArg(args, "max-pages", DEFAULT_MAX_PAGES);
  const maxPosts = getNumberArg(args, "max-posts", DEFAULT_MAX_POSTS);
  const dryRun = args["dry-run"] === true;

  const outputDir = path.join(process.cwd(), "data", "telegram_posts", channel);
  const manifestPath = path.join(outputDir, "_index.json");

  let before: string | null = null;
  let existingPosts = replace ? [] : loadExistingPosts(manifestPath);
  if (!replace) {
    const fileBackfill = loadExistingPostsFromFiles(outputDir, channel);
    if (fileBackfill.length > existingPosts.length) {
      existingPosts = fileBackfill;
    }
  }
  const existingIds = new Set(existingPosts.map((post) => post.postId));
  const postsById = new Map<number, TelegramPost>(
    existingPosts.map((post) => [post.postId, post])
  );
  let fetchedCount = 0;
  let newCount = 0;

  for (let page = 0; page < maxPages; page += 1) {
    const html = await fetchArchivePage(channel, before ?? undefined);
    const pagePosts = parsePostsFromHtml(html, channel);
    let pageNewPosts = 0;

    for (const post of pagePosts) {
      const isNew = !postsById.has(post.postId);
      if (!postsById.has(post.postId)) {
        postsById.set(post.postId, post);
      }

      if (isNew) {
        pageNewPosts += 1;
      }

      fetchedCount += 1;

      if (!fetchAll && postsById.size >= maxPosts && replace) {
        break;
      }
    }

    newCount += pageNewPosts;

    before = extractNextBeforeCursor(html);
    console.log(
      `Fetched page ${page + 1}${fetchAll ? "" : `/${maxPages}`} - page posts: ${pagePosts.length}, new: ${pageNewPosts}, total stored: ${postsById.size}`
    );

    if (!before) {
      break;
    }

    if (!fetchAll && pageNewPosts === 0 && page > 0) {
      console.log("No new posts found on this page. Stopping incremental sync.");
      break;
    }

    await sleep(PAGE_DELAY_MS);
  }

  let posts = [...postsById.values()].sort((a, b) => a.postId - b.postId);
  if (!fetchAll && replace) {
    posts = posts.slice(-maxPosts);
  }

  if (posts.length === 0) {
    throw new Error(`No posts parsed from @${channel}.`);
  }

  if (dryRun) {
    console.log(
      `Dry run complete. Stored ${posts.length} posts for @${channel}. New posts discovered this run: ${newCount}. Existing before run: ${existingIds.size}.`
    );
    console.log(
      JSON.stringify(
        posts.slice(-3).map((post) => ({
          postId: post.postId,
          publishedAt: post.publishedAt,
          language: post.language,
          url: post.url,
          preview: `${post.text.slice(0, 100)}...`,
        })),
        null,
        2
      )
    );
    return;
  }

  if (replace) {
    fs.rmSync(outputDir, { recursive: true, force: true });
  }

  fs.mkdirSync(outputDir, { recursive: true });

  for (const post of posts) {
    const datePart = post.publishedAt.slice(0, 10);
    const fileName = `${datePart}-${post.postId}.md`;
    fs.writeFileSync(
      path.join(outputDir, fileName),
      buildPostDocument(post),
      "utf-8"
    );
  }

  fs.writeFileSync(manifestPath, JSON.stringify(posts, null, 2), "utf-8");

  console.log(
    `Saved ${posts.length} Telegram posts to ${path.relative(process.cwd(), outputDir)}. New this run: ${newCount}.`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

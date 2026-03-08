<div align="center">

<img src="public/akmal.jpg" width="120" height="120" style="border-radius: 50%;" alt="Akmal Paiziev" />

# Ask Akmal

**Chat with an AI clone of Akmal Paiziev** — serial entrepreneur, founder of Express24, MyTaxi, Workly, Maxtrack & [Numeo.ai](https://numeo.ai). Stanford GSB alum. Built Uzbekistan's first digital maps.

[![Live Demo](https://img.shields.io/badge/Live_Demo-askpaiziev24.netlify.app-blue?style=for-the-badge&logo=netlify)](https://askpaiziev24.netlify.app)

</div>

---

## What is this?

An AI-powered conversational clone trained on Akmal Paiziev's public content — interviews, YouTube videos, LinkedIn posts, articles, his Telegram book *"From Tashkent to Silicon Valley"*, podcast appearances, and the public `@paiziev24` Telegram archive.

Ask it anything about startups, building companies in emerging markets, hiring, fundraising, AI agents, logistics, or the Central Asian tech ecosystem — and get answers grounded in Akmal's actual words and recent posts.

## How it works

```
User question → Gemini embedding → pgvector similarity search → date-aware / telegram-aware retrieval merge → Gemini 2.5 Flash → streamed response with exact source cards
```

1. **Knowledge Base** — Public Akmal content embedded into Supabase with Gemini `gemini-embedding-001` vectors, including the full public `@paiziev24` Telegram archive snapshot
2. **Retrieval** — Hybrid search: vector similarity + keyword fallback + supplemental Telegram retrieval for recent/date-specific questions
3. **Generation** — Gemini 2.5 Flash answers in Akmal's voice, grounded only in retrieved public context
4. **Streaming** — The client consumes the `/api/chat` SSE stream directly and renders source cards, timestamps, and token-by-token text
5. **Safety & UX** — Rate limiting, input validation, unsupported-answer source suppression, and contextual follow-up questions

## Data Sources

| Source | Count | Description |
|--------|-------|-------------|
| YouTube transcripts | 89 videos | Startup Maktabi series, podcasts (CACTUZ, AVLO, SEREDIN, Fikr yetakchilari, BUSOQQA, CHOYXONA), interviews on 25+ channels, panels & talks |
| Telegram posts | 1,046 posts | Public `@paiziev24` channel archive captured and normalized from Telegram's public web archive |
| Telegram book | 114 chapters | *"From Tashkent to Silicon Valley"* |
| Articles | 7 | Euronews, Tribune, Kapital.uz, DigitalBusiness.kz, Numeo.ai, and more |
| LinkedIn | 2 | Profile, posts, about section, Numeo description |
| Interviews | 4 | The Tech, and others |
| Bios | 2 | Startup Grind, Outsource |

**Corpus snapshot:** 89 YouTube transcripts, 1,046 Telegram posts, the Telegram book, and other public profile/interview/article data — all embedded into Supabase for retrieval.
**Languages:** Uzbek, English, and Russian

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | [Next.js 16](https://nextjs.org) (App Router, Turbopack) |
| **AI / LLM** | [Vercel AI SDK v6](https://ai-sdk.dev) + [Gemini 2.5 Flash](https://ai.google.dev) |
| **Embeddings** | Gemini `gemini-embedding-001` (768D, free tier) |
| **Database** | [Supabase](https://supabase.com) (Postgres + pgvector + HNSW index + RLS) |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com) + CSS custom properties |
| **Deployment** | [Netlify](https://netlify.com) |
| **Analytics** | [Plausible](https://plausible.io) (privacy-friendly) |
| **Language** | TypeScript (strict) |

## Features

- **Hybrid semantic retrieval** — pgvector similarity search with keyword fallback and deduping
- **Date-aware Telegram retrieval** — better answers for prompts like "last month", "March 2026", or "what did you post on Telegram?"
- **Exact-post source cards** — source UI links directly to the relevant Telegram post or video instead of generic source labels
- **Unsupported-answer cleanup** — irrelevant citations are suppressed when the answer is effectively "I haven't spoken publicly about that"
- **Context-aware follow-ups** — follow-up chips now stay on-topic instead of using random generic prompts
- **Bilingual UI** — full English / Uzbek toggle for UI and chat behavior
- **101 suggested questions per language** — 202 total prompts, with a weighted mix of evergreen and recent Telegram-driven questions
- **Direct SSE chat streaming** — token-by-token rendering, thinking indicator, timestamps, and production-safe client streaming
- **PWA installable** — add to home screen on mobile for app-like experience
- **Dark/light mode** — follows system preference
- **Markdown rendering** — lists, bold, links, code blocks, blockquotes
- **Copy & Share** — action buttons on AI responses
- **Rate limiting** — 30 req/min per IP
- **Input validation** — max 2000 chars, max 50 messages per conversation
- **Row Level Security** — SELECT-only, no client-exposed keys
- **Mobile-first** — responsive design with safe-area-inset support

## Getting Started

### Prerequisites

- Node.js 22+
- Supabase project with pgvector extension enabled
- Google AI API key (Gemini — free tier works)

### Setup

```bash
git clone https://github.com/AkbarDevop/ask-paiziev24.git
cd ask-paiziev24
npm install
```

Create `.env.local`:

```env
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### Database setup

Push the Supabase migrations to create the `documents` table, pgvector index, and `match_documents()` RPC:

```bash
npx supabase db push
```

### Ingest data

Place your `.txt` or `.md` files anywhere under `data/` (articles, bios, Telegram posts) and `data/youtube/` (transcripts), then run:

```bash
source <(grep -v '^#' .env.local | grep '=' | sed 's/^/export /') && npx tsx scripts/chunk-and-embed.ts
```

This chunks all files, generates Gemini embeddings, and inserts into Supabase.

To sync recent Telegram posts from the public `@paiziev24` archive and import them without rebuilding the entire corpus:

```bash
npx tsx scripts/fetch-telegram-channel.ts --channel=paiziev24 --max-pages=15 --max-posts=250
npx tsx scripts/import-telegram-posts.ts --channel=paiziev24
```

To sync Telegram in one command:

```bash
npm run sync:telegram
```

To fetch the full public Telegram history and re-import it:

```bash
npm run sync:telegram:all
```

Automatic updates:

- `.github/workflows/sync-telegram.yml` runs on a biweekly cadence (implemented as a weekly trigger with every-other-week gating) and can also be triggered manually.
- It fetches recent `@paiziev24` posts, imports them into Supabase, and commits the refreshed local snapshot.
- Required GitHub Actions secrets: `GOOGLE_GENERATIVE_AI_API_KEY`, `SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

To backfill embeddings for existing rows with `embedding = NULL`:

```bash
source <(grep -v '^#' .env.local | grep '=' | sed 's/^/export /') && npx tsx scripts/backfill-embeddings.ts
```

### Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Deploy

```bash
npx netlify deploy --prod
```

## Project Structure

```
src/
├── app/
│   ├── api/chat/route.ts    # Chat API: hybrid retrieval, telegram/date-aware ranking, source-card streaming
│   ├── layout.tsx           # Root layout, OG metadata, PWA manifest, Plausible analytics
│   └── page.tsx             # Home page
├── components/
│   ├── ChatInterface.tsx    # Main chat UI, direct SSE client, language toggle, input, message list
│   ├── MessageBubble.tsx    # Message rendering, markdown, compact source cards, timestamps, streaming cursor
│   ├── SuggestedQuestions.tsx # Weighted recent + evergreen homepage question picker
│   ├── AkmalAvatar.tsx      # Avatar with hero section (bilingual)
│   └── ThinkingIndicator.tsx # Animated thinking steps (bilingual)
├── lib/
│   ├── prompts.ts           # System prompt, 202 suggested questions (EN+UZ), UI translations, follow-up logic
│   ├── embeddings.ts        # Gemini embedding helpers (768D, getEmbedding/getEmbeddings)
│   └── supabase.ts          # DB client (service role, not exposed to client)
scripts/
├── chunk-and-embed.ts       # Data ingestion: chunk → embed → insert (clears + re-inserts)
├── backfill-embeddings.ts   # Backfill NULL embeddings in batches of 20
├── fetch-telegram-channel.ts # Scrape public Telegram archive into data/telegram_posts/
├── import-telegram-posts.ts # Incrementally import telegram_post rows into Supabase
└── download-remaining-yt.py # YouTube transcript downloader
data/
├── *.txt                    # Articles, interviews, bios, LinkedIn, Telegram book
├── telegram_posts/          # Normalized Telegram channel posts by channel/post id
└── youtube/*.txt            # 89 YouTube transcripts
supabase/
├── schema.sql               # Base schema with pgvector, HNSW index, match_documents() RPC
└── migrations/              # RLS policies, language constraints, 768D embedding migration
public/
├── akmal.jpg                # Avatar image
└── manifest.json            # PWA manifest
```

## License

MIT

---

<div align="center">

Built by [Akbar](https://akbar.one)

</div>

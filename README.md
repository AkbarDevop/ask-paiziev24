<div align="center">

<img src="public/akmal.jpg" width="120" height="120" style="border-radius: 50%;" alt="Akmal Paiziev" />

# Ask Akmal

**Chat with an AI clone of Akmal Paiziev** — serial entrepreneur, founder of Express24, MyTaxi, Workly, Maxtrack & [Numeo.ai](https://numeo.ai). Stanford GSB alum. Built Uzbekistan's first digital maps.

[![Live Demo](https://img.shields.io/badge/Live_Demo-askpaiziev24.netlify.app-blue?style=for-the-badge&logo=netlify)](https://askpaiziev24.netlify.app)

</div>

---

## What is this?

An AI-powered conversational clone trained on Akmal Paiziev's public content — interviews, YouTube videos, LinkedIn posts, articles, his Telegram book *"From Tashkent to Silicon Valley"*, and podcast appearances across Uzbek, Russian, and English.

Ask it anything about startups, building companies in emerging markets, hiring, fundraising, or the Central Asian tech ecosystem — and get answers grounded in Akmal's actual words and experiences.

## How it works

```
User question → Embed query (Gemini 768D) → pgvector similarity search → Top-K context → Gemini 2.5 Flash → Streamed response with source citations
```

1. **Knowledge Base** — 860+ text chunks from 85+ sources ingested into Supabase with vector embeddings (Gemini `gemini-embedding-001`, 768D)
2. **Retrieval** — Hybrid search: vector similarity (cosine distance via HNSW index) + keyword ILIKE fallback, merged and deduplicated
3. **Generation** — Gemini 2.5 Flash generates a response grounded in retrieved context, speaking as Akmal, with inline source citations
4. **Streaming** — Response streams token-by-token with source badges, timestamps, and a blinking cursor
5. **Security** — Rate limiting, input validation, Row Level Security, no client-exposed keys

## Data Sources

| Source | Count | Description |
|--------|-------|-------------|
| YouTube transcripts | 74 videos | Startup Maktabi series, podcasts (CACTUZ, AVLO, SEREDIN, Fikr yetakchilari, BUSOQQA, CHOYXONA), interviews on 25+ channels, panels & talks |
| Telegram book | 114 chapters | *"From Tashkent to Silicon Valley"* |
| Articles | 5 | Euronews, Tribune, Kapital.uz, DigitalBusiness.kz, Numeo.ai |
| LinkedIn | 1 | Profile, posts, about section, Numeo description |
| Interviews | 1 | The Tech interview |
| Bios | 2 | Startup Grind, Outsource |

**Total:** 861 chunks across 85+ source files
**Languages:** English, Uzbek, Russian

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

- **Semantic search** — Vector similarity via pgvector (768D Gemini embeddings) with keyword fallback
- **Source citations** — AI responses show which source types were used (YouTube, Interview, Article, etc.)
- **Bilingual UI** — Full English / Uzbek toggle (all UI text, not just prompts)
- **88 suggested questions per language** — Randomized from a pool of 176 total, every refresh is different
- **Real-time streaming** — Token-by-token with blinking cursor, thinking indicator, and timestamps
- **PWA installable** — Add to home screen on mobile for app-like experience
- **Dark/light mode** — Follows system preference
- **Markdown rendering** — Lists, bold, links, code blocks, blockquotes
- **Copy & Share** — Action buttons on AI responses
- **Rate limiting** — 30 req/min per IP
- **Input validation** — Max 2000 chars, max 50 messages per conversation
- **Row Level Security** — SELECT-only, no client-exposed keys
- **Mobile-first** — Responsive design with safe-area-inset support

## Getting Started

### Prerequisites

- Node.js 18+
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

Place your `.txt` files in `data/` (articles, bios) and `data/youtube/` (transcripts), then run:

```bash
source <(grep -v '^#' .env.local | grep '=' | sed 's/^/export /') && npx tsx scripts/chunk-and-embed.ts
```

This chunks all files, generates Gemini embeddings, and inserts into Supabase.

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
│   ├── api/chat/route.ts    # Chat API: vector search + keyword fallback + streaming with source citations
│   ├── layout.tsx           # Root layout, OG metadata, PWA manifest, Plausible analytics
│   └── page.tsx             # Home page
├── components/
│   ├── ChatInterface.tsx    # Main chat UI, language toggle, input, message list
│   ├── MessageBubble.tsx    # Message rendering, markdown, source badges, timestamps, streaming cursor
│   ├── SuggestedQuestions.tsx # Random question picker from 88-question pool
│   ├── AkmalAvatar.tsx      # Avatar with hero section (bilingual)
│   └── ThinkingIndicator.tsx # Animated thinking steps (bilingual)
├── lib/
│   ├── prompts.ts           # System prompt, 176 suggested questions (EN+UZ), UI translations
│   ├── embeddings.ts        # Gemini embedding helpers (768D, getEmbedding/getEmbeddings)
│   └── supabase.ts          # DB client (service role, not exposed to client)
scripts/
├── chunk-and-embed.ts       # Data ingestion: chunk → embed → insert (clears + re-inserts)
├── backfill-embeddings.ts   # Backfill NULL embeddings in batches of 20
└── download-remaining-yt.py # YouTube transcript downloader
data/
├── *.txt                    # Articles, interviews, bios, LinkedIn, Telegram book
└── youtube/*.txt            # 74 YouTube transcripts
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

Built by [Akbar](https://github.com/AkbarDevop)

</div>

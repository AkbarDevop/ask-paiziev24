<div align="center">

<img src="public/akmal.jpg" width="120" height="120" style="border-radius: 50%;" alt="Akmal Paiziev" />

# Ask Akmal

**Chat with an AI clone of Akmal Paiziev** — serial entrepreneur, founder of Express24, MyTaxi, Workly, Maxtrack & [Numeo.ai](https://numeo.ai). Stanford GSB alum. Built Uzbekistan's first digital maps.

[![Live Demo](https://img.shields.io/badge/Live_Demo-askakmal.netlify.app-blue?style=for-the-badge&logo=netlify)](https://askakmal.netlify.app)

</div>

---

## What is this?

An AI-powered conversational clone trained on Akmal Paiziev's public content — interviews, YouTube videos, LinkedIn posts, articles, his Telegram book *"From Tashkent to Silicon Valley"*, and podcast appearances across Uzbek, Russian, and English.

Ask it anything about startups, building companies in emerging markets, hiring, fundraising, or the Central Asian tech ecosystem — and get answers grounded in Akmal's actual words and experiences.

## How it works

```
User question → Keyword extraction → Supabase vector search → Context retrieval → Gemini 2.5 Flash → Streamed response
```

1. **Knowledge Base** — 950+ text chunks from 100+ sources ingested into Supabase (Postgres + pgvector)
2. **Retrieval** — Relevant context is pulled from the database based on the user's question
3. **Generation** — Gemini 2.5 Flash generates a response grounded in retrieved context, speaking as Akmal
4. **Streaming** — Response streams token-by-token for a real-time chat experience

## Data Sources

| Source | Count | Description |
|--------|-------|-------------|
| YouTube transcripts | 62 videos | Startup Maktabi series, podcasts (CACTUZ, AVLO, SEREDIN, Fikr yetakchilari), interviews on 20+ channels |
| Telegram book | 114 chapters | *"From Tashkent to Silicon Valley"* |
| Articles | 5 | Euronews, Tribune, Kapital.uz, DigitalBusiness.kz |
| LinkedIn | 1 | Profile, posts, about section |
| Interviews | 1 | The Tech interview |
| Bios | 2 | Startup Grind, Outsource |

**Languages:** English, Uzbek, Russian

## Tech Stack

- **Framework** — [Next.js 16](https://nextjs.org) (App Router)
- **AI** — [Vercel AI SDK v6](https://ai-sdk.dev) + [Gemini 2.5 Flash](https://ai.google.dev)
- **Database** — [Supabase](https://supabase.com) (Postgres + pgvector + RLS)
- **Styling** — [Tailwind CSS v4](https://tailwindcss.com) + CSS custom properties (light/dark auto)
- **Deployment** — [Netlify](https://netlify.com)
- **Language** — TypeScript

## Features

- Bilingual UI (English / Uzbek toggle)
- Real-time streaming responses with thinking indicator
- Suggested questions with shuffle
- Markdown rendering (lists, bold, links, code blocks, quotes)
- Copy & Share buttons on AI responses
- Auto-resizing textarea input
- Light/dark mode (system preference)
- Rate limiting (30 req/min per IP)
- Input validation & sanitization
- Security headers + Row Level Security on database
- Mobile-first responsive design

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase project with `documents` table
- Google AI API key (Gemini)

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
```

### Ingest data

```bash
# Place .txt files in data/ and data/youtube/
source <(grep -v '^#' .env.local | grep '=' | sed 's/^/export /') && npx tsx scripts/chunk-and-embed.ts
```

### Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/
│   ├── api/chat/route.ts    # Chat API with RAG pipeline
│   ├── layout.tsx           # Root layout + OG metadata
│   └── page.tsx             # Home page
├── components/
│   ├── ChatInterface.tsx    # Main chat UI
│   ├── MessageBubble.tsx    # Message rendering + markdown
│   ├── SuggestedQuestions.tsx
│   ├── AkmalAvatar.tsx
│   └── ThinkingIndicator.tsx
├── lib/
│   ├── prompts.ts           # System prompt + suggested questions
│   ├── supabase.ts          # DB client
│   └── embeddings.ts        # Embedding utilities
scripts/
├── chunk-and-embed.ts       # Data ingestion pipeline
└── download-remaining-yt.py # YouTube transcript downloader
data/
├── *.txt                    # Articles, interviews, bios
└── youtube/*.txt            # YouTube transcripts
```

## License

MIT

---

<div align="center">

Built by [Akbar](https://github.com/AkbarDevop)

</div>

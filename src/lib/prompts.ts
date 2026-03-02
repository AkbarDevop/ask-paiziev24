export const AKMAL_SYSTEM_PROMPT = `You are Akmal Paiziev — a serial tech entrepreneur from Uzbekistan, now based in San Francisco. You founded MyTaxi, Express24 (sold to Yandex in 2024), Workly, Maxtrack, and now Numeo.ai. You studied at Stanford GSB and have been building tech companies since 2005.

PERSONALITY & VOICE:
- You are practical and direct. You learned business by doing, not by reading.
- You think in terms of problems and markets, not abstract theory.
- You often reference your own experiences: the internet cafés, drawing maps of Uzbekistan from scratch, being interrogated by secret services, pivoting MyTaxi's business model 3 times, growing Express24 500% during COVID.
- You believe deeply in building for emerging markets and that the best ideas come from solving real problems you personally experienced.
- You value team building, resilience, and execution speed.
- You are optimistic about AI and believe digital employees will work alongside humans in the near future.
- You speak with conviction but without arrogance.

RULES:
1. Answer ONLY based on the context provided below. This context contains your actual words, writings, interviews, YouTube videos (Startup Maktabi series), LinkedIn posts, and your Telegram channel book.
2. If the context does not contain information to answer the question, say something like: "I haven't spoken publicly about that" or "That's not something I've shared my thoughts on yet." NEVER fabricate views or quotes.
3. When relevant, reference specific experiences from your career to illustrate points — just as you would in a real conversation.
4. Keep responses conversational, 2-4 paragraphs. You're not writing an essay.
5. Never use AI filler phrases like "Certainly!", "Great question!", "As an AI language model...", or "I'd be happy to help."
6. If asked who you are, briefly introduce yourself and your journey.
7. You can respond in both English and Uzbek, matching the user's language. Some context may be in Uzbek (auto-transcribed from YouTube) — use it naturally regardless of which language you're responding in.
8. You have deep knowledge about: startup building, finding investors, team hiring, sales, customer development, MVP, business models, leadership — from your Startup Maktabi YouTube series.

CONTEXT FROM YOUR WRITINGS AND INTERVIEWS:
{retrieved_context}`;

export const SUGGESTED_QUESTIONS = {
  en: [
    "How did you start your first business at age 20?",
    "How did you decide to sell Express24 to Yandex?",
    "What advice would you give to first-time founders in Central Asia?",
    "Why did you pivot to AI and logistics with Numeo?",
    "What was it like building the first digital maps of Uzbekistan?",
    "How do you build and retain a strong team?",
    "What did you learn at Stanford GSB?",
    "How did Express24 grow 500% during COVID?",
    "What's the hardest decision you've ever made as a founder?",
    "How did you handle being interrogated by secret services?",
    "What's your take on AI replacing jobs?",
    "How do you find product-market fit?",
    "What mistakes did you make with MyTaxi?",
    "How do you think about hiring your first 10 employees?",
    "What's different about building startups in emerging markets?",
    "How do you decide when to pivot vs. persist?",
    "What role did internet cafés play in your journey?",
    "How do you approach fundraising as a Central Asian founder?",
    "What's the story behind Workly and Maxtrack?",
    "What does a typical day look like for you now?",
  ],
  uz: [
    "20 yoshda birinchi biznesingizni qanday boshlagansiz?",
    "Express24ni Yandexga sotish qarorini qanday qabul qildingiz?",
    "Markaziy Osiyodagi yosh tadbirkorlarga qanday maslahat berasiz?",
    "Nega AI va logistikaga — Numeo.ai ga o'tdingiz?",
    "O'zbekistonning birinchi raqamli xaritasini yaratish qanday bo'lgan?",
    "Kuchli jamoani qanday qurasiz va saqlab qolasiz?",
    "Stanford GSBda nima o'rgandingiz?",
    "COVID paytida Express24 qanday 500% o'sdi?",
    "Asoschи sifatida eng qiyin qaroringiz qanday bo'lgan?",
    "Maxfiy xizmatlar tomonidan so'roq qilinganingiz qanday bo'lgan?",
    "Sunʼiy intellekt ish o'rinlarini almashtirishiga qanday qaraysiz?",
    "Product-market fitni qanday topasiz?",
    "MyTaxi bilan qanday xatolar qildingiz?",
    "Birinchi 10 xodimni qanday yollash kerak?",
    "Rivojlanayotgan bozorlarda startup qurish nimasi bilan farq qiladi?",
    "Pivot qilish yoki davom etishni qanday hal qilasiz?",
    "Internet kafelar sizning yo'lingizda qanday rol o'ynagan?",
    "Markaziy Osiyolik asoschiga investitsiya topish bo'yicha maslahat?",
    "Workly va Maxtrack tarixi qanday?",
    "Hozirgi kunlaringiz qanday o'tadi?",
  ],
} as const;

export type Language = "en" | "uz";

export const UI_TEXT = {
  en: {
    heroTitle: "Ask Akmal",
    heroDescription:
      "AI clone of Akmal Paiziev — serial entrepreneur, founder of Express24, MyTaxi & Numeo.ai",
    poweredBy: "Powered by Gemini · Context from public interviews & writings",
    newChat: "New chat",
    placeholder: "Ask Akmal anything...",
    moreSuggestions: "More suggestions",
    copy: "Copy",
    copied: "Copied",
    share: "Share",
    tryAgain: "Try again",
    disclaimer: "AI simulation — not affiliated with Akmal Paiziev",
    inputHint: "Enter to send, Shift+Enter for new line",
    thinkingSteps: [
      "Searching through interviews",
      "Reading essays and articles",
      "Browsing Telegram posts",
      "Preparing response",
    ],
    errorRate: "Too many requests. Please wait a moment and try again.",
    errorServer: "Akmal is temporarily unavailable. Please try again shortly.",
    errorGeneric: "Something went wrong. Please try again.",
  },
  uz: {
    heroTitle: "Akmalga savol bering",
    heroDescription:
      "Akmal Paizievning AI kloni — serial tadbirkor, Express24, MyTaxi va Numeo.ai asoschisi",
    poweredBy:
      "Gemini asosida · Ommaviy intervyu va maqolalardan kontekst",
    newChat: "Yangi suhbat",
    placeholder: "Akmalga savol bering...",
    moreSuggestions: "Boshqa savollar",
    copy: "Nusxalash",
    copied: "Nusxalandi",
    share: "Ulashish",
    tryAgain: "Qayta urinish",
    disclaimer: "AI simulyatsiya — Akmal Paiziev bilan bog'liq emas",
    inputHint: "Yuborish — Enter, yangi qator — Shift+Enter",
    thinkingSteps: [
      "Intervyularni qidiryapman",
      "Maqolalarni o'qiyapman",
      "Telegram postlarini ko'ryapman",
      "Javob tayyorlayapman",
    ],
    errorRate: "Juda ko'p so'rov. Iltimos, biroz kuting va qayta urinib ko'ring.",
    errorServer: "Akmal vaqtincha mavjud emas. Iltimos, keyinroq urinib ko'ring.",
    errorGeneric: "Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.",
  },
} as const;

export function getRandomQuestions(lang: Language, count = 4): string[] {
  const pool = [...SUGGESTED_QUESTIONS[lang]];
  const picked: string[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    picked.push(pool.splice(idx, 1)[0]);
  }
  return picked;
}

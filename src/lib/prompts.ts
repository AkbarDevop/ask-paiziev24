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
9. When referencing specific facts from the context, add a subtle citation at the END of that sentence using the format [n](url) where n is the source number from the SOURCE REFERENCE list. Do NOT wrap the whole sentence in a link — only add the small number. Example: "I grew Express24 by 500% during the pandemic [2](https://example.com). We had to completely rethink logistics." Only cite when directly using a specific fact.

CONTEXT FROM YOUR WRITINGS AND INTERVIEWS:
{retrieved_context}`;

export const SUGGESTED_QUESTIONS = {
  en: [
    // Personal story & early life
    "How did you start your first business at age 20?",
    "What role did internet cafés play in your journey?",
    "What was your childhood like growing up in Uzbekistan?",
    "Who were your biggest mentors or influences?",
    "What did your family think when you became an entrepreneur?",
    "What was your first ever job?",
    "When did you first realize you wanted to build companies?",
    "What books or experiences shaped your thinking early on?",

    // Express24
    "How did you decide to sell Express24 to Yandex?",
    "How did Express24 grow 500% during COVID?",
    "What was the hardest moment at Express24?",
    "How did you come up with the idea for Express24?",
    "What made Express24 different from other delivery apps?",
    "How did you scale Express24 to cover all of Uzbekistan?",
    "What was the negotiation with Yandex like?",
    "How did Express24 handle logistics in a country with no address system?",

    // MyTaxi
    "What mistakes did you make with MyTaxi?",
    "How many times did you pivot MyTaxi?",
    "What was it like competing with Yandex Taxi?",
    "How did you build the driver network from scratch?",
    "What made you start a ride-hailing app in Uzbekistan?",

    // Maps & early tech
    "What was it like building the first digital maps of Uzbekistan?",
    "How did you draw maps of an entire country from scratch?",
    "Why were there no digital maps of Uzbekistan before you?",

    // Stanford & Silicon Valley
    "What did you learn at Stanford GSB?",
    "How did Stanford change your perspective on business?",
    "What surprised you most about Silicon Valley?",
    "How do you compare the startup culture in the US vs Central Asia?",
    "What's the biggest lesson from living in San Francisco?",

    // Fundraising & investors
    "How do you approach fundraising as a Central Asian founder?",
    "What do investors look for in emerging market startups?",
    "How do you pitch to investors who don't know your market?",
    "What's the biggest mistake founders make when fundraising?",
    "Should you bootstrap or raise money?",
    "How do you value an early-stage startup?",

    // Team & leadership
    "How do you build and retain a strong team?",
    "How do you think about hiring your first 10 employees?",
    "What's your management style?",
    "How do you fire someone who isn't performing?",
    "How do you keep your team motivated during hard times?",
    "What qualities do you look for when hiring?",
    "How do you build company culture from day one?",
    "What's the most important role to hire first in a startup?",

    // Startup advice
    "What advice would you give to first-time founders in Central Asia?",
    "How do you find product-market fit?",
    "How do you decide when to pivot vs. persist?",
    "What's different about building startups in emerging markets?",
    "What's the biggest mistake first-time founders make?",
    "How do you validate a startup idea before building it?",
    "When should a founder give up on an idea?",
    "How do you deal with competition from bigger companies?",
    "What's more important: the idea or the execution?",
    "How do you price your product in a low-income market?",
    "What's the secret to growing fast in Central Asia?",
    "How do you build a startup with limited resources?",

    // AI & Numeo
    "Why did you pivot to AI and logistics with Numeo?",
    "What's your take on AI replacing jobs?",
    "How will AI change business in Central Asia?",
    "What is Numeo.ai and what problem does it solve?",
    "Do you think AI will create more jobs than it destroys?",
    "What excites you most about AI right now?",

    // Workly & Maxtrack
    "What's the story behind Workly and Maxtrack?",
    "What did you learn from building B2B products?",

    // Philosophy & mindset
    "What's the hardest decision you've ever made as a founder?",
    "How did you handle being interrogated by secret services?",
    "What does a typical day look like for you now?",
    "What keeps you going after 20 years of entrepreneurship?",
    "What's your biggest regret as a founder?",
    "How do you handle failure?",
    "What's the best piece of advice you've ever received?",
    "How do you balance work and personal life?",
    "What would you do differently if you started over?",
    "What does success mean to you?",
    "How do you make tough decisions under pressure?",
    "What's the most important lesson from your career?",

    // Uzbekistan & emerging markets
    "How has Uzbekistan's tech scene changed since you started?",
    "What opportunities do you see in Central Asia right now?",
    "Why don't more people build startups in Uzbekistan?",
    "What infrastructure challenges did you face in Uzbekistan?",
    "How do you think about expanding from Uzbekistan to other markets?",

    // Sales & growth
    "How did you get your first 100 customers?",
    "What's the best way to sell in Uzbekistan?",
    "How do you think about customer acquisition cost?",
    "What marketing strategies work in emerging markets?",
    "How do you build trust with users in a new market?",
  ],
  uz: [
    // Shaxsiy tarix va bolalik
    "20 yoshda birinchi biznesingizni qanday boshlagansiz?",
    "Internet kafelar sizning yo'lingizda qanday rol o'ynagan?",
    "O'zbekistonda o'sish qanday bo'lgan?",
    "Sizga eng ko'p ta'sir ko'rsatgan ustozlar kim bo'lgan?",
    "Oilangiz tadbirkorlikka qanday munosabatda bo'lgan?",
    "Birinchi ishingiz qanday bo'lgan?",
    "Kompaniyalar qurishni birinchi marta qachon xohlagansiz?",
    "Qaysi kitoblar yoki tajribalar sizning fikrlashingizni shakllantirgan?",

    // Express24
    "Express24ni Yandexga sotish qarorini qanday qabul qildingiz?",
    "COVID paytida Express24 qanday 500% o'sdi?",
    "Express24dagi eng qiyin lahza qanday bo'lgan?",
    "Express24 g'oyasi qanday paydo bo'lgan?",
    "Express24ni boshqa yetkazib berish ilovalaridan nimasi farq qilgan?",
    "Express24ni butun O'zbekistonga qanday kengaytirdingiz?",
    "Yandex bilan muzokaralar qanday o'tgan?",
    "Manzil tizimi bo'lmagan mamlakatda logistikani qanday hal qildingiz?",

    // MyTaxi
    "MyTaxi bilan qanday xatolar qildingiz?",
    "MyTaxini necha marta pivot qildingiz?",
    "Yandex Taxi bilan raqobat qanday bo'lgan?",
    "Haydovchilar tarmog'ini noldan qanday qurdingiz?",
    "O'zbekistonda taksi ilovasini nima uchun boshlagansiz?",

    // Xaritalar va ilk texnologiya
    "O'zbekistonning birinchi raqamli xaritasini yaratish qanday bo'lgan?",
    "Butun mamlakat xaritasini noldan qanday chizdingiz?",
    "Sizdan oldin O'zbekistonning raqamli xaritasi nega yo'q edi?",

    // Stanford va Kremniy vodiysi
    "Stanford GSBda nima o'rgandingiz?",
    "Stanford sizning biznesga qarashingizni qanday o'zgartirdi?",
    "Kremniy vodiysida sizni eng ko'p nima hayratga soldi?",
    "AQSh va Markaziy Osiyodagi startup madaniyatini qanday solishtirasiz?",
    "San-Fransiskoda yashashdan olgan eng katta dars nima?",

    // Investitsiya va investorlar
    "Markaziy Osiyolik asoschiga investitsiya topish bo'yicha maslahat?",
    "Investorlar rivojlanayotgan bozor startaplariga nimani qidiradi?",
    "Bozoringizni bilmaydigan investorlarga qanday taqdimot qilasiz?",
    "Asoschislar investitsiya izlashda qanday xatolar qiladi?",
    "Bootstrap qilish kerakmi yoki pul jalb qilishmi?",
    "Boshlang'ich bosqichdagi startapni qanday baholaysiz?",

    // Jamoa va rahbarlik
    "Kuchli jamoani qanday qurasiz va saqlab qolasiz?",
    "Birinchi 10 xodimni qanday yollash kerak?",
    "Sizning boshqaruv uslubingiz qanday?",
    "Yaxshi ishlamayotgan odamni qanday ishdan bo'shatasiz?",
    "Qiyin paytlarda jamoani qanday motivatsiya qilasiz?",
    "Yollashda qanday xususiyatlarga e'tibor berasiz?",
    "Kompaniya madaniyatini birinchi kundan qanday qurasiz?",
    "Startapda birinchi qaysi lavozimni yollash kerak?",

    // Startup maslahatlari
    "Markaziy Osiyodagi yosh tadbirkorlarga qanday maslahat berasiz?",
    "Product-market fitni qanday topasiz?",
    "Pivot qilish yoki davom etishni qanday hal qilasiz?",
    "Rivojlanayotgan bozorlarda startup qurish nimasi bilan farq qiladi?",
    "Birinchi marta startup qurayotgan odamlarning eng katta xatosi nima?",
    "Startup g'oyasini qurmasdan oldin qanday tekshirasiz?",
    "Asoschisi g'oyadan qachon voz kechishi kerak?",
    "Katta kompaniyalar bilan raqobatni qanday yengasiz?",
    "G'oya muhimmi yoki amalga oshirish?",
    "Kam daromadli bozorda mahsulot narxini qanday belgilaysiz?",
    "Markaziy Osiyoda tez o'sishning siri nima?",
    "Cheklangan resurslar bilan startapni qanday qurasiz?",

    // AI va Numeo
    "Nega AI va logistikaga — Numeo.ai ga o'tdingiz?",
    "Sun'iy intellekt ish o'rinlarini almashtirishiga qanday qaraysiz?",
    "AI Markaziy Osiyoda biznesni qanday o'zgartiradi?",
    "Numeo.ai nima va qanday muammoni hal qiladi?",
    "AI yo'q qilganidan ko'ra ko'proq ish o'rni yaratadimi?",
    "Hozir AIda sizni eng ko'p nima hayratga solyapti?",

    // Workly va Maxtrack
    "Workly va Maxtrack tarixi qanday?",
    "B2B mahsulotlar qurishdan nima o'rgandingiz?",

    // Falsafa va tafakkur
    "Asoschisi sifatida eng qiyin qaroringiz qanday bo'lgan?",
    "Maxfiy xizmatlar tomonidan so'roq qilinganingiz qanday bo'lgan?",
    "Hozirgi kunlaringiz qanday o'tadi?",
    "20 yillik tadbirkorlikdan keyin sizni nima harakatga keltiradi?",
    "Asoschisi sifatida eng katta afsuslanishingiz nima?",
    "Muvaffaqiyatsizlikni qanday boshdan kechirasiz?",
    "Olgan eng yaxshi maslahatngiz nima?",
    "Ish va shaxsiy hayot o'rtasida muvozanatni qanday saqlaysiz?",
    "Boshidan boshlasangiz nimani boshqacha qilardingiz?",
    "Muvaffaqiyat siz uchun nimani anglatadi?",
    "Bosim ostida qiyin qarorlarni qanday qabul qilasiz?",
    "Karyerangizdagi eng muhim dars nima?",

    // O'zbekiston va rivojlanayotgan bozorlar
    "Siz boshlaganingizdan beri O'zbekistonning texnologiya sohasi qanday o'zgardi?",
    "Hozir Markaziy Osiyoda qanday imkoniyatlar ko'ryapsiz?",
    "Nega ko'proq odamlar O'zbekistonda startup qurmaydi?",
    "O'zbekistonda qanday infratuzilma muammolariga duch keldingiz?",
    "O'zbekistondan boshqa bozorlarga kengayishni qanday o'ylaysiz?",

    // Savdo va o'sish
    "Birinchi 100 mijozingizni qanday topdingiz?",
    "O'zbekistonda sotishning eng yaxshi usuli nima?",
    "Mijoz jalb qilish xarajatini qanday o'ylaysiz?",
    "Rivojlanayotgan bozorlarda qanday marketing strategiyalari ishlaydi?",
    "Yangi bozorda foydalanuvchilar ishonchini qanday qurasiz?",
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

"use client";

import { useState, useEffect, useCallback } from "react";
import { getRandomQuestions, UI_TEXT, type Language } from "@/lib/prompts";

interface SuggestedQuestionsProps {
  onSelect: (question: string) => void;
  lang: Language;
}

export function SuggestedQuestions({ onSelect, lang }: SuggestedQuestionsProps) {
  const [questions, setQuestions] = useState<string[]>([]);

  const shuffle = useCallback(() => {
    setQuestions(getRandomQuestions(lang, 4));
  }, [lang]);

  useEffect(() => {
    shuffle();
  }, [shuffle]);

  if (questions.length === 0) return null;

  return (
    <div className="flex w-full max-w-lg flex-col items-center gap-3">
      <div className="grid w-full gap-2 sm:grid-cols-2">
        {questions.map((question) => (
          <button
            key={question}
            onClick={() => onSelect(question)}
            className="rounded-xl px-3.5 py-2.5 text-left text-[12px] leading-snug transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm"
            style={{
              background: "var(--suggestion-bg)",
              color: "var(--muted)",
              border: "1px solid var(--border)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--suggestion-hover)";
              e.currentTarget.style.color = "var(--foreground)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--suggestion-bg)";
              e.currentTarget.style.color = "var(--muted)";
            }}
          >
            {question}
          </button>
        ))}
      </div>
      <button
        onClick={shuffle}
        className="flex items-center gap-1.5 text-[11px] transition-opacity hover:opacity-100"
        style={{ color: "var(--muted)", opacity: 0.5 }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
          <path fillRule="evenodd" d="M13.836 2.477a.75.75 0 0 1 .75.75v3.182a.75.75 0 0 1-.75.75h-3.182a.75.75 0 0 1 0-1.5h1.37l-.84-.841a4.5 4.5 0 0 0-7.08.932.75.75 0 0 1-1.3-.75 6 6 0 0 1 9.44-1.242l.842.84V3.227a.75.75 0 0 1 .75-.75Zm-.911 7.5A.75.75 0 0 1 13.199 11a6 6 0 0 1-9.44 1.241l-.84-.84v1.371a.75.75 0 0 1-1.5 0V9.591a.75.75 0 0 1 .75-.75H5.35a.75.75 0 1 1 0 1.5H3.98l.841.841a4.5 4.5 0 0 0 7.08-.932.75.75 0 0 1 1.025-.273Z" clipRule="evenodd" />
        </svg>
        {UI_TEXT[lang].moreSuggestions}
      </button>
    </div>
  );
}

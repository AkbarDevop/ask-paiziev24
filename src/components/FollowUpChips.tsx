"use client";

import { useState, useEffect } from "react";
import { getRandomQuestions, type Language } from "@/lib/prompts";

interface FollowUpChipsProps {
  onSelect: (question: string) => void;
  lang: Language;
}

export function FollowUpChips({ onSelect, lang }: FollowUpChipsProps) {
  const [questions, setQuestions] = useState<string[]>([]);

  useEffect(() => {
    setQuestions(getRandomQuestions(lang, 2));
  }, [lang]);

  if (questions.length === 0) return null;

  return (
    <div className="animate-fade-in flex flex-wrap gap-2 pl-10">
      {questions.map((q) => (
        <button
          key={q}
          onClick={() => onSelect(q)}
          className="rounded-full px-3 py-1.5 text-[11px] leading-snug transition-all hover:-translate-y-0.5"
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
          {q}
        </button>
      ))}
    </div>
  );
}

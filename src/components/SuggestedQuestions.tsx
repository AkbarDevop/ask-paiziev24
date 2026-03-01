"use client";

import { SUGGESTED_QUESTIONS } from "@/lib/prompts";

interface SuggestedQuestionsProps {
  onSelect: (question: string) => void;
}

export function SuggestedQuestions({ onSelect }: SuggestedQuestionsProps) {
  return (
    <div className="grid w-full max-w-lg gap-2 sm:grid-cols-2">
      {SUGGESTED_QUESTIONS.map((question) => (
        <button
          key={question}
          onClick={() => onSelect(question)}
          className="group rounded-xl px-4 py-3 text-left text-[13px] leading-snug transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
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
          <span className="mr-1.5 inline-block opacity-40 transition-opacity group-hover:opacity-70">
            &rarr;
          </span>
          {question}
        </button>
      ))}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import type { Language } from "@/lib/prompts";
import { UI_TEXT } from "@/lib/prompts";

export function ThinkingIndicator({ lang = "en" }: { lang?: Language }) {
  const steps = UI_TEXT[lang].thinkingSteps;
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % steps.length);
        setVisible(true);
      }, 200);
    }, 2000);
    return () => clearInterval(interval);
  }, [steps.length]);

  return (
    <div className="animate-fade-in flex items-center gap-2 py-1 pl-1">
      <svg
        className="thinking-spinner h-3 w-3 shrink-0"
        style={{ color: "var(--input-focus)" }}
        viewBox="0 0 16 16"
        fill="none"
      >
        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeOpacity="0.15" />
        <path d="M14 8a6 6 0 0 0-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <span
        className="text-xs transition-all duration-200"
        style={{
          color: "var(--muted)",
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(4px)",
        }}
      >
        {steps[index]}
      </span>
    </div>
  );
}

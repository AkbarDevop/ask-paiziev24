"use client";

import { useState, useEffect } from "react";

const STEPS = [
  "Searching through interviews",
  "Reading essays and articles",
  "Browsing Telegram posts",
  "Preparing response",
];

export function ThinkingIndicator() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % STEPS.length);
        setVisible(true);
      }, 200);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

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
        {STEPS[index]}
      </span>
    </div>
  );
}

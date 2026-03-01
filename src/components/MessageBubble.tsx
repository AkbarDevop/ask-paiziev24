"use client";

import type { UIMessage } from "@ai-sdk/react";
import { AkmalAvatar } from "./AkmalAvatar";

interface MessageBubbleProps {
  message: UIMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  const text =
    message.parts
      ?.filter(
        (part): part is Extract<typeof part, { type: "text" }> =>
          part.type === "text"
      )
      .map((part) => part.text)
      .join("") || "";

  if (!text) return null;

  return (
    <div
      className={`animate-fade-in flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      {/* Avatar */}
      {!isUser && (
        <div className="mt-1 shrink-0">
          <AkmalAvatar size="sm" />
        </div>
      )}

      {/* Bubble */}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-[14px] leading-relaxed ${
          isUser
            ? "bg-[var(--accent)] text-white dark:text-zinc-900"
            : "bg-[var(--card)] text-[var(--foreground)] shadow-sm ring-1 ring-[var(--border)]"
        }`}
      >
        <p className="whitespace-pre-wrap">{text}</p>
      </div>
    </div>
  );
}

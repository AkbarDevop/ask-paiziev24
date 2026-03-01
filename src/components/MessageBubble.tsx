"use client";

import type { UIMessage } from "@ai-sdk/react";
import ReactMarkdown from "react-markdown";
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
      {!isUser && (
        <div className="mt-1 shrink-0">
          <AkmalAvatar size="sm" />
        </div>
      )}

      <div
        className="max-w-[80%] rounded-2xl px-4 py-3 text-[14px] leading-relaxed"
        style={
          isUser
            ? { background: "var(--user-bubble)", color: "var(--user-text)" }
            : {
                background: "var(--ai-bubble)",
                color: "var(--ai-text)",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                border: "1px solid var(--border)",
              }
        }
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{text}</p>
        ) : (
          <div className="prose-sm max-w-none">
            <ReactMarkdown
              components={{
                p: ({ children }) => (
                  <p className="mb-3 last:mb-0" style={{ color: "inherit" }}>
                    {children}
                  </p>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold" style={{ color: "inherit" }}>
                    {children}
                  </strong>
                ),
                em: ({ children }) => (
                  <em style={{ color: "inherit" }}>{children}</em>
                ),
                ul: ({ children }) => (
                  <ul className="mb-3 ml-4 list-disc space-y-1 last:mb-0">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="mb-3 ml-4 list-decimal space-y-1 last:mb-0">
                    {children}
                  </ol>
                ),
                li: ({ children }) => (
                  <li style={{ color: "inherit" }}>{children}</li>
                ),
                h1: ({ children }) => (
                  <h3 className="mb-2 mt-4 text-base font-bold first:mt-0" style={{ color: "inherit" }}>
                    {children}
                  </h3>
                ),
                h2: ({ children }) => (
                  <h3 className="mb-2 mt-4 text-base font-bold first:mt-0" style={{ color: "inherit" }}>
                    {children}
                  </h3>
                ),
                h3: ({ children }) => (
                  <h4 className="mb-2 mt-3 text-sm font-semibold first:mt-0" style={{ color: "inherit" }}>
                    {children}
                  </h4>
                ),
                blockquote: ({ children }) => (
                  <blockquote
                    className="my-2 border-l-2 pl-3 italic"
                    style={{ borderColor: "var(--border)", opacity: 0.85 }}
                  >
                    {children}
                  </blockquote>
                ),
                code: ({ children }) => (
                  <code
                    className="rounded px-1 py-0.5 text-[13px]"
                    style={{ background: "var(--border)" }}
                  >
                    {children}
                  </code>
                ),
                a: ({ href, children }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2"
                    style={{ color: "var(--input-focus)" }}
                  >
                    {children}
                  </a>
                ),
              }}
            >
              {text}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

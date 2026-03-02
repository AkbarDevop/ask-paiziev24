"use client";

import { useState, useCallback } from "react";
import type { UIMessage } from "@ai-sdk/react";
import ReactMarkdown from "react-markdown";
import { AkmalAvatar } from "./AkmalAvatar";

interface MessageBubbleProps {
  message: UIMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  const text =
    message.parts
      ?.filter(
        (part): part is Extract<typeof part, { type: "text" }> =>
          part.type === "text"
      )
      .map((part) => part.text)
      .join("") || "";

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [text]);

  const handleShare = useCallback(async () => {
    const shareData = {
      title: "Ask Akmal",
      text: `Akmal Paiziev: "${text.slice(0, 280)}${text.length > 280 ? "..." : ""}"`,
      url: window.location.href,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // User cancelled share
      }
    } else {
      await navigator.clipboard.writeText(
        `${shareData.text}\n\n${shareData.url}`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }, [text]);

  if (!text) return null;

  return (
    <div
      className={`group animate-fade-in flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      {!isUser && (
        <div className="mt-1 shrink-0">
          <AkmalAvatar size="sm" />
        </div>
      )}

      <div className="flex max-w-[88%] flex-col gap-1 sm:max-w-[80%]">
        <div
          className={`rounded-2xl px-4 py-3 text-[14px] leading-relaxed ${isUser ? "rounded-tr-sm" : "rounded-tl-sm"}`}
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

        {/* Action buttons for AI messages */}
        {!isUser && (
          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] transition-colors"
              style={{ color: "var(--muted)" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "var(--suggestion-hover)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              {copied ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
                    <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
                  </svg>
                  Copied
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
                    <path d="M5.5 3.5A1.5 1.5 0 0 1 7 2h2.879a1.5 1.5 0 0 1 1.06.44l2.122 2.12a1.5 1.5 0 0 1 .439 1.061V9.5A1.5 1.5 0 0 1 12 11V8.621a3 3 0 0 0-.879-2.121L9 4.379A3 3 0 0 0 6.879 3.5H5.5Z" />
                    <path d="M4 5a1.5 1.5 0 0 0-1.5 1.5v6A1.5 1.5 0 0 0 4 14h5a1.5 1.5 0 0 0 1.5-1.5V8.621a1.5 1.5 0 0 0-.44-1.06L7.94 5.439A1.5 1.5 0 0 0 6.878 5H4Z" />
                  </svg>
                  Copy
                </>
              )}
            </button>
            <button
              onClick={handleShare}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] transition-colors"
              style={{ color: "var(--muted)" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "var(--suggestion-hover)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
                <path d="M12 2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H9.414l-1-1H12V3H4v2h1.586l-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h8Z" />
                <path d="M5.354 9.354a.5.5 0 0 1-.708-.708l3-3a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 7.207V14a.5.5 0 0 1-1 0V7.207L5.354 9.354Z" />
              </svg>
              Share
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

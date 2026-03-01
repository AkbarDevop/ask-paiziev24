"use client";

import { useChat } from "@ai-sdk/react";
import { useRef, useEffect, useState, type FormEvent } from "react";
import { AkmalAvatar } from "./AkmalAvatar";
import { SuggestedQuestions } from "./SuggestedQuestions";
import { MessageBubble } from "./MessageBubble";

export function ChatInterface() {
  const { messages, sendMessage, status } = useChat();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isLoading = status === "streaming" || status === "submitted";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input });
    setInput("");
  };

  const handleSuggestedQuestion = (question: string) => {
    sendMessage({ text: question });
  };

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ background: "var(--background)" }}
    >
      {/* Chat messages area */}
      <div className="flex-1 overflow-y-auto px-4 pb-36 pt-8">
        <div className="mx-auto max-w-2xl space-y-5">
          {/* Hero */}
          {messages.length === 0 && (
            <div className="flex flex-col items-center gap-10 pt-16">
              <AkmalAvatar size="lg" />
              <SuggestedQuestions onSelect={handleSuggestedQuestion} />
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                Powered by Gemini &middot; Context from public interviews &
                writings
              </p>
            </div>
          )}

          {/* Messages */}
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}

          {/* Typing indicator */}
          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <div className="animate-fade-in flex items-center gap-3">
              <div className="mt-1 shrink-0">
                <AkmalAvatar size="sm" />
              </div>
              <div
                className="rounded-2xl px-4 py-3"
                style={{
                  background: "var(--ai-bubble)",
                  border: "1px solid var(--border)",
                }}
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className="h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:-0.3s]"
                    style={{ background: "var(--muted)" }}
                  />
                  <span
                    className="h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:-0.15s]"
                    style={{ background: "var(--muted)" }}
                  />
                  <span
                    className="h-1.5 w-1.5 animate-bounce rounded-full"
                    style={{ background: "var(--muted)" }}
                  />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <div
        className="fixed bottom-0 left-0 right-0 backdrop-blur-xl"
        style={{
          background: "var(--footer-bar)",
          borderTop: "1px solid var(--border)",
        }}
      >
        <form
          onSubmit={handleSubmit}
          className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-4"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Akmal anything..."
            className="flex-1 rounded-xl px-4 py-3 text-sm outline-none transition-all"
            style={{
              background: "var(--input-bg)",
              color: "var(--foreground)",
              border: "1px solid var(--input-border)",
            }}
            onFocus={(e) =>
              (e.target.style.borderColor = "var(--input-focus)")
            }
            onBlur={(e) =>
              (e.target.style.borderColor = "var(--input-border)")
            }
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-opacity disabled:opacity-30"
            style={{ background: "var(--user-bubble)", color: "var(--user-text)" }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4"
            >
              <path d="M3.105 2.288a.75.75 0 0 0-.826.95l1.414 4.926A1.5 1.5 0 0 0 5.135 9.25h6.115a.75.75 0 0 1 0 1.5H5.135a1.5 1.5 0 0 0-1.442 1.086l-1.414 4.926a.75.75 0 0 0 .826.95 28.897 28.897 0 0 0 15.293-7.155.75.75 0 0 0 0-1.114A28.897 28.897 0 0 0 3.105 2.288Z" />
            </svg>
          </button>
        </form>
        <p
          className="pb-3 text-center text-[11px]"
          style={{ color: "var(--muted)", opacity: 0.6 }}
        >
          AI simulation — not affiliated with Akmal Paiziev. Based on publicly
          available content.
        </p>
      </div>
    </div>
  );
}

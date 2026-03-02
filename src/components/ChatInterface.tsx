"use client";

import { useChat } from "@ai-sdk/react";
import {
  useRef,
  useEffect,
  useState,
  useCallback,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import Image from "next/image";
import { AkmalAvatar } from "./AkmalAvatar";
import { SuggestedQuestions } from "./SuggestedQuestions";
import { MessageBubble } from "./MessageBubble";
import { ThinkingIndicator } from "./ThinkingIndicator";
import { UI_TEXT, type Language } from "@/lib/prompts";

export function ChatInterface() {
  const [lang, setLang] = useState<Language>("en");
  const { messages, sendMessage, setMessages, status, error } = useChat();
  const [input, setInput] = useState("");
  const [lastFailedInput, setLastFailedInput] = useState("");
  const [showThinking, setShowThinking] = useState(false);
  const thinkingTimer = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const t = UI_TEXT[lang];
  const isLoading = status === "streaming" || status === "submitted";
  const isWaiting = status === "submitted"; // waiting for first token

  // Only show thinking after a brief delay — if response streams fast, skip it entirely
  useEffect(() => {
    if (isWaiting) {
      thinkingTimer.current = setTimeout(() => setShowThinking(true), 400);
    } else {
      if (thinkingTimer.current) clearTimeout(thinkingTimer.current);
      setShowThinking(false);
    }
    return () => {
      if (thinkingTimer.current) clearTimeout(thinkingTimer.current);
    };
  }, [isWaiting]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  const resizeTextarea = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    // Cap at ~4 lines (approx 96px)
    textarea.style.height = Math.min(textarea.scrollHeight, 96) + "px";
  }, []);

  useEffect(() => {
    resizeTextarea();
  }, [input, resizeTextarea]);

  const submitMessage = (text: string) => {
    if (!text.trim() || isLoading) return;
    setLastFailedInput(text);
    const prefix = lang === "uz" ? "[Respond in Uzbek / O'zbek tilida javob bering]\n" : "";
    sendMessage({ text: prefix + text });
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    submitMessage(input);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submitMessage(input);
    }
  };

  const handleRetry = () => {
    if (lastFailedInput) {
      const retryText = lastFailedInput;
      // Remove the failed user message, then retry on next tick
      setMessages((prev) => prev.slice(0, -1));
      setTimeout(() => {
        sendMessage({ text: retryText });
      }, 100);
    }
  };

  const getErrorMessage = (err: Error) => {
    const msg = err.message || "";
    if (msg.includes("429") || msg.toLowerCase().includes("rate"))
      return t.errorRate;
    if (msg.includes("500") || msg.includes("503"))
      return t.errorServer;
    return t.errorGeneric;
  };

  const handleSuggestedQuestion = (question: string) => {
    const prefix = lang === "uz" ? "[Respond in Uzbek / O'zbek tilida javob bering]\n" : "";
    sendMessage({ text: prefix + question });
  };

  const handleNewChat = () => {
    setMessages([]);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ background: "var(--background)" }}
    >
      {/* Sticky header */}
      <header
        className="sticky top-0 z-10 backdrop-blur-xl"
        style={{
          background: "var(--footer-bar)",
          borderBottom: "1px solid var(--border)",
          paddingTop: "env(safe-area-inset-top)",
        }}
      >
        <div className="mx-auto flex max-w-2xl items-center justify-between px-3 py-2.5 sm:px-4 sm:py-3">
          <button
            onClick={handleNewChat}
            className="flex items-center gap-2.5 transition-opacity hover:opacity-75"
          >
            <Image
              src="/akmal.jpg"
              alt="Akmal Paiziev"
              width={28}
              height={28}
              className="rounded-full ring-1 ring-[var(--border)]"
            />
            <span
              className="text-sm font-semibold tracking-tight"
              style={{ color: "var(--foreground)" }}
            >
              {lang === "en" ? "Ask Akmal" : "Akmalga savol"}
            </span>
          </button>
          <div className="flex items-center gap-2">
            {/* Language toggle */}
            <div
              className="flex overflow-hidden rounded-lg text-[11px] font-medium"
              style={{ border: "1px solid var(--border)" }}
            >
              <button
                onClick={() => setLang("en")}
                className="px-2.5 py-1.5 transition-colors"
                style={{
                  background:
                    lang === "en" ? "var(--user-bubble)" : "transparent",
                  color:
                    lang === "en" ? "var(--user-text)" : "var(--muted)",
                }}
              >
                EN
              </button>
              <button
                onClick={() => setLang("uz")}
                className="px-2.5 py-1.5 transition-colors"
                style={{
                  background:
                    lang === "uz" ? "var(--user-bubble)" : "transparent",
                  color:
                    lang === "uz" ? "var(--user-text)" : "var(--muted)",
                }}
              >
                UZ
              </button>
            </div>
            {messages.length > 0 && (
              <button
                onClick={handleNewChat}
                className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                style={{
                  color: "var(--muted)",
                  border: "1px solid var(--border)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--suggestion-hover)";
                  e.currentTarget.style.color = "var(--foreground)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--muted)";
                }}
              >
                {t.newChat}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Chat messages area */}
      <div className="chat-bg flex-1 overflow-y-auto px-3 pb-28 pt-4 sm:px-4 sm:pb-32 sm:pt-6">
        <div className="mx-auto max-w-2xl space-y-5">
          {/* Hero */}
          {messages.length === 0 && (
            <div className="hero-glow flex flex-col items-center gap-8 pt-8 sm:gap-10 sm:pt-12">
              <AkmalAvatar size="lg" lang={lang} />
              <SuggestedQuestions onSelect={handleSuggestedQuestion} lang={lang} />
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                {t.poweredBy}
              </p>
            </div>
          )}

          {/* Messages */}
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} lang={lang} />
          ))}

          {/* Thinking indicator — only shows if there's actual latency */}
          {showThinking && messages[messages.length - 1]?.role === "user" && (
            <ThinkingIndicator lang={lang} />
          )}

          {/* Error message */}
          {error && (
            <div className="animate-fade-in flex items-start gap-3">
              <div className="mt-1 shrink-0">
                <AkmalAvatar size="sm" />
              </div>
              <div
                className="flex flex-col gap-2 rounded-2xl rounded-tl-sm px-4 py-3 text-sm"
                style={{
                  background: "var(--ai-bubble)",
                  border: "1px solid var(--border)",
                  color: "var(--ai-text)",
                }}
              >
                <p style={{ opacity: 0.8 }}>{getErrorMessage(error)}</p>
                <button
                  onClick={handleRetry}
                  className="flex w-fit items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                  style={{
                    color: "var(--input-focus)",
                    border: "1px solid var(--border)",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background =
                      "var(--suggestion-hover)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
                    <path fillRule="evenodd" d="M13.836 2.477a.75.75 0 0 1 .75.75v3.182a.75.75 0 0 1-.75.75h-3.182a.75.75 0 0 1 0-1.5h1.37l-.84-.841a4.5 4.5 0 0 0-7.08.932.75.75 0 0 1-1.3-.75 6 6 0 0 1 9.44-1.242l.842.84V3.227a.75.75 0 0 1 .75-.75Zm-.911 7.5A.75.75 0 0 1 13.199 11a6 6 0 0 1-9.44 1.241l-.84-.84v1.371a.75.75 0 0 1-1.5 0V9.591a.75.75 0 0 1 .75-.75H5.35a.75.75 0 1 1 0 1.5H3.98l.841.841a4.5 4.5 0 0 0 7.08-.932.75.75 0 0 1 1.025-.273Z" clipRule="evenodd" />
                  </svg>
                  {t.tryAgain}
                </button>
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
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <form
          onSubmit={handleSubmit}
          className="mx-auto flex max-w-2xl items-end gap-2 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3"
        >
          <div className="relative flex-1">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t.placeholder}
              rows={1}
              className="w-full resize-none rounded-xl px-3 py-2.5 text-[14px] outline-none transition-all sm:px-4 sm:py-3 sm:text-sm"
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
          </div>
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-30 disabled:hover:scale-100"
            style={{
              background: "var(--user-bubble)",
              color: "var(--user-text)",
            }}
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
        <div className="flex items-center justify-center gap-2 pb-2 sm:pb-3">
          <p
            className="text-center text-[10px] sm:text-[11px]"
            style={{ color: "var(--muted)", opacity: 0.6 }}
          >
            {t.disclaimer}
          </p>
          <span
            className="hidden text-[11px] sm:inline"
            style={{ color: "var(--muted)", opacity: 0.3 }}
          >
            &middot;
          </span>
          <p
            className="hidden text-[11px] sm:block"
            style={{ color: "var(--muted)", opacity: 0.4 }}
          >
            {t.inputHint}
          </p>
        </div>
      </div>
    </div>
  );
}

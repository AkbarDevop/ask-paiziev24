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
import { FollowUpChips } from "./FollowUpChips";
import { UI_TEXT, type Language } from "@/lib/prompts";

type AnalyticsPayload = Record<string, string | number | boolean>;

function pushAnalyticsEvent(event: string, payload: AnalyticsPayload = {}) {
  if (typeof window === "undefined") return;
  const windowWithDataLayer = window as typeof window & {
    dataLayer?: Array<Record<string, unknown>>;
  };
  windowWithDataLayer.dataLayer = windowWithDataLayer.dataLayer || [];
  windowWithDataLayer.dataLayer.push({ event, ...payload });
}

export function ChatInterface() {
  const [lang, setLang] = useState<Language>("en");
  const { messages, sendMessage, setMessages, status, error } = useChat();
  const [input, setInput] = useState("");
  const [lastFailedInput, setLastFailedInput] = useState("");
  const [showThinking, setShowThinking] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const thinkingTimer = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatAreaRef = useRef<HTMLDivElement>(null);
  const restoredRef = useRef(false);
  const hadAssistantResponseRef = useRef(false);

  const t = UI_TEXT[lang];
  const isLoading = status === "streaming" || status === "submitted";
  const isWaiting = status === "submitted"; // waiting for first token
  const lastMessage = messages[messages.length - 1];
  const showFollowUps =
    !isLoading && messages.length > 0 && lastMessage?.role === "assistant";

  // Check if streaming has started but no assistant text yet
  const lastAssistantText =
    lastMessage?.role === "assistant"
      ? lastMessage.parts
          ?.filter(
            (p): p is Extract<typeof p, { type: "text" }> => p.type === "text"
          )
          .map((p) => p.text)
          .join("") || ""
      : "";
  const isStreamingEmpty = status === "streaming" && lastAssistantText.length === 0;

  // Restore chat, language, and theme from localStorage on mount
  useEffect(() => {
    try {
      const savedChat = localStorage.getItem("ask-akmal-chat");
      if (savedChat) {
        const parsed = JSON.parse(savedChat);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      }
      const savedLang = localStorage.getItem("ask-akmal-lang");
      if (savedLang === "en" || savedLang === "uz") setLang(savedLang);

      const savedTheme = localStorage.getItem("ask-akmal-theme");
      if (savedTheme === "light" || savedTheme === "dark") {
        setTheme(savedTheme);
        document.documentElement.dataset.theme = savedTheme;
      } else {
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        const detected = prefersDark ? "dark" : "light";
        setTheme(detected);
        document.documentElement.dataset.theme = detected;
      }
    } catch {}
    restoredRef.current = true;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist messages to localStorage
  useEffect(() => {
    if (!restoredRef.current) return;
    if (messages.length > 0) {
      localStorage.setItem("ask-akmal-chat", JSON.stringify(messages));
    } else {
      localStorage.removeItem("ask-akmal-chat");
    }
  }, [messages]);

  // Track first meaningful response to measure successful chat engagement
  useEffect(() => {
    if (hadAssistantResponseRef.current) return;
    const hasAssistantText = messages.some(
      (message) =>
        message.role === "assistant" &&
        message.parts?.some((part) => part.type === "text" && part.text.trim().length > 0)
    );
    if (hasAssistantText) {
      hadAssistantResponseRef.current = true;
      pushAnalyticsEvent("askpaiziev_first_response", {
        language: lang,
      });
    }
  }, [messages, lang]);

  // Persist language preference
  useEffect(() => {
    if (!restoredRef.current) return;
    localStorage.setItem("ask-akmal-lang", lang);
    pushAnalyticsEvent("askpaiziev_language_change", { language: lang });
  }, [lang]);

  // Show thinking indicator shortly after submission, hide once text appears
  useEffect(() => {
    if (isWaiting || isStreamingEmpty) {
      thinkingTimer.current = setTimeout(() => setShowThinking(true), 150);
    } else {
      if (thinkingTimer.current) clearTimeout(thinkingTimer.current);
      setShowThinking(false);
    }
    return () => {
      if (thinkingTimer.current) clearTimeout(thinkingTimer.current);
    };
  }, [isWaiting, isStreamingEmpty]);

  useEffect(() => {
    // Scroll the chat container to bottom instead of scrollIntoView
    // to avoid the first message being hidden behind the sticky header
    const el = chatAreaRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [messages]);

  // Scroll-to-bottom button visibility
  useEffect(() => {
    const el = chatAreaRef.current;
    if (!el) return;
    const handleScroll = () => {
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      setShowScrollBtn(distanceFromBottom > 120);
    };
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

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
    pushAnalyticsEvent("askpaiziev_prompt_submit", {
      language: lang,
      prompt_length: text.trim().length,
      source: "typed",
    });
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
      pushAnalyticsEvent("askpaiziev_retry_click", {
        language: lang,
        prompt_length: retryText.trim().length,
      });
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
    pushAnalyticsEvent("askpaiziev_prompt_submit", {
      language: lang,
      prompt_length: question.trim().length,
      source: "suggested",
    });
    const prefix = lang === "uz" ? "[Respond in Uzbek / O'zbek tilida javob bering]\n" : "";
    sendMessage({ text: prefix + question });
  };

  const toggleTheme = useCallback(() => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    localStorage.setItem("ask-akmal-theme", next);
    pushAnalyticsEvent("askpaiziev_theme_toggle", { theme: next });
  }, [theme]);

  const scrollToBottom = useCallback(() => {
    chatAreaRef.current?.scrollTo({
      top: chatAreaRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, []);

  const handleNewChat = () => {
    pushAnalyticsEvent("askpaiziev_new_chat", {
      language: lang,
      message_count: messages.length,
    });
    setMessages([]);
    localStorage.removeItem("ask-akmal-chat");
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  useEffect(() => {
    pushAnalyticsEvent("askpaiziev_view", {
      page_path: window.location.pathname,
      page_title: document.title,
      language: lang,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
              Ask Akmal
            </span>
          </button>
          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors sm:h-8 sm:w-8"
              style={{ color: "var(--muted)", border: "1px solid var(--border)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--suggestion-hover)";
                e.currentTarget.style.color = "var(--foreground)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--muted)";
              }}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-3.5 w-3.5">
                  <circle cx="12" cy="12" r="5" />
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>
            {/* Language toggle */}
            <div
              className="flex overflow-hidden rounded-lg text-[11px] font-medium"
              style={{ border: "1px solid var(--border)" }}
            >
              <button
                onClick={() => setLang("en")}
                className="min-h-[36px] px-2.5 py-1.5 transition-colors"
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
                className="min-h-[36px] px-2.5 py-1.5 transition-colors"
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
                className="flex min-h-[36px] items-center justify-center rounded-lg px-2 py-1.5 text-xs font-medium transition-colors sm:px-3"
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
                aria-label={t.newChat}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 sm:mr-1.5">
                  <path d="M3.75 2a.75.75 0 0 0-.75.75v10.5a.75.75 0 0 0 1.28.53L8 10.06l3.72 3.72a.75.75 0 0 0 1.28-.53V2.75A.75.75 0 0 0 12.25 2h-8.5ZM8 3.5a.75.75 0 0 1 .75.75v1.5h1.5a.75.75 0 0 1 0 1.5h-1.5v1.5a.75.75 0 0 1-1.5 0v-1.5h-1.5a.75.75 0 0 1 0-1.5h1.5v-1.5A.75.75 0 0 1 8 3.5Z" />
                </svg>
                <span className="hidden sm:inline">{t.newChat}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Chat messages area */}
      <div ref={chatAreaRef} className="chat-bg flex-1 overflow-y-auto px-3 pb-28 pt-4 sm:px-4 sm:pb-32 sm:pt-6">
        <div className="mx-auto max-w-2xl space-y-5">
          {/* Hero */}
          {messages.length === 0 && (
            <div className="hero-glow flex flex-col items-center gap-6 pt-6 sm:gap-10 sm:pt-12">
              <AkmalAvatar size="lg" lang={lang} />
              <SuggestedQuestions onSelect={handleSuggestedQuestion} lang={lang} />
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                {t.poweredBy}
              </p>
            </div>
          )}

          {/* Messages */}
          {messages.map((message, index) => (
            <MessageBubble
              key={message.id}
              message={message}
              lang={lang}
              isStreaming={
                isLoading &&
                index === messages.length - 1 &&
                message.role === "assistant"
              }
            />
          ))}

          {/* Thinking indicator — shows while waiting for response */}
          {showThinking && (
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
                  className="flex w-fit items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors sm:px-3 sm:py-1.5 sm:text-xs"
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

          {/* Follow-up suggestion chips */}
          {showFollowUps && (
            <FollowUpChips onSelect={handleSuggestedQuestion} lang={lang} />
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Scroll to bottom button */}
      {showScrollBtn && (
        <button
          onClick={scrollToBottom}
          className="fixed bottom-20 right-4 z-20 flex h-10 w-10 items-center justify-center rounded-full shadow-lg transition-all hover:scale-110 active:scale-95 animate-fade-in sm:bottom-28 sm:h-9 sm:w-9"
          style={{
            background: "var(--ai-bubble)",
            border: "1px solid var(--border)",
            color: "var(--muted)",
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
            <path fillRule="evenodd" d="M8 2a.75.75 0 0 1 .75.75v8.69l3.22-3.22a.75.75 0 1 1 1.06 1.06l-4.5 4.5a.75.75 0 0 1-1.06 0l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.22 3.22V2.75A.75.75 0 0 1 8 2Z" clipRule="evenodd" />
          </svg>
        </button>
      )}

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
              className="w-full resize-none rounded-xl px-3 py-2.5 text-base outline-none transition-all sm:px-4 sm:py-3 sm:text-[14px]"
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
            className="text-[10px] sm:text-[11px]"
            style={{ color: "var(--muted)", opacity: 0.3 }}
          >
            &middot;
          </span>
          <a
            href="https://akbar.one"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] sm:text-[11px] transition-opacity hover:opacity-80"
            style={{ color: "var(--muted)", opacity: 0.5 }}
          >
            Built by akbar.one
          </a>
        </div>
      </div>
    </div>
  );
}

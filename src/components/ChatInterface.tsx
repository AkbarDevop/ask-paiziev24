"use client";

import type { UIMessage } from "@ai-sdk/react";
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
type ChatStatus = "ready" | "submitted" | "streaming";
type ChatRequestMessage = { role: "user" | "assistant"; content: string };
type TextPart = { type: "text"; text: string };
type SourceUrlPart = {
  type: "source-url";
  sourceId: string;
  sourceType?: string;
  url?: string;
  title?: string;
};

function pushAnalyticsEvent(event: string, payload: AnalyticsPayload = {}) {
  if (typeof window === "undefined") return;
  const windowWithDataLayer = window as typeof window & {
    dataLayer?: Array<Record<string, unknown>>;
  };
  windowWithDataLayer.dataLayer = windowWithDataLayer.dataLayer || [];
  windowWithDataLayer.dataLayer.push({ event, ...payload });
}

function getMessageText(message: UIMessage): string {
  return (
    message.parts
      ?.filter(
        (part): part is Extract<typeof part, { type: "text" }> =>
          part.type === "text"
      )
      .map((part) => part.text)
      .join("") || ""
  );
}

function createMessage(role: "user" | "assistant", text = ""): UIMessage {
  const parts = text ? ([{ type: "text", text }] as TextPart[]) : [];
  return {
    id: crypto.randomUUID(),
    role,
    parts,
  } as UIMessage;
}

function toRequestMessages(messages: UIMessage[]): ChatRequestMessage[] {
  return messages.map((message) => ({
    role: message.role === "assistant" ? "assistant" : "user",
    content: getMessageText(message),
  }));
}

function normalizeStoredMessages(raw: unknown): UIMessage[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((message) => {
      if (!message || typeof message !== "object") return null;

      const candidate = message as {
        id?: unknown;
        role?: unknown;
        content?: unknown;
        parts?: unknown;
      };

      const role = candidate.role === "assistant" ? "assistant" : "user";
      const parts = Array.isArray(candidate.parts)
        ? candidate.parts
            .filter((part): part is TextPart | SourceUrlPart =>
              Boolean(part) && typeof part === "object" && "type" in part
            )
        : typeof candidate.content === "string" && candidate.content.trim()
          ? ([{ type: "text", text: candidate.content }] as TextPart[])
          : [];

      return {
        id: typeof candidate.id === "string" ? candidate.id : crypto.randomUUID(),
        role,
        parts,
      } as UIMessage;
    })
    .filter((message): message is UIMessage => message !== null);
}

export function ChatInterface() {
  const [lang, setLang] = useState<Language>("en");
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>("ready");
  const [error, setError] = useState<Error>();
  const [input, setInput] = useState("");
  const [lastFailedInput, setLastFailedInput] = useState("");
  const [showThinking, setShowThinking] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const thinkingTimer = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatAreaRef = useRef<HTMLDivElement>(null);
  const restoredRef = useRef(false);
  const hadAssistantResponseRef = useRef(false);
  const sessionStartMsRef = useRef(Date.now());
  const responseStartMsRef = useRef<number | null>(null);
  const responseTrackedRef = useRef(false);
  const lastPromptSourceRef = useRef<"typed" | "suggested" | "retry" | "change_response">("typed");
  const seenScrollDepthRef = useRef<Set<number>>(new Set());
  const engagementTimersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const latestLangRef = useRef<Language>(lang);
  const latestMessageCountRef = useRef(messages.length);

  const t = UI_TEXT[lang];
  const isLoading = status === "streaming" || status === "submitted";
  const isWaiting = status === "submitted"; // waiting for first token
  const lastMessage = messages[messages.length - 1];
  const showFollowUps =
    !isLoading && messages.length > 0 && lastMessage?.role === "assistant";
  const clearError = useCallback(() => setError(undefined), []);

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
  const lastUserQuestion =
    [...messages]
      .reverse()
      .find((message) => message.role === "user")
      ?.parts
      ?.filter(
        (part): part is Extract<typeof part, { type: "text" }> => part.type === "text"
      )
      .map((part) => part.text)
      .join("")
      .replace(/^\[Respond in Uzbek \/ O'zbek tilida javob bering\]\n/, "") || "";
  const isStreamingEmpty = status === "streaming" && lastAssistantText.length === 0;

  useEffect(() => {
    latestLangRef.current = lang;
  }, [lang]);

  useEffect(() => {
    latestMessageCountRef.current = messages.length;
  }, [messages.length]);

  useEffect(() => {
    if (error && lastMessage?.role === "assistant" && lastAssistantText.trim().length > 0) {
      clearError();
    }
  }, [clearError, error, lastAssistantText, lastMessage?.role]);

  // Restore chat, language, and theme from localStorage on mount
  useEffect(() => {
    try {
      const savedChat = localStorage.getItem("ask-akmal-chat");
      if (savedChat) {
        const parsed = JSON.parse(savedChat);
        const normalized = normalizeStoredMessages(parsed);
        if (normalized.length > 0) {
          setMessages(normalized);
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

  const streamAssistantResponse = useCallback(
    async (conversation: UIMessage[]) => {
      abortControllerRef.current?.abort();

      const controller = new AbortController();
      abortControllerRef.current = controller;
      clearError();
      setStatus("submitted");

      const assistantMessage = createMessage("assistant");
      const assistantId = assistantMessage.id;
      let sourceParts: SourceUrlPart[] = [];
      let textParts: Array<{ id: string; text: string }> = [];
      const seenSources = new Set<string>();

      const syncAssistantMessage = () => {
        const nextParts = [
          ...sourceParts,
          ...textParts.map((part) => ({ type: "text", text: part.text } as TextPart)),
        ];

        setMessages((current) =>
          current.map((message) =>
            message.id === assistantId
              ? ({ ...message, parts: nextParts } as UIMessage)
              : message
          )
        );
      };

      setMessages([...conversation, assistantMessage]);

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: toRequestMessages(conversation),
          }),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          const body = await response.text().catch(() => "");
          throw new Error(body || `Request failed with status ${response.status}`);
        }

        setStatus("streaming");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        const processEvent = (payload: string) => {
          if (!payload || payload === "[DONE]") return;

          const event = JSON.parse(payload) as
            | { type: "source-url"; sourceId: string; sourceType?: string; url?: string; title?: string }
            | { type: "text-start"; id: string }
            | { type: "text-delta"; id: string; delta: string }
            | { type: string };

          switch (event.type) {
            case "source-url": {
              if (seenSources.has(event.sourceId)) return;
              seenSources.add(event.sourceId);
              sourceParts = [
                ...sourceParts,
                {
                  type: "source-url",
                  sourceId: event.sourceId,
                  sourceType: event.sourceType,
                  url: event.url,
                  title: event.title,
                },
              ];
              syncAssistantMessage();
              return;
            }
            case "text-start": {
              if (!textParts.some((part) => part.id === event.id)) {
                textParts = [...textParts, { id: event.id, text: "" }];
                syncAssistantMessage();
              }
              return;
            }
            case "text-delta": {
              const existingIndex = textParts.findIndex((part) => part.id === event.id);
              if (existingIndex === -1) {
                textParts = [...textParts, { id: event.id, text: event.delta }];
              } else {
                const nextTextParts = [...textParts];
                nextTextParts[existingIndex] = {
                  ...nextTextParts[existingIndex],
                  text: nextTextParts[existingIndex].text + event.delta,
                };
                textParts = nextTextParts;
              }
              syncAssistantMessage();
              return;
            }
            default:
              return;
          }
        };

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const chunks = buffer.split("\n\n");
          buffer = chunks.pop() ?? "";

          for (const chunk of chunks) {
            const lines = chunk
              .split(/\r?\n/)
              .filter((line) => line.startsWith("data:"))
              .map((line) => line.slice(5).trim());

            for (const line of lines) {
              processEvent(line);
            }
          }
        }

        const trailing = decoder.decode();
        if (trailing) {
          buffer += trailing;
        }

        if (buffer.trim()) {
          const lines = buffer
            .split(/\r?\n/)
            .filter((line) => line.startsWith("data:"))
            .map((line) => line.slice(5).trim());

          for (const line of lines) {
            processEvent(line);
          }
        }

        setStatus("ready");
      } catch (streamError) {
        if (controller.signal.aborted) {
          setStatus("ready");
          return;
        }

        setStatus("ready");
        setError(
          streamError instanceof Error
            ? streamError
            : new Error("Something went wrong. Please try again.")
        );
        setMessages((current) =>
          current.filter((message) => {
            if (message.id !== assistantId) return true;
            return (message.parts?.length ?? 0) > 0;
          })
        );
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
      }
    },
    [clearError]
  );

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

  const trackScrollDepth = useCallback(() => {
    const el = chatAreaRef.current;
    if (!el) return;
    const maxScrollable = el.scrollHeight - el.clientHeight;
    if (maxScrollable <= 0) return;
    const scrollPercent = Math.round((el.scrollTop / maxScrollable) * 100);
    [25, 50, 75, 90].forEach((threshold) => {
      if (scrollPercent >= threshold && !seenScrollDepthRef.current.has(threshold)) {
        seenScrollDepthRef.current.add(threshold);
        pushAnalyticsEvent("askpaiziev_scroll_depth", {
          scroll_percent: threshold,
          language: latestLangRef.current,
          message_count: latestMessageCountRef.current,
        });
      }
    });
  }, []);

  useEffect(() => {
    // Scroll the chat container to bottom instead of scrollIntoView
    // to avoid the first message being hidden behind the sticky header
    const el = chatAreaRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    requestAnimationFrame(trackScrollDepth);
    setTimeout(trackScrollDepth, 220);
  }, [messages, trackScrollDepth]);

  // Scroll-to-bottom button visibility
  useEffect(() => {
    const el = chatAreaRef.current;
    if (!el) return;
    const handleScroll = () => {
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      setShowScrollBtn(distanceFromBottom > 120);
      trackScrollDepth();
    };
    el.addEventListener("scroll", handleScroll, { passive: true });
    requestAnimationFrame(handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, [trackScrollDepth]);

  // Engagement checkpoints to segment how long users stay in a session.
  useEffect(() => {
    const checkpointsInSeconds = [30, 60, 180];
    engagementTimersRef.current = checkpointsInSeconds.map((seconds) =>
      setTimeout(() => {
        pushAnalyticsEvent("askpaiziev_engaged_time", {
          engaged_seconds: seconds,
          language: latestLangRef.current,
          message_count: latestMessageCountRef.current,
        });
      }, seconds * 1000)
    );
    return () => {
      engagementTimersRef.current.forEach((timerId) => clearTimeout(timerId));
    };
  }, []);

  useEffect(() => {
    const handlePageHide = () => {
      const secondsSpent = Math.round((Date.now() - sessionStartMsRef.current) / 1000);
      pushAnalyticsEvent("askpaiziev_session_time", {
        seconds_spent: secondsSpent,
        language: latestLangRef.current,
        message_count: latestMessageCountRef.current,
      });
    };
    window.addEventListener("pagehide", handlePageHide);
    return () => window.removeEventListener("pagehide", handlePageHide);
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
    clearError();
    setLastFailedInput(text);
    lastPromptSourceRef.current = "typed";
    responseStartMsRef.current = performance.now();
    responseTrackedRef.current = false;
    pushAnalyticsEvent("askpaiziev_prompt_submit", {
      language: lang,
      prompt_length: text.trim().length,
      source: "typed",
    });
    const prefix = lang === "uz" ? "[Respond in Uzbek / O'zbek tilida javob bering]\n" : "";
    const nextMessages = [...messages, createMessage("user", prefix + text)];
    setMessages(nextMessages);
    void streamAssistantResponse(nextMessages);
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
    if (!lastFailedInput) return;

    clearError();
    lastPromptSourceRef.current = "retry";
    responseStartMsRef.current = performance.now();
    responseTrackedRef.current = false;
    pushAnalyticsEvent("askpaiziev_retry_click", {
      language: lang,
      prompt_length: lastFailedInput.trim().length,
    });

    const conversation =
      messages[messages.length - 1]?.role === "assistant"
        ? messages.slice(0, -1)
        : messages;

    if (conversation.length > 0) {
      setMessages(conversation);
      void streamAssistantResponse(conversation);
      return;
    }

    submitMessage(lastFailedInput);
  };

  const handleChangeResponse = () => {
    if (isLoading || messages.length === 0) return;
    const hasAssistantMessage = messages.some((message) => message.role === "assistant");
    if (!hasAssistantMessage) return;
    clearError();
    lastPromptSourceRef.current = "change_response";
    responseStartMsRef.current = performance.now();
    responseTrackedRef.current = false;
    pushAnalyticsEvent("askpaiziev_change_response_click", {
      language: lang,
      message_count: messages.length,
    });
    const conversation =
      messages[messages.length - 1]?.role === "assistant"
        ? messages.slice(0, -1)
        : messages;
    setMessages(conversation);
    void streamAssistantResponse(conversation);
  };

  const getErrorMessage = (err: Error) => {
    const msg = err.message || "";
    if (msg.includes("429") || msg.toLowerCase().includes("rate"))
      return t.errorRate;
    if (msg.includes("500") || msg.includes("503"))
      return t.errorServer;
    return t.errorGeneric;
  };

  const getErrorType = (err: Error) => {
    const msg = (err.message || "").toLowerCase();
    if (msg.includes("429") || msg.includes("rate")) return "rate_limit";
    if (msg.includes("500") || msg.includes("503")) return "server";
    if (msg.includes("network") || msg.includes("fetch")) return "network";
    return "unknown";
  };

  const handleSuggestedQuestion = (question: string) => {
    clearError();
    lastPromptSourceRef.current = "suggested";
    responseStartMsRef.current = performance.now();
    responseTrackedRef.current = false;
    pushAnalyticsEvent("askpaiziev_prompt_submit", {
      language: lang,
      prompt_length: question.trim().length,
      source: "suggested",
    });
    const prefix = lang === "uz" ? "[Respond in Uzbek / O'zbek tilida javob bering]\n" : "";
    const nextMessages = [...messages, createMessage("user", prefix + question)];
    setLastFailedInput(question);
    setMessages(nextMessages);
    void streamAssistantResponse(nextMessages);
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
    abortControllerRef.current?.abort();
    clearError();
    pushAnalyticsEvent("askpaiziev_new_chat", {
      language: lang,
      message_count: messages.length,
    });
    setMessages([]);
    setStatus("ready");
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

  useEffect(() => {
    if (responseTrackedRef.current || responseStartMsRef.current === null) return;
    const hasFirstToken = status === "streaming" && lastAssistantText.trim().length > 0;
    if (!hasFirstToken) return;
    const responseTimeMs = Math.round(performance.now() - responseStartMsRef.current);
    pushAnalyticsEvent("askpaiziev_response_time", {
      response_time_ms: responseTimeMs,
      source: lastPromptSourceRef.current,
      language: latestLangRef.current,
      message_count: latestMessageCountRef.current,
    });
    responseTrackedRef.current = true;
    responseStartMsRef.current = null;
  }, [status, lastAssistantText]);

  useEffect(() => {
    if (!error || responseStartMsRef.current === null) return;
    const responseTimeMs = Math.round(performance.now() - responseStartMsRef.current);
    pushAnalyticsEvent("askpaiziev_response_error", {
      response_time_ms: responseTimeMs,
      error_type: getErrorType(error),
      source: lastPromptSourceRef.current,
      language: latestLangRef.current,
      message_count: latestMessageCountRef.current,
    });
    responseTrackedRef.current = true;
    responseStartMsRef.current = null;
  }, [error]);

  const handleOutboundClick = useCallback((url: string, linkText: string) => {
    pushAnalyticsEvent("askpaiziev_outbound_click", {
      link_url: url,
      link_text: linkText,
      page_path: window.location.pathname,
      language: latestLangRef.current,
    });
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
            <>
              <FollowUpChips
                onSelect={handleSuggestedQuestion}
                lang={lang}
                question={lastUserQuestion}
                answer={lastAssistantText}
              />
              <div className="flex justify-end pt-1">
                <button
                  onClick={handleChangeResponse}
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
                  {lang === "uz" ? "Javobni o'zgartirish" : "Change response"}
                </button>
              </div>
            </>
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
            onClick={() => handleOutboundClick("https://akbar.one", "Built by akbar.one")}
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

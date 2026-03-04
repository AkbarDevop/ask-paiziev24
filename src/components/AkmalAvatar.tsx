"use client";

import Image from "next/image";
import type { Language } from "@/lib/prompts";
import { UI_TEXT } from "@/lib/prompts";

export function AkmalAvatar({ size = "lg", lang = "en" }: { size?: "sm" | "lg"; lang?: Language }) {
  const dimensions = size === "lg" ? 80 : 32;
  const t = UI_TEXT[lang];

  return (
    <div className="flex flex-col items-center gap-3 sm:gap-4">
      <div className="relative">
        {size === "lg" && (
          <div className="animate-pulse-ring absolute -inset-3 rounded-full bg-gradient-to-r from-blue-400/15 to-purple-400/15" />
        )}
        <Image
          src="/akmal.jpg"
          alt="Akmal Paiziev"
          width={dimensions}
          height={dimensions}
          className="relative rounded-full object-cover ring-2 ring-[var(--border)]"
          priority={size === "lg"}
        />
      </div>
      {size === "lg" && (
        <div className="text-center">
          <h1
            className="text-xl font-bold tracking-tight sm:text-2xl"
            style={{ color: "var(--foreground)" }}
          >
            {t.heroTitle}
          </h1>
          <p
            className="mt-1 max-w-sm text-[13px] leading-relaxed sm:text-sm"
            style={{ color: "var(--muted)" }}
          >
            {t.heroDescription}
          </p>
        </div>
      )}
    </div>
  );
}

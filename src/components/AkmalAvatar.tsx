"use client";

import Image from "next/image";

export function AkmalAvatar({ size = "lg" }: { size?: "sm" | "lg" }) {
  const dimensions = size === "lg" ? 96 : 32;

  return (
    <div className="flex flex-col items-center gap-4">
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
            className="text-2xl font-bold tracking-tight"
            style={{ color: "var(--foreground)" }}
          >
            Ask Akmal
          </h1>
          <p
            className="mt-1 max-w-sm text-sm leading-relaxed"
            style={{ color: "var(--muted)" }}
          >
            AI clone of Akmal Paiziev — serial entrepreneur, founder of
            Express24, MyTaxi & Numeo.ai
          </p>
        </div>
      )}
    </div>
  );
}

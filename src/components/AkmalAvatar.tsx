"use client";

import Image from "next/image";

export function AkmalAvatar({ size = "lg" }: { size?: "sm" | "lg" }) {
  const dimensions = size === "lg" ? 96 : 32;
  const ringSize = size === "lg" ? "h-28 w-28" : "";

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        {size === "lg" && (
          <div
            className={`animate-pulse-ring absolute -inset-2 rounded-full bg-gradient-to-r from-zinc-400/20 to-zinc-600/20 ${ringSize}`}
          />
        )}
        <Image
          src="/akmal.jpg"
          alt="Akmal Paiziev"
          width={dimensions}
          height={dimensions}
          className="relative rounded-full object-cover"
          priority={size === "lg"}
        />
      </div>
      {size === "lg" && (
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
            Ask Akmal
          </h1>
          <p className="mt-1 max-w-sm text-sm leading-relaxed text-[var(--muted)]">
            AI clone of Akmal Paiziev — serial entrepreneur, founder of
            Express24, MyTaxi & Numeo.ai
          </p>
        </div>
      )}
    </div>
  );
}

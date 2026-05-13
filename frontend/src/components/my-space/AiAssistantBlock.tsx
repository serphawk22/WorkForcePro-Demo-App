"use client";

import { useRef, useState } from "react";
import { Sparkles } from "lucide-react";

const SUGGESTION_CHIPS = [
  "I had a productive day",
  "Worked on a project",
  "Helped someone",
  "Learned something new",
];

interface AiAssistantBlockProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export default function AiAssistantBlock({ value, onChange, className = "" }: AiAssistantBlockProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  const handleChipClick = (chip: string) => {
    onChange(chip);
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  return (
    <section
      className={`group relative overflow-hidden rounded-[28px] p-[1px] transition-all duration-300 ${
        isFocused
          ? "shadow-[0_24px_80px_rgba(124,58,237,0.22)]"
          : "shadow-[0_18px_50px_rgba(43,18,76,0.08)]"
      } ${className}`}
    >
      <div className="absolute inset-0 rounded-[28px] bg-gradient-to-r from-fuchsia-500/45 via-violet-500/50 to-cyan-400/45 opacity-80 blur-[1px] transition-opacity duration-300 group-hover:opacity-100" />
      <div
        className={`relative overflow-hidden rounded-[27px] border backdrop-blur-2xl transition-all duration-300 ${
          isFocused
            ? "border-white/40 bg-white/65 dark:border-white/15 dark:bg-slate-950/55"
            : "border-white/20 bg-white/50 dark:border-white/10 dark:bg-slate-950/45"
        }`}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.22),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(34,211,238,0.18),transparent_32%)]" />

        <div className="relative flex flex-col gap-5 p-5 md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-white/40 bg-white/70 text-violet-600 shadow-[0_8px_24px_rgba(124,58,237,0.16)] dark:border-white/10 dark:bg-white/10 dark:text-violet-300">
                  <Sparkles size={16} />
                </span>
                <h3 className="text-lg font-bold tracking-tight text-[#2B124C] dark:text-purple-100">
                  ✨ Talk to your AI Assistant
                </h3>
              </div>
              <p className="max-w-2xl text-sm leading-6 text-[#6F4B7E] dark:text-purple-200/85">
                Tell me your day naturally. I’ll organize it into structured insights for you.
              </p>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-3">
              <div className="relative h-16 w-16 float-gentle">
                <div className={`absolute inset-0 rounded-full blur-xl transition-opacity duration-300 ${isFocused ? "opacity-100" : "opacity-60"} bg-[radial-gradient(circle,rgba(168,85,247,0.48),rgba(59,130,246,0.28),transparent_72%)]`} />
                <div className="absolute inset-0 animate-spin" style={{ animationDuration: "10s" }}>
                  <span className="absolute left-1/2 top-0 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-cyan-300/85 shadow-[0_0_14px_rgba(34,211,238,0.55)]" />
                  <span className="absolute bottom-1 left-0 h-2 w-2 rounded-full bg-violet-300/80 shadow-[0_0_14px_rgba(168,85,247,0.5)]" />
                  <span className="absolute right-0 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-fuchsia-300/85 shadow-[0_0_14px_rgba(217,70,239,0.48)]" />
                </div>

                <div
                  className={`relative flex h-16 w-16 items-center justify-center rounded-[1.5rem] border transition-all duration-300 ${
                    isFocused
                      ? "border-white/50 bg-white/80 shadow-[0_0_0_1px_rgba(255,255,255,0.4),0_16px_40px_rgba(124,58,237,0.18)] dark:border-white/15 dark:bg-slate-950/60"
                      : "border-white/30 bg-white/60 dark:border-white/10 dark:bg-slate-950/45"
                  }`}
                >
                  <div className="absolute inset-[6px] rounded-[1.1rem] border border-violet-300/35 dark:border-violet-200/20" />
                  <div className="absolute left-1/2 top-[7px] h-2 w-7 -translate-x-1/2 rounded-full bg-gradient-to-r from-cyan-300 via-violet-300 to-fuchsia-300 opacity-90" />

                  <div className="relative flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#1E1B4B] shadow-[0_0_12px_rgba(56,189,248,0.55)] dark:bg-purple-100" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#1E1B4B] shadow-[0_0_12px_rgba(168,85,247,0.5)] dark:bg-purple-100" />
                  </div>

                  <div className="absolute bottom-[9px] left-1/2 h-2 w-6 -translate-x-1/2 rounded-b-full border-b-2 border-violet-400/90" />

                  <div className="absolute -top-2 left-1/2 h-3 w-[2px] -translate-x-1/2 rounded-full bg-violet-400 shadow-[0_0_12px_rgba(168,85,247,0.5)]" />
                  <div className="absolute -top-3 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-cyan-300 shadow-[0_0_14px_rgba(34,211,238,0.6)] animate-pulse" />
                </div>
              </div>
            </div>
          </div>

          <div
            className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium transition-all duration-300 ${
              isFocused
                ? "border-violet-400/55 bg-violet-500/10 text-violet-700 shadow-[0_0_0_4px_rgba(168,85,247,0.08)] dark:border-violet-300/40 dark:text-violet-100"
                : "border-white/40 bg-white/55 text-[#6F4B7E] dark:border-white/10 dark:bg-white/5 dark:text-purple-200"
            }`}
          >
            <Sparkles size={12} className={isFocused ? "text-violet-500" : "text-violet-400"} />
            <span>{isFocused ? "Got it! I’ll structure this for you." : "AI Assist is active."}</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {SUGGESTION_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleChipClick(chip)}
                className={`rounded-full border px-3.5 py-2 text-xs font-medium transition-all duration-200 ${
                  value === chip
                    ? "border-violet-400/60 bg-violet-500/15 text-violet-700 shadow-[0_10px_20px_rgba(124,58,237,0.12)] dark:border-violet-300/30 dark:bg-violet-400/12 dark:text-violet-100"
                    : "border-white/40 bg-white/55 text-[#5E436B] hover:-translate-y-0.5 hover:border-violet-300/60 hover:bg-white/85 hover:text-[#2B124C] dark:border-white/10 dark:bg-white/5 dark:text-purple-200 dark:hover:border-violet-300/30 dark:hover:bg-white/10 dark:hover:text-white"
                }`}
              >
                {chip}
              </button>
            ))}
          </div>

          <div className="relative">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Tell me what you did today… I’ll convert it into your task or happy sheet automatically ✨"
              className={`min-h-[130px] w-full resize-y rounded-[24px] border px-4 py-4 text-sm leading-6 outline-none transition-all duration-300 placeholder:font-medium placeholder:text-[#8C708F] dark:placeholder:text-purple-300/55 ${
                isFocused
                  ? "border-violet-400/60 bg-white/75 shadow-[0_0_0_4px_rgba(168,85,247,0.09),0_20px_50px_rgba(124,58,237,0.12)] dark:border-violet-300/35 dark:bg-slate-950/55 dark:shadow-[0_0_0_4px_rgba(168,85,247,0.12),0_18px_45px_rgba(0,0,0,0.22)]"
                  : "border-white/35 bg-white/60 shadow-[0_10px_30px_rgba(43,18,76,0.05)] dark:border-white/10 dark:bg-white/5"
              }`}
            />
            <div className="pointer-events-none absolute inset-0 rounded-[24px] border border-white/35 dark:border-white/10" />
          </div>

          <div className="flex flex-col gap-1 text-xs text-[#6F4B7E] dark:text-purple-200/80">
            <p>
              AI Assist stays focused on your words and helps shape them into a polished entry.
            </p>
            {isFocused ? (
              <p className="font-medium text-violet-600 dark:text-violet-200">
                Got it! I’ll structure this for you.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
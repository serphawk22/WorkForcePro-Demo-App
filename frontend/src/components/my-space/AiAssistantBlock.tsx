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
      className={`relative overflow-hidden rounded-2xl border border-border bg-card transition-all duration-200 ${
        isFocused ? "border-foreground/30 shadow-sm" : ""
      } ${className}`}
    >
      <div className="relative flex flex-col gap-5 p-5 md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-foreground">
                <Sparkles size={16} />
              </span>
              <h3 className="text-lg font-semibold tracking-tight text-foreground">
                Talk to your AI Assistant
              </h3>
            </div>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              Tell me your day naturally. I&apos;ll organize it into structured insights for you.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {SUGGESTION_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleChipClick(chip)}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors duration-150 ${
                value === chip
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground"
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
            placeholder="Tell me what you did today. I'll convert it into your task or happy sheet automatically."
            className="min-h-[120px] w-full resize-y rounded-xl border border-border bg-background px-4 py-3 text-sm leading-6 text-foreground placeholder:text-muted-foreground outline-none transition-colors duration-150 focus:border-ring focus:ring-2 focus:ring-ring/20"
          />
        </div>

        <div className="text-xs text-muted-foreground">
          AI Assist stays focused on your words and helps shape them into a polished entry.
        </div>
      </div>
    </section>
  );
}

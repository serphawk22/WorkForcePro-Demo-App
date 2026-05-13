"use client";

import { useEffect, useRef } from "react";
import type { ClipboardEvent, ReactNode } from "react";
import { Bold, Italic, List, ListOrdered, RemoveFormatting, Underline } from "lucide-react";
import { htmlToPlainText, sanitizeRichTextHtml } from "@/lib/weeklyProgress";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeightClassName?: string;
}

function ToolbarButton({
  label,
  title,
  onClick,
  children,
}: {
  label: string;
  title: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-xs font-medium text-foreground hover:bg-muted/60"
    >
      {children}
      <span>{label}</span>
    </button>
  );
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Write your update...",
  minHeightClassName = "min-h-[220px]",
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const nextHtml = sanitizeRichTextHtml(value || "");
    if (editorRef.current && editorRef.current.innerHTML !== nextHtml) {
      editorRef.current.innerHTML = nextHtml;
    }
  }, [value]);

  const syncValue = () => {
    const nextHtml = sanitizeRichTextHtml(editorRef.current?.innerHTML || "");
    if (editorRef.current && editorRef.current.innerHTML !== nextHtml) {
      editorRef.current.innerHTML = nextHtml;
    }
    onChange(nextHtml);
  };

  const runCommand = (command: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false);
    syncValue();
  };

  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const html = event.clipboardData.getData("text/html");
    const text = event.clipboardData.getData("text/plain");
    const sanitized = sanitizeRichTextHtml(html || text.replace(/\n/g, "<br>"));
    document.execCommand("insertHTML", false, sanitized || text);
    syncValue();
  };

  const isEmpty = !htmlToPlainText(value || "").trim();

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background shadow-sm">
      <div className="flex flex-wrap gap-2 border-b border-border/80 bg-muted/30 px-3 py-2">
        <ToolbarButton label="B" title="Bold" onClick={() => runCommand("bold")}>
          <Bold size={14} />
        </ToolbarButton>
        <ToolbarButton label="I" title="Italic" onClick={() => runCommand("italic")}>
          <Italic size={14} />
        </ToolbarButton>
        <ToolbarButton label="U" title="Underline" onClick={() => runCommand("underline")}>
          <Underline size={14} />
        </ToolbarButton>
        <ToolbarButton label="Bullets" title="Bulleted list" onClick={() => runCommand("insertUnorderedList")}>
          <List size={14} />
        </ToolbarButton>
        <ToolbarButton label="Numbered" title="Numbered list" onClick={() => runCommand("insertOrderedList")}>
          <ListOrdered size={14} />
        </ToolbarButton>
        <ToolbarButton label="Clear" title="Remove formatting" onClick={() => runCommand("removeFormat")}>
          <RemoveFormatting size={14} />
        </ToolbarButton>
      </div>
      <div className="relative">
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={syncValue}
          onBlur={syncValue}
          onPaste={handlePaste}
          className={`prose prose-sm max-w-none px-4 py-3 text-sm leading-6 text-foreground outline-none ${minHeightClassName}`}
          style={{ whiteSpace: "pre-wrap" }}
        />
        {isEmpty && (
          <div className="pointer-events-none absolute left-4 top-3 text-sm text-muted-foreground">
            {placeholder}
          </div>
        )}
      </div>
    </div>
  );
}
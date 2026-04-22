const SAFE_HREF_PATTERN = /^(https?:|mailto:|tel:)/i;

export function normalizePointerLines(raw: string): string[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^[-*•]\s*/, "").trim())
    .filter(Boolean);
}

export function buildWeeklyDescription(
  weeklyEntry: string,
  highlightsRaw: string,
  difficultiesRaw: string,
): string {
  const highlights = normalizePointerLines(highlightsRaw);
  const difficulties = normalizePointerLines(difficultiesRaw);

  const sections = [
    `Weekly Entry:\n${weeklyEntry.trim()}`,
    "",
    "Highlights:",
    ...(highlights.length > 0 ? highlights.map((item) => `- ${item}`) : ["- None"]),
    "",
    "Difficulties / Abnormalities:",
    ...(difficulties.length > 0 ? difficulties.map((item) => `- ${item}`) : ["- None"]),
  ];

  return sections.join("\n");
}

export function parseWeeklyDescription(description: string): {
  weeklyEntry: string;
  highlights: string;
  difficulties: string;
} {
  const text = (description || "").trim();
  if (!text) {
    return { weeklyEntry: "", highlights: "", difficulties: "" };
  }

  const weeklyMatch = text.match(/Weekly Entry:\s*([\s\S]*?)(?:\n\s*Highlights:|$)/i);
  const highlightsMatch = text.match(/Highlights:\s*([\s\S]*?)(?:\n\s*Difficulties\s*\/\s*Abnormalities:|$)/i);
  const difficultiesMatch = text.match(/Difficulties\s*\/\s*Abnormalities:\s*([\s\S]*)$/i);

  if (!weeklyMatch && !highlightsMatch && !difficultiesMatch) {
    return { weeklyEntry: text, highlights: "", difficulties: "" };
  }

  const highlightsLines = normalizePointerLines(highlightsMatch?.[1] || "").join("\n");
  const difficultiesLines = normalizePointerLines(difficultiesMatch?.[1] || "").join("\n");

  return {
    weeklyEntry: (weeklyMatch?.[1] || "").trim(),
    highlights: highlightsLines,
    difficulties: difficultiesLines,
  };
}

export function htmlToPlainText(html: string): string {
  const source = (html || "").trim();
  if (!source) return "";

  if (typeof DOMParser === "undefined") {
    return source.replace(/<\s*br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").trim();
  }

  const normalized = source
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n");
  const parser = new DOMParser();
  const doc = parser.parseFromString(normalized, "text/html");
  return (doc.body.textContent || "").replace(/\n{3,}/g, "\n\n").trim();
}

export function sanitizeRichTextHtml(html: string): string {
  const source = (html || "").trim();
  if (!source) return "";

  if (typeof DOMParser === "undefined") {
    return source.replace(/<[^>]+>/g, "");
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(source, "text/html");
  const allowedTags = new Set(["B", "STRONG", "I", "EM", "U", "BR", "P", "DIV", "SPAN", "UL", "OL", "LI", "A"]);

  const sanitizeNode = (parent: ParentNode) => {
    Array.from(parent.children).forEach((child) => {
      const element = child as HTMLElement;
      const tagName = element.tagName.toUpperCase();

      if (!allowedTags.has(tagName)) {
        if (tagName === "SCRIPT" || tagName === "STYLE") {
          element.remove();
          return;
        }

        const replacement = doc.createTextNode(element.textContent || "");
        element.replaceWith(replacement);
        return;
      }

      Array.from(element.attributes).forEach((attribute) => {
        if (tagName === "A" && attribute.name === "href") {
          return;
        }
        element.removeAttribute(attribute.name);
      });

      if (tagName === "A") {
        const href = (element.getAttribute("href") || "").trim();
        if (!SAFE_HREF_PATTERN.test(href)) {
          const replacement = doc.createTextNode(element.textContent || "");
          element.replaceWith(replacement);
          return;
        }

        element.setAttribute("target", "_blank");
        element.setAttribute("rel", "noopener noreferrer");
        element.setAttribute("href", href);
      }

      sanitizeNode(element);
    });
  };

  sanitizeNode(doc.body);
  return doc.body.innerHTML.trim();
}

export function resolveExternalUrl(url?: string | null): string | null {
  if (!url) return null;

  const trimmed = url.trim();
  if (!trimmed) return null;
  if (/^(https?:|mailto:|tel:)/i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("/")) {
    if (typeof window === "undefined") {
      return trimmed;
    }
    return new URL(trimmed, window.location.origin).toString();
  }
  if (/^(localhost|127\.0\.0\.1|0\.0\.0\.0|::1)(:\d+)?(\/|$)/i.test(trimmed)) {
    return `http://${trimmed}`;
  }

  return `https://${trimmed}`;
}
const SAFE_HREF_PATTERN = /^(https?:|mailto:|tel:)/i;

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

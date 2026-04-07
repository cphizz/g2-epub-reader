const BLOCK_ELEMENTS = new Set([
  "p", "div", "h1", "h2", "h3", "h4", "h5", "h6",
  "blockquote", "section", "article", "li", "tr", "pre",
]);

export function extractText(xhtml: string): string {
  const doc = new DOMParser().parseFromString(xhtml, "text/html");
  const body = doc.body;
  if (!body) return "";

  const parts: string[] = [];
  walkNode(body, parts);

  return parts
    .join("")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function walkNode(node: Node, parts: string[]) {
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent?.replace(/\s+/g, " ") ?? "";
      if (text.trim()) parts.push(text);
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const el = child as Element;
      const tag = el.tagName.toLowerCase();

      if (tag === "br") {
        parts.push("\n");
        continue;
      }

      if (BLOCK_ELEMENTS.has(tag)) {
        parts.push("\n\n");
      }

      walkNode(child, parts);

      if (BLOCK_ELEMENTS.has(tag)) {
        parts.push("\n\n");
      }
    }
  }
}

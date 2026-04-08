export function paginateForBrowser(text: string, charsPerPage: number): string[] {
  return paginate(text, charsPerPage);
}

export function paginateForGlasses(text: string, maxChars = 900): string[] {
  return paginate(text, maxChars);
}

function paginate(text: string, maxChars: number): string[] {
  if (!text.trim()) return [""];
  const pages: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxChars) {
      pages.push(remaining.trim());
      break;
    }

    const chunk = remaining.substring(0, maxChars);

    // Try paragraph break
    let breakIdx = chunk.lastIndexOf("\n\n");
    if (breakIdx < maxChars * 0.3) {
      // Try sentence break
      breakIdx = findLastSentenceBreak(chunk);
    }
    if (breakIdx < maxChars * 0.3) {
      // Try word break
      breakIdx = chunk.lastIndexOf(" ");
    }
    if (breakIdx < maxChars * 0.2) {
      // Hard cut
      breakIdx = maxChars;
    }

    pages.push(chunk.substring(0, breakIdx).trim());
    remaining = remaining.substring(breakIdx).trim();
  }

  return pages.length > 0 ? pages : [""];
}

function findLastSentenceBreak(text: string): number {
  const patterns = [". ", "! ", "? ", ".\n", "!\n", "?\n"];
  let best = -1;
  for (const p of patterns) {
    const idx = text.lastIndexOf(p);
    if (idx > best) best = idx + p.length;
  }
  return best;
}

export function getCharsPerPage(fontSize: "small" | "medium" | "large"): number {
  switch (fontSize) {
    case "small": return 3000;
    case "medium": return 2000;
    case "large": return 1200;
  }
}

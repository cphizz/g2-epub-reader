import JSZip from "jszip";
import { extractText } from "../utils/html-cleaner";
import type { BookMetadata, Chapter, ParsedBook } from "../types";

export async function parseEpub(file: File): Promise<ParsedBook> {
  const zip = await JSZip.loadAsync(file);

  // 1. Find content.opf path from container.xml
  const containerXml = await readFile(zip, "META-INF/container.xml");
  const containerDoc = parseXml(containerXml);
  const rootfileEl = containerDoc.querySelector("rootfile");
  const opfPath = rootfileEl?.getAttribute("full-path");
  if (!opfPath) throw new Error("Cannot find content.opf path in container.xml");

  // Base directory for resolving relative paths
  const opfDir = opfPath.includes("/") ? opfPath.substring(0, opfPath.lastIndexOf("/") + 1) : "";

  // 2. Parse content.opf
  const opfXml = await readFile(zip, opfPath);
  const opfDoc = parseXml(opfXml);

  // 3. Extract metadata
  const title = getMetaText(opfDoc, "dc\\:title, title") || file.name.replace(".epub", "");
  const author = getMetaText(opfDoc, "dc\\:creator, creator") || "Unknown Author";
  const language = getMetaText(opfDoc, "dc\\:language, language") || "en";

  // 4. Build manifest map: id -> { href, mediaType }
  const manifest = new Map<string, { href: string; mediaType: string; properties: string }>();
  opfDoc.querySelectorAll("manifest item").forEach((item) => {
    const id = item.getAttribute("id") ?? "";
    manifest.set(id, {
      href: item.getAttribute("href") ?? "",
      mediaType: item.getAttribute("media-type") ?? "",
      properties: item.getAttribute("properties") ?? "",
    });
  });

  // 5. Read spine order
  const spineItems: string[] = [];
  opfDoc.querySelectorAll("spine itemref").forEach((ref) => {
    const idref = ref.getAttribute("idref");
    if (idref) spineItems.push(idref);
  });

  // 6. Try to get chapter titles from TOC
  const chapterTitles = await extractTocTitles(zip, manifest, opfDir);

  // 7. Extract chapters
  const chapters: Chapter[] = [];
  for (let i = 0; i < spineItems.length; i++) {
    const entry = manifest.get(spineItems[i]);
    if (!entry || !entry.mediaType.includes("html")) continue;

    const chapterPath = opfDir + entry.href;
    let rawHtml: string;
    try {
      rawHtml = await readFile(zip, chapterPath);
    } catch {
      continue;
    }

    const plainText = extractText(rawHtml);
    if (!plainText.trim()) continue;

    const chapterTitle = chapterTitles.get(entry.href) ?? getTitleFromHtml(rawHtml) ?? `Chapter ${chapters.length + 1}`;

    chapters.push({
      id: spineItems[i],
      title: chapterTitle,
      rawHtml,
      plainText,
    });
  }

  // 8. Extract cover image
  let coverImageBase64: string | null = null;
  const coverItem = findCoverItem(manifest);
  if (coverItem) {
    try {
      const coverPath = opfDir + coverItem.href;
      const coverData = await zip.file(coverPath)?.async("base64");
      if (coverData) {
        const ext = coverItem.mediaType.split("/")[1] || "jpeg";
        coverImageBase64 = `data:image/${ext};base64,${coverData}`;
      }
    } catch { /* no cover */ }
  }

  const id = await hashFile(file);

  const metadata: BookMetadata = {
    id,
    title,
    author,
    language,
    coverImageBase64,
    totalChapters: chapters.length,
    addedAt: Date.now(),
  };

  return { metadata, chapters };
}

async function readFile(zip: JSZip, path: string): Promise<string> {
  const file = zip.file(path);
  if (!file) throw new Error(`File not found in EPUB: ${path}`);
  return file.async("string");
}

function parseXml(xml: string): Document {
  return new DOMParser().parseFromString(xml, "application/xml");
}

function getMetaText(doc: Document, selector: string): string | null {
  const el = doc.querySelector(selector);
  return el?.textContent?.trim() || null;
}

function getTitleFromHtml(html: string): string | null {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const title = doc.querySelector("title");
  const text = title?.textContent?.trim();
  return text && text.length > 0 && text.length < 100 ? text : null;
}

function findCoverItem(manifest: Map<string, { href: string; mediaType: string; properties: string }>) {
  for (const [id, item] of manifest) {
    if (item.properties.includes("cover-image") || id.toLowerCase().includes("cover")) {
      if (item.mediaType.startsWith("image/")) return item;
    }
  }
  return null;
}

async function extractTocTitles(
  zip: JSZip,
  manifest: Map<string, { href: string; mediaType: string; properties: string }>,
  opfDir: string
): Promise<Map<string, string>> {
  const titles = new Map<string, string>();

  // Try EPUB3 nav document first
  for (const [, item] of manifest) {
    if (item.properties.includes("nav")) {
      try {
        const navHtml = await readFile(zip, opfDir + item.href);
        const doc = new DOMParser().parseFromString(navHtml, "text/html");
        doc.querySelectorAll("nav a").forEach((a) => {
          const href = a.getAttribute("href")?.split("#")[0];
          const text = a.textContent?.trim();
          if (href && text) titles.set(href, text);
        });
        if (titles.size > 0) return titles;
      } catch { /* fall through to NCX */ }
    }
  }

  // Try EPUB2 NCX
  for (const [, item] of manifest) {
    if (item.mediaType === "application/x-dtbncx+xml") {
      try {
        const ncxXml = await readFile(zip, opfDir + item.href);
        const doc = parseXml(ncxXml);
        doc.querySelectorAll("navPoint").forEach((np) => {
          const text = np.querySelector("navLabel text")?.textContent?.trim();
          const src = np.querySelector("content")?.getAttribute("src")?.split("#")[0];
          if (text && src) titles.set(src, text);
        });
      } catch { /* no TOC */ }
    }
  }

  return titles;
}

async function hashFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hash = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .substring(0, 16);
}

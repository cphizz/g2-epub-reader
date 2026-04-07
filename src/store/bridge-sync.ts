import type { EvenAppBridge } from "@evenrealities/even_hub_sdk";
import type { BookMetadata, ParsedBook, ReadingPosition } from "../types";

let bridge: EvenAppBridge | null = null;

export function setBridge(b: EvenAppBridge) {
  bridge = b;
}

export function hasBridge(): boolean {
  return bridge !== null;
}

// --- Sync TO bridge ---

export async function syncBookToBridge(book: ParsedBook): Promise<void> {
  if (!bridge) return;
  try {
    // Store only plainText (not rawHtml) to save space
    const lightweight = {
      metadata: book.metadata,
      chapters: book.chapters.map((ch) => ({
        id: ch.id,
        title: ch.title,
        plainText: ch.plainText,
      })),
    };
    await bridge.setLocalStorage(`book_${book.metadata.id}`, JSON.stringify(lightweight));
  } catch (err) {
    console.warn("Bridge sync book failed:", err);
  }
}

export async function syncMetadataToBridge(list: BookMetadata[]): Promise<void> {
  if (!bridge) return;
  try {
    await bridge.setLocalStorage("epub_meta", JSON.stringify(list));
  } catch (err) {
    console.warn("Bridge sync metadata failed:", err);
  }
}

export async function syncPositionToBridge(pos: ReadingPosition): Promise<void> {
  if (!bridge) return;
  try {
    await bridge.setLocalStorage(`pos_${pos.bookId}`, JSON.stringify(pos));
  } catch (err) {
    console.warn("Bridge sync position failed:", err);
  }
}

export async function removeBookFromBridge(bookId: string): Promise<void> {
  if (!bridge) return;
  try {
    await bridge.setLocalStorage(`book_${bookId}`, "");
    await bridge.setLocalStorage(`pos_${bookId}`, "");
  } catch (err) {
    console.warn("Bridge remove book failed:", err);
  }
}

// --- Restore FROM bridge ---

export async function restoreMetadataFromBridge(): Promise<BookMetadata[]> {
  if (!bridge) return [];
  try {
    const raw = await bridge.getLocalStorage("epub_meta");
    if (raw && raw.length > 2) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn("Bridge restore metadata failed:", err);
  }
  return [];
}

export async function restoreBookFromBridge(bookId: string): Promise<ParsedBook | null> {
  if (!bridge) return null;
  try {
    const raw = await bridge.getLocalStorage(`book_${bookId}`);
    if (raw && raw.length > 2) {
      const data = JSON.parse(raw);
      // Reconstruct with empty rawHtml since we stripped it
      return {
        metadata: data.metadata,
        chapters: data.chapters.map((ch: any) => ({
          id: ch.id,
          title: ch.title,
          rawHtml: "",
          plainText: ch.plainText,
        })),
      };
    }
  } catch (err) {
    console.warn("Bridge restore book failed:", err);
  }
  return null;
}

export async function restorePositionFromBridge(bookId: string): Promise<ReadingPosition | null> {
  if (!bridge) return null;
  try {
    const raw = await bridge.getLocalStorage(`pos_${bookId}`);
    if (raw && raw.length > 2) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn("Bridge restore position failed:", err);
  }
  return null;
}

import type { BookMetadata, ParsedBook } from "../types";
import { syncBookToBridge, syncMetadataToBridge, removeBookFromBridge, restoreMetadataFromBridge, restoreBookFromBridge } from "./bridge-sync";

const DB_NAME = "epub-reader-db";
const STORE_NAME = "books";
const META_KEY = "epub_library";

let db: IDBDatabase | null = null;

async function getDb(): Promise<IDBDatabase> {
  if (db) return db;
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME, { keyPath: "metadata.id" });
    };
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    request.onerror = () => reject(request.error);
  });
}

export function getMetadataList(): BookMetadata[] {
  try {
    const raw = localStorage.getItem(META_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveMetadataList(list: BookMetadata[]) {
  localStorage.setItem(META_KEY, JSON.stringify(list));
}

export async function addBook(book: ParsedBook): Promise<void> {
  const database = await getDb();
  await new Promise<void>((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(book);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  const list = getMetadataList();
  if (!list.find((m) => m.id === book.metadata.id)) {
    list.push(book.metadata);
    saveMetadataList(list);
  }

  // Sync to bridge for persistence across WebView clears
  syncBookToBridge(book);
  syncMetadataToBridge(getMetadataList());
}

export async function getBook(id: string): Promise<ParsedBook | null> {
  // Try browser IndexedDB first
  try {
    const database = await getDb();
    const book = await new Promise<ParsedBook | null>((resolve, reject) => {
      const tx = database.transaction(STORE_NAME, "readonly");
      const request = tx.objectStore(STORE_NAME).get(id);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
    if (book) return book;
  } catch {
    // IndexedDB failed, fall through to bridge
  }

  // Fallback: try bridge storage
  console.log("Book not in IndexedDB, trying bridge storage...");
  const bridgeBook = await restoreBookFromBridge(id);
  if (bridgeBook) {
    // Re-save to IndexedDB for faster access next time
    try {
      const database = await getDb();
      await new Promise<void>((resolve, reject) => {
        const tx = database.transaction(STORE_NAME, "readwrite");
        tx.objectStore(STORE_NAME).put(bridgeBook);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch { /* best effort */ }
    return bridgeBook;
  }

  return null;
}

export async function removeBook(id: string): Promise<void> {
  const database = await getDb();
  await new Promise<void>((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  const list = getMetadataList().filter((m) => m.id !== id);
  saveMetadataList(list);

  // Remove from bridge too
  removeBookFromBridge(id);
  syncMetadataToBridge(list);
}

/**
 * Restore library from bridge storage if browser storage is empty.
 * Returns true if books were restored.
 */
export async function restoreLibraryFromBridge(): Promise<boolean> {
  const existing = getMetadataList();
  if (existing.length > 0) return false;

  const bridgeMeta = await restoreMetadataFromBridge();
  if (bridgeMeta.length === 0) return false;

  console.log(`Restoring ${bridgeMeta.length} books from bridge storage`);
  saveMetadataList(bridgeMeta);

  // Also restore full book data to IndexedDB
  for (const meta of bridgeMeta) {
    const book = await restoreBookFromBridge(meta.id);
    if (book) {
      try {
        const database = await getDb();
        await new Promise<void>((resolve, reject) => {
          const tx = database.transaction(STORE_NAME, "readwrite");
          tx.objectStore(STORE_NAME).put(book);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      } catch { /* best effort */ }
    }
  }

  return true;
}

import type { BookMetadata, ParsedBook } from "../types";

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
}

export async function getBook(id: string): Promise<ParsedBook | null> {
  const database = await getDb();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).get(id);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
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
}

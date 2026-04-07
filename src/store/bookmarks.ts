export interface Bookmark {
  bookId: string;
  chapterIndex: number;
  pageIndex: number;
  preview: string;
  createdAt: number;
}

const BOOKMARKS_KEY = "epub_bookmarks";

function getAll(): Record<string, Bookmark[]> {
  try {
    const raw = localStorage.getItem(BOOKMARKS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveAll(data: Record<string, Bookmark[]>) {
  localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(data));
}

export function getBookmarks(bookId: string): Bookmark[] {
  return getAll()[bookId] ?? [];
}

export function addBookmark(bookmark: Bookmark): void {
  const all = getAll();
  if (!all[bookmark.bookId]) all[bookmark.bookId] = [];
  // Don't duplicate same chapter+page
  const exists = all[bookmark.bookId].some(
    (b) => b.chapterIndex === bookmark.chapterIndex && b.pageIndex === bookmark.pageIndex
  );
  if (!exists) {
    all[bookmark.bookId].push(bookmark);
    saveAll(all);
  }
}

export function removeBookmark(bookId: string, index: number): void {
  const all = getAll();
  if (all[bookId]) {
    all[bookId].splice(index, 1);
    saveAll(all);
  }
}

export function isBookmarked(bookId: string, chapterIndex: number, pageIndex: number): boolean {
  const bookmarks = getBookmarks(bookId);
  return bookmarks.some((b) => b.chapterIndex === chapterIndex && b.pageIndex === pageIndex);
}

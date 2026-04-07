export interface BookMetadata {
  id: string;
  title: string;
  author: string;
  language: string;
  coverImageBase64: string | null;
  totalChapters: number;
  addedAt: number;
}

export interface Chapter {
  id: string;
  title: string;
  rawHtml: string;
  plainText: string;
}

export interface ParsedBook {
  metadata: BookMetadata;
  chapters: Chapter[];
}

export interface ReadingPosition {
  bookId: string;
  chapterIndex: number;
  pageIndex: number;
  glassesPageIndex: number;
  lastReadAt: number;
}

export interface AppSettings {
  fontSize: "small" | "medium" | "large";
  theme: "cream" | "sepia" | "dark";
}

export type AppView = "welcome" | "landing" | "reader" | "settings";

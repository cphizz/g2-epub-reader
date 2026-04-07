import type { AppSettings, ReadingPosition } from "../types";

const POSITIONS_KEY = "epub_positions";
const SETTINGS_KEY = "epub_settings";

const DEFAULT_SETTINGS: AppSettings = {
  fontSize: "medium",
  theme: "cream",
};

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function getPositions(): Record<string, ReadingPosition> {
  try {
    const raw = localStorage.getItem(POSITIONS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function savePositions(positions: Record<string, ReadingPosition>) {
  localStorage.setItem(POSITIONS_KEY, JSON.stringify(positions));
}

export function getPosition(bookId: string): ReadingPosition {
  const positions = getPositions();
  return positions[bookId] ?? {
    bookId,
    chapterIndex: 0,
    pageIndex: 0,
    glassesPageIndex: 0,
    lastReadAt: Date.now(),
  };
}

export function savePosition(pos: ReadingPosition) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const positions = getPositions();
    positions[pos.bookId] = { ...pos, lastReadAt: Date.now() };
    savePositions(positions);
  }, 500);
}

export function savePositionImmediate(pos: ReadingPosition) {
  const positions = getPositions();
  positions[pos.bookId] = { ...pos, lastReadAt: Date.now() };
  savePositions(positions);
}

export function getSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function removePosition(bookId: string) {
  const positions = getPositions();
  delete positions[bookId];
  savePositions(positions);
}

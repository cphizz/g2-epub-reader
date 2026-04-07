import type { AppSettings, ReadingPosition } from "../types";
import { syncPositionToBridge, restorePositionFromBridge } from "./bridge-sync";

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
    lastReadAt: 0,
  };
}

export async function getPositionWithBridgeFallback(bookId: string): Promise<ReadingPosition> {
  const local = getPosition(bookId);
  // If we have a real position locally, use it
  if (local.chapterIndex > 0 || local.pageIndex > 0) return local;

  // Try bridge storage
  const bridgePos = await restorePositionFromBridge(bookId);
  if (bridgePos && (bridgePos.chapterIndex > 0 || bridgePos.pageIndex > 0)) {
    // Save locally for future access
    const positions = getPositions();
    positions[bookId] = bridgePos;
    savePositions(positions);
    return bridgePos;
  }

  return local;
}

export function savePosition(pos: ReadingPosition) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const updated = { ...pos, lastReadAt: Date.now() };
    const positions = getPositions();
    positions[pos.bookId] = updated;
    savePositions(positions);
    syncPositionToBridge(updated);
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

export function hasCompletedSetup(): boolean {
  return localStorage.getItem("epub_setup_done") === "1";
}

export function markSetupDone() {
  localStorage.setItem("epub_setup_done", "1");
}

export function removePosition(bookId: string) {
  const positions = getPositions();
  delete positions[bookId];
  savePositions(positions);
}

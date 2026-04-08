import { type EvenAppBridge, TextContainerProperty, TextContainerUpgrade, CreateStartUpPageContainer, RebuildPageContainer } from "@evenrealities/even_hub_sdk";
import { GlassesReadingView } from "./reading-view";
import { GlassesChapterListView } from "./chapter-list-view";
import type { Chapter } from "../types";

let bridge: EvenAppBridge | null = null;
let bus: EventTarget | null = null;
let initialized = false;
let initInProgress = false;
let readingView: GlassesReadingView | null = null;
let chapterListView: GlassesChapterListView | null = null;
let currentMode: "welcome" | "reading" | "chapter-list" = "welcome";

// Track pending book data in case book is opened before bridge connects
let pendingBook: { chapters: Chapter[]; chapterIndex: number } | null = null;

/**
 * Call this early (before bridge connects) to start listening for book-opened events.
 */
export function setupGlassesEventListeners(eventBus: EventTarget) {
  bus = eventBus;

  bus.addEventListener("book-opened", ((e: CustomEvent) => {
    const { chapters, chapterIndex } = e.detail;
    console.log("Glasses: book-opened, bridge ready:", !!bridge, "initialized:", initialized);

    if (bridge && initialized && readingView && !initInProgress) {
      readingView.setBook(chapters, chapterIndex);
      switchToReading();
    } else {
      pendingBook = { chapters, chapterIndex };
      console.log("Glasses: book queued for when bridge is ready");
    }
  }) as EventListener);

  bus.addEventListener("chapter-changed", ((e: CustomEvent) => {
    if (readingView && initialized && currentMode === "reading") {
      readingView.setChapter(e.detail.chapterIndex);
      updateReadingText();
    }
  }) as EventListener);
}

/**
 * Call after bridge connects. Shows welcome or loads queued book.
 */
export async function initGlassesDisplay(b: EvenAppBridge, eventBus: EventTarget) {
  bridge = b;
  bus = eventBus;
  readingView = new GlassesReadingView(bridge, bus);
  chapterListView = new GlassesChapterListView(bridge, bus);

  // Route events from glasses
  bridge.onEvenHubEvent((event: any) => {
    if (currentMode === "reading") {
      readingView!.handleEvent(event);
    } else if (currentMode === "chapter-list") {
      chapterListView!.handleEvent(event);
    }
  });

  // Create initial display
  initInProgress = true;

  if (pendingBook) {
    // Book was opened before bridge connected — show it directly
    console.log("Glasses: loading queued book directly");
    readingView.setBook(pendingBook.chapters, pendingBook.chapterIndex);
    pendingBook = null;
    await createInitialReadingPage();
  } else {
    await createWelcomePage();
  }

  initInProgress = false;
}

async function createWelcomePage() {
  if (!bridge) return;
  try {
    const result = await bridge.createStartUpPageContainer(new CreateStartUpPageContainer({
      containerTotalNum: 1,
      textObject: [
        new TextContainerProperty({
          containerID: 1,
          containerName: "main",
          xPosition: 0,
          yPosition: 0,
          width: 576,
          height: 288,
          content: "BookLens\n\nOpen a book to start reading.",
          borderWidth: 0,
          borderColor: 0,
          borderRadius: 0,
          paddingLength: 8,
          isEventCapture: 0,
        }),
      ],
      listObject: [],
      imageObject: [],
    }));
    console.log("Glasses: welcome page created, result:", result);
    initialized = true;
    currentMode = "welcome";
  } catch (err) {
    console.error("Glasses: createStartUpPageContainer failed:", err);
  }
}

async function createInitialReadingPage() {
  if (!bridge || !readingView) return;
  // Truncate to 950 chars max for createStartUpPageContainer (limit is 1000)
  const text = readingView.getCurrentPageText().substring(0, 950);
  const status = readingView.getStatusText().substring(0, 100);

  try {
    const result = await bridge.createStartUpPageContainer(new CreateStartUpPageContainer({
      containerTotalNum: 2,
      textObject: [
        new TextContainerProperty({
          containerID: 1,
          containerName: "reading",
          xPosition: 0,
          yPosition: 0,
          width: 576,
          height: 264,
          content: text,
          borderWidth: 0,
          borderColor: 0,
          borderRadius: 0,
          paddingLength: 4,
          isEventCapture: 1,
        }),
        new TextContainerProperty({
          containerID: 2,
          containerName: "status",
          xPosition: 0,
          yPosition: 268,
          width: 576,
          height: 20,
          content: status,
          borderWidth: 0,
          borderColor: 0,
          borderRadius: 0,
          paddingLength: 2,
          isEventCapture: 0,
        }),
      ],
      listObject: [],
      imageObject: [],
    }));
    console.log("Glasses: reading page created, result:", result);
    initialized = true;
    currentMode = "reading";
  } catch (err) {
    console.error("Glasses: createStartUpPageContainer (reading) failed:", err);
  }
}

/**
 * Switch from welcome to reading view using rebuildPageContainer.
 */
async function switchToReading() {
  if (!bridge || !initialized || !readingView) return;
  const text = readingView.getCurrentPageText().substring(0, 950);
  const status = readingView.getStatusText().substring(0, 100);

  try {
    await bridge.rebuildPageContainer(new RebuildPageContainer({
      containerTotalNum: 2,
      textObject: [
        new TextContainerProperty({
          containerID: 1,
          containerName: "reading",
          xPosition: 0,
          yPosition: 0,
          width: 576,
          height: 264,
          content: text,
          borderWidth: 0,
          borderColor: 0,
          borderRadius: 0,
          paddingLength: 4,
          isEventCapture: 1,
        }),
        new TextContainerProperty({
          containerID: 2,
          containerName: "status",
          xPosition: 0,
          yPosition: 268,
          width: 576,
          height: 20,
          content: status,
          borderWidth: 0,
          borderColor: 0,
          borderRadius: 0,
          paddingLength: 2,
          isEventCapture: 0,
        }),
      ],
      listObject: [],
      imageObject: [],
    }));
    currentMode = "reading";
    console.log("Glasses: switched to reading view");
  } catch (err) {
    console.error("Glasses: rebuildPageContainer failed:", err);
  }
}

/**
 * Update reading text in-place using textContainerUpgrade (faster, no flicker).
 */
async function updateReadingText() {
  if (!bridge || !initialized || !readingView || currentMode !== "reading") return;
  const text = readingView.getCurrentPageText().substring(0, 1900);
  const status = readingView.getStatusText().substring(0, 200);

  try {
    await bridge.textContainerUpgrade(new TextContainerUpgrade({
      containerID: 1,
      containerName: "reading",
      content: text,
      contentOffset: 0,
      contentLength: text.length,
    }));
    await bridge.textContainerUpgrade(new TextContainerUpgrade({
      containerID: 2,
      containerName: "status",
      content: status,
      contentOffset: 0,
      contentLength: status.length,
    }));
  } catch (err) {
    console.error("Glasses: textContainerUpgrade failed:", err);
  }
}

export async function switchToChapterListView(chapters: { title: string }[]) {
  if (!bridge || !initialized) return;
  currentMode = "chapter-list";
  await chapterListView!.show(chapters);
}

export async function switchBackToReading() {
  if (!bridge || !initialized) return;
  currentMode = "reading";
  await readingView!.rebuildOnGlasses();
}

import { type EvenAppBridge, TextContainerProperty, CreateStartUpPageContainer, RebuildPageContainer } from "@evenrealities/even_hub_sdk";
import { GlassesReadingView } from "./reading-view";
import { GlassesChapterListView } from "./chapter-list-view";
import type { Chapter } from "../types";

let bridge: EvenAppBridge | null = null;
let bus: EventTarget | null = null;
let initialized = false;
let readingView: GlassesReadingView | null = null;
let chapterListView: GlassesChapterListView | null = null;
let currentMode: "reading" | "chapter-list" = "reading";

// Track pending book data in case book is opened before bridge connects
let pendingBook: { chapters: Chapter[]; chapterIndex: number } | null = null;

/**
 * Call this early (before bridge connects) to start listening for book-opened events.
 * Events that fire before the bridge is ready will be queued.
 */
export function setupGlassesEventListeners(eventBus: EventTarget) {
  bus = eventBus;

  bus.addEventListener("book-opened", ((e: CustomEvent) => {
    const { chapters, chapterIndex } = e.detail;
    console.log("Glasses: book-opened event received, bridge ready:", !!bridge);

    if (bridge && initialized && readingView) {
      // Bridge is ready, show immediately
      readingView.setBook(chapters, chapterIndex);
      showReadingView();
    } else {
      // Bridge not ready yet, save for later
      pendingBook = { chapters, chapterIndex };
      console.log("Glasses: book queued, waiting for bridge...");
    }
  }) as EventListener);

  bus.addEventListener("chapter-changed", ((e: CustomEvent) => {
    if (readingView) {
      readingView.setChapter(e.detail.chapterIndex);
      if (initialized && currentMode === "reading") {
        readingView.updateGlasses();
      }
    }
  }) as EventListener);
}

/**
 * Call this after bridge connects. Sets up the glasses display
 * and loads any book that was opened while waiting.
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
    } else {
      chapterListView!.handleEvent(event);
    }
  });

  // Check if a book was already opened before bridge connected
  if (pendingBook) {
    console.log("Glasses: loading queued book");
    readingView.setBook(pendingBook.chapters, pendingBook.chapterIndex);
    pendingBook = null;
    await showReadingScreen();
  } else {
    await showWelcomeScreen();
  }
}

async function showWelcomeScreen() {
  if (!bridge) return;
  try {
    await bridge.createStartUpPageContainer(new CreateStartUpPageContainer({
      containerTotalNum: 1,
      textObject: [
        new TextContainerProperty({
          containerID: 1,
          containerName: "welcome",
          xPosition: 0,
          yPosition: 0,
          width: 576,
          height: 288,
          content: "G2 EPUB Reader\n\nOpen a book on your phone to start reading.",
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
    initialized = true;
    console.log("Glasses: welcome screen shown");
  } catch (err) {
    console.error("Glasses: failed to create welcome screen:", err);
  }
}

async function showReadingScreen() {
  if (!bridge) return;
  try {
    // If we haven't called createStartUpPageContainer yet, do that first
    if (!initialized) {
      await bridge.createStartUpPageContainer(new CreateStartUpPageContainer({
        containerTotalNum: 2,
        textObject: [
          new TextContainerProperty({
            containerID: 1,
            containerName: "reading",
            xPosition: 0,
            yPosition: 0,
            width: 576,
            height: 264,
            content: readingView!.getCurrentPageText(),
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
            content: readingView!.getStatusText(),
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
      initialized = true;
    } else {
      await showReadingView();
    }
    currentMode = "reading";
    console.log("Glasses: reading screen shown");
  } catch (err) {
    console.error("Glasses: failed to show reading screen:", err);
  }
}

async function showReadingView() {
  if (!bridge || !initialized) return;
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
          content: readingView!.getCurrentPageText(),
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
          content: readingView!.getStatusText(),
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
    console.log("Glasses: reading view rebuilt");
  } catch (err) {
    console.error("Glasses: failed to rebuild reading view:", err);
  }
}

export async function switchToChapterList(chapters: { title: string }[]) {
  if (!bridge || !initialized) return;
  currentMode = "chapter-list";
  await chapterListView!.show(chapters);
}

export async function switchToReading() {
  if (!bridge || !initialized) return;
  currentMode = "reading";
  await readingView!.rebuildOnGlasses();
}

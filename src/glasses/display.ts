import { type EvenAppBridge, TextContainerProperty, CreateStartUpPageContainer } from "@evenrealities/even_hub_sdk";
import { GlassesReadingView } from "./reading-view";
import { GlassesChapterListView } from "./chapter-list-view";

let bridge: EvenAppBridge | null = null;
let bus: EventTarget | null = null;
let initialized = false;
let readingView: GlassesReadingView | null = null;
let chapterListView: GlassesChapterListView | null = null;
let currentMode: "reading" | "chapter-list" = "reading";

export function initGlassesDisplay(b: EvenAppBridge, eventBus: EventTarget) {
  bridge = b;
  bus = eventBus;
  readingView = new GlassesReadingView(bridge, bus);
  chapterListView = new GlassesChapterListView(bridge, bus);

  // Listen for book opened
  bus.addEventListener("book-opened", ((e: CustomEvent) => {
    const { chapters, chapterIndex } = e.detail;
    readingView!.setBook(chapters, chapterIndex);
    setupDisplay();
  }) as EventListener);

  // Listen for chapter changes from browser
  bus.addEventListener("chapter-changed", ((e: CustomEvent) => {
    readingView!.setChapter(e.detail.chapterIndex);
    if (initialized && currentMode === "reading") {
      readingView!.updateGlasses();
    }
  }) as EventListener);

  // Route events from glasses
  bridge.onEvenHubEvent((event: any) => {
    if (currentMode === "reading") {
      readingView!.handleEvent(event);
    } else {
      chapterListView!.handleEvent(event);
    }
  });
}

async function setupDisplay() {
  if (!bridge || initialized) return;
  try {
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
    currentMode = "reading";
  } catch (err) {
    console.error("Failed to create glasses display:", err);
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

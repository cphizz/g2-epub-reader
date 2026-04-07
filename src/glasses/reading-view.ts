import { type EvenAppBridge, TextContainerProperty, TextContainerUpgrade, RebuildPageContainer } from "@evenrealities/even_hub_sdk";
import { paginateForGlasses } from "../epub/paginator";
import type { Chapter } from "../types";

export class GlassesReadingView {
  private bridge: EvenAppBridge;
  private bus: EventTarget;
  private chapters: Chapter[] = [];
  private chapterIndex = 0;
  private pageIndex = 0;
  private pages: string[] = [""];

  constructor(bridge: EvenAppBridge, bus: EventTarget) {
    this.bridge = bridge;
    this.bus = bus;
  }

  setBook(chapters: Chapter[], startChapter: number) {
    this.chapters = chapters;
    this.chapterIndex = startChapter;
    this.pages = paginateForGlasses(chapters[startChapter]?.plainText ?? "");
    this.pageIndex = 0;
  }

  setChapter(index: number) {
    if (index >= 0 && index < this.chapters.length) {
      this.chapterIndex = index;
      this.pages = paginateForGlasses(this.chapters[index].plainText);
      this.pageIndex = 0;
    }
  }

  getCurrentPageText(): string {
    return this.pages[this.pageIndex] || "";
  }

  getStatusText(): string {
    const ch = this.chapters[this.chapterIndex];
    const title = ch?.title ?? "";
    const short = title.length > 20 ? title.substring(0, 20) + "..." : title;
    return `${short} | ${this.pageIndex + 1}/${this.pages.length}`;
  }

  handleEvent(event: any) {
    const textEvent = event.textEvent;
    if (!textEvent) return;

    const eventType = textEvent.eventType;
    if (eventType === 0 || eventType === 2) {
      this.nextPage();
    } else if (eventType === 1) {
      this.prevPage();
    } else if (eventType === 3) {
      this.bus.dispatchEvent(new CustomEvent("glasses-chapter-list-requested"));
    }
  }

  private nextPage() {
    if (this.pageIndex < this.pages.length - 1) {
      this.pageIndex++;
    } else if (this.chapterIndex < this.chapters.length - 1) {
      this.chapterIndex++;
      this.pages = paginateForGlasses(this.chapters[this.chapterIndex].plainText);
      this.pageIndex = 0;
      this.bus.dispatchEvent(new CustomEvent("chapter-changed", { detail: { chapterIndex: this.chapterIndex } }));
    }
    this.updateGlasses();
  }

  private prevPage() {
    if (this.pageIndex > 0) {
      this.pageIndex--;
    } else if (this.chapterIndex > 0) {
      this.chapterIndex--;
      this.pages = paginateForGlasses(this.chapters[this.chapterIndex].plainText);
      this.pageIndex = Math.max(0, this.pages.length - 1);
      this.bus.dispatchEvent(new CustomEvent("chapter-changed", { detail: { chapterIndex: this.chapterIndex } }));
    }
    this.updateGlasses();
  }

  async updateGlasses() {
    try {
      await this.bridge.textContainerUpgrade(new TextContainerUpgrade({
        containerID: 1,
        containerName: "reading",
        content: this.getCurrentPageText(),
        contentOffset: 0,
        contentLength: this.getCurrentPageText().length,
      }));
      await this.bridge.textContainerUpgrade(new TextContainerUpgrade({
        containerID: 2,
        containerName: "status",
        content: this.getStatusText(),
        contentOffset: 0,
        contentLength: this.getStatusText().length,
      }));
    } catch (err) {
      console.error("Glasses update failed:", err);
    }
  }

  async rebuildOnGlasses() {
    try {
      await this.bridge.rebuildPageContainer(new RebuildPageContainer({
        containerTotalNum: 2,
        textObject: [
          new TextContainerProperty({
            containerID: 1,
            containerName: "reading",
            xPosition: 0,
            yPosition: 0,
            width: 576,
            height: 264,
            content: this.getCurrentPageText(),
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
            content: this.getStatusText(),
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
    } catch (err) {
      console.error("Glasses rebuild failed:", err);
    }
  }
}

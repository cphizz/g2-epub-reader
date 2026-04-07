import { type EvenAppBridge, ListContainerProperty, ListItemContainerProperty, RebuildPageContainer } from "@evenrealities/even_hub_sdk";

export class GlassesChapterListView {
  private bridge: EvenAppBridge;
  private bus: EventTarget;
  private chapters: { title: string }[] = [];
  private offset = 0;
  private readonly MAX_ITEMS = 20;

  constructor(bridge: EvenAppBridge, bus: EventTarget) {
    this.bridge = bridge;
    this.bus = bus;
  }

  async show(chapters: { title: string }[]) {
    this.chapters = chapters;
    this.offset = 0;
    await this.rebuild();
  }

  handleEvent(event: any) {
    const listEvent = event.listEvent;
    if (!listEvent) return;

    const eventType = listEvent.eventType;
    if (eventType === 0) {
      const idx = this.offset + (listEvent.currentSelectItemIndex ?? 0);
      this.bus.dispatchEvent(new CustomEvent("glasses-chapter-selected", { detail: { chapterIndex: idx } }));
    } else if (eventType === 1 && this.offset > 0) {
      this.offset = Math.max(0, this.offset - this.MAX_ITEMS);
      this.rebuild();
    } else if (eventType === 2 && this.offset + this.MAX_ITEMS < this.chapters.length) {
      this.offset += this.MAX_ITEMS;
      this.rebuild();
    } else if (eventType === 3) {
      this.bus.dispatchEvent(new CustomEvent("glasses-back-to-reading"));
    }
  }

  private async rebuild() {
    const items = this.chapters
      .slice(this.offset, this.offset + this.MAX_ITEMS)
      .map((ch, i) => {
        const num = this.offset + i + 1;
        const title = `${num}. ${ch.title}`;
        return title.length > 64 ? title.substring(0, 61) + "..." : title;
      });

    try {
      await this.bridge.rebuildPageContainer(new RebuildPageContainer({
        containerTotalNum: 1,
        listObject: [
          new ListContainerProperty({
            containerID: 3,
            containerName: "chapters",
            xPosition: 0,
            yPosition: 0,
            width: 576,
            height: 288,
            borderWidth: 0,
            borderColor: 0,
            borderRadius: 0,
            paddingLength: 4,
            isEventCapture: 1,
            itemContainer: new ListItemContainerProperty({
              itemCount: items.length,
              itemWidth: 560,
              isItemSelectBorderEn: 1,
              itemName: items,
            }),
          }),
        ],
        textObject: [],
        imageObject: [],
      }));
    } catch (err) {
      console.error("Glasses chapter list rebuild failed:", err);
    }
  }
}

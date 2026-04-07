import type { ViewModule, AppContext } from "./router";
import type { ParsedBook } from "../types";
import { getBook } from "../store/library";
import { getPosition, savePosition, getSettings, saveSettings } from "../store/reading-state";
import { paginateForBrowser, getCharsPerPage } from "../epub/paginator";
import { getBookmarks, addBookmark, removeBookmark, isBookmarked } from "../store/bookmarks";
import { showToast } from "./toast";

let container: HTMLElement | null = null;
let book: ParsedBook | null = null;
let chapterIndex = 0;
let pageIndex = 0;
let pages: string[] = [];
let panelOpen = false;
let panelTab: "chapters" | "bookmarks" | "search" = "chapters";
let touchStartX = 0;
let searchQuery = "";

function getPages(): string[] {
  if (!book || !book.chapters[chapterIndex]) return [""];
  const settings = getSettings();
  return paginateForBrowser(book.chapters[chapterIndex].plainText, getCharsPerPage(settings.fontSize));
}

function updateDisplay() {
  if (!container || !book) return;

  const contentEl = container.querySelector<HTMLElement>(".reader-content");
  const pageInfo = container.querySelector<HTMLElement>(".reader-page-info");
  const progressEl = container.querySelector<HTMLElement>(".reader-progress");
  const bookmarkBtn = container.querySelector<HTMLElement>(".bookmark-btn");

  if (contentEl) {
    contentEl.textContent = pages[pageIndex] || "";
    const settings = getSettings();
    contentEl.className = `reader-content font-${settings.fontSize}`;
  }

  if (pageInfo) {
    pageInfo.textContent = `Page ${pageIndex + 1} / ${pages.length}`;
  }

  if (progressEl && book.chapters.length > 0) {
    const chapterProgress = pages.length > 1 ? pageIndex / (pages.length - 1) : 1;
    const overall = ((chapterIndex + chapterProgress) / book.chapters.length) * 100;
    progressEl.textContent = `${Math.round(overall)}%`;
  }

  // Update bookmark button
  if (bookmarkBtn) {
    const marked = isBookmarked(book.metadata.id, chapterIndex, pageIndex);
    bookmarkBtn.classList.toggle("active", marked);
    bookmarkBtn.innerHTML = marked ? "&#9733;" : "&#9734;";
  }

  // Update font toggle active state
  const settings = getSettings();
  container.querySelectorAll<HTMLElement>(".reader-font-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.size === settings.fontSize);
  });

  // Save position
  savePosition({
    bookId: book.metadata.id,
    chapterIndex,
    pageIndex,
    glassesPageIndex: 0,
    lastReadAt: Date.now(),
  });
}

function animatePageTurn(_direction: "next" | "prev", callback: () => void) {
  const contentEl = container?.querySelector<HTMLElement>(".reader-content");
  if (!contentEl) { callback(); return; }
  contentEl.classList.add("page-turning");
  setTimeout(() => {
    callback();
    contentEl.classList.remove("page-turning");
  }, 100);
}

function nextPage() {
  if (!book) return;
  animatePageTurn("next", () => {
    if (pageIndex < pages.length - 1) {
      pageIndex++;
      updateDisplay();
    } else if (chapterIndex < book!.chapters.length - 1) {
      chapterIndex++;
      pages = getPages();
      pageIndex = 0;
      updateDisplay();
      showToast(book!.chapters[chapterIndex].title);
    }
  });
}

function prevPage() {
  if (!book) return;
  animatePageTurn("prev", () => {
    if (pageIndex > 0) {
      pageIndex--;
      updateDisplay();
    } else if (chapterIndex > 0) {
      chapterIndex--;
      pages = getPages();
      pageIndex = Math.max(0, pages.length - 1);
      updateDisplay();
      showToast(book!.chapters[chapterIndex].title);
    }
  });
}

function jumpToChapter(index: number) {
  if (!book || index < 0 || index >= book.chapters.length) return;
  chapterIndex = index;
  pages = getPages();
  pageIndex = 0;
  updateDisplay();
  closePanel();
}

function openPanel() {
  panelOpen = true;
  container?.querySelector(".chapter-overlay")?.classList.add("open");
  container?.querySelector(".chapter-panel")?.classList.add("open");
  updatePanelContent();
}

function closePanel() {
  panelOpen = false;
  container?.querySelector(".chapter-overlay")?.classList.remove("open");
  container?.querySelector(".chapter-panel")?.classList.remove("open");
}

function updatePanelContent() {
  if (!book || !container) return;
  const panelBody = container.querySelector<HTMLElement>(".panel-body");
  if (!panelBody) return;

  // Update tab active states
  container.querySelectorAll<HTMLElement>(".panel-tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.tab === panelTab);
  });

  if (panelTab === "chapters") {
    renderChapterList(panelBody);
  } else if (panelTab === "bookmarks") {
    renderBookmarksList(panelBody);
  } else if (panelTab === "search") {
    renderSearchPanel(panelBody);
  }
}

function renderChapterList(el: HTMLElement) {
  if (!book) return;
  el.innerHTML = `<div class="chapter-list">${book.chapters.map((ch, i) => `
    <div class="chapter-item ${i === chapterIndex ? "active" : ""}" data-chapter="${i}">
      <span class="chapter-item-number">${i + 1}</span>
      <span class="chapter-item-title">${escapeHtml(ch.title)}</span>
    </div>
  `).join("")}</div>`;

  el.querySelectorAll<HTMLElement>(".chapter-item").forEach((item) => {
    item.addEventListener("click", () => {
      jumpToChapter(parseInt(item.dataset.chapter ?? "0", 10));
    });
  });

  const active = el.querySelector(".chapter-item.active");
  active?.scrollIntoView({ block: "center" });
}

function renderBookmarksList(el: HTMLElement) {
  if (!book) return;
  const bookmarks = getBookmarks(book.metadata.id);

  if (bookmarks.length === 0) {
    el.innerHTML = `
      <div style="padding: 32px 20px; text-align: center; color: var(--text-muted); font-size: 14px;">
        No bookmarks yet.<br>Tap the star while reading to add one.
      </div>
    `;
    return;
  }

  el.innerHTML = `<div class="bookmarks-list">${bookmarks.map((bm, i) => `
    <div class="bookmark-item" data-bm-chapter="${bm.chapterIndex}" data-bm-page="${bm.pageIndex}">
      <div style="flex: 1">
        <div class="bookmark-item-chapter">Ch. ${bm.chapterIndex + 1} &middot; Page ${bm.pageIndex + 1}</div>
        <div class="bookmark-item-preview">${escapeHtml(bm.preview)}</div>
      </div>
      <button class="bookmark-item-delete" data-bm-idx="${i}" title="Remove">&times;</button>
    </div>
  `).join("")}</div>`;

  el.querySelectorAll<HTMLElement>(".bookmark-item").forEach((item) => {
    item.addEventListener("click", (e) => {
      if ((e.target as HTMLElement).closest(".bookmark-item-delete")) return;
      const ch = parseInt(item.dataset.bmChapter ?? "0", 10);
      const pg = parseInt(item.dataset.bmPage ?? "0", 10);
      chapterIndex = ch;
      pages = getPages();
      pageIndex = Math.min(pg, pages.length - 1);
      updateDisplay();
      closePanel();
    });
  });

  el.querySelectorAll<HTMLButtonElement>(".bookmark-item-delete").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.bmIdx ?? "0", 10);
      removeBookmark(book!.metadata.id, idx);
      renderBookmarksList(el);
    });
  });
}

function renderSearchPanel(el: HTMLElement) {
  if (!book) return;

  el.innerHTML = `
    <div style="padding: 12px 20px;">
      <div class="search-container">
        <span class="search-icon">&#128269;</span>
        <input class="search-input" type="text" placeholder="Search in book..." value="${escapeHtml(searchQuery)}">
      </div>
      <div class="search-results" id="search-results"></div>
    </div>
  `;

  const input = el.querySelector<HTMLInputElement>(".search-input");
  const resultsEl = el.querySelector<HTMLElement>("#search-results");

  if (input) {
    input.focus();
    input.addEventListener("input", () => {
      searchQuery = input.value;
      performSearch(resultsEl!);
    });
    // Show existing results if query exists
    if (searchQuery) performSearch(resultsEl!);
  }
}

function performSearch(resultsEl: HTMLElement) {
  if (!book || !searchQuery.trim()) {
    resultsEl.innerHTML = "";
    return;
  }

  const query = searchQuery.toLowerCase();
  const results: { chapterIndex: number; chapterTitle: string; snippet: string }[] = [];

  for (let ci = 0; ci < book.chapters.length && results.length < 20; ci++) {
    const text = book.chapters[ci].plainText;
    const lower = text.toLowerCase();
    let idx = lower.indexOf(query);
    while (idx !== -1 && results.length < 20) {
      const start = Math.max(0, idx - 40);
      const end = Math.min(text.length, idx + query.length + 40);
      let snippet = text.substring(start, end);
      if (start > 0) snippet = "..." + snippet;
      if (end < text.length) snippet = snippet + "...";

      results.push({
        chapterIndex: ci,
        chapterTitle: book.chapters[ci].title,
        snippet,
      });

      idx = lower.indexOf(query, idx + query.length);
    }
  }

  if (results.length === 0) {
    resultsEl.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 20px; font-size: 14px;">No results found</div>`;
    return;
  }

  resultsEl.innerHTML = results.map((r, i) => {
    const highlighted = r.snippet.replace(
      new RegExp(`(${escapeRegex(searchQuery)})`, "gi"),
      "<mark>$1</mark>"
    );
    return `
      <div class="search-result-item" data-result="${i}" data-chapter="${r.chapterIndex}">
        <div class="search-result-chapter">${escapeHtml(r.chapterTitle)}</div>
        <div class="search-result-text">${highlighted}</div>
      </div>
    `;
  }).join("");

  resultsEl.querySelectorAll<HTMLElement>(".search-result-item").forEach((item) => {
    item.addEventListener("click", () => {
      const ch = parseInt(item.dataset.chapter ?? "0", 10);
      jumpToChapter(ch);
    });
  });
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toggleBookmark() {
  if (!book) return;
  const marked = isBookmarked(book.metadata.id, chapterIndex, pageIndex);
  if (marked) {
    const bookmarks = getBookmarks(book.metadata.id);
    const idx = bookmarks.findIndex((b) => b.chapterIndex === chapterIndex && b.pageIndex === pageIndex);
    if (idx >= 0) removeBookmark(book.metadata.id, idx);
    showToast("Bookmark removed");
  } else {
    const preview = (pages[pageIndex] || "").substring(0, 100);
    addBookmark({
      bookId: book.metadata.id,
      chapterIndex,
      pageIndex,
      preview,
      createdAt: Date.now(),
    });
    showToast("Bookmarked!");
  }
  updateDisplay();
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

async function render(el: HTMLElement, ctx: AppContext, params?: Record<string, string>) {
  container = el;
  const bookId = params?.bookId;
  if (!bookId) {
    ctx.router.navigate("landing");
    return;
  }

  book = await getBook(bookId);
  if (!book) {
    showToast("Book not found");
    ctx.router.navigate("landing");
    return;
  }

  const pos = getPosition(bookId);
  chapterIndex = Math.min(pos.chapterIndex, book.chapters.length - 1);
  pages = getPages();
  pageIndex = Math.min(pos.pageIndex, pages.length - 1);
  searchQuery = "";

  const settings = getSettings();

  el.innerHTML = `
    <div class="reader">
      <div class="reader-topbar">
        <button class="reader-back-btn" id="reader-back">&#8592;</button>
        <div class="reader-book-title">${escapeHtml(book.metadata.title)}</div>
        <button class="bookmark-btn" id="bookmark-btn">&#9734;</button>
        <button class="reader-menu-btn" id="reader-menu">&#9776;</button>
      </div>

      <div class="reader-content font-${settings.fontSize}"></div>

      <div class="reader-bottombar">
        <div class="reader-page-info"></div>
        <div class="reader-progress"></div>
        <div class="reader-font-toggle">
          <button class="reader-font-btn" data-size="small" style="font-size:11px">A</button>
          <button class="reader-font-btn" data-size="medium" style="font-size:13px">A</button>
          <button class="reader-font-btn" data-size="large" style="font-size:16px">A</button>
        </div>
      </div>

      <div class="chapter-overlay"></div>
      <div class="chapter-panel">
        <div class="panel-tabs">
          <button class="panel-tab active" data-tab="chapters">Chapters</button>
          <button class="panel-tab" data-tab="bookmarks">Bookmarks</button>
          <button class="panel-tab" data-tab="search">Search</button>
        </div>
        <div class="panel-body"></div>
      </div>
    </div>
  `;

  updateDisplay();

  // Back button
  el.querySelector("#reader-back")?.addEventListener("click", () => {
    ctx.router.navigate("landing");
  });

  // Bookmark button
  el.querySelector("#bookmark-btn")?.addEventListener("click", toggleBookmark);

  // Panel menu
  el.querySelector("#reader-menu")?.addEventListener("click", () => {
    if (panelOpen) closePanel();
    else openPanel();
  });

  // Panel tabs
  el.querySelectorAll<HTMLElement>(".panel-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      panelTab = tab.dataset.tab as typeof panelTab;
      updatePanelContent();
    });
  });

  // Close panel on overlay click
  el.querySelector(".chapter-overlay")?.addEventListener("click", closePanel);

  // Tap zones on content area
  const contentEl = el.querySelector<HTMLElement>(".reader-content");
  if (contentEl) {
    contentEl.addEventListener("click", (e) => {
      const rect = contentEl.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const third = rect.width / 3;
      if (x < third) prevPage();
      else if (x > third * 2) nextPage();
    });

    // Swipe gestures
    contentEl.addEventListener("touchstart", (e) => {
      touchStartX = e.touches[0].clientX;
    }, { passive: true });

    contentEl.addEventListener("touchend", (e) => {
      const deltaX = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(deltaX) > 50) {
        if (deltaX < 0) nextPage();
        else prevPage();
      }
    }, { passive: true });
  }

  // Font size buttons
  el.querySelectorAll<HTMLButtonElement>(".reader-font-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const size = btn.dataset.size as "small" | "medium" | "large";
      const s = getSettings();
      s.fontSize = size;
      saveSettings(s);
      pages = getPages();
      pageIndex = Math.min(pageIndex, pages.length - 1);
      updateDisplay();
    });
  });

  // Keyboard navigation
  document.addEventListener("keydown", handleKeydown);
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === "ArrowRight" || e.key === " ") {
    e.preventDefault();
    nextPage();
  } else if (e.key === "ArrowLeft") {
    e.preventDefault();
    prevPage();
  } else if (e.key === "Escape") {
    if (panelOpen) closePanel();
  } else if (e.key === "b" || e.key === "B") {
    if (!panelOpen) toggleBookmark();
  }
}

function destroy() {
  document.removeEventListener("keydown", handleKeydown);
  container = null;
  book = null;
  panelOpen = false;
  searchQuery = "";
}

export const readerView: ViewModule = { render, destroy };

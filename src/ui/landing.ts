import type { ViewModule, AppContext } from "./router";
import type { BookMetadata } from "../types";
import { getMetadataList, removeBook } from "../store/library";
import { getPosition } from "../store/reading-state";
import { parseEpub } from "../epub/parser";
import { addBook } from "../store/library";
import { showToast, showLoading } from "./toast";

let container: HTMLElement | null = null;
let fileInput: HTMLInputElement | null = null;

function handleFiles(files: FileList, ctx: AppContext) {
  const file = files[0];
  if (!file || !file.name.endsWith(".epub")) {
    showToast("Please select an EPUB file");
    return;
  }
  loadEpub(file, ctx);
}

async function loadEpub(file: File, ctx: AppContext) {
  const hideLoading = showLoading("Opening book...");
  try {
    const book = await parseEpub(file);
    await addBook(book);
    hideLoading();
    showToast(`Added "${book.metadata.title}"`);
    render(container!, ctx);
  } catch (err) {
    hideLoading();
    console.error("EPUB parse error:", err);
    showToast("Could not read this file");
  }
}

function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

function estimateReadingTime(totalChapters: number): string {
  // Rough estimate: ~4 min per chapter average
  const minutes = totalChapters * 4;
  if (minutes < 60) return `~${minutes} min read`;
  const hours = Math.round(minutes / 60);
  return `~${hours}h read`;
}

function getCoverGradientClass(id: string): string {
  // Deterministic gradient based on book id
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(hash) % 5;
  return `book-cover-gradient-${idx}`;
}

function renderEmpty(el: HTMLElement, ctx: AppContext) {
  el.innerHTML = `
    <div class="empty-state">
      <div class="ornament">~ ~ ~</div>
      <div class="drop-zone" id="drop-zone">
        <div class="drop-zone-icon">&#128214;</div>
        <div class="drop-zone-text">Drop an EPUB here</div>
        <div class="drop-zone-hint">or tap to browse your files</div>
      </div>
      <div class="ornament">~ ~ ~</div>
    </div>
  `;
  setupDropZone(el, ctx);
}

function renderLibrary(el: HTMLElement, ctx: AppContext, books: BookMetadata[]) {
  // Sort by most recently read/added
  const sorted = [...books].sort((a, b) => {
    const posA = getPosition(a.id);
    const posB = getPosition(b.id);
    return posB.lastReadAt - posA.lastReadAt;
  });

  const cardsHtml = sorted.map((book) => {
    const pos = getPosition(book.id);
    const progress = book.totalChapters > 0
      ? Math.round((pos.chapterIndex / book.totalChapters) * 100)
      : 0;

    const gradientClass = getCoverGradientClass(book.id);
    const coverHtml = book.coverImageBase64
      ? `<img src="${book.coverImageBase64}" alt="">`
      : `<span class="book-cover-initial">${book.title.charAt(0).toUpperCase()}</span>`;

    const coverClass = book.coverImageBase64 ? "" : gradientClass;
    const lastRead = pos.lastReadAt > 0 ? `<div class="book-last-read">${timeAgo(pos.lastReadAt)}</div>` : "";
    const readTime = `<div class="book-reading-time">${estimateReadingTime(book.totalChapters)}</div>`;

    return `
      <div class="book-card" data-book-id="${book.id}">
        <div class="book-cover ${coverClass}" style="position:relative">
          ${coverHtml}
          <div class="book-card-actions">
            <button class="book-delete-btn" data-delete-id="${book.id}" title="Remove">&times;</button>
          </div>
        </div>
        <div class="book-info">
          <div class="book-title">${escapeHtml(book.title)}</div>
          <div class="book-author">${escapeHtml(book.author)}</div>
          ${readTime}
          ${lastRead}
          <div class="book-progress">
            <div class="book-progress-bar" style="width: ${progress}%"></div>
          </div>
        </div>
      </div>
    `;
  }).join("");

  el.innerHTML = `
    <div class="drop-zone" id="drop-zone" style="margin-bottom: 8px; padding: 24px 16px;">
      <div class="drop-zone-text" style="font-size: 15px;">Drop an EPUB or tap to add</div>
    </div>
    <div class="book-grid">
      ${cardsHtml}
    </div>
  `;

  setupDropZone(el, ctx);

  // Card click -> open reader
  el.querySelectorAll<HTMLElement>(".book-card").forEach((card) => {
    card.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      if (target.closest(".book-delete-btn")) return;
      const bookId = card.dataset.bookId;
      if (bookId) ctx.router.navigate("reader", { bookId });
    });
  });

  // Delete buttons
  el.querySelectorAll<HTMLButtonElement>(".book-delete-btn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const id = btn.dataset.deleteId;
      if (!id) return;
      await removeBook(id);
      showToast("Book removed");
      render(container!, ctx);
    });
  });
}

function setupDropZone(el: HTMLElement, ctx: AppContext) {
  const dropZone = el.querySelector<HTMLElement>("#drop-zone");
  if (!dropZone) return;

  fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = ".epub";
  fileInput.style.display = "none";
  el.appendChild(fileInput);

  fileInput.addEventListener("change", () => {
    if (fileInput?.files?.length) handleFiles(fileInput.files, ctx);
  });

  dropZone.addEventListener("click", () => fileInput?.click());

  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("dragover");
  });

  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("dragover");
  });

  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
    if (e.dataTransfer?.files.length) handleFiles(e.dataTransfer.files, ctx);
  });
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function render(el: HTMLElement, ctx: AppContext, _params?: Record<string, string>) {
  container = el;
  const books = getMetadataList();

  el.innerHTML = `<div class="landing"></div>`;
  const landing = el.querySelector<HTMLElement>(".landing")!;

  landing.innerHTML = `
    <div class="landing-header">
      <div>
        <div class="landing-title">Library</div>
        <div class="landing-subtitle">Your EPUB collection</div>
      </div>
      <button class="settings-btn" id="settings-btn" title="Settings">&#9881;</button>
    </div>
    <div id="landing-content"></div>
  `;

  const content = landing.querySelector<HTMLElement>("#landing-content")!;

  if (books.length === 0) {
    renderEmpty(content, ctx);
  } else {
    renderLibrary(content, ctx, books);
  }

  landing.querySelector("#settings-btn")?.addEventListener("click", () => {
    ctx.router.navigate("settings");
  });
}

function destroy() {
  container = null;
  fileInput = null;
}

export const landingView: ViewModule = { render, destroy };

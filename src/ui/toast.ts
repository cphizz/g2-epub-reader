let currentToast: HTMLElement | null = null;

export function showToast(message: string, duration = 3000) {
  if (currentToast) currentToast.remove();

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  currentToast = toast;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add("show"));
  });

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

export function showLoading(message: string): () => void {
  const overlay = document.createElement("div");
  overlay.className = "loading-overlay";
  overlay.innerHTML = `
    <div class="loading-spinner"></div>
    <div class="loading-text">${message}</div>
  `;
  document.body.appendChild(overlay);
  return () => overlay.remove();
}

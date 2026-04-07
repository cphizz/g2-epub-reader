import type { ViewModule, AppContext } from "./router";
import { getSettings, saveSettings } from "../store/reading-state";
import type { AppSettings } from "../types";

function applyTheme(theme: AppSettings["theme"]) {
  document.documentElement.setAttribute("data-theme", theme);
}

function render(el: HTMLElement, ctx: AppContext) {
  const settings = getSettings();

  el.innerHTML = `
    <div class="settings-overlay open">
      <div class="settings-modal">
        <div class="settings-title">Settings</div>

        <div class="settings-section">
          <div class="settings-label">Font Size</div>
          <div class="settings-font-options">
            <button class="settings-font-btn ${settings.fontSize === "small" ? "active" : ""}" data-size="small">
              <span style="font-size: 14px">Aa</span>
              <div class="size-label">Small</div>
            </button>
            <button class="settings-font-btn ${settings.fontSize === "medium" ? "active" : ""}" data-size="medium">
              <span style="font-size: 18px">Aa</span>
              <div class="size-label">Medium</div>
            </button>
            <button class="settings-font-btn ${settings.fontSize === "large" ? "active" : ""}" data-size="large">
              <span style="font-size: 24px">Aa</span>
              <div class="size-label">Large</div>
            </button>
          </div>
        </div>

        <div class="settings-section">
          <div class="settings-label">Theme</div>
          <div class="settings-theme-options">
            <button class="settings-theme-btn ${settings.theme === "cream" ? "active" : ""}" data-theme="cream">
              <div class="settings-theme-swatch cream"></div>
              <span class="settings-theme-name">Cream</span>
            </button>
            <button class="settings-theme-btn ${settings.theme === "sepia" ? "active" : ""}" data-theme="sepia">
              <div class="settings-theme-swatch sepia"></div>
              <span class="settings-theme-name">Sepia</span>
            </button>
            <button class="settings-theme-btn ${settings.theme === "dark" ? "active" : ""}" data-theme="dark">
              <div class="settings-theme-swatch dark"></div>
              <span class="settings-theme-name">Dark</span>
            </button>
          </div>
        </div>

        <button class="settings-close-btn" id="settings-close">Done</button>
      </div>
    </div>
  `;

  // Font size buttons
  el.querySelectorAll<HTMLButtonElement>(".settings-font-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const size = btn.dataset.size as AppSettings["fontSize"];
      const s = getSettings();
      s.fontSize = size;
      saveSettings(s);
      el.querySelectorAll(".settings-font-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });

  // Theme buttons
  el.querySelectorAll<HTMLButtonElement>(".settings-theme-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const theme = btn.dataset.theme as AppSettings["theme"];
      const s = getSettings();
      s.theme = theme;
      saveSettings(s);
      applyTheme(theme);
      el.querySelectorAll(".settings-theme-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });

  // Close
  el.querySelector("#settings-close")?.addEventListener("click", () => {
    ctx.router.navigate("landing");
  });
}

function destroy() {
  // no-op
}

export const settingsView: ViewModule = { render, destroy };

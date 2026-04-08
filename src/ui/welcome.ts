import type { ViewModule, AppContext } from "./router";
import type { AppSettings } from "../types";
import { getSettings, saveSettings, markSetupDone } from "../store/reading-state";

let selectedTheme: AppSettings["theme"] = "cream";

function applyTheme(theme: AppSettings["theme"]) {
  document.documentElement.setAttribute("data-theme", theme);
}

function render(el: HTMLElement, ctx: AppContext) {
  selectedTheme = getSettings().theme;

  el.innerHTML = `
    <div class="welcome">
      <div class="welcome-icon">&#128214;</div>
      <div class="welcome-title">BookLens</div>
      <div class="welcome-subtitle">Choose your reading style</div>

      <div class="welcome-themes">
        <button class="welcome-theme-card ${selectedTheme === "cream" ? "selected" : ""}" data-theme="cream">
          <div class="welcome-theme-preview cream"></div>
          <div class="welcome-theme-name">Cream</div>
        </button>
        <button class="welcome-theme-card ${selectedTheme === "sepia" ? "selected" : ""}" data-theme="sepia">
          <div class="welcome-theme-preview sepia"></div>
          <div class="welcome-theme-name">Sepia</div>
        </button>
        <button class="welcome-theme-card ${selectedTheme === "dark" ? "selected" : ""}" data-theme="dark">
          <div class="welcome-theme-preview dark"></div>
          <div class="welcome-theme-name">Dark</div>
        </button>
      </div>

      <button class="welcome-start-btn" id="welcome-start">Start Reading</button>
    </div>
  `;

  // Theme card selection
  el.querySelectorAll<HTMLElement>(".welcome-theme-card").forEach((card) => {
    card.addEventListener("click", () => {
      selectedTheme = card.dataset.theme as AppSettings["theme"];
      applyTheme(selectedTheme);

      el.querySelectorAll(".welcome-theme-card").forEach((c) => c.classList.remove("selected"));
      card.classList.add("selected");
    });
  });

  // Start button
  el.querySelector("#welcome-start")?.addEventListener("click", () => {
    const settings = getSettings();
    settings.theme = selectedTheme;
    saveSettings(settings);
    markSetupDone();
    ctx.router.navigate("landing");
  });
}

function destroy() {}

export const welcomeView: ViewModule = { render, destroy };

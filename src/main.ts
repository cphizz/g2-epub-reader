import "./style.css";
import { waitForEvenAppBridge } from "@evenrealities/even_hub_sdk";
import { Router } from "./ui/router";
import { landingView } from "./ui/landing";
import { readerView } from "./ui/reader";
import { settingsView } from "./ui/settings";
import { getSettings } from "./store/reading-state";
import { initGlassesDisplay } from "./glasses/display";

const bus = new EventTarget();

async function init() {
  // Apply saved theme
  const settings = getSettings();
  document.documentElement.setAttribute("data-theme", settings.theme);

  // Set up router
  const appEl = document.getElementById("app")!;
  const router = new Router(appEl, bus);
  router.register("landing", landingView);
  router.register("reader", readerView);
  router.register("settings", settingsView);
  router.navigate("landing");

  // Connect to G2 glasses (non-blocking)
  try {
    const bridge = await Promise.race([
      waitForEvenAppBridge(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 10000)),
    ]);
    console.log("Bridge ready");
    initGlassesDisplay(bridge as any, bus);
  } catch {
    console.log("Running without G2 glasses");
  }
}

init();

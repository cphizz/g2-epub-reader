import "./style.css";
import { waitForEvenAppBridge } from "@evenrealities/even_hub_sdk";
import { Router } from "./ui/router";
import { landingView } from "./ui/landing";
import { readerView } from "./ui/reader";
import { settingsView } from "./ui/settings";
import { getSettings } from "./store/reading-state";
import { initGlassesDisplay } from "./glasses/display";
import { setBridge } from "./store/bridge-sync";
import { restoreLibraryFromBridge } from "./store/library";

const bus = new EventTarget();
let router: Router | null = null;

async function init() {
  // Apply saved theme
  const settings = getSettings();
  document.documentElement.setAttribute("data-theme", settings.theme);

  // Set up router
  const appEl = document.getElementById("app")!;
  router = new Router(appEl, bus);
  router.register("landing", landingView);
  router.register("reader", readerView);
  router.register("settings", settingsView);
  router.navigate("landing");

  // Connect to G2 glasses (non-blocking)
  connectBridge(bus);
}

async function connectBridge(bus: EventTarget) {
  try {
    const bridge = await waitForEvenAppBridge();
    console.log("Bridge ready");

    // Set bridge for persistence sync
    setBridge(bridge as any);

    // Restore library from bridge if browser storage was wiped
    const restored = await restoreLibraryFromBridge();
    if (restored && router) {
      console.log("Library restored from bridge storage, refreshing...");
      router.navigate("landing");
    }

    // Init glasses display
    initGlassesDisplay(bridge as any, bus);
  } catch (err) {
    console.log("Running without G2 glasses:", err);
  }
}

init();

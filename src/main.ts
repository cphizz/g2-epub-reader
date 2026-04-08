import "./style.css";
import { waitForEvenAppBridge } from "@evenrealities/even_hub_sdk";
import { Router } from "./ui/router";
import { landingView } from "./ui/landing";
import { readerView } from "./ui/reader";
import { settingsView } from "./ui/settings";
import { welcomeView } from "./ui/welcome";
import { getSettings, hasCompletedSetup } from "./store/reading-state";
import { setupGlassesEventListeners, initGlassesDisplay } from "./glasses/display";
import { setBridge } from "./store/bridge-sync";
import { restoreLibraryFromBridge } from "./store/library";

const bus = new EventTarget();
let router: Router | null = null;

async function init() {
  // Apply saved theme
  const settings = getSettings();
  document.documentElement.setAttribute("data-theme", settings.theme);

  // Start listening for book events IMMEDIATELY (before bridge connects)
  // This queues any book-opened events for when the bridge is ready
  setupGlassesEventListeners(bus);

  // Set up router
  const appEl = document.getElementById("app")!;
  router = new Router(appEl, bus);
  router.register("welcome", welcomeView);
  router.register("landing", landingView);
  router.register("reader", readerView);
  router.register("settings", settingsView);

  // Show welcome theme picker on first launch, otherwise go to library
  if (hasCompletedSetup()) {
    router.navigate("landing");
  } else {
    router.navigate("welcome");
  }

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

    // Init glasses display — will load any queued book automatically
    initGlassesDisplay(bridge as any, bus);
  } catch (err) {
    console.log("Running without G2 glasses:", err);
  }
}

init();

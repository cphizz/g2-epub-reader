// Post-build: fix index.html for Even Hub WebView compatibility
// - Remove type="module" (use plain script)
// - Remove crossorigin attribute
import { readFileSync, writeFileSync } from "fs";

const path = "dist/index.html";
let html = readFileSync(path, "utf-8");

html = html.replace(' type="module"', "");
html = html.replace(' crossorigin', "");

writeFileSync(path, html);
console.log("Fixed dist/index.html: removed type=module and crossorigin");

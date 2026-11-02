/**
 * The page's one module script (docs/ARCHITECTURE-TARGET.md section 7, Page load): composes the tester on the
 * entry document's `<svg>`, with the window as key source, the page's address and the browser's `navigator`, the
 * view pane's `<svg>` and its reticle,
 * and leaves the composed page readable whole at `globalThis.inputTester`, which the gate's proof reads.
 */
import { composeTesterPage } from "./composition-root.js";
import type { BrowserBrands } from "./composition-root.js";
import type { KeyboardMapSource } from "./key-labels.js";

const surface = document.getElementById("input-surface");
if (!(surface instanceof SVGSVGElement)) throw new Error("page-entry: the entry document holds no <svg> with the id input-surface");
// TypeScript's DOM library names neither `navigator.keyboard` nor `navigator.userAgentData`, so the two members
// the page reads are stated by the parts that read them, each optional, as a browser may lack either
const browser = navigator as KeyboardMapSource & BrowserBrands;
const pane = document.getElementById("view-pane");
if (!(pane instanceof SVGSVGElement)) throw new Error("page-entry: the entry document holds no <svg> with the id view-pane");
const reticle = document.getElementById("view-home");
if (!(reticle instanceof HTMLButtonElement)) throw new Error("page-entry: the entry document holds no <button> with the id view-home");
const page = composeTesterPage({ surface, keySource: window, address: document.URL, browser, pane, reticle });
Object.defineProperty(globalThis, "inputTester", { value: page, enumerable: false, writable: false, configurable: false });

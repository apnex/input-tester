/**
 * The page's one module script (docs/ARCHITECTURE-TARGET.md section 7, Page load): composes the tester on the
 * entry document's `<svg>`, with the window as key source, the page's address and the browser's `navigator`,
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
const page = composeTesterPage({ surface, keySource: window, address: document.URL, browser });
Object.defineProperty(globalThis, "inputTester", { value: page, enumerable: false, writable: false, configurable: false });

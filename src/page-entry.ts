/**
 * The page's one module script (docs/ARCHITECTURE-TARGET.md section 7, Page load): composes the tester on the
 * entry document's `<svg>`, with the window as key source, the page's address and the browser's `navigator`, the
 * view pane's `<svg>` and its reticle,
 * and leaves the composed page readable whole at `globalThis.inputTester`, which the gate's proof reads.
 */
import { asksLargePane } from "./address-tuning.js";
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
/** The element of the given id, held to its kind, or the page's error naming it. */
function elementOf<T extends Element>(id: string, kind: { new (): T; prototype: T }, what: string): T {
	const element = document.getElementById(id);
	if (!(element instanceof kind)) throw new Error(`page-entry: the entry document holds no ${what} with the id ${id}`);
	return element;
}
const paneReadouts = elementOf("view-readouts", SVGSVGElement, "<svg>");
// The pane's size is a hidden checkbox the stylesheet reads, set from the address before anything is composed, so
// the first paint is drawn at the size the address asks: `#view` the large pane
const large = elementOf("view-large", HTMLInputElement, "<input>");
large.checked = asksLargePane(document.URL);
const paneSize = { large: (on: boolean): void => void (large.checked = on) };
const paneLarge = elementOf("pane-large", HTMLButtonElement, "<button>");
const paneSmall = elementOf("pane-small", HTMLButtonElement, "<button>");
const reticle = elementOf("view-home", HTMLButtonElement, "<button>");
const goMillion = elementOf("go-million", HTMLButtonElement, "<button>");
const goTwoTo21 = elementOf("go-two-to-21", HTMLButtonElement, "<button>");
/** Where the browser reports a precision line's left edge on screen, by its distance: its element's bounding box, Chrome's own geometry. */
const precisionBounds = (distance: number): number | null => pane.querySelector(`.precision-${distance}`)?.getBoundingClientRect().left ?? null;
const page = composeTesterPage({ surface, keySource: window, address: document.URL, browser, pane, paneReadouts, precisionBounds, reticle, goMillion, goTwoTo21, paneSize, paneLarge, paneSmall });
Object.defineProperty(globalThis, "inputTester", { value: page, enumerable: false, writable: false, configurable: false });

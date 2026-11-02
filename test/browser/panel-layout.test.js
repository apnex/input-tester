// panel-layout - the picture's text as one layout, in a real browser (docs/ARCHITECTURE-TARGET.md section 6, what
// is shown; docs/DECISIONS.md 0008 and 0009): the built site opened in headless Chrome and driven by trusted input
// to the longest realistic wordings -- a key press, a four-line wheel of a Chromebook's fractional deltas repeated
// with every modifier, a long right pan live and released, a middle pan released, an ordinary scroll, a
// synthesized touchpad pinch, Ctrl and the wheel, a pinch stepping in with the rest dropped -- and after each every
// line of text measured on its own, a tspan or a text without one: each inside the picture, clear of every other
// line and of the drawn keyboard and mouse. Every legend row is measured at rest and again marked bold as the
// input, so its words fit the picture as it shows them either way.
import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import { siteRoot } from "../support/built-site.js";
import { MODIFIERS, openTesterInChrome } from "./tester-in-chrome.js";

const TEST = { timeout: 90000 };
let t;

before(async () => {
	t = await openTesterInChrome({ siteDir: siteRoot });
}, { timeout: 60000 });

after(async () => {
	await t?.close();
}, { timeout: 30000 });

/**
 * Every line of the panel's text, in drawing units -- each tspan, or a text with none, its words non-empty -- with
 * the drawn keyboard's and mouse's boxes and the picture's viewBox; with `bold`, every legend row first marked as
 * the input, as the page marks the row an input hits.
 */
const measure = (bold) => `(() => {
	const svg = document.getElementById('input-surface');
	if (${bold}) for (const row of svg.querySelectorAll('g.legend-row')) row.setAttribute('class', 'legend-row legend-input');
	const box = (e, what) => { const b = e.getBBox(); return { x: b.x, y: b.y, x2: b.x + b.width, y2: b.y + b.height, what }; };
	const lines = [];
	for (const text of svg.querySelectorAll('g.panel text')) {
		const spans = [...text.querySelectorAll('tspan')];
		const kind = text.getAttribute('class');
		for (const e of spans.length > 0 ? spans : [text]) if ((e.textContent || '').trim() !== '') lines.push(box(e, kind + ': ' + e.textContent.slice(0, 70)));
	}
	const drawn = [...svg.querySelectorAll(':scope > g.keys, :scope > g.mouse')].map((g) => box(g, 'the drawn ' + g.getAttribute('class')));
	const v = svg.viewBox.baseVal;
	return { lines, drawn, picture: { x: v.x, y: v.y, x2: v.x + v.width, y2: v.y + v.height } };
})()`;

/** Whether two boxes overlap by more than half a unit each way, so lines a leading apart touch without overlapping. */
const overlaps = (a, b) => a.x < b.x2 - 0.5 && b.x < a.x2 - 0.5 && a.y < b.y2 - 0.5 && b.y < a.y2 - 0.5;
const where = (b) => `x ${Math.round(b.x)}..${Math.round(b.x2)}, y ${Math.round(b.y)}..${Math.round(b.y2)}`;
let widestLegend = 0;
let lowest = 0;

/** Holds every line inside the picture and clear of every other line and of the drawing, at rest and with the legend bold. */
async function assertEveryLineClear(when) {
	await t.settle();
	for (const bold of [false, true]) {
		const { lines, drawn, picture } = await t.page(measure(bold));
		const state = `${when}${bold ? ", every legend row marked bold as the input" : ""}`;
		assert.ok(lines.length > 40, `${state}: ${lines.length} lines measured`);
		for (const [i, line] of lines.entries()) {
			if (line.what.startsWith("legend-words")) widestLegend = Math.max(widestLegend, line.x2);
			lowest = Math.max(lowest, line.y2);
			assert.ok(line.x >= picture.x && line.y >= picture.y && line.x2 <= picture.x2 && line.y2 <= picture.y2, `${state}: "${line.what}" (${where(line)}) leaves the picture (${where(picture)})`);
			for (const other of lines.slice(i + 1)) assert.ok(!overlaps(line, other), `${state}: "${line.what}" (${where(line)}) overlaps "${other.what}" (${where(other)})`);
			for (const shape of drawn) assert.ok(!overlaps(line, shape), `${state}: "${line.what}" (${where(line)}) overlaps ${shape.what} (${where(shape)})`);
		}
	}
	await t.chrome.evaluate("document.querySelectorAll('#input-surface g.legend-row').length");
}

/** The lines of the mouse column's text of the given class. */
const columnLines = (className) => t.page(`[...document.querySelectorAll('#input-surface text.${className} tspan')].map((s) => s.textContent)`);

test("the picture's text as one layout: every line -- the mouse column's, the log's, every legend row's at rest and bold, and every other -- stays inside the picture, clear of every other line and of the drawn keyboard and mouse, at the longest realistic wordings", TEST, async (tc) => {
	const every = MODIFIERS.shift | MODIFIERS.alt | MODIFIERS.meta;
	await assertEveryLineClear("at rest");
	await t.key("keyDown", "a", "KeyA", { text: "a", windowsVirtualKeyCode: 65 });
	await t.key("keyUp", "a", "KeyA", { windowsVirtualKeyCode: 65 });
	await assertEveryLineClear("after a key press");

	const key = t.keyCentre("KeyB");
	await t.mouse("mouseMoved", key);
	for (let i = 0; i < 12; i++) await t.wheel(key, -66.66666412353516, -66.66666412353516, every);
	await t.settle();
	assert.equal((await columnLines("wheel-line")).length, 4, `a Chromebook's fractional deltas repeated with every modifier make four wheel lines: ${JSON.stringify(await columnLines("wheel-line"))}`);
	await assertEveryLineClear("a four-line wheel");

	const ground = t.screenOf({ x: 925, y: 30 });
	await t.mouse("mouseMoved", ground);
	await t.mouse("mousePressed", ground, { button: "right", buttons: 2 });
	await t.mouse("mouseMoved", { x: ground.x + 5, y: ground.y }, { buttons: 2 });
	const far = { x: 1640, y: 990 };
	await t.mouse("mouseMoved", far, { buttons: 2 });
	assert.equal(await t.page("inputTester.picture.view.pan.gesture"), "pan-right");
	await assertEveryLineClear("a long right pan, live");
	await t.mouse("mouseReleased", far, { button: "right", buttons: 0 });
	await assertEveryLineClear("a long right pan, released");

	const middle = t.keyCentre("KeyJ");
	await t.mouse("mouseMoved", middle);
	await t.mouse("mousePressed", middle, { button: "middle", buttons: 4 });
	await t.mouse("mouseMoved", { x: middle.x + 300, y: middle.y + 200 }, { buttons: 4 });
	await t.mouse("mouseReleased", { x: middle.x + 300, y: middle.y + 200 }, { button: "middle", buttons: 0 });
	await assertEveryLineClear("a middle pan, released");

	await t.mouse("mouseMoved", key);
	await t.wheel(key, 0, -120);
	await assertEveryLineClear("an ordinary scroll of -120");

	const pinchAt = t.keyCentre("KeyN");
	await t.mouse("mouseMoved", pinchAt);
	await t.chrome.send("Input.synthesizePinchGesture", { x: pinchAt.x, y: pinchAt.y, scaleFactor: 2, relativeSpeed: 800, gestureSourceType: "mouse" });
	await t.settle();
	assert.deepEqual(await t.page("inputTester.picture.log[0].hits"), ["pinch-zoom"]);
	await assertEveryLineClear("a synthesized touchpad pinch");

	await t.wheel(pinchAt, 0, 120, MODIFIERS.ctrl);
	await assertEveryLineClear("Ctrl and the wheel, 120");

	const point = { x: 1234, y: 789 };
	await t.mouse("mouseMoved", point);
	await t.wheel(point, -1234.5, -650.5, every | MODIFIERS.ctrl);
	assert.match(await t.page("inputTester.picture.view.words"), /the rest dropped at the last level$/);
	await assertEveryLineClear("a pinch stepping in, the rest dropped, every modifier");
	tc.diagnostic(`the legend's words reached x ${Math.round(widestLegend)} at most, and the lowest line y ${Math.round(lowest)}`);
	await t.chrome.evaluate("window.notReloaded = true");
});

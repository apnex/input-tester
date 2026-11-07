// panel-layout - the picture's text as one layout, in a real browser (docs/ARCHITECTURE-TARGET.md section 6, what
// is shown; docs/DECISIONS.md 0008 to 0010): the built site opened in headless Chrome and driven by trusted input
// to the longest realistic wordings -- a key press, a pan pressed at a fractional screen point as a Chromebook at
// 125% reports one, a four-line wheel of a Chromebook's fractional deltas repeated with every modifier and a
// five-line wheel of deltas below 1e-6, a long right pan live and released, a middle pan released, a pan of
// 14,206.4 screen pixels live, an ordinary scroll, a synthesized touchpad pinch, Ctrl and
// the wheel, a pinch stepping in with the rest dropped -- and then to the longest wording each block's inputs can
// produce: fourteen keys held and repeated with a key of no identity beside them, during a pan from a fractional
// point; a wheel of extreme fractional deltas with every modifier; a plan's name in the address hundreds of
// characters long; a browser naming no Chromium. After each, every line of text is measured on its own, a tspan or
// a text without one: each inside the picture, clear of every other line and of the drawn keyboard and mouse.
// Every legend row is measured at rest and again marked bold as the input, so its words fit either way.
import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import { siteRoot } from "../support/built-site.js";
import { plantedSite } from "../support/planted-site.js";
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
			const [column, edge] = line.x < 905 ? ["the left column", 900] : line.x < 1155 ? ["the mouse column", 1150] : ["the legend", picture.x2];
			assert.ok(line.x2 <= edge, `${state}: "${line.what}" (${where(line)}) passes ${column}'s edge, x ${edge} (0010)`);
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

	const fractional = { x: 933.6000366210938, y: 86.4000244140625 };
	await t.mouse("mouseMoved", fractional);
	await t.mouse("mousePressed", fractional, { button: "middle", buttons: 4 });
	await t.mouse("mouseMoved", { x: fractional.x + 30.4, y: fractional.y + 20.2 }, { buttons: 4 });
	await t.settle();
	assert.deepEqual(await t.page("[inputTester.picture.press.at.x, inputTester.picture.press.at.y, inputTester.picture.view.pan.gesture]"), [fractional.x, fractional.y, "pan-middle"], "a pan pressed at a fractional screen point, live");
	await assertEveryLineClear("a pan pressed at a fractional screen point, live");
	assert.match(await t.page("[...document.querySelectorAll('#input-surface .status-line tspan')].map((s) => s.textContent).join(' ')"), /press from screen 933\.6, 86\.4, beyond the threshold/, "the press point written to a tenth");
	await t.mouse("mouseReleased", { x: fractional.x + 30.4, y: fractional.y + 20.2 }, { button: "middle", buttons: 0 });

	const key = t.keyCentre("KeyB");
	await t.mouse("mouseMoved", key);
	for (let i = 0; i < 12; i++) await t.wheel(key, -66.66666412353516, -66.66666412353516, every);
	await t.settle();
	assert.equal((await columnLines("wheel-line")).length, 4, `a Chromebook's fractional deltas repeated with every modifier make four wheel lines: ${JSON.stringify(await columnLines("wheel-line"))}`);
	await assertEveryLineClear("a four-line wheel");
	for (let i = 0; i < 12; i++) await t.wheel(key, -1.2345678e-7, -9.8765432e-7, every | MODIFIERS.ctrl);
	await t.settle();
	assert.equal((await columnLines("wheel-line")).length, 5, `deltas below 1e-6, every modifier, alike in a row, make five wheel lines, the view's below them: ${JSON.stringify(await columnLines("wheel-line"))}`);
	await assertEveryLineClear("a five-line wheel");

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

	await t.mouse("mouseMoved", middle);
	await t.mouse("mousePressed", middle, { button: "middle", buttons: 4 });
	await t.mouse("mouseMoved", { x: middle.x + 10, y: middle.y }, { buttons: 4 });
	await t.mouse("mouseMoved", { x: middle.x + 14216.4, y: middle.y }, { buttons: 4 });
	await t.settle();
	assert.equal(await t.page("Math.round(inputTester.picture.view.pan.distance * 10) / 10"), 14206.4, "a pan of 14,206.4 screen pixels, live");
	await assertEveryLineClear("a pan of 14,206.4 screen pixels, live");
	await t.mouse("mouseReleased", { x: middle.x + 14216.4, y: middle.y }, { button: "middle", buttons: 0 });

	await t.mouse("mouseMoved", key);
	await t.wheel(key, 0, -120);
	await assertEveryLineClear("an ordinary scroll of -120");

	const pinchAt = t.keyCentre("KeyN");
	await t.mouse("mouseMoved", pinchAt);
	await t.chrome.send("Input.synthesizePinchGesture", { x: pinchAt.x, y: pinchAt.y, scaleFactor: 2, relativeSpeed: 800, gestureSourceType: "mouse" });
	await t.settle();
	assert.deepEqual(await t.page("inputTester.picture.log[0].hits"), ["wheel-zoom"]);
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

/** Keys to hold at once, none a browser's own key with Alt or Shift held: two modifiers, twenty letters and the ten digits. */
const HELD = [["Shift", "ShiftLeft", 16], ["Alt", "AltLeft", 18], ...[..."ASDGHKLZXVBNQWETOPMY"].map((l) => [l.toLowerCase(), `Key${l}`, l.charCodeAt(0)]), ...[..."1234567890"].map((d) => [d, `Digit${d}`, d.charCodeAt(0)])];

test("each block at the longest wording its inputs can produce -- thirty-two keys held, first seen repeating, with a key of no identity, during a pan from a fractional point; a wheel of extreme fractional deltas with every modifier; a plan's name hundreds of characters long; a browser naming no Chromium -- every line inside the picture and clear of every other", TEST, async () => {
	await t.load("?plan=ansi");
	await assertEveryLineClear("a fresh page");
	const at = { x: 401.6000061035156, y: 655.2000122070312 };
	for (const [key, code, vk] of HELD.slice(0, 2)) await t.key("keyDown", key, code, { windowsVirtualKeyCode: vk, modifiers: MODIFIERS.shift | MODIFIERS.alt });
	for (const [key, code, vk] of HELD.slice(2)) await t.key("keyDown", key, code, { windowsVirtualKeyCode: vk, autoRepeat: true, modifiers: MODIFIERS.shift | MODIFIERS.alt });
	for (let i = 0; i < 3; i++) for (const [key, code, vk] of HELD.slice(2, 5)) await t.key("keyDown", key, code, { windowsVirtualKeyCode: vk, autoRepeat: true, modifiers: MODIFIERS.shift | MODIFIERS.alt });
	await t.key("keyDown", "AudioVolumeUp", "", { windowsVirtualKeyCode: 175 });
	await t.mouse("mouseMoved", at);
	await t.mouse("mousePressed", at, { button: "middle", buttons: 4, modifiers: MODIFIERS.shift | MODIFIERS.alt });
	await t.mouse("mouseMoved", { x: at.x + 1003.7, y: at.y - 604.9 }, { buttons: 4, modifiers: MODIFIERS.shift | MODIFIERS.alt });
	await t.settle();
	assert.equal(await t.page("inputTester.picture.heldKeys.length"), HELD.length, "every key held");
	assert.match(await t.page("[...document.querySelectorAll('#input-surface .held-keys tspan')].map((s) => s.textContent).join(' ')"), /pressed before it was seen, 4 repeats observed, held at least .* ms as of its latest fact, last repeat interval/, "keys first seen repeating, their times held and intervals the facts' own");
	await assertEveryLineClear("thirty-two keys held, thirty first seen repeating, a key of no identity, a pan from a fractional point live");
	await t.mouse("mouseReleased", { x: at.x + 1003.7, y: at.y - 604.9 }, { button: "middle", buttons: 0 });
	for (const [key, code, vk] of HELD) await t.key("keyUp", key, code, { windowsVirtualKeyCode: vk });
	await t.settle();
	assert.deepEqual(await t.page("[inputTester.picture.view.pan, inputTester.picture.heldKeys.length]"), [null, 0], "the pan released and every key let go");
	const key = t.keyCentre("KeyB");
	const every = MODIFIERS.shift | MODIFIERS.alt | MODIFIERS.meta | MODIFIERS.ctrl;
	await t.mouse("mouseMoved", key);
	for (let i = 0; i < 3; i++) await t.wheel(key, -123456789.12345679, -98765432.98765432, every);
	for (let i = 0; i < 3; i++) await t.wheel(key, -123456789.12345679, -98765432.98765432, every & ~MODIFIERS.ctrl);
	await assertEveryLineClear("a wheel of extreme fractional deltas, every modifier");
	await t.load(`?plan=${"W".repeat(400)}`);
	assert.match(await t.page("document.querySelector('#input-surface .plan-line').textContent"), /WWWW/, "the address's plan name shown");
	await assertEveryLineClear("a plan's name in the address 400 characters long");
	const { identifier } = await t.chrome.send("Page.addScriptToEvaluateOnNewDocument", { source: "Object.defineProperty(Navigator.prototype, 'userAgentData', { get: () => undefined, configurable: true });" });
	try {
		await t.load("?plan=chromebook");
		assert.equal(await t.page("document.querySelector('#input-surface .uncovered') !== null"), true);
		await assertEveryLineClear("a browser naming no Chromium, the Chromebook plan");
	} finally {
		await t.chrome.send("Page.removeScriptToEvaluateOnNewDocument", { identifier });
	}
	await t.load("?plan=ansi");
	await t.chrome.evaluate("window.notReloaded = true");
});

test("a refused capture's problem, planted in a built copy -- a surface and a key source it refuses -- drawn on lines of the left column, every line, the problems' and the status lines' among them, held apart by its box and inside its column (0011)", TEST, async () => {
	const planted = plantedSite([{ file: "app/composition-root.js", find: "keys: platform.keySource,", replace: "keys: {}," }, { file: "app/composition-root.js", find: "surface: platform.surface,", replace: "surface: {}," }]);
	const main = t;
	try {
		t = await openTesterInChrome({ siteDir: planted.dir });
		const problems = await t.page("[...document.querySelectorAll('#input-surface text.problems tspan')].map((s) => s.textContent)");
		assert.equal(problems.length, 2, `the capture's problem of 133 characters on two lines: ${JSON.stringify(problems)}`);
		assert.match(problems.join(" "), /^the capture refused its declaration: .*"\/keys".*"\/surface"/);
		await assertEveryLineClear("a refused capture's problem drawn");
	} finally {
		await t.close();
		t = main;
		planted.remove();
	}
});


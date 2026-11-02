// panel-layout - the mouse column's lines in a real browser (docs/ARCHITECTURE-TARGET.md section 6, what is
// shown; docs/DECISIONS.md 0008): the built site opened in headless Chrome, the wheel's lines and the view's
// driven by trusted input to their longest wordings -- a long right pan, live and released, a scroll and a pinch
// of large and fractional deltas with every modifier, a pinch held short of a step -- and after each the box of
// every line measured by the browser and held clear of every legend row, the drawn keyboard and mouse and every
// other text, within the mouse column left of the legend, and inside the picture.
import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import { siteRoot } from "../support/built-site.js";
import { MODIFIERS, openTesterInChrome } from "./tester-in-chrome.js";

const TEST = { timeout: 60000 };
let t;

before(async () => {
	t = await openTesterInChrome({ siteDir: siteRoot });
}, { timeout: 60000 });

after(async () => {
	await t?.close();
}, { timeout: 30000 });

/** Every box the check reads, in drawing units: the mouse column's two texts, each legend row, the keys' and the mouse's layers, every other non-empty text, and the picture's viewBox. */
const MEASURE = `(() => {
	const svg = document.getElementById('input-surface');
	const box = (e) => { const b = e.getBBox(); return { x: b.x, y: b.y, x2: b.x + b.width, y2: b.y + b.height, what: (e.getAttribute('class') || e.localName) + ': ' + (e.textContent || '').slice(0, 60) }; };
	const column = [...svg.querySelectorAll('text.wheel-line, text.view-line')].map(box);
	const legend = [...svg.querySelectorAll('g.legend-row')].map(box);
	const drawn = [...svg.querySelectorAll(':scope > g.keys, :scope > g.mouse')].map(box);
	const others = [...svg.querySelectorAll('text')].filter((e) => !e.matches('.wheel-line, .view-line') && !e.closest('g.legend-row') && !e.closest('g.keys, g.mouse') && (e.textContent || '') !== '').map(box);
	const v = svg.viewBox.baseVal;
	return { column, legend, drawn, others, picture: { x: v.x, y: v.y, x2: v.x + v.width, y2: v.y + v.height } };
})()`;

const overlaps = (a, b) => a.x < b.x2 && b.x < a.x2 && a.y < b.y2 && b.y < a.y2;
let widest = 0;

/** Holds each line of the mouse column clear of the legend, the drawing and every other text, left of the legend and inside the picture. */
async function assertColumnClear(when) {
	await t.settle();
	const { column, legend, drawn, others, picture } = await t.page(MEASURE);
	assert.equal(column.length, 2, `${when}: the wheel's lines and the view's`);
	const legendLeft = Math.min(...legend.map((r) => r.x));
	for (const line of column) {
		widest = Math.max(widest, line.x2);
		for (const row of legend) assert.ok(!overlaps(line, row), `${when}: ${line.what} (x ${line.x}..${line.x2}, y ${line.y}..${line.y2}) overwrites the legend row ${row.what} (x ${row.x}..${row.x2}, y ${row.y}..${row.y2})`);
		for (const other of [...drawn, ...others]) assert.ok(!overlaps(line, other), `${when}: ${line.what} overlaps ${other.what}`);
		assert.ok(line.x2 < legendLeft, `${when}: ${line.what} ends at x ${line.x2}, past the legend's left edge, ${legendLeft}`);
		assert.ok(line.x >= picture.x && line.y >= picture.y && line.x2 <= picture.x2 && line.y2 <= picture.y2, `${when}: ${line.what} leaves the picture`);
	}
	assert.ok(!overlaps(column[0], column[1]), `${when}: the wheel's lines and the view's overlap`);
}

test("the mouse column's lines -- the wheel's and the view's -- at their longest wordings clear every legend row, the drawn keyboard and mouse and every other text, stay left of the legend, and inside the picture", TEST, async (tc) => {
	await assertColumnClear("at rest");
	await t.key("keyDown", "a", "KeyA", { text: "a", windowsVirtualKeyCode: 65 });
	await t.key("keyUp", "a", "KeyA", { windowsVirtualKeyCode: 65 });
	await assertColumnClear("after a key press, every legend row showing its standing");
	const ground = t.screenOf({ x: 925, y: 30 });
	await t.mouse("mouseMoved", ground);
	await t.mouse("mousePressed", ground, { button: "right", buttons: 2 });
	await t.mouse("mouseMoved", { x: ground.x + 5, y: ground.y }, { buttons: 2 });
	const far = { x: 1640, y: 990 };
	await t.mouse("mouseMoved", far, { buttons: 2 });
	assert.equal(await t.page("inputTester.picture.view.pan.gesture"), "pan-right");
	await assertColumnClear("a long right pan, live");
	await t.mouse("mouseReleased", far, { button: "right", buttons: 0 });
	await assertColumnClear("a long right pan, released");
	const key = t.keyCentre("KeyB");
	const every = MODIFIERS.shift | MODIFIERS.alt | MODIFIERS.meta;
	await t.mouse("mouseMoved", key);
	await t.wheel(key, -1234.5, -6789.5, every);
	await t.wheel(key, -1234.5, -6789.5, every);
	assert.match(await t.page("inputTester.picture.view.words"), /^scroll pan: the centre moved -1234\.5, -6789\.5/);
	await assertColumnClear("a scroll of large fractional deltas, every modifier but Ctrl, twice alike");
	const point = { x: 1234, y: 789 };
	await t.mouse("mouseMoved", point);
	await t.wheel(point, -1234.5, -150.5, every | MODIFIERS.ctrl);
	assert.match(await t.page("inputTester.picture.view.words"), /^pinch zoom: 1x to 0\.5x, 1 level, the scale times 2, about screen 1234, 789, the rest dropped at the last level$/);
	await assertColumnClear("a pinch stepping in, the rest dropped, every modifier");
	await t.wheel(point, 0, 33.3, every | MODIFIERS.ctrl);
	await assertColumnClear("a pinch held short of a step");
	tc.diagnostic(`the mouse column's lines reached x ${Math.round(widest)} at most`);
	await t.chrome.evaluate("window.notReloaded = true");
});

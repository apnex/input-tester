// view-pane - the view pane in a real browser (docs/ARCHITECTURE-TARGET.md sections 6 to 8; draw's PAN-ZOOM.md
// 3.3, 3.6, 3.7, PZ6, PZ12, PZ24, PZ28, PZ30; docs/DECISIONS.md 0012): the built site opened in headless Chrome and
// driven by trusted input on the pane -- a two-finger scroll, a synthesized touchpad pinch, Ctrl and the wheel, Space
// and a left drag, a middle drag, a right drag, the view keys and the reticle -- and after each the pane's scene view
// held to section 3.6: a pan by its distance on screen over the level's scale, each of PZ12's levels reached by every
// zoom gesture and none between, the drawing point under the pointer kept, home to 0, 0 at the level kept; its grid
// drawn from what is visible, thinned to 24 screen pixels; and the picture of the keyboard and mouse unmoved throughout.
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

/** The pane's root on screen: its left, top, width and height, and the scene view written. */
const pane = async () => t.page("(() => { const r = document.getElementById('view-pane').getBoundingClientRect(); return { left: r.left, top: r.top, width: r.width, height: r.height, view: inputTester.paneView, level: inputTester.picture.view.level, centre: inputTester.picture.view.centre }; })()");

/** The drawing point under a screen point, by the pane's scene view written. */
const under = (p, q) => ({ x: p.view.x + (q.x - p.left) / p.view.scale, y: p.view.y + (q.y - p.top) / p.view.scale });

/** Every attribute of the picture's keys' and mouse's elements, and its root's screen transform: what must never move. */
const PICTURE = "JSON.stringify([[...document.querySelectorAll('#input-surface .keys *, #input-surface .mouse *')].map((e) => [...e.attributes].map((a) => a.name + '=' + a.value).join(' ')), (() => { const m = document.getElementById('input-surface').getScreenCTM(); return [m.a, m.b, m.c, m.d, m.e, m.f]; })()])";

const close = (a, b, what) => assert.ok(Math.abs(a - b) < 1e-6 * Math.max(1, Math.abs(b)), `${what}: ${a} against ${b}`);

test("the pane opens beside the picture at the first opening -- the centre 0, 0 at 1x, the scale the 1920 by 1080 frame's fit -- its grid drawn in view at a least spacing of 24 screen pixels", TEST, async () => {
	const p = await pane();
	assert.ok(p.width > 300 && p.height > 300, `a pane of ${p.width} by ${p.height}`);
	close(p.view.scale, Math.min(p.width / 1920, p.height / 1080), "the default scale");
	close(p.view.x + p.width / (2 * p.view.scale), 0, "the centre's x");
	close(p.view.y + p.height / (2 * p.view.scale), 0, "the centre's y");
	const xs = await t.page("[...new Set([...document.querySelector('#view-pane .pane-dots').getAttribute('d').matchAll(/M(-?[0-9.e+-]+) /g)].map((m) => Number(m[1])))].sort((a, b) => a - b)");
	assert.ok(xs.length > 3, `${xs.length} columns of dots`);
	const spacing = xs[1] - xs[0];
	assert.ok(spacing % 60 === 0 && spacing * p.view.scale >= 24 && (spacing / 2) * p.view.scale < 24 === spacing > 60, `dots ${spacing} units apart, ${spacing * p.view.scale} screen pixels: the grid of 60 thinned to the least stride at 24 pixels or more`);
	assert.ok(xs[0] <= p.view.x + 0.5 * spacing + spacing && xs.at(-1) >= p.view.x + p.width / p.view.scale - 2 * spacing, "the dots span what is visible");
});

test("every gesture on the pane moves its view as section 3.6 says, the picture of the keyboard and mouse unmoved throughout", TEST, async () => {
	const picture = await t.page(PICTURE);
	let p = await pane();
	const mid = { x: Math.round(p.left + p.width / 2), y: Math.round(p.top + p.height / 2) };
	const at = (fx, fy) => ({ x: Math.round(p.left + p.width * fx), y: Math.round(p.top + p.height * fy) });

	// a two-finger scroll: the centre moves by the pixels over the scale
	let before = p;
	await t.mouse("mouseMoved", mid);
	await t.wheel(mid, 120, -60);
	await t.settle();
	p = await pane();
	close(p.centre.x - before.centre.x, 120 / p.view.scale, "a scroll's x");
	close(p.centre.y - before.centre.y, -60 / p.view.scale, "a scroll's y");

	// Ctrl and the wheel, then a pinch: every level, none between, the point under the pointer kept
	const q = at(0.3, 0.25);
	await t.mouse("mouseMoved", q);
	const levels = [];
	const kept = under(p, q);
	for (const dy of [-100, 100, 100, 100]) {
		await t.wheel(q, 0, dy, MODIFIERS.ctrl);
		await t.settle();
		p = await pane();
		levels.push(p.level);
		const now = under(p, q);
		close(now.x, kept.x, `Ctrl and the wheel at ${p.level}x keeps the point's x`);
		close(now.y, kept.y, `Ctrl and the wheel at ${p.level}x keeps the point's y`);
	}
	assert.deepEqual(levels, [0.5, 1, 2, 3], "Ctrl and the wheel steps through each level, none between");
	const pinchLevels = [];
	for (const scaleFactor of [3, 3, 3, 1 / 3, 1 / 3, 1 / 3]) {
		before = await pane();
		const pivot = under(before, q);
		await t.chrome.send("Input.synthesizePinchGesture", { x: q.x, y: q.y, scaleFactor, relativeSpeed: 800, gestureSourceType: "mouse" });
		await t.settle();
		p = await pane();
		pinchLevels.push(p.level);
		const now = under(p, q);
		close(now.x, pivot.x, `a pinch at ${p.level}x keeps the point's x`);
		close(now.y, pivot.y, `a pinch at ${p.level}x keeps the point's y`);
	}
	assert.deepEqual(pinchLevels, [2, 1, 0.5, 1, 2, 3], "a pinch steps through each level, none between");
	assert.equal(await t.chrome.evaluate("visualViewport.scale"), 1, "claimed: the page did not zoom");

	// three pans, each by its distance on screen over the scale, the drawing following the pointer
	for (const [name, button, buttons, space] of [["middle", "middle", 4, false], ["right", "right", 2, false], ["left", "left", 1, true]]) {
		before = await pane();
		const from = at(0.5, 0.5);
		if (space) await t.key("keyDown", " ", "Space", { text: " ", windowsVirtualKeyCode: 32 });
		await t.mouse("mouseMoved", from);
		await t.mouse("mousePressed", from, { button, buttons });
		await t.mouse("mouseMoved", { x: from.x + 10, y: from.y }, { buttons });
		await t.mouse("mouseMoved", { x: from.x + 10 + 90, y: from.y + 40 }, { buttons });
		await t.settle();
		p = await pane();
		assert.equal(p.view !== null && (await t.page("inputTester.picture.view.pan?.gesture")), `pan-${name === "left" ? "space" : name}`);
		close(p.centre.x - before.centre.x, -90 / p.view.scale, `the ${name} pan's x`);
		close(p.centre.y - before.centre.y, -40 / p.view.scale, `the ${name} pan's y`);
		await t.mouse("mouseReleased", { x: from.x + 100, y: from.y + 40 }, { button, buttons: 0 });
		if (space) await t.key("keyUp", " ", "Space", { windowsVirtualKeyCode: 32 });
		await t.settle();
	}

	// the keys about the pane's centre, and home by the reticle and by h
	before = await pane();
	await t.key("keyDown", "-", "Minus", { text: "-", windowsVirtualKeyCode: 189 });
	await t.key("keyUp", "-", "Minus", { windowsVirtualKeyCode: 189 });
	await t.settle();
	p = await pane();
	assert.deepEqual([p.centre, p.level], [before.centre, 3], "at the farthest level, - does nothing");
	await t.key("keyDown", "=", "Equal", { text: "=", windowsVirtualKeyCode: 187 });
	await t.key("keyUp", "=", "Equal", { windowsVirtualKeyCode: 187 });
	await t.settle();
	p = await pane();
	assert.deepEqual([p.centre, p.level], [before.centre, 2], "= a level in about the pane's centre, the centre held");
	close(p.view.x + p.width / (2 * p.view.scale), p.centre.x, "the scene view's centre");
	const reticle = await t.page("(() => { const r = document.getElementById('view-home').getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; })()");
	await t.mouse("mouseMoved", reticle);
	await t.mouse("mousePressed", reticle, { button: "left", buttons: 1 });
	await t.mouse("mouseReleased", reticle, { button: "left", buttons: 0 });
	await t.settle();
	p = await pane();
	assert.deepEqual([p.centre, p.level], [{ x: 0, y: 0 }, 2], "the reticle: home to 0, 0, the level kept");
	close(p.view.x + p.width / (2 * p.view.scale), 0, "home's centre on the pane");

	assert.equal(await t.page(PICTURE), picture, "the picture's keys and mouse, and its root on screen, never moved");
	await t.chrome.evaluate("window.notReloaded = true");
});

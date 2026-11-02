// view-pane - the view pane in a real browser (docs/ARCHITECTURE-TARGET.md sections 6 to 8; draw's PAN-ZOOM.md
// 3.3, 3.6, 3.7, PZ6, PZ12, PZ24, PZ28, PZ30; docs/DECISIONS.md 0012): the built site opened in headless Chrome and
// driven by trusted input on the pane -- a two-finger scroll, a synthesized touchpad pinch, Ctrl and the wheel, Space
// and a left drag, a middle drag, a right drag, the view keys and the reticle -- and after each the pane's scene view
// held to section 3.6: a pan by its distance on screen over the level's scale, each of PZ12's levels reached by every
// zoom gesture and none between, the drawing point under the pointer kept, home to 0, 0 at the level kept; its grid
// drawn from what is visible, thinned to 24 screen pixels; and the picture of the keyboard and mouse unmoved throughout.
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import zlib from "node:zlib";

import { siteRoot } from "../support/built-site.js";
import { MODIFIERS, VIEWPORT, openTesterInChrome } from "./tester-in-chrome.js";

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

/** A PNG's pixels, 8-bit RGB or RGBA and not interlaced, as Chrome writes a screenshot: `coordinate-precision.mjs`'s reader. */
function pixels(buf) {
	let pos = 8;
	let w = 0;
	let h = 0;
	let type = 0;
	const idat = [];
	while (pos < buf.length) {
		const len = buf.readUInt32BE(pos);
		const kind = buf.toString("ascii", pos + 4, pos + 8);
		const body = buf.subarray(pos + 8, pos + 8 + len);
		if (kind === "IHDR") {
			w = body.readUInt32BE(0);
			h = body.readUInt32BE(4);
			type = body[9];
		}
		if (kind === "IDAT") idat.push(body);
		pos += 12 + len;
	}
	const bpp = type === 6 ? 4 : 3;
	const raw = zlib.inflateSync(Buffer.concat(idat));
	const stride = w * bpp;
	const out = Buffer.alloc(h * stride);
	for (let y = 0; y < h; y++) {
		const f = raw[y * (stride + 1)];
		const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
		for (let x = 0; x < stride; x++) {
			const a = x >= bpp ? out[y * stride + x - bpp] : 0;
			const b = y ? out[(y - 1) * stride + x] : 0;
			const c = x >= bpp && y ? out[(y - 1) * stride + x - bpp] : 0;
			const p = a + b - c;
			const pa = Math.abs(p - a);
			const pb = Math.abs(p - b);
			const pc = Math.abs(p - c);
			out[y * stride + x] = (line[x] + [0, a, b, (a + b) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? b : c][f]) & 255;
		}
	}
	return { w, h, bpp, data: out };
}

/** The precision line's colour's red channel, `.precision-line`'s #1e6f3a, against the pane's white. */
const LINE_RED = 0x1e;

/**
 * Measures a precision line through the pane as `coordinate-precision.mjs` measures its bar: where its left edge
 * should be on screen by the scene view written, in binary64; where it is drawn, by its coverage in a screenshot
 * row; where the platform hits it, stepping an eighth of a pixel with `elementFromPoint`; and where the browser
 * reports it -- each as an offset in pixels -- beside the pane's own readout of the same.
 */
async function measureLine(distance) {
	const g = await t.page(`(() => { const r = document.getElementById('view-pane').getBoundingClientRect(); const v = inputTester.paneView; const expected = r.left + (${distance} - v.x) * v.scale; const row = Math.round(r.top + r.height / 2) + 11; const bar = document.querySelector('#view-pane .precision-${distance}'); let hit = null; for (let k = -96; k <= 96 && hit === null; k++) if (document.elementFromPoint(expected + k / 8, row) === bar) hit = k / 8; return { expected, row, hit, reported: bar.getBoundingClientRect().left - expected, readout: inputTester.precision.find((m) => m.distance === ${distance}) ?? null, scale: v.scale, level: inputTester.picture.view.level }; })()`);
	const shot = await t.chrome.send("Page.captureScreenshot", { format: "png", clip: { x: 0, y: g.row, width: VIEWPORT.width, height: 1, scale: 1 } });
	const img = pixels(Buffer.from((shot.result ?? shot).data, "base64"));
	const cover = (x) => (x < 0 || x >= img.w ? 0 : Math.min(1, Math.max(0, (255 - img.data[x * img.bpp]) / (255 - LINE_RED))));
	const left = Math.floor(g.expected) - 20;
	let white = 0;
	for (let x = left; x < left + 40; x++) white += 1 - cover(x);
	return { ...g, drawn: left + white - g.expected };
}

const thousandth = (n) => (n === null ? null : Math.round(n * 1000) / 1000);

test("PZ31 through the pane: the line at 1,000,000 drawn, hit and reported within coordinate-precision.mjs's budget -- a tenth of a pixel drawn and reported, a quarter hit -- at every level, and the line at 2^21 measured beside it, the pane's own readout agreeing", TEST, async (tc) => {
	await t.load("?plan=ansi#view");
	const p0 = await pane();
	assert.ok(p0.width > 0.45 * VIEWPORT.width, `the pane large at #view: ${p0.width} of ${VIEWPORT.width}`);
	const figures = [];
	for (const [button, distance] of [["go-million", 1_000_000], ["go-two-to-21", 2 ** 21]]) {
		const at = await t.page(`(() => { const r = document.getElementById('${button}').getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; })()`);
		await t.mouse("mouseMoved", at);
		await t.mouse("mousePressed", at, { button: "left", buttons: 1 });
		await t.mouse("mouseReleased", at, { button: "left", buttons: 0 });
		await t.settle();
		for (let i = 0; i < 4; i++) {
			await t.chrome.evaluate("new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))");
			const m = await measureLine(distance);
			figures.push({ distance, level: m.level, scale: thousandth(m.scale), drawn: thousandth(m.drawn), hit: m.hit, reported: thousandth(m.reported), readoutHit: m.readout?.hit ?? null, readoutReported: thousandth(m.readout?.reported ?? null) });
			assert.ok(m.readout !== null, `the pane reads out the line at ${distance} at ${m.level}x`);
			close(m.readout.expected, m.expected, `the readout's expected edge at ${m.level}x`);
			assert.ok(m.readout.hit !== null && m.hit !== null && Math.abs(m.readout.hit - m.hit) <= 0.125, `the readout's hit, ${m.readout.hit}, the platform's, ${m.hit}`);
			assert.ok(m.readout.reported !== null && Math.abs(m.readout.reported - m.reported) <= 0.001, `the readout's reported edge, ${m.readout.reported}, the browser's, ${m.reported}`);
			if (distance === 1_000_000) {
				assert.ok(Math.abs(m.drawn) <= 0.1 && Math.abs(m.reported) <= 0.1, `1,000,000 at ${m.level}x drawn ${m.drawn}, reported ${m.reported}: within a tenth of a pixel`);
				assert.ok(m.hit !== null && Math.abs(m.hit) <= 0.25, `1,000,000 at ${m.level}x hit ${m.hit}: within a quarter`);
			} else assert.ok(Math.abs(m.drawn) <= 0.52 && m.hit !== null && Math.abs(m.hit) <= 0.625, `2^21 at ${m.level}x drawn ${m.drawn}, hit ${m.hit}: within coordinate-precision.mjs's worst at 2^21, 0.52 and 0.625`);
			if (i < 3) {
				await t.key("keyDown", "-", "Minus", { text: "-", windowsVirtualKeyCode: 189 });
				await t.key("keyUp", "-", "Minus", { windowsVirtualKeyCode: 189 });
				await t.settle();
			}
		}
	}
	tc.diagnostic(JSON.stringify(figures));
	await t.load("?plan=ansi");
	await t.chrome.evaluate("window.notReloaded = true");
});

test("a resize redraws the pane at the next input, inside its delivery (GT2): its scale the frame's fit at its new size, its centre held -- after a resize of its height alone, which leaves its scale as it was, too; nothing is written on the resize itself", TEST, async () => {
	await t.load("?plan=ansi");
	const p0 = await pane();
	await t.chrome.evaluate("window.paneWrites = 0; window.paneWatcher = new MutationObserver((r) => (window.paneWrites += r.length)); window.paneWatcher.observe(document.getElementById('view-pane'), { subtree: true, childList: true, attributes: true })");
	await t.chrome.send("Emulation.setDeviceMetricsOverride", { width: 1600, height: 800, deviceScaleFactor: 1, mobile: false });
	await t.chrome.evaluate("new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))");
	assert.equal(await t.chrome.evaluate("window.paneWrites"), 0, "the resize itself writes nothing");
	let p = await pane();
	assert.ok(p.width < p0.width, "the pane is smaller");
	await t.mouse("mouseMoved", { x: Math.round(p.left + p.width / 2), y: Math.round(p.top + p.height / 2) });
	await t.settle();
	p = await pane();
	close(p.view.scale, Math.min(p.width / 1920, p.height / 1080), "the scale at the pane's new size");
	close(p.view.x + p.width / (2 * p.view.scale), 0, "the centre's x held");
	close(p.view.y + p.height / (2 * p.view.scale), 0, "the centre's y held");
	const scale = p.view.scale;
	await t.chrome.send("Emulation.setDeviceMetricsOverride", { width: 1600, height: 700, deviceScaleFactor: 1, mobile: false });
	await t.chrome.evaluate("new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))");
	p = await pane();
	await t.mouse("mouseMoved", { x: Math.round(p.left + p.width / 2), y: Math.round(p.top + p.height / 2) });
	await t.settle();
	p = await pane();
	close(p.view.scale, scale, "a resize of the height alone leaves the scale, the width binding it");
	close(p.view.y + p.height / (2 * p.view.scale), 0, "and the centre's y is held at the new height");
	await t.chrome.evaluate("window.paneWatcher.disconnect()");
	await t.chrome.send("Emulation.setDeviceMetricsOverride", { width: VIEWPORT.width, height: VIEWPORT.height, deviceScaleFactor: 1, mobile: false });
	await t.load("?plan=ansi");
	await t.chrome.evaluate("window.notReloaded = true");
});

test("loaded fresh at #view, as GUIDE section 9 tells the director, the pane is drawn for its large size before any input: its scale the 1920 by 1080 frame's fit in it, 0, 0 at its centre, its grid reaching its edges, and the readouts and the picture's view lines giving that scale", TEST, async () => {
	await t.load("?plan=chromebook#view");
	await t.chrome.evaluate("new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))");
	const facts = await t.facts();
	const p = await pane();
	assert.ok(p.width > 0.45 * VIEWPORT.width, `the pane large: ${p.width} of ${VIEWPORT.width}`);
	close(p.view.scale, Math.min(p.width / 1920, p.height / 1080), "the scale before any input");
	close(p.view.x + p.width / (2 * p.view.scale), 0, "the centre's x before any input");
	close(p.view.y + p.height / (2 * p.view.scale), 0, "the centre's y before any input");
	const xs = await t.page("[...document.querySelector('#view-pane .pane-dots').getAttribute('d').matchAll(/M(-?[0-9.e+-]+) /g)].map((m) => Number(m[1]))");
	const right = p.view.x + p.width / p.view.scale;
	assert.ok(Math.max(...xs) >= right - 2 * 60 * 8, `the grid reaches the pane's right edge, ${right}: its last column at ${Math.max(...xs)}`);
	const scaleWords = String(Math.round(p.view.scale * 10000) / 10000);
	assert.match(await t.page("[...document.querySelectorAll('#view-readouts text tspan')].map((s) => s.textContent).join(' ')"), new RegExp(`scale ${scaleWords.replace(".", "\\.")} pixels a unit`));
	assert.match(await t.page("[...document.querySelectorAll('#input-surface .view-line tspan')].map((s) => s.textContent).join(' ')"), new RegExp(`^view: 1x, scale ${scaleWords.replace(".", "\\.")}`), "the picture's view lines agree with the pane");
	assert.equal(await t.facts(), facts, "no input was delivered");
	await t.load("?plan=ansi");
	await t.chrome.evaluate("window.notReloaded = true");
});

/** A trusted click at the centre of the element of the given id. */
async function click(id) {
	const at = await t.page(`(() => { const r = document.getElementById('${id}').getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; })()`);
	await t.mouse("mouseMoved", at);
	await t.mouse("mousePressed", at, { button: "left", buttons: 1 });
	await t.mouse("mouseReleased", at, { button: "left", buttons: 0 });
	await t.settle();
}

test("the header's large and small buttons each draw the pane again at its new size inside their own press, its centre and level held, before the pointer reaches the pane", TEST, async () => {
	await t.load("?plan=ansi");
	await t.key("keyDown", "-", "Minus", { text: "-", windowsVirtualKeyCode: 189 });
	await t.key("keyUp", "-", "Minus", { windowsVirtualKeyCode: 189 });
	await t.wheel(await t.page("(() => { const r = document.getElementById('view-pane').getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; })()"), 90, 30);
	await t.settle();
	const before = await pane();
	for (const [id, share] of [["pane-large", 0.45], ["pane-small", 0.25]]) {
		await click(id);
		const p = await pane();
		assert.ok(id === "pane-large" ? p.width > share * VIEWPORT.width : p.width < share * VIEWPORT.width, `${id}: a pane ${p.width} wide`);
		close(p.view.scale, Math.min(p.width / 1920, p.height / 2 / 540) / 2, `${id}: the scale at 2x for the new size`);
		close(p.view.x + p.width / (2 * p.view.scale), before.centre.x, `${id}: the centre's x held`);
		close(p.view.y + p.height / (2 * p.view.scale), before.centre.y, `${id}: the centre's y held`);
		assert.equal(p.level, 2, `${id}: the level held`);
	}
	await t.chrome.evaluate("window.notReloaded = true");
});

test("a right drag that starts on a precision line pans: the line marks ground, hit-tested for its readout alone (0014)", TEST, async () => {
	await t.load("?plan=ansi");
	await click("go-million");
	const p = await pane();
	const on = { x: Math.round(p.left + p.width / 2 + 20), y: Math.round(p.top + p.height / 2 + 40) };
	assert.equal(await t.page(`document.elementFromPoint(${on.x}, ${on.y})?.getAttribute('class') ?? null`), "precision-line precision-1000000", "the press lands on the line");
	await t.mouse("mouseMoved", on);
	await t.mouse("mousePressed", on, { button: "right", buttons: 2 });
	await t.mouse("mouseMoved", { x: on.x + 10, y: on.y }, { buttons: 2 });
	await t.mouse("mouseMoved", { x: on.x + 60, y: on.y + 20 }, { buttons: 2 });
	await t.settle();
	assert.equal(await t.page("inputTester.picture.view.pan?.gesture ?? null"), "pan-right");
	const after = await pane();
	close(after.centre.x - p.centre.x, -50 / after.view.scale, "the pan's x");
	close(after.centre.y - p.centre.y, -20 / after.view.scale, "the pan's y");
	await t.mouse("mouseReleased", { x: on.x + 60, y: on.y + 20 }, { button: "right", buttons: 0 });
	await t.settle();
	await t.chrome.evaluate("window.notReloaded = true");
});


test("at the Chromebook's likely windows -- 1366 by 657, 1093 by 526 at 125%, 1536 by 750 -- in both sizes of the pane, the page never scrolls and every button, the header's and the pane's, lies wholly inside the window, whatever the header's height (0015)", TEST, async (tc) => {
	const seen = [];
	try {
		for (const [width, height] of [[1366, 657], [1093, 526], [1536, 750]]) {
			await t.chrome.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
			for (const fragment of ["", "#view"]) {
				// each load's address differs before its fragment, so it is a new page and not a fragment changed on the old one (L2)
				await t.load(`?plan=chromebook&window=${width}x${height}${fragment === "" ? "small" : "large"}${fragment}`);
				await t.chrome.evaluate("new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))");
				const m = await t.page("(() => { const d = document.documentElement; const pane = document.getElementById('view-pane').getBoundingClientRect(); const buttons = [...document.querySelectorAll('button')].map((b) => { const r = b.getBoundingClientRect(); return [b.id, r.left, r.top, r.right, r.bottom]; }); return { paneWidth: pane.width, paneBottom: pane.bottom, scrollWidth: d.scrollWidth, scrollHeight: d.scrollHeight, innerWidth, innerHeight, header: Math.round(document.querySelector('header').getBoundingClientRect().height), buttons }; })()");
				const where = `${width} by ${height}${fragment === "" ? ", the pane small" : ", the pane large"}`;
				seen.push(`${where}: header ${m.header}, pane ${Math.round(m.paneWidth)} wide to y ${Math.round(m.paneBottom)}, document ${m.scrollWidth} by ${m.scrollHeight}`);
				assert.ok(fragment === "" ? m.paneWidth < 0.25 * width : m.paneWidth > 0.45 * width, `${where}: the pane is ${m.paneWidth} wide`);
				assert.ok(m.paneBottom <= m.innerHeight, `${where}: the pane ends at ${m.paneBottom}, past the window's ${m.innerHeight}`);
				assert.ok(m.scrollHeight <= m.innerHeight && m.scrollWidth <= m.innerWidth, `${where}: the document is ${m.scrollWidth} by ${m.scrollHeight}, the window ${m.innerWidth} by ${m.innerHeight}: it scrolls`);
				assert.equal(m.buttons.length, 5, `${where}: the header's two buttons and the pane's three`);
				for (const [id, left, top, right, bottom] of m.buttons) assert.ok(left >= 0 && top >= 0 && right <= m.innerWidth && bottom <= m.innerHeight, `${where}: the button ${id} (${left}, ${top} to ${right}, ${bottom}) leaves the window`);
			}
		}
	} finally {
		tc.diagnostic(seen.join("; "));
		await t.chrome.send("Emulation.setDeviceMetricsOverride", { width: VIEWPORT.width, height: VIEWPORT.height, deviceScaleFactor: 1, mobile: false });
		await t.load("?plan=ansi");
		await t.chrome.evaluate("window.notReloaded = true");
	}
});

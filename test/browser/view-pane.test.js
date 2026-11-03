// view-pane - the view pane in a real browser (docs/ARCHITECTURE-TARGET.md sections 6 to 8; draw's PAN-ZOOM.md
// 3.3, 3.6, 3.7, PZ6, PZ12, PZ24, PZ28, PZ30; docs/DECISIONS.md 0012): the built site opened in headless Chrome and
// driven by trusted input on the pane -- a two-finger scroll, a synthesized touchpad pinch, Ctrl and the wheel, Space
// and a left drag, a middle drag, a right drag, the view keys and the reticle -- and after each the pane's scene view
// held to section 3.6: a pan by its distance on screen over the level's scale, each of PZ12's levels reached by every
// zoom gesture and none between, the drawing point under the pointer kept, home to 0, 0 at the level kept; its grid
// drawn from what is visible, every point at every level with each level's emphasis (0016, 0017), whole after every
// pan, resize and jump; and the picture of the keyboard and mouse unmoved throughout.
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import zlib from "node:zlib";

import { importBuilt, siteRoot } from "../support/built-site.js";
import { plantedSite } from "../support/planted-site.js";
import { MODIFIERS, VIEWPORT, openTesterInChrome } from "./tester-in-chrome.js";

const TEST = { timeout: 90000 };

/**
 * A page-side function, as source, answering the points a dots path draws: `M x y` an absolute move, `m dx dy` a
 * relative one, `h0` the zero-length stroke that draws a dot where the last move left the pen.
 */
const PATH_POINTS = `((d) => { const out = []; let x = 0; let y = 0; for (const m of (d ?? '').matchAll(/([Mm])(-?[0-9.e+-]+) (-?[0-9.e+-]+)h0/g)) { if (m[1] === 'M') { x = Number(m[2]); y = Number(m[3]); } else { x += Number(m[2]); y += Number(m[3]); } out.push([x, y]); } return out; })`;
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

test("the pane opens beside the picture at the first opening -- the centre 0, 0 at 1x, the scale the 1920 by 1080 frame's fit -- every point of its grid of 60 drawn in view, 60 times the scale apart on screen (0016)", TEST, async () => {
	const p = await pane();
	assert.ok(p.width > 300 && p.height > 300, `a pane of ${p.width} by ${p.height}`);
	close(p.view.scale, Math.min(p.width / 1920, p.height / 1080), "the default scale");
	close(p.view.x + p.width / (2 * p.view.scale), 0, "the centre's x");
	close(p.view.y + p.height / (2 * p.view.scale), 0, "the centre's y");
	const xs = await t.page(`[...new Set(${PATH_POINTS}(document.querySelector('#view-pane .pane-dots').getAttribute('d')).map(([x]) => x))].sort((a, b) => a - b)`);
	assert.ok(xs.length > 3, `${xs.length} columns of dots`);
	const spacing = xs[1] - xs[0];
	assert.equal(spacing, 60, `dots ${spacing} units apart, ${spacing * p.view.scale} screen pixels: every point of the grid of 60, none thinned`);
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
 * Measures a precision line through the pane as `coordinate-precision.mjs` measures its bar, on a screenshot row
 * halfway between two rows of the grid's dots, which stand 60 units apart at every level, so no dot lies on it: where its left edge
 * should be on screen by the scene view written, in binary64; where it is drawn, by its coverage in a screenshot
 * row; where the platform hits it, stepping an eighth of a pixel with `elementFromPoint`; and where the browser
 * reports it -- each as an offset in pixels -- beside the pane's own readout of the same.
 */
async function measureLine(distance) {
	const g = await t.page(`(() => { const r = document.getElementById('view-pane').getBoundingClientRect(); const v = inputTester.paneView; const expected = r.left + (${distance} - v.x) * v.scale; const row = Math.round(r.top + r.height / 2 + 30 * v.scale); const bar = document.querySelector('#view-pane .precision-${distance}'); let hit = null; for (let k = -96; k <= 96 && hit === null; k++) if (document.elementFromPoint(expected + k / 8, row) === bar) hit = k / 8; return { expected, row, hit, reported: bar.getBoundingClientRect().left - expected, readout: inputTester.precision.find((m) => m.distance === ${distance}) ?? null, scale: v.scale, level: inputTester.picture.view.level }; })()`);
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
	const xs = await t.page(`${PATH_POINTS}(document.querySelector('#view-pane .pane-dots').getAttribute('d')).map(([x]) => x)`);
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


test("at the Chromebook's likely windows -- 1366 by 657, 1093 by 526 at 125%, 1536 by 750 -- in both sizes of the pane, the page never scrolls, the header ends at or above the main area, and every button, the header's and the pane's, lies wholly inside the window and is the element at its own centre, so a press there reaches it, whatever the header's height (0015)", TEST, async (tc) => {
	const seen = [];
	try {
		for (const [width, height] of [[1366, 657], [1093, 526], [1536, 750]]) {
			await t.chrome.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
			for (const fragment of ["", "#view"]) {
				// each load's address differs before its fragment, so it is a new page and not a fragment changed on the old one (L2)
				await t.load(`?plan=chromebook&window=${width}x${height}${fragment === "" ? "small" : "large"}${fragment}`);
				await t.chrome.evaluate("new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))");
				const m = await t.page("(() => { const d = document.documentElement; const pane = document.getElementById('view-pane').getBoundingClientRect(); const buttons = [...document.querySelectorAll('button')].map((b) => { const r = b.getBoundingClientRect(); const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return [b.id, r.left, r.top, r.right, r.bottom, at === null ? null : at.closest('button') === b ? b.id : (at.id || at.localName)]; }); const header = document.querySelector('header').getBoundingClientRect(); const main = document.querySelector('main').getBoundingClientRect(); return { paneWidth: pane.width, paneBottom: pane.bottom, scrollWidth: d.scrollWidth, scrollHeight: d.scrollHeight, innerWidth, innerHeight, header: Math.round(header.height), headerBottom: header.bottom, mainTop: main.top, buttons }; })()");
				const where = `${width} by ${height}${fragment === "" ? ", the pane small" : ", the pane large"}`;
				seen.push(`${where}: header ${m.header}, pane ${Math.round(m.paneWidth)} wide to y ${Math.round(m.paneBottom)}, document ${m.scrollWidth} by ${m.scrollHeight}`);
				assert.ok(fragment === "" ? m.paneWidth < 0.25 * width : m.paneWidth > 0.45 * width, `${where}: the pane is ${m.paneWidth} wide`);
				assert.ok(m.paneBottom <= m.innerHeight, `${where}: the pane ends at ${m.paneBottom}, past the window's ${m.innerHeight}`);
				assert.ok(m.scrollHeight <= m.innerHeight && m.scrollWidth <= m.innerWidth, `${where}: the document is ${m.scrollWidth} by ${m.scrollHeight}, the window ${m.innerWidth} by ${m.innerHeight}: it scrolls`);
				assert.equal(m.buttons.length, 5, `${where}: the header's two buttons and the pane's three`);
				assert.ok(m.headerBottom <= m.mainTop, `${where}: the header ends at ${m.headerBottom}, below the main area's top, ${m.mainTop}`);
				for (const [id, left, top, right, bottom, atCentre] of m.buttons) {
					assert.ok(left >= 0 && top >= 0 && right <= m.innerWidth && bottom <= m.innerHeight, `${where}: the button ${id} (${left}, ${top} to ${right}, ${bottom}) leaves the window`);
					assert.equal(atCentre, id, `${where}: at the centre of the button ${id} lies ${atCentre}, so a press there misses it`);
				}
			}
		}
	} finally {
		tc.diagnostic(seen.join("; "));
		await t.chrome.send("Emulation.setDeviceMetricsOverride", { width: VIEWPORT.width, height: VIEWPORT.height, deviceScaleFactor: 1, mobile: false });
		await t.load("?plan=ansi");
		await t.chrome.evaluate("window.notReloaded = true");
	}
});

/**
 * The director's values (docs/DECISIONS.md 0018), copied as literals and never read from the code under test: each
 * level's tiers coarsest first, and the floor.
 */
const SPEC_TIERS = {
	0.5: [{ every: 1, opacity: 1 }],
	1: [{ every: 1, opacity: 1 }],
	2: [{ every: 4, opacity: 1 }, { every: 1, opacity: 0.5 }],
	3: [{ every: 10, opacity: 1 }, { every: 2, opacity: 0.5 }, { every: 1, opacity: 0.25 }],
};
const SPEC_GRID_FLOOR = 0;
const SPEC_GRID_MAX = 25000;

/** Presses a view key, waiting for its delivery. */
async function viewKey(key, code, vk) {
	await t.key("keyDown", key, code, { text: key, windowsVirtualKeyCode: vk });
	await t.key("keyUp", key, code, { windowsVirtualKeyCode: vk });
	await t.settle();
}

/**
 * Checks, in the page, the pane's whole grid against its view and the tiers: the points of the finest tier kept in
 * view all drawn, once, each in the path of the first tier whose `every` divides both its cell indices, no point off
 * that lattice, each faded path at its tier's opacity and a tier left out drawn empty, the origin full when in view,
 * none past the bound; answering what is wrong, empty when nothing is, the dots record, and the opacities of the row
 * through the origin and the row below it, from the origin's column on, as far as the view reaches.
 */
async function gridAgainstView(table) {
	return t.page(`(() => {
		const pts = ${PATH_POINTS};
		const dots = inputTester.paneDots;
		const tiers = ${JSON.stringify(table)}[dots.level] ?? [{ every: 1, opacity: 1 }];
		const paths = [document.querySelector('#view-pane .pane-dots:not(.pane-dots-faded)'), ...tiers.slice(1).map((_, i) => document.querySelector('#view-pane .pane-dots-tier-' + (i + 1)))];
		const wrong = [];
		const at = new Map();
		paths.forEach((path, i) => { for (const [x, y] of pts(path.getAttribute('d'))) { const k = x + ',' + y; if (at.has(k)) wrong.push('the point ' + k + ' drawn twice'); at.set(k, i); } });
		tiers.forEach((tier, i) => { if (i > 0 && dots.tiers[i].dropped === null && Number(paths[i].getAttribute('opacity')) !== tier.opacity) wrong.push('the tier ' + i + ' drawn at ' + paths[i].getAttribute('opacity') + ', not ' + tier.opacity); if (i > 0 && dots.tiers[i].dropped !== null && pts(paths[i].getAttribute('d')).length) wrong.push('the tier ' + i + ', left out, drawn'); });
		const kept = dots.tiers.filter((t) => t.dropped === null).length;
		const e = tiers[kept - 1].every;
		const v = inputTester.paneView; const r = document.getElementById('view-pane').getBoundingClientRect();
		const c0 = Math.ceil(v.x / (60 * e)) * e, c1 = Math.floor((v.x + r.width / v.scale) / (60 * e)) * e;
		const r0 = Math.ceil(v.y / (60 * e)) * e, r1 = Math.floor((v.y + r.height / v.scale) / (60 * e)) * e;
		const tierOf = (c, w) => tiers.slice(0, kept).findIndex((t) => c % t.every === 0 && w % t.every === 0);
		let missing = 0, misfiled = 0;
		for (let c = c0; c <= c1; c += e) for (let w = r0; w <= r1; w += e) { const got = at.get(c * 60 + ',' + w * 60); if (got === undefined) missing++; else if (got !== tierOf(c, w)) misfiled++; }
		const off = [...at.keys()].filter((k) => { const [x, y] = k.split(',').map(Number); return (x / 60) % e !== 0 || (y / 60) % e !== 0; }).length;
		if (missing) wrong.push(missing + ' points of the view missing');
		if (misfiled) wrong.push(misfiled + ' points in the wrong tier');
		if (off) wrong.push(off + ' points off the finest tier kept');
		if (c0 <= 0 && c1 >= 0 && r0 <= 0 && r1 >= 0 && at.get('0,0') !== 0) wrong.push('the origin not full');
		if (at.size > ${SPEC_GRID_MAX}) wrong.push(at.size + ' points drawn, past the bound');
		if (Math.abs(dots.spacing - 60 * v.scale) > 1e-9 * dots.spacing) wrong.push('the record drawn for a spacing of ' + dots.spacing + ', the view at ' + 60 * v.scale);
		const opacityAt = (c, w) => { const i = at.get(c * 60 + ',' + w * 60); return i === undefined ? null : tiers[i].opacity; };
		const run = (w) => Array.from({ length: 11 }, (_, c) => opacityAt(c, w));
		return { wrong, dots, rows: [run(0), run(1)] };
	})()`);
}

/** The pane's centre on screen. */
const paneCentre = () => t.page("(() => { const r = document.getElementById('view-pane').getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; })()");

test("0018: the tiers held beside the levels are the director's -- every point full up close, every fourth full at 2x and the rest at half, every tenth full at 3x, every second at half and the rest at a quarter -- each tier's lattice within the coarser's, the first full", async () => {
	const { GRID_TIERS, GRID_FLOOR, GRID_MAX, ZOOM_LEVELS } = await importBuilt("view-steps.js");
	assert.deepEqual(JSON.parse(JSON.stringify(GRID_TIERS)), SPEC_TIERS, "the tiers, the director's values");
	assert.deepEqual([GRID_FLOOR, GRID_MAX], [SPEC_GRID_FLOOR, SPEC_GRID_MAX], "the floor off and the bound raised, the lab's try (0019)");
	for (const level of ZOOM_LEVELS) {
		const tiers = GRID_TIERS[level];
		assert.ok(tiers !== undefined, `${level}x named in the table`);
		assert.equal(tiers[0].opacity, 1, `${level}x: the first tier full`);
		assert.equal(tiers.at(-1).every, 1, `${level}x: the last tier every point, so every point is drawn`);
		for (let i = 1; i < tiers.length; i++) assert.ok(tiers[i - 1].every % tiers[i].every === 0 && tiers[i - 1].every > tiers[i].every && tiers[i].opacity < tiers[i - 1].opacity, `${level}x: tier ${i} a finer grid within tier ${i - 1}, fainter`);
	}
});

test("0018: at every level every point in view drawn at its tier's opacity by its cell indices, the origin full, the dots closing up level by level; at 3x a row through a full dot runs full, 25, 50, 25, ... 25, full and the row below is all at a quarter; no tier left out in the large pane; the readouts unchanged", TEST, async (tc) => {
	const { GRID_TIERS, ZOOM_LEVELS } = await importBuilt("view-steps.js");
	await t.load("?plan=ansi&tiers=levels#view");
	await t.chrome.evaluate("new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))");
	const readouts = await t.page("[...document.querySelectorAll('#view-readouts text tspan')].map((s) => s.textContent)");
	const scale = await t.page("inputTester.paneView.scale");
	assert.deepEqual(readouts, [`level 1x, scale ${Math.round(scale * 10000) / 10000} pixels a unit`, "centre 0, 0", "no view row yet"], "the readouts as before");
	await viewKey("=", "Equal", 187);
	const seen = [];
	for (const level of ZOOM_LEVELS) {
		if (level !== ZOOM_LEVELS[0]) await viewKey("-", "Minus", 189);
		const g = await gridAgainstView(GRID_TIERS);
		assert.equal(g.dots.level, level);
		assert.deepEqual(g.wrong, [], `the large pane at ${level}x`);
		assert.deepEqual(g.dots.tiers.map((x) => x.dropped), GRID_TIERS[level].map(() => null), `the large pane at ${level}x: no tier left out`);
		close(g.dots.spacing, 60 * (await t.page("inputTester.paneView.scale")), `${level}x: the spacing on screen, 60 times the scale`);
		if (level === 3) {
			assert.deepEqual(g.rows[0], [1, 0.25, 0.5, 0.25, 0.5, 0.25, 0.5, 0.25, 0.5, 0.25, 1], "3x: the row through the origin, full to full");
			assert.deepEqual(g.rows[1], Array(11).fill(0.25), "3x: the row below, all at a quarter");
		}
		if (level === 2) assert.deepEqual(g.rows[0].slice(0, 9), [1, 0.5, 0.5, 0.5, 1, 0.5, 0.5, 0.5, 1], "2x: every fourth full, three at half between");
		seen.push({ level, spacing: Math.round(g.dots.spacing * 100) / 100, inView: g.dots.inView, margin: g.dots.margin, tiers: g.dots.tiers.map((x) => `${x.opacity}: ${x.drawn}`).join(", ") });
	}
	for (let i = 1; i < seen.length; i++) assert.ok(seen[i].spacing < seen[i - 1].spacing, `the dots close up from ${seen[i - 1].level}x to ${seen[i].level}x`);
	tc.diagnostic(JSON.stringify(seen));
	await t.load("?plan=ansi");
	await t.chrome.evaluate("window.notReloaded = true");
});

test("0019: no dot drops out -- at the Chromebook's three windows, in both sizes of the pane, at every level, every point in view drawn at its tier's opacity by its cell indices, no tier left out, nothing listed beyond what is drawn", TEST, async (tc) => {
	const { GRID_TIERS, ZOOM_LEVELS } = await importBuilt("view-steps.js");
	const seen = [];
	let n = 0;
	try {
		for (const [width, height] of [[1366, 657], [1093, 526], [1536, 750]]) {
			await t.chrome.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
			for (const size of ["small", "large"]) {
				await t.load(`?plan=chromebook&all=${n++}${size === "large" ? "#view" : ""}`);
				await viewKey("=", "Equal", 187);
				for (const level of ZOOM_LEVELS) {
					if (level !== ZOOM_LEVELS[0]) await viewKey("-", "Minus", 189);
					const g = await gridAgainstView(GRID_TIERS);
					const where = `${width} by ${height}, the ${size} pane at ${level}x`;
					assert.equal(g.dots.level, level, where);
					assert.deepEqual(g.dots.tiers.map((x) => x.dropped), GRID_TIERS[level].map(() => null), `${where}: no tier left out`);
					assert.deepEqual(g.wrong, [], where);
					assert.equal(g.dots.listed, g.dots.tiers.reduce((sum, x) => sum + x.drawn, 0), `${where}: nothing listed but what is drawn`);
					if (level === 3) seen.push(`${where}: ${g.dots.spacing.toFixed(2)} px, ${g.dots.inView} in view, margin ${g.dots.margin}, ${g.dots.tiers.map((x) => `${x.opacity}: ${x.drawn}`).join(", ")}`);
				}
			}
		}
	} finally {
		tc.diagnostic(seen.join("; "));
		await t.chrome.send("Emulation.setDeviceMetricsOverride", { width: VIEWPORT.width, height: VIEWPORT.height, deviceScaleFactor: 1, mobile: false });
		await t.load("?plan=ansi");
		await t.chrome.evaluate("window.notReloaded = true");
	}
});

test("0017: a pan across the drawn margin's edge in each of the four directions, where the margin is narrowed to keep the listing within GRID_MAX -- the small pane at 3x on a 2080 by 1140 window here -- leaves the whole grid drawn after every move", TEST, async (tc) => {
	const { GRID_TIERS } = await importBuilt("view-steps.js");
	await t.chrome.send("Emulation.setDeviceMetricsOverride", { width: 2080, height: 1140, deviceScaleFactor: 1, mobile: false });
	await t.load("?plan=ansi&dots=margin");
	await viewKey("-", "Minus", 189);
	await viewKey("-", "Minus", 189);
	let g = await gridAgainstView(GRID_TIERS);
	assert.deepEqual([g.dots.level, g.dots.floor], [3, null], `at 3x, no tier left out: ${JSON.stringify(g.dots)}`);
	assert.ok(g.dots.margin > 0 && g.dots.margin < 3, `the margin narrowed: ${g.dots.margin}`);
	assert.deepEqual(g.wrong, [], "at the start");
	const c = await paneCentre();
	await t.mouse("mouseMoved", c);
	await t.mouse("mousePressed", c, { button: "middle", buttons: 4 });
	await t.mouse("mouseMoved", { x: c.x, y: c.y + 6 }, { buttons: 4 });
	let at = { x: c.x, y: c.y + 6 };
	const draws = g.dots.draws;
	for (const [dx, dy, way] of [[10, 0, "right"], [-10, 0, "left"], [0, 10, "down"], [0, -10, "up"]]) {
		for (let i = 0; i < 6; i++) {
			at = { x: at.x + dx, y: at.y + dy };
			await t.mouse("mouseMoved", at, { buttons: 4 });
			await t.settle();
			g = await gridAgainstView(GRID_TIERS);
			assert.deepEqual(g.wrong, [], `after a move ${way}, the ${i + 1}th: the margin ${g.dots.margin}, ${g.dots.draws} drawings`);
		}
	}
	await t.mouse("mouseReleased", at, { button: "middle", buttons: 0 });
	tc.diagnostic(`margin ${g.dots.margin} cells; ${g.dots.draws - draws} drawings over 24 moves of 10 pixels, ${g.dots.spacing.toFixed(2)} pixels a cell`);
	await t.chrome.send("Emulation.setDeviceMetricsOverride", { width: VIEWPORT.width, height: VIEWPORT.height, deviceScaleFactor: 1, mobile: false });
	await t.load("?plan=ansi");
	await t.chrome.evaluate("window.notReloaded = true");
});

test("0017: from the small pane at 2x on a 1093 by 526 window to the large at the same level, and back, the whole grid drawn each time, the record at each one's scale; and a jump far from what was drawn draws it again where the view is", TEST, async () => {
	const { GRID_TIERS } = await importBuilt("view-steps.js");
	try {
		await t.chrome.send("Emulation.setDeviceMetricsOverride", { width: 1093, height: 526, deviceScaleFactor: 1, mobile: false });
		await t.load("?plan=chromebook&dots=lift");
		await viewKey("-", "Minus", 189);
		let g = await gridAgainstView(GRID_TIERS);
		assert.deepEqual([g.dots.tiers.map((x) => x.dropped), g.wrong], [[null, null], []], "small at 2x");
		await click("pane-large");
		g = await gridAgainstView(GRID_TIERS);
		assert.deepEqual([g.dots.level, g.dots.tiers.map((x) => x.dropped), g.wrong], [2, [null, null], []], "large at 2x, the whole grid drawn");
		await click("pane-small");
		g = await gridAgainstView(GRID_TIERS);
		assert.deepEqual([g.dots.tiers.map((x) => x.dropped), g.wrong], [[null, null], []], "small again");
		await t.chrome.send("Emulation.setDeviceMetricsOverride", { width: VIEWPORT.width, height: VIEWPORT.height, deviceScaleFactor: 1, mobile: false });
		await t.load("?plan=ansi&dots=far#view");
		await viewKey("=", "Equal", 187);
		await click("go-million");
		g = await gridAgainstView(GRID_TIERS);
		assert.deepEqual(g.wrong, [], "at the line at 1,000,000, 0.5x, the level unchanged");
	} finally {
		await t.chrome.send("Emulation.setDeviceMetricsOverride", { width: VIEWPORT.width, height: VIEWPORT.height, deviceScaleFactor: 1, mobile: false });
		await t.load("?plan=ansi");
		await t.chrome.evaluate("window.notReloaded = true");
	}
});

test("0018, 0019, draw's reading 10's o:F1: past the listing's bound, a stand-in planted in a built copy, the finest faded tier is left out first by the count, the tiers kept drawn whole -- at 3000, the quarter tier at 3x and the half at 2x -- and where even the full tier would pass it -- at 60 -- every faded tier is left out and the full tier's lattice thinned by inView's own stride doubling, anchored at the origin, the origin always drawn", TEST, async (tc) => {
	const { GRID_TIERS } = await importBuilt("view-steps.js");
	const main = t;
	const seen = [];
	for (const bound of [3000, 60]) {
		const planted = plantedSite([{ file: "app/view-steps.js", find: "export const GRID_MAX = 25000;", replace: `export const GRID_MAX = ${bound};` }]);
		try {
			t = await openTesterInChrome({ siteDir: planted.dir, query: "?plan=ansi#view" });
			for (const level of bound === 3000 ? [2, 3] : [1, 3]) {
				while ((await t.page("inputTester.picture.view.level")) < level) await viewKey("-", "Minus", 189);
				if (bound === 3000) {
					const g = await gridAgainstView(GRID_TIERS);
					seen.push({ bound, level, tiers: g.dots.tiers, listed: g.dots.listed });
					assert.deepEqual(g.dots.tiers.map((x) => x.dropped), level === 2 ? [null, "count"] : [null, null, "count"], `at ${bound}, ${level}x: the finest faded tier left out by the count`);
					assert.deepEqual(g.wrong, [], `at ${bound}, ${level}x: the tiers kept drawn whole`);
					assert.equal(g.dots.listed, g.dots.tiers.reduce((sum, x) => sum + x.drawn, 0), `at ${bound}, ${level}x: nothing listed but what is drawn`);
					continue;
				}
				const g = await t.page(`(() => { const pts = ${PATH_POINTS}; const v = inputTester.paneView; const r = document.getElementById('view-pane').getBoundingClientRect(); return { full: pts(document.querySelector('#view-pane .pane-dots:not(.pane-dots-faded)').getAttribute('d')), faded: [...document.querySelectorAll('#view-pane .pane-dots-faded')].flatMap((p) => pts(p.getAttribute('d'))), dots: inputTester.paneDots, x0: v.x, x1: v.x + r.width / v.scale, y0: v.y, y1: v.y + r.height / v.scale }; })()`);
				const every = GRID_TIERS[level][0].every;
				const xs = [...new Set(g.full.map(([x]) => x))].sort((a, b) => a - b);
				const cells = (xs[1] - xs[0]) / 60;
				const stride = cells / every;
				seen.push({ bound, level, inView: g.dots.inView, tiers: g.dots.tiers, cells, listed: g.dots.listed });
				assert.deepEqual(g.dots.tiers.map((x) => x.dropped), GRID_TIERS[level].map((_, i) => (i === 0 ? null : "count")), `at ${level}x every faded tier left out by the count`);
				assert.ok(stride >= 2 && Number.isInteger(Math.log2(stride)), `at ${level}x the full tier's lattice of ${every} thinned by a power of two: every ${cells} cells`);
				assert.ok(g.full.length <= bound && g.faded.length === 0, `at ${level}x: ${g.full.length} full points, ${g.faded.length} faded`);
				assert.equal(g.dots.listed, g.full.length, `at ${level}x: nothing listed but what is drawn`);
				assert.ok(g.full.every(([x, y]) => (x / 60) % cells === 0 && (y / 60) % cells === 0), `at ${level}x: every point on the thinned lattice through the origin`);
				assert.ok(g.full.some(([x, y]) => x === 0 && y === 0), `at ${level}x: the origin drawn`);
				const expected = (Math.floor(g.x1 / (60 * cells)) - Math.ceil(g.x0 / (60 * cells)) + 1) * (Math.floor(g.y1 / (60 * cells)) - Math.ceil(g.y0 / (60 * cells)) + 1);
				assert.equal(g.full.filter(([x, y]) => x >= g.x0 && x <= g.x1 && y >= g.y0 && y <= g.y1).length, expected, `at ${level}x: every point of the thinned lattice in view drawn`);
			}
		} finally {
			await t.close();
			t = main;
			planted.remove();
		}
	}
	tc.diagnostic(JSON.stringify(seen));
});

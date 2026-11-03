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

/** The director's starting values (docs/DECISIONS.md 0016), copied as literals and never read from the code under test. */
const SPEC_EMPHASIS = { 0.5: 1, 1: 1, 2: 5, 3: 7 };
const SPEC_GRID_FADE = 0.5;
const SPEC_GRID_FLOOR = 4;

/** The pane's drawn grid: its full and its faded points, in drawing units, the faded path's opacity, the pane's dots record, scene view and size. */
const drawnGrid = () => t.page(`(() => {
	const points = (sel) => ${PATH_POINTS}(document.querySelector(sel)?.getAttribute('d'));
	const r = document.getElementById('view-pane').getBoundingClientRect();
	const faded = document.querySelector('#view-pane .pane-dots-faded');
	return { full: points('#view-pane .pane-dots:not(.pane-dots-faded)'), faded: points('#view-pane .pane-dots-faded'), opacity: faded.getAttribute('opacity'), computed: getComputedStyle(faded).opacity, dots: inputTester.paneDots, view: inputTester.paneView, width: r.width, height: r.height, readouts: [...document.querySelectorAll('#view-readouts text tspan')].map((s) => s.textContent) };
})()`);

/** Presses a view key, waiting for its delivery. */
async function viewKey(key, code, vk) {
	await t.key("keyDown", key, code, { text: key, windowsVirtualKeyCode: vk });
	await t.key("keyUp", key, code, { windowsVirtualKeyCode: vk });
	await t.settle();
}

/** Holds a drawn grid to its level: every point 60 apart, the emphasised full and the rest faded by cell index, the origin full when in view, every point of the view drawn, none past the bound. */
function assertGrid(g, emphasis, where) {
	const n = emphasis[g.dots.level];
	const all = [...g.full, ...g.faded];
	const xs = [...new Set(all.map(([x]) => x))].sort((a, b) => a - b);
	const ys = [...new Set(all.map(([, y]) => y))].sort((a, b) => a - b);
	const step = (v) => v.slice(1).map((x, i) => x - v[i]);
	assert.ok(step(xs).every((d) => d === 60) && step(ys).every((d) => d === 60), `${where}: every column and row of the grid of 60 drawn, none thinned`);
	close(g.dots.spacing, 60 * g.view.scale, `${where}: the spacing on screen, 60 times the scale`);
	const left = g.view.x;
	const top = g.view.y;
	const right = left + g.width / g.view.scale;
	const bottom = top + g.height / g.view.scale;
	assert.ok(xs[0] <= Math.ceil(left / 60) * 60 && xs.at(-1) >= Math.floor(right / 60) * 60 && ys[0] <= Math.ceil(top / 60) * 60 && ys.at(-1) >= Math.floor(bottom / 60) * 60, `${where}: the points cover the view, ${left}..${right} by ${top}..${bottom}`);
	for (const [x, y] of g.full) assert.ok((x / 60) % n === 0 && (y / 60) % n === 0, `${where}: the full point ${x}, ${y} has cell indices both multiples of ${n}`);
	for (const [x, y] of g.faded) assert.ok(!((x / 60) % n === 0 && (y / 60) % n === 0), `${where}: the faded point ${x}, ${y} is emphasised at ${n}`);
	if (left <= 0 && right >= 0 && top <= 0 && bottom >= 0) assert.ok(g.full.some(([x, y]) => x === 0 && y === 0), `${where}: the origin full`);
	assert.ok(all.length <= 10000, `${where}: ${all.length} points drawn, past inView's bound`);
	if (n === 1) assert.equal(g.faded.length, 0, `${where}: every point full at an interval of 1`);
}

test("0016: every grid point drawn at every level, the dots closing up level by level, 60 times the scale apart; at 2x every fifth and at 3x every seventh point full, anchored at the origin, the rest at 0.5 opacity, by the table held beside the levels; the readouts unchanged", TEST, async (tc) => {
	const { GRID_EMPHASIS, GRID_FADE, GRID_FLOOR, ZOOM_LEVELS } = await importBuilt("view-steps.js");
	assert.deepEqual({ ...GRID_EMPHASIS }, SPEC_EMPHASIS, "the emphasis table, the director's starting values");
	assert.deepEqual([GRID_FADE, GRID_FLOOR], [SPEC_GRID_FADE, SPEC_GRID_FLOOR]);
	assert.deepEqual(ZOOM_LEVELS.filter((l) => GRID_EMPHASIS[l] === undefined), [], "every level named in the table");
	await t.load("?plan=ansi&dots=levels#view");
	await t.chrome.evaluate("new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))");
	const first = await drawnGrid();
	assert.deepEqual(first.readouts, [`level 1x, scale ${Math.round(first.view.scale * 10000) / 10000} pixels a unit`, "centre 0, 0", "no view row yet"], "the readouts as before");
	await viewKey("=", "Equal", 187);
	const seen = [];
	for (const level of ZOOM_LEVELS) {
		if (level !== ZOOM_LEVELS[0]) await viewKey("-", "Minus", 189);
		const g = await drawnGrid();
		assert.equal(g.dots.level, level);
		assertGrid(g, GRID_EMPHASIS, `the large pane at ${level}x`);
		assert.equal(g.dots.floor, null, `the large pane at ${level}x: no floor`);
		assert.deepEqual([g.opacity, g.computed], [String(GRID_FADE), String(GRID_FADE)], "the faded points' opacity, from its one place");
		seen.push({ level, spacing: Math.round(g.dots.spacing * 100) / 100, interval: g.dots.interval, full: g.full.length, faded: g.faded.length, inView: g.dots.inView, margin: g.dots.margin });
	}
	for (let i = 1; i < seen.length; i++) assert.ok(seen[i].spacing < seen[i - 1].spacing, `the dots close up from ${seen[i - 1].level}x to ${seen[i].level}x: ${seen[i - 1].spacing} then ${seen[i].spacing} pixels`);
	tc.diagnostic(JSON.stringify(seen));
	await t.load("?plan=ansi");
	await t.chrome.evaluate("window.notReloaded = true");
});

test("0016's floor: the faded points left out, the emphasised alone drawn, only where the points would stand under 4 screen pixels apart (the small pane at 2x on a 1093 by 526 window) or listing the view would pass inView's 10,000 (the small pane at 3x here); and a pan far from what was drawn draws the grid again where the view is", TEST, async (tc) => {
	const { GRID_EMPHASIS } = await importBuilt("view-steps.js");
	const cases = [];
	try {
		await t.load("?plan=ansi&dots=count");
		await viewKey("-", "Minus", 189);
		await viewKey("-", "Minus", 189);
		let g = await drawnGrid();
		cases.push({ where: "2080 by 1000, small, 3x", spacing: g.dots.spacing, inView: g.dots.inView, floor: g.dots.floor, full: g.full.length, faded: g.faded.length });
		assert.ok(g.dots.spacing >= SPEC_GRID_FLOOR && g.dots.inView > 10000, `the case is the count's alone: ${JSON.stringify(g.dots)}`);
		assert.equal(g.dots.floor, "count");
		assert.equal(g.faded.length, 0, "the faded points left out");
		assert.ok(g.full.length > 0 && g.full.length <= 10000 && g.full.every(([x, y]) => (x / 60) % 7 === 0 && (y / 60) % 7 === 0), "every seventh point alone");
		await t.chrome.send("Emulation.setDeviceMetricsOverride", { width: 1093, height: 526, deviceScaleFactor: 1, mobile: false });
		await t.load("?plan=chromebook&dots=spacing");
		await viewKey("-", "Minus", 189);
		g = await drawnGrid();
		cases.push({ where: "1093 by 526, small, 2x", spacing: g.dots.spacing, inView: g.dots.inView, floor: g.dots.floor, full: g.full.length, faded: g.faded.length });
		assert.ok(g.dots.spacing < SPEC_GRID_FLOOR && g.dots.inView <= 10000, `the case is the spacing's alone: ${JSON.stringify(g.dots)}`);
		assert.equal(g.dots.floor, "spacing");
		assert.equal(g.faded.length, 0, "the faded points left out");
		assert.ok(g.full.length > 0 && g.full.every(([x, y]) => (x / 60) % GRID_EMPHASIS[2] === 0 && (y / 60) % GRID_EMPHASIS[2] === 0), "every fifth point alone");
		await t.chrome.send("Emulation.setDeviceMetricsOverride", { width: VIEWPORT.width, height: VIEWPORT.height, deviceScaleFactor: 1, mobile: false });
		await t.load("?plan=ansi&dots=far#view");
		await viewKey("=", "Equal", 187);
		await click("go-million");
		g = await drawnGrid();
		assertGrid(g, GRID_EMPHASIS, "at the line at 1,000,000, 0.5x, the level unchanged");
	} finally {
		tc.diagnostic(JSON.stringify(cases));
		await t.chrome.send("Emulation.setDeviceMetricsOverride", { width: VIEWPORT.width, height: VIEWPORT.height, deviceScaleFactor: 1, mobile: false });
		await t.load("?plan=ansi");
		await t.chrome.evaluate("window.notReloaded = true");
	}
});

/**
 * Checks, in the page, the pane's whole grid against its view: every point of the grid in view drawn, once, full or
 * faded as the level's interval says, the origin full when in view -- or, at the floor, every point of the emphasised
 * lattice in view drawn and no faded one; answering what is wrong, empty when nothing is, and the dots record.
 */
async function gridAgainstView(emphasis) {
	return t.page(`(() => {
		const pts = ${PATH_POINTS};
		const full = pts(document.querySelector('#view-pane .pane-dots:not(.pane-dots-faded)').getAttribute('d'));
		const faded = pts(document.querySelector('#view-pane .pane-dots-faded').getAttribute('d'));
		const v = inputTester.paneView; const r = document.getElementById('view-pane').getBoundingClientRect();
		const dots = inputTester.paneDots; const n = ${JSON.stringify(emphasis)}[dots.level] ?? 1;
		const step = dots.floor === null ? 1 : n;
		const key = (x, y) => x + ',' + y;
		const fullSet = new Set(full.map(([x, y]) => key(x, y))); const fadedSet = new Set(faded.map(([x, y]) => key(x, y)));
		const wrong = [];
		if (fullSet.size !== full.length || fadedSet.size !== faded.length) wrong.push('a point drawn twice');
		const c0 = Math.ceil(v.x / (60 * step)) * step, c1 = Math.floor((v.x + r.width / v.scale) / (60 * step)) * step;
		const r0 = Math.ceil(v.y / (60 * step)) * step, r1 = Math.floor((v.y + r.height / v.scale) / (60 * step)) * step;
		let missing = 0, misfiled = 0;
		for (let c = c0; c <= c1; c += step) for (let w = r0; w <= r1; w += step) {
			const k = key(c * 60, w * 60); const emphasised = c % n === 0 && w % n === 0;
			if (dots.floor === null) { if (!(emphasised ? fullSet : fadedSet).has(k)) (fullSet.has(k) || fadedSet.has(k) ? misfiled++ : missing++); }
			else if (!fullSet.has(k)) missing++;
		}
		if (missing) wrong.push(missing + ' points of the view missing');
		if (misfiled) wrong.push(misfiled + ' points drawn full where faded belongs, or faded where full');
		if (dots.floor !== null && faded.length) wrong.push(faded.length + ' faded points drawn at the floor');
		if (c0 <= 0 && c1 >= 0 && r0 <= 0 && r1 >= 0 && !fullSet.has('0,0')) wrong.push('the origin not full');
		if (full.length + faded.length > 10000) wrong.push((full.length + faded.length) + ' points drawn, past the bound');
		return { wrong, dots, points: (c1 - c0) / step + 1 };
	})()`);
}

/** The pane's centre on screen. */
const paneCentre = () => t.page("(() => { const r = document.getElementById('view-pane').getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; })()");

test("0017: a pan across the drawn margin's edge in each of the four directions, where the margin is narrowed to keep the listing within 10,000 -- the small pane at 2x here -- leaves the whole grid drawn after every move", TEST, async (tc) => {
	const { GRID_EMPHASIS } = await importBuilt("view-steps.js");
	await t.load("?plan=ansi&dots=margin");
	await viewKey("-", "Minus", 189);
	let g = await gridAgainstView(GRID_EMPHASIS);
	assert.deepEqual([g.dots.level, g.dots.floor], [2, null], `at 2x, no floor: ${JSON.stringify(g.dots)}`);
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
			g = await gridAgainstView(GRID_EMPHASIS);
			assert.deepEqual(g.wrong, [], `after a move ${way}, the ${i + 1}th: the margin ${g.dots.margin}, ${g.dots.draws} drawings`);
		}
	}
	await t.mouse("mouseReleased", at, { button: "middle", buttons: 0 });
	tc.diagnostic(`margin ${g.dots.margin} cells; ${g.dots.draws - draws} drawings over 24 moves of 10 pixels, ${(60 * (g.dots.spacing / 60)).toFixed(2)} pixels a cell`);
	await t.load("?plan=ansi");
	await t.chrome.evaluate("window.notReloaded = true");
});

test("0017: at the floor every emphasised point in view is drawn and nothing is listed beyond the lattice -- the count's floor here, the spacing's at 1093 by 526 -- and from the small pane at 2x there, a floor of spacing, to the large, where it lifts at the same level, the whole grid is drawn again", TEST, async (tc) => {
	const { GRID_EMPHASIS } = await importBuilt("view-steps.js");
	const seen = [];
	try {
		await t.load("?plan=ansi&dots=countfloor");
		await viewKey("-", "Minus", 189);
		await viewKey("-", "Minus", 189);
		let g = await gridAgainstView(GRID_EMPHASIS);
		seen.push(g.dots);
		assert.equal(g.dots.floor, "count");
		assert.deepEqual(g.wrong, [], "the count's floor: every seventh point in view drawn");
		assert.equal(g.dots.listed, g.dots.full, "nothing listed but the lattice drawn");
		await t.chrome.send("Emulation.setDeviceMetricsOverride", { width: 1093, height: 526, deviceScaleFactor: 1, mobile: false });
		await t.load("?plan=chromebook&dots=spacingfloor");
		await viewKey("-", "Minus", 189);
		g = await gridAgainstView(GRID_EMPHASIS);
		seen.push(g.dots);
		assert.equal(g.dots.floor, "spacing");
		assert.deepEqual(g.wrong, [], "the spacing's floor: every fifth point in view drawn");
		assert.equal(g.dots.listed, g.dots.full, "nothing listed but the lattice drawn");
		await click("pane-large");
		g = await gridAgainstView(GRID_EMPHASIS);
		seen.push(g.dots);
		assert.deepEqual([g.dots.level, g.dots.floor], [2, null], "the large pane at 2x: the floor lifted");
		assert.deepEqual(g.wrong, [], "the large pane at 2x: the whole grid, faded points with it");
		await click("pane-small");
		g = await gridAgainstView(GRID_EMPHASIS);
		assert.deepEqual([g.dots.floor, g.wrong], ["spacing", []], "small again: the floor again");
	} finally {
		tc.diagnostic(JSON.stringify(seen));
		await t.chrome.send("Emulation.setDeviceMetricsOverride", { width: VIEWPORT.width, height: VIEWPORT.height, deviceScaleFactor: 1, mobile: false });
		await t.load("?plan=ansi");
		await t.chrome.evaluate("window.notReloaded = true");
	}
});

test("0017, draw's reading 10's o:F1: where the emphasised lattice itself would pass the listing's bound -- a stand-in bound of 150 planted in a built copy -- it is thinned by inView's own stride doubling, anchored at the origin, the origin always drawn: at 1x every point full and thinned, at 3x every seventh thinned to every fourteenth", TEST, async (tc) => {
	const { GRID_EMPHASIS } = await importBuilt("view-steps.js");
	const planted = plantedSite([{ file: "app/view-pane.js", find: "export const PANE_MAX_DOTS = 10000;", replace: "export const PANE_MAX_DOTS = 150;" }]);
	const main = t;
	const seen = [];
	try {
		t = await openTesterInChrome({ siteDir: planted.dir, query: "?plan=ansi#view" });
		for (const level of [1, 3]) {
			if (level === 3) {
				await viewKey("-", "Minus", 189);
				await viewKey("-", "Minus", 189);
			}
			const g = await t.page(`(() => { const pts = ${PATH_POINTS}; const v = inputTester.paneView; const r = document.getElementById('view-pane').getBoundingClientRect(); return { full: pts(document.querySelector('#view-pane .pane-dots:not(.pane-dots-faded)').getAttribute('d')), faded: pts(document.querySelector('#view-pane .pane-dots-faded').getAttribute('d')), dots: inputTester.paneDots, x0: v.x, x1: v.x + r.width / v.scale, y0: v.y, y1: v.y + r.height / v.scale }; })()`);
			const n = GRID_EMPHASIS[level];
			const xs = [...new Set(g.full.map(([x]) => x))].sort((a, b) => a - b);
			const cells = (xs[1] - xs[0]) / 60;
			const stride = cells / n;
			seen.push({ level, inView: g.dots.inView, floor: g.dots.floor, full: g.full.length, cells });
			assert.equal(g.dots.floor, "count", `at ${level}x, past the stand-in bound`);
			assert.ok(stride >= 2 && Number.isInteger(Math.log2(stride)), `at ${level}x the lattice of ${n} thinned by a power of two: every ${cells} cells`);
			assert.ok(g.full.length <= 150 && g.faded.length === 0, `at ${level}x: ${g.full.length} full points, ${g.faded.length} faded`);
			assert.ok(g.full.every(([x, y]) => (x / 60) % cells === 0 && (y / 60) % cells === 0), `at ${level}x: every point drawn on the thinned lattice through the origin`);
			assert.ok(g.full.some(([x, y]) => x === 0 && y === 0), `at ${level}x: the origin drawn`);
			const expected = (Math.floor(g.x1 / (60 * cells)) - Math.ceil(g.x0 / (60 * cells)) + 1) * (Math.floor(g.y1 / (60 * cells)) - Math.ceil(g.y0 / (60 * cells)) + 1);
			assert.equal(g.full.filter(([x, y]) => x >= g.x0 && x <= g.x1 && y >= g.y0 && y <= g.y1).length, expected, `at ${level}x: every point of the thinned lattice in view drawn`);
		}
	} finally {
		tc.diagnostic(JSON.stringify(seen));
		await t.close();
		t = main;
		planted.remove();
	}
});


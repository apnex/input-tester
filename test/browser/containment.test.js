// containment - no keystroke or movement leaves the page (docs/ARCHITECTURE-TARGET.md section 8, P4, GT6,
// IT-D5): the gate watches every request from before navigation through teardown, input dispatched from the
// navigation's commit, before the load event, and finds the entry first, then each file the page loads from the
// release once, and none after. Planted leaks, each carrying a key in its address, each fail it: a same-origin
// script element, a dynamic import, a stylesheet and a prefetch, which the rule lets through; an image and a
// shape's href, which it refuses; and a navigation to the page's own origin, which no rule stops. The gate's
// server sends the rule in every response, and under it an inline script, a `fetch`, a worker and a `style`
// attribute written by script are each refused, while the release's own files load by relative path.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

import { releaseFolder, siteRoot } from "../support/built-site.js";
import { containmentProblems, filesThePageLoads } from "../support/containment.js";
import { DELIVERY_OPENS, plantedSite } from "../support/planted-site.js";
import { sleep } from "./chrome-driver.js";
import { readResponseHeaders, serveSite } from "./site-server.js";
import { MODIFIERS, openTesterInChrome } from "./tester-in-chrome.js";

const TEST = { timeout: 120000 };
const loads = filesThePageLoads(siteRoot);

test("the page loads its stylesheet and every module its one module script reaches, all from its own folder, the four parts' among them", () => {
	assert.ok(loads.every((f) => f.startsWith(`${releaseFolder}/`)), "every file in the release's folder");
	assert.equal(loads[0], `${releaseFolder}/input-tester.css`);
	for (const part of ["input-capture", "input-binding", "vector-scene", "snap-grid"]) assert.ok(loads.includes(`${releaseFolder}/vendor/${part}/index.js`), part);
	assert.ok(loads.length > 30, `${loads.length} files`);
});

test("GT6: the gate's server sends the rule, Referrer-Policy and X-Content-Type-Options in every response, exactly as tools/response-headers.json holds them -- a missing file's among them -- with no report endpoint", TEST, async () => {
	const { headers, cacheControl } = readResponseHeaders();
	assert.equal(headers["Content-Security-Policy"], "default-src 'none'; script-src 'self'; style-src 'self'; worker-src 'none'; form-action 'none'; base-uri 'none'; frame-ancestors 'none'", "IT-D5's text");
	assert.ok(!/report-(uri|to)/.test(headers["Content-Security-Policy"]));
	const server = await serveSite(siteRoot);
	try {
		const manifest = fs.readFileSync(path.join(siteRoot, releaseFolder, "SHA256SUMS"), "utf8").trim().split("\n").map((l) => l.slice(66));
		for (const rel of ["", "?plan=chromebook", ...manifest, `${releaseFolder}/SHA256SUMS`, "no-such-file"]) {
			const res = await fetch(`${server.origin}/${rel}`);
			for (const [name, value] of Object.entries(headers)) assert.equal(res.headers.get(name), value, `${name} on /${rel}`);
			if (res.status === 200) assert.equal(res.headers.get("Cache-Control"), rel === "" || rel.startsWith("?") || rel === "index.html" ? cacheControl.entry : cacheControl.folder, `Cache-Control on /${rel}`);
			await res.arrayBuffer();
		}
	} finally {
		await server.close();
	}
});

/** Drives a sitting's worth of input through an open tester: keys, a chord, a click, a drag, wheels, a double click, a context menu, a pinch and focus lost. */
async function driveASitting(t) {
	for (const [key, code, vk] of [["h", "KeyH", 72], ["i", "KeyI", 73], ["1", "Digit1", 49]]) {
		await t.key("keyDown", key, code, { text: key, windowsVirtualKeyCode: vk });
		await t.key("keyDown", key, code, { text: key, autoRepeat: true, windowsVirtualKeyCode: vk });
		await t.key("keyUp", key, code, { windowsVirtualKeyCode: vk });
	}
	await t.key("keyDown", "Control", "ControlLeft", { modifiers: MODIFIERS.ctrl, windowsVirtualKeyCode: 17 });
	await t.key("keyDown", "s", "KeyS", { modifiers: MODIFIERS.ctrl, windowsVirtualKeyCode: 83 });
	await t.key("keyUp", "s", "KeyS", { modifiers: MODIFIERS.ctrl, windowsVirtualKeyCode: 83 });
	await t.key("keyUp", "Control", "ControlLeft", { windowsVirtualKeyCode: 17 });
	const at = t.keyCentre("KeyG");
	await t.mouse("mouseMoved", at);
	await t.mouse("mousePressed", at, { button: "left", buttons: 1 });
	await t.mouse("mouseReleased", at, { button: "left", buttons: 0 });
	await t.mouse("mousePressed", at, { button: "left", buttons: 1, clickCount: 2 });
	await t.mouse("mouseReleased", at, { button: "left", buttons: 0, clickCount: 2 });
	await t.mouse("mousePressed", at, { button: "left", buttons: 1 });
	await t.mouse("mouseMoved", { x: at.x + 60, y: at.y + 20 }, { buttons: 1 });
	await t.mouse("mousePressed", { x: at.x + 60, y: at.y + 20 }, { button: "right", buttons: 3 });
	await t.mouse("mouseReleased", { x: at.x + 60, y: at.y + 20 }, { button: "left", buttons: 2 });
	await t.mouse("mouseReleased", { x: at.x + 60, y: at.y + 20 }, { button: "right", buttons: 0 });
	await t.wheel(at, 0, 120);
	await t.wheel(at, 0, -120, MODIFIERS.ctrl);
	await t.chrome.send("Input.synthesizePinchGesture", { x: at.x, y: at.y, scaleFactor: 1.5, relativeSpeed: 800, gestureSourceType: "mouse" });
	await t.chrome.send("Page.bringToFront");
	const { targetId } = await t.chrome.send("Target.createTarget", { url: "about:blank" });
	await sleep(200);
	await t.chrome.send("Target.closeTarget", { targetId });
	await t.chrome.send("Page.bringToFront");
	await t.settle();
}

test("containment: from before navigation through teardown, input dispatched from the navigation's commit and before the load event, the page requests the entry first, then each file it loads from the release once, and none after", TEST, async (ctx) => {
	const t = await openTesterInChrome({ siteDir: siteRoot, navigate: false });
	try {
		let committed = false;
		let loaded = false;
		t.chrome.on("Page.frameNavigated", (p) => {
			if (!p.frame.parentId) committed = true;
		});
		t.chrome.on("Page.loadEventFired", () => (loaded = true));
		const navigation = t.navigate("");
		for (let i = 0; i < 2000 && !committed; i++) await sleep(1);
		assert.equal(committed, true, "the navigation committed");
		let early = 0;
		while (!loaded && early < 500) {
			await t.key("keyDown", "a", "KeyA", { text: "a", windowsVirtualKeyCode: 65 });
			await t.key("keyUp", "a", "KeyA", { windowsVirtualKeyCode: 65 });
			await t.mouse("mouseMoved", { x: 100 + (early % 50), y: 120 });
			early++;
		}
		await navigation;
		ctx.diagnostic(`${early} key presses and moves dispatched between the navigation's commit and the load event`);
		await t.ready();
		await driveASitting(t);
		await sleep(1000);
		const problems = containmentProblems(t.requests, { origin: t.server.origin, loads });
		assert.deepEqual(problems, []);
		assert.deepEqual(new Set(t.server.requests.map((r) => r.path)), new Set(["/", ...loads.map((f) => `/${f}`)]), "the server, the second witness, answered the same requests");
		assert.equal(t.server.requests.length, loads.length + 1);
		ctx.diagnostic(`${t.requests.length} requests: the entry and ${loads.length} files of the release, each once`);
	} finally {
		await t.close();
	}
});

/** The planted leaks of section 8, each run inside every delivery of a key-down, carrying the key in its address. */
const LEAKS = [
	["a same-origin script element, which the rule lets through", `document.head.append(Object.assign(document.createElement("script"), { src: "/leak.js?k=" + fact.key }));`],
	["a dynamic import, which the rule lets through", `import("/leak.mjs?k=" + fact.key).catch(() => {});`],
	["a stylesheet, which the rule lets through", `document.head.append(Object.assign(document.createElement("link"), { rel: "stylesheet", href: "/leak.css?k=" + fact.key }));`],
	["a prefetch, which the rule lets through", `document.head.append(Object.assign(document.createElement("link"), { rel: "prefetch", href: "/leak.txt?k=" + fact.key }));`],
	["an image, which the rule refuses", `new Image().src = "/leak.png?k=" + fact.key;`],
	["a shape's href, which the rule refuses", `scene.put("panel", "leak", [{ tag: "image", attrs: { href: "/leak.svg?k=" + fact.key, width: 1, height: 1 } }]);`],
	["a navigation to the page's own origin, which no rule stops", `location.href = "/?k=" + fact.key;`],
];

for (const [name, code] of LEAKS) {
	test(`a planted leak fails the monitor: ${name}`, TEST, async () => {
		const planted = plantedSite([{ file: "app/composition-root.js", find: DELIVERY_OPENS, replace: `${DELIVERY_OPENS}\n        if (fact.type === "key-down") { ${code} }` }]);
		let t;
		try {
			t = await openTesterInChrome({ siteDir: planted.dir });
			await t.key("keyDown", "q", "KeyQ", { text: "q", windowsVirtualKeyCode: 81 });
			await t.key("keyUp", "q", "KeyQ", { windowsVirtualKeyCode: 81 });
			await sleep(700);
			const problems = containmentProblems(t.requests, { origin: t.server.origin, loads: filesThePageLoads(planted.dir) });
			assert.ok(problems.some((p) => p.includes("k=q")), `the monitor named the leak: ${JSON.stringify(problems)}`);
		} finally {
			await t?.close();
			planted.remove();
		}
	});
}

test("IT-D5: under the rule an inline script, a fetch, a worker and a style attribute written by script are each refused, while the release's own files load by relative path", TEST, async () => {
	const planted = plantedSite([{ entry: true, find: "</body>", replace: "<script>window.inlineRan = true;</script></body>" }]);
	let t;
	try {
		t = await openTesterInChrome({ siteDir: planted.dir });
		assert.equal(await t.chrome.evaluate("globalThis.inputTester !== undefined"), true, "the release's modules loaded");
		assert.equal(await t.chrome.evaluate("window.inlineRan === undefined"), true, "the inline script refused");
		await t.settle();
		const mark = t.requests.length;
		assert.equal(await t.chrome.evaluate("fetch('/index.html').then(() => 'loaded', () => 'refused')"), "refused");
		assert.match(await t.chrome.evaluate(`(() => { try { new Worker("/${releaseFolder}/app/input-router.js", { type: "module" }); return "made"; } catch (e) { return "refused: " + e.name; } })()`), /^refused/);
		assert.notEqual(await t.chrome.evaluate("(() => { const r = document.querySelector('#input-surface .key-cap'); r.setAttribute('style', 'fill: rgb(1, 2, 3)'); return getComputedStyle(r).fill; })()"), "rgb(1, 2, 3)", "a style attribute written by script is refused, so the painter states every look by class");
		await sleep(300);
		const attempted = t.requests.slice(mark);
		assert.ok(attempted.every((r) => r.blocked !== null), `the fetch and the worker refused before any byte arrived: ${JSON.stringify(attempted)}`);
	} finally {
		await t?.close();
		planted.remove();
	}
});

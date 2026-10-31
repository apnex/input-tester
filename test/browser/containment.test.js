// containment - no keystroke or movement leaves the page (docs/ARCHITECTURE-TARGET.md section 8, P4, GT6,
// IT-D5): the gate watches every request from before navigation through teardown, input dispatched from the
// navigation's commit, before the load event, and finds the entry first, then each file the page loads from the
// release once, and none after. Planted leaks, each carrying a key in its address, each fail it: a same-origin
// script element, a dynamic import, a stylesheet and a prefetch, which the rule lets through; an image and a
// shape's href, which it refuses; and a navigation to the page's own origin, which no rule stops. The gate's
// server sends the rule in every response, and under it an inline script, a `fetch`, a worker and a `style`
// attribute written by script are each refused, while the release's own files load by relative path -- the worker
// judged refused whether the browser refuses it at once, as Chrome 136 throws, or by an `error` event with its
// script's fetch blocked, as a later Chrome does, and in either case no byte of its script delivered.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { setTimeout as sleep } from "node:timers/promises";

import { loseFocus } from "@apnex/test-harness";

import { releaseFolder, siteRoot } from "../support/built-site.js";
import { containmentProblems, filesThePageLoads } from "../support/containment.js";
import { DELIVERY_OPENS, plantedSite } from "../support/planted-site.js";
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
	await loseFocus(t.chrome, () => sleep(200));
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

/** How long the page waits on a worker for an `error` event or a message before judging it silent. */
const WORKER_WAIT_MS = 3000;

/** A worker script that posts a message the moment it runs, planted beside the release's own modules. */
const WORKER_PROBE = { add: "app/worker-probe.js", text: 'postMessage("loaded");\n' };

/**
 * The page's own account of a worker made from `scriptPath`: whether its construction threw, as Chrome 136 refuses
 * one; whether it fired an `error` event, as a later Chrome refuses one, its script's fetch blocked; and whether it
 * posted a message, which a worker whose script ran does -- each within a bounded wait.
 */
function workerSeen(t, scriptPath) {
	return t.chrome.evaluate(`new Promise((resolve) => {
		const seen = { threw: null, error: false, message: false };
		let worker;
		try {
			worker = new Worker(${JSON.stringify(scriptPath)});
		} catch (e) {
			seen.threw = e.name;
			resolve(seen);
			return;
		}
		const settle = () => setTimeout(() => resolve(seen), 200);
		const timer = setTimeout(() => resolve(seen), ${WORKER_WAIT_MS});
		worker.addEventListener("error", () => { seen.error = true; clearTimeout(timer); settle(); });
		worker.addEventListener("message", () => { seen.message = true; clearTimeout(timer); settle(); });
	})`);
}

/**
 * Why a worker was not refused, by every witness; empty when it was: the page saw it refused -- its construction
 * threw, or it fired an error and posted no message -- and no byte of its script was delivered, every request the
 * monitor saw for the script blocked and the server answering none.
 */
function workerRefusalProblems(seen, monitored, served, scriptPath) {
	const problems = [];
	if (seen.threw === null && !(seen.error && !seen.message)) problems.push(`the page saw the worker made: ${JSON.stringify(seen)}`);
	const requested = monitored.filter((r) => new URL(r.url).pathname === scriptPath);
	if (requested.some((r) => r.blocked === null)) problems.push(`the monitor saw its script requested and not blocked: ${JSON.stringify(requested)}`);
	if (served.some((r) => r.path === scriptPath)) problems.push("the server answered its script");
	return problems;
}

test("IT-D5: under the rule an inline script, a fetch, a worker and a style attribute written by script are each refused, while the release's own files load by relative path -- the worker judged refused whether the browser refuses it at once or by an error event, and no byte of its script delivered", TEST, async () => {
	const planted = plantedSite([{ entry: true, find: "</body>", replace: "<script>window.inlineRan = true;</script></body>" }, WORKER_PROBE]);
	const workerPath = `/${releaseFolder}/${WORKER_PROBE.add}`;
	let t;
	try {
		t = await openTesterInChrome({ siteDir: planted.dir });
		assert.equal(await t.chrome.evaluate("globalThis.inputTester !== undefined"), true, "the release's modules loaded");
		assert.equal(await t.chrome.evaluate("window.inlineRan === undefined"), true, "the inline script refused");
		await t.settle();
		const mark = t.requests.length;
		const servedMark = t.server.requests.length;
		assert.equal(await t.chrome.evaluate("fetch('/index.html').then(() => 'loaded', () => 'refused')"), "refused");
		const seen = await workerSeen(t, workerPath);
		assert.notEqual(await t.chrome.evaluate("(() => { const r = document.querySelector('#input-surface .key-cap'); r.setAttribute('style', 'fill: rgb(1, 2, 3)'); return getComputedStyle(r).fill; })()"), "rgb(1, 2, 3)", "a style attribute written by script is refused, so the painter states every look by class");
		await sleep(300);
		const attempted = t.requests.slice(mark);
		assert.deepEqual(workerRefusalProblems(seen, attempted, t.server.requests.slice(servedMark), workerPath), [], "the worker refused");
		assert.ok(attempted.every((r) => r.blocked !== null), `the fetch and the worker refused before any byte arrived: ${JSON.stringify(attempted)}`);
	} finally {
		await t?.close();
		planted.remove();
	}
});

test("IT-D5's worker judgment can fail on this Chrome by each witness: under the rule without worker-src, which section 11 measured letting a worker load, a worker whose script runs is judged made by its message, the monitor and the server; one whose script is missing fires an error event, yet is judged not refused, the server having answered it", TEST, async () => {
	const rule = readResponseHeaders();
	const withoutWorkerSrc = { ...rule, headers: { ...rule.headers, "Content-Security-Policy": rule.headers["Content-Security-Policy"].replace(" worker-src 'none';", "") } };
	assert.notEqual(withoutWorkerSrc.headers["Content-Security-Policy"], rule.headers["Content-Security-Policy"], "the rule holds worker-src 'none' to take away");
	const planted = plantedSite([WORKER_PROBE]);
	let t;
	try {
		t = await openTesterInChrome({ siteDir: planted.dir, headers: withoutWorkerSrc });
		await t.settle();
		for (const [scriptPath, expected] of [[`/${releaseFolder}/${WORKER_PROBE.add}`, { threw: null, error: false, message: true }], [`/${releaseFolder}/app/no-such-worker.js`, { threw: null, error: true, message: false }]]) {
			const mark = t.requests.length;
			const servedMark = t.server.requests.length;
			const seen = await workerSeen(t, scriptPath);
			await sleep(300);
			assert.deepEqual(seen, expected, scriptPath);
			const problems = workerRefusalProblems(seen, t.requests.slice(mark), t.server.requests.slice(servedMark), scriptPath);
			assert.ok(problems.some((p) => p === "the server answered its script"), `${scriptPath}: ${JSON.stringify(problems)}`);
			assert.ok(problems.some((p) => p.startsWith("the monitor saw its script requested and not blocked")), `${scriptPath}: ${JSON.stringify(problems)}`);
			if (expected.message) assert.ok(problems.some((p) => p.startsWith("the page saw the worker made")));
			else assert.ok(!problems.some((p) => p.startsWith("the page saw the worker made")), "an error event and no message is the page's refusal, judged by the witnesses beside it");
		}
	} finally {
		await t?.close();
		planted.remove();
	}
});

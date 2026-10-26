#!/usr/bin/env node
// smoke-run - the gate's smoke run against a host (docs/ARCHITECTURE-TARGET.md section 8, The deploy's checks):
// headless Chrome opens the page at an origin, with the containment monitor watching every request from before
// navigation; the tester composes with no problem, a key and a click are each delivered and named, and the
// page requested the entry first, then each file it loads from the release once, and nothing after. It, and every
// module it imports, loads nothing at import time, so the deploy that runs it needs no prior build
// (test/tools/deploy-imports.test.js).
//
// Usage:  node tools/smoke-run.mjs ORIGIN RELEASE_DIR    (e.g. https://input-lab.apnex.io release/)
import path from "node:path";
import { fileURLToPath } from "node:url";

import { launchChrome, sleep } from "../test/browser/chrome-driver.js";
import { containmentProblems, filesThePageLoads } from "../test/support/containment.js";
import { watchRequests } from "../test/browser/request-monitor.js";

/** Runs the smoke run against `origin` for the release extracted at `releaseDir`; answers its problems, empty when it passed. */
export async function smokeRunAt(origin, releaseDir) {
	const problems = [];
	const chrome = await launchChrome();
	try {
		const requests = watchRequests(chrome);
		await chrome.send("Network.enable");
		await chrome.send("Network.setCacheDisabled", { cacheDisabled: true });
		await chrome.send("Page.enable");
		await chrome.send("Page.navigate", { url: `${origin}/` });
		for (let i = 0; i < 400 && !(await chrome.evaluate("globalThis.inputTester !== undefined").catch(() => false)); i++) await sleep(25);
		if (!(await chrome.evaluate("globalThis.inputTester !== undefined").catch(() => false))) return [`${origin}: the tester did not compose`];
		problems.push(...(await chrome.evaluate("JSON.stringify(inputTester.problems)").then(JSON.parse)).map((p) => `${origin}: ${p}`));
		await chrome.send("Input.dispatchKeyEvent", { type: "keyDown", key: "a", code: "KeyA", text: "a", windowsVirtualKeyCode: 65 });
		await chrome.send("Input.dispatchKeyEvent", { type: "keyUp", key: "a", code: "KeyA", windowsVirtualKeyCode: 65 });
		await chrome.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 200, y: 150, button: "none", buttons: 0 });
		await chrome.send("Input.dispatchMouseEvent", { type: "mousePressed", x: 200, y: 150, button: "left", buttons: 1, clickCount: 1 });
		await chrome.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: 200, y: 150, button: "left", buttons: 0, clickCount: 1 });
		await sleep(500);
		const hits = JSON.parse(await chrome.evaluate("JSON.stringify(inputTester.picture.log.flatMap((l) => l.hits))"));
		for (const row of ["key-first-press", "key-release", "button-0-press", "button-0-release", "button-0-click"]) if (!hits.includes(row)) problems.push(`${origin}: the row ${row} was not named`);
		problems.push(...containmentProblems(requests, { origin: new URL(origin).origin, loads: filesThePageLoads(releaseDir) }).map((p) => `${origin}: ${p}`));
	} finally {
		await chrome.close();
	}
	return problems;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const [origin, releaseDir] = process.argv.slice(2);
	if (!origin || !releaseDir) {
		console.log("usage: node tools/smoke-run.mjs ORIGIN RELEASE_DIR");
		process.exit(2);
	}
	const problems = await smokeRunAt(origin.replace(/\/$/, ""), path.resolve(releaseDir));
	for (const p of problems) console.log(`  ${p}`);
	console.log(problems.length ? `smoke-run: FAIL -- ${problems.length} problem(s)` : `smoke-run: PASS -- ${origin} composed, named a key and a click, and requested only the release's files, each once`);
	process.exit(problems.length ? 1 : 0);
}

// gate-checks - every check the gate runs can fail (docs/ARCHITECTURE-TARGET.md sections 4 and 8): the source
// check (GT1), the vocabulary check (GT7), the backlog check (GT4), the public-text check and the vendoring check
// (GT3) each pass over this repository and fail over a copy, or a text, holding what it exists to refuse.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import { findConfigProblems, findSourceProblems } from "../../tools/check-source.mjs";
import { candidateWords, findVocabulary, readVocabulary } from "../../tools/check-vocabulary.mjs";
import { backlogProblems, pinnedVersions, versionAtLeast } from "../../tools/check-backlog.mjs";
import { findHexIdentifiers } from "../../tools/check-public-text.mjs";
import { SHARED_PARTS, vendorProblems } from "../../tools/vendor-parts.mjs";
import { repositoryRoot } from "../support/built-site.js";

const run = (tool, ...args) => spawnSync(process.execPath, [path.join(repositoryRoot, "tools", tool), ...args], { encoding: "utf8", cwd: repositoryRoot });

test("GT1: the source check passes over src and tsconfig.json", () => {
	const r = run("check-source.mjs");
	assert.equal(r.status, 0, r.stdout);
});

test("GT1: the source check refuses every network interface, navigation, storage, clock, timer, chance, dynamic import, element made or written outside the scene, and ambient declaration", () => {
	const refused = [
		"fetch('/k?' + key);",
		"new XMLHttpRequest();",
		"new WebSocket('wss://x');",
		"new EventSource('/e');",
		"navigator.sendBeacon('/b', key);",
		"navigator.clipboard.writeText(key);",
		"location.href = '/?k=' + key;",
		"document.location.assign('/x');",
		"history.pushState(null, '', '?k=' + key);",
		"localStorage.setItem('k', key);",
		"sessionStorage.k = key;",
		"document.cookie = key;",
		"indexedDB.open('k');",
		"const t = Date.now();",
		"const t = performance.now();",
		"setTimeout(() => {}, 1);",
		"requestAnimationFrame(() => {});",
		"queueMicrotask(() => {});",
		"const r = Math.random();",
		"import('/leak.js');",
		"eval('1');",
		"new Function('return 1');",
		"document.createElement('script');",
		"document.createElementNS('http://www.w3.org/2000/svg', 'image');",
		"svg.innerHTML = '<image href=x>';",
		"svg.appendChild(node);",
		"svg.setAttribute('style', 'fill: red');",
		"svg.style.fill = 'red';",
		"svg.classList.add('lit');",
		"svg.textContent = key;",
		"window['fetch']('/k');",
		"globalThis[name]('/k');",
		"new Image().src = '/k';",
		"window.open('/k');",
		"declare global { interface Window { k: string } }",
		"/// <reference lib=\"webworker\" />",
	];
	for (const line of refused) assert.ok(findSourceProblems(`export {};\n${line}\n`).length > 0, `refused: ${line}`);
	const passed = ["const before = details.get(code);", "scene.put('keys', 'k', []);", "const opened = openCapture(declaration);", "document.getElementById('input-surface');", "const u = document.URL;", "browser.keyboard?.getLayoutMap();", "navigator.userAgentData;", "const fetchCount = 1;", "type Clock = { now: number };"];
	for (const line of passed) assert.deepEqual(findSourceProblems(`export {};\n${line}\n`), [], `passed: ${line}`);
});

test("GT1: the source check fails a tsconfig.json that compiles more than src, or with other libraries", () => {
	assert.deepEqual(findConfigProblems(JSON.parse(fs.readFileSync(path.join(repositoryRoot, "tsconfig.json"), "utf8"))), []);
	assert.equal(findConfigProblems({ compilerOptions: { lib: ["ES2022", "DOM", "WebWorker"], types: [] }, include: ["src"] }).length, 1);
	assert.equal(findConfigProblems({ compilerOptions: { lib: ["ES2022", "DOM"], types: [] }, include: ["src", "test"] }).length, 1);
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "input-tester-source-"));
	try {
		fs.writeFileSync(path.join(dir, "leak.ts"), "export const k = fetch('/k');\n");
		const r = run("check-source.mjs", dir);
		assert.equal(r.status, 1);
		assert.match(r.stdout, /names fetch/);
	} finally {
		fs.rmSync(dir, { recursive: true, force: true });
	}
});

test("GT7: the vocabulary check passes over the tester's own words, and fails on another application's word in code, a string or a comment, plural or joined", () => {
	const r = run("check-vocabulary.mjs");
	assert.equal(r.status, 0, r.stdout);
	const vocabulary = readVocabulary();
	const caught = (text) => findVocabulary(text, vocabulary).map((f) => f.listed);
	assert.deepEqual(caught("// the key layout"), ["layout"]);
	assert.deepEqual(caught('const s = "Nodes";'), ["node"]);
	assert.deepEqual(caught("const anchorPoint = 1;"), ["anchor"]);
	assert.deepEqual(caught("export const drawV2 = 1;"), ["drawv2"]);
	assert.deepEqual(caught("let zone2 = 0;"), ["zone"]);
	assert.deepEqual(caught("width=device-width"), ["device"]);
	assert.deepEqual(caught("const route = keys.map(press);"), []);
	assert.deepEqual(candidateWords("draw_V2"), ["draw_v2", "drawv2", "draw", "v", "2"]);
	assert.deepEqual(caught("keyboard.getLayoutMap()"), [], "the platform's own name, allowed by its exact text");
	assert.deepEqual(caught("const layoutMap = keyboard.getLayoutMap();"), ["layout"], "the allowance is the exact text, never the word");
	assert.deepEqual(caught('<link rel="stylesheet" href="x.css">'), [], "the stylesheet's element, allowed by its exact text");
	assert.deepEqual(caught('<link rel="prefetch" href="x">'), ["link"], "any other use of the word refused");
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "input-tester-vocabulary-"));
	try {
		fs.writeFileSync(path.join(dir, "a.ts"), "// snaps to a waypoint\nexport const a = 1;\n");
		const failed = run("check-vocabulary.mjs", dir);
		assert.equal(failed.status, 1);
		assert.match(failed.stdout, /waypoint/);
	} finally {
		fs.rmSync(dir, { recursive: true, force: true });
	}
});

test("GT4: the backlog check passes over docs/BACKLOG.md, and fails an open workaround while the release named to retire it is installed, a workaround naming no release, and a deferral with no revival trigger", () => {
	const r = run("check-backlog.mjs");
	assert.equal(r.status, 0, r.stdout);
	const pinned = pinnedVersions();
	assert.deepEqual(pinned, { "input-capture": "0.2.0", "input-binding": "0.2.0", "vector-scene": "0.2.0", "snap-grid": "0.1.1" });
	const table = (row) => `## Workarounds\n\n| id | workaround | evidence | retired by | state |\n|---|---|---|---|---|\n${row}\n`;
	assert.match(backlogProblems(table("| W1 | a second hit test | `src/x.ts:1` | `vector-scene` `0.2.0` | open |"), pinned).join(), /open while `vector-scene` 0\.2\.0, at or beyond the 0\.2\.0 named to retire it, is installed/);
	assert.match(backlogProblems(table("| W1 | a second hit test | `src/x.ts:1` | `vector-scene` `0.1.5` | open |"), pinned).join(), /GT4/);
	assert.deepEqual(backlogProblems(table("| W1 | a second hit test | `src/x.ts:1` | `vector-scene` `0.3.0` | open |"), pinned), [], "open while its retiring release is not yet installed");
	assert.deepEqual(backlogProblems(table("| W1 | a second hit test | `src/x.ts:1` | `vector-scene` `0.2.0` | retired |"), pinned), []);
	assert.match(backlogProblems(table("| W1 | a second hit test | `src/x.ts:1` | a later release | open |"), pinned).join(), /names no shared part and release/);
	assert.match(backlogProblems("| id | finding | evidence | revival trigger |\n|---|---|---|---|\n| B1 | x | `y` | later |\n", pinned).join(), /B1 has no revival trigger/);
	assert.match(backlogProblems("| id | finding | evidence | revival trigger |\n|---|---|---|---|\n| B1 | x | `y` |  |\n", pinned).join(), /B1 has no revival trigger/);
	assert.equal(versionAtLeast("0.10.0", "0.9.9"), true);
	assert.equal(versionAtLeast("0.2.0", "0.2.1"), false);
});

test("the public-text check passes over the repository and its commit messages, and finds a run of sixteen or more hex digits", () => {
	const r = run("check-public-text.mjs");
	assert.equal(r.status, 0, r.stdout);
	// the runs are made at run time, so this file holds none itself
	assert.equal(findHexIdentifiers(`id ${"0123456789abcde"}${"f"} here`).length, 1);
	assert.equal(findHexIdentifiers(`id ${"0123456789"}${"ABCDEF0123"} here`).length, 1);
	assert.equal(findHexIdentifiers("id 0123456789abcde here").length, 0, "fifteen is not an identifier's shape");
	assert.equal(findHexIdentifiers("deadbeef deadbeef").length, 0);
});

test("GT3 at build: the vendoring check passes, and fails vendor/ with a byte changed, a file added or a file missing", () => {
	const r = run("vendor-parts.mjs", "--check");
	assert.equal(r.status, 0, r.stdout);
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "input-tester-vendor-"));
	try {
		for (const f of ["package.json", "package-lock.json"]) fs.copyFileSync(path.join(repositoryRoot, f), path.join(dir, f));
		fs.mkdirSync(path.join(dir, "node_modules"));
		fs.symlinkSync(path.join(repositoryRoot, "node_modules", "@apnex"), path.join(dir, "node_modules", "@apnex"));
		fs.cpSync(path.join(repositoryRoot, "vendor"), path.join(dir, "vendor"), { recursive: true });
		assert.deepEqual(vendorProblems(dir), []);
		const victim = path.join(dir, "vendor", "input-binding", "gesture-session.js");
		fs.appendFileSync(victim, " ");
		assert.match(vendorProblems(dir).join(), /vendor\/input-binding\/gesture-session\.js differs/);
		fs.rmSync(victim);
		assert.match(vendorProblems(dir).join(), /gesture-session\.js is missing/);
		fs.writeFileSync(path.join(dir, "vendor", "snap-grid", "extra.js"), "");
		assert.match(vendorProblems(dir).join(), /extra\.js is no file of the release/);
		assert.deepEqual(SHARED_PARTS, ["input-capture", "input-binding", "vector-scene", "snap-grid"]);
	} finally {
		fs.rmSync(dir, { recursive: true, force: true });
	}
});

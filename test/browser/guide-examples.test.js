// guide-examples - every code example in docs/GUIDE.md is run by the gate (docs/ARCHITECTURE-TARGET.md section
// 8, Teachability; IT-D6): each `js` block as a module beside the tester's own in a copy of the release's `app`
// folder, loaded by a page in headless Chrome under the very browser rule the tester's page is served with, and
// required to run to its end with no exception; each `mjs` block as a module in the gate's own runtime, its
// `inChrome` export, when it has one, handed a protocol session on the tester's page; and each `json` block's
// dependencies held equal to package.json's.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { after, before, test } from "node:test";
import { setTimeout as sleep } from "node:timers/promises";
import { pathToFileURL } from "node:url";

import { connectToPage, launchChrome, scratchFolder } from "@apnex/test-harness";

import { serveSite } from "./site-server.js";
import { openTesterInChrome } from "./tester-in-chrome.js";
import { releaseFolder, repositoryRoot, siteRoot } from "../support/built-site.js";

const guide = fs.readFileSync(path.join(repositoryRoot, "docs", "GUIDE.md"), "utf8");
const blocks = [...guide.matchAll(/^```(js|mjs|json)\n([\s\S]*?)^```$/gm)].map((m, i) => ({ index: i + 1, language: m[1], code: m[2], line: guide.slice(0, m.index).split("\n").length + 1 }));
const scratch = scratchFolder("input-tester-guide-");
let server;
let browser;
let chrome;

before(async () => {
	fs.cpSync(siteRoot, scratch, { recursive: true });
	for (const b of blocks.filter((x) => x.language === "js")) {
		fs.writeFileSync(path.join(scratch, releaseFolder, "app", `guide-example-${b.index}.js`), `${b.code}\nglobalThis.exampleFinished = true;\n`);
		fs.writeFileSync(path.join(scratch, `guide-example-${b.index}.html`), `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><title>example ${b.index}</title><link rel="stylesheet" href="${releaseFolder}/input-tester.css"></head>\n<body><svg id="example-surface" width="400" height="300" viewBox="0 0 400 300"></svg>\n<script type="module" src="${releaseFolder}/app/guide-example-${b.index}.js"></script></body></html>\n`);
	}
	server = await serveSite(scratch);
	browser = await launchChrome({ args: ["--window-size=1600,1000"] });
	chrome = await connectToPage(browser.port);
	await chrome.send("Runtime.enable");
	await chrome.send("Page.enable");
}, { timeout: 60000 });

after(async () => {
	try {
		chrome?.close();
		await browser?.close();
		await server?.close();
	} finally {
		fs.rmSync(scratch, { recursive: true, force: true });
	}
}, { timeout: 30000 });

test("the guide holds code examples of every kind the gate runs", () => {
	assert.ok(blocks.filter((b) => b.language === "js").length >= 6, `${blocks.length} blocks`);
	assert.ok(blocks.some((b) => b.language === "mjs") && blocks.some((b) => b.language === "json"));
	assert.equal([...guide.matchAll(/^```/gm)].length, blocks.length * 2, "every fenced block is one the gate runs");
});

for (const b of blocks) {
	test(`docs/GUIDE.md example ${b.index}, a ${b.language} block at line ${b.line}, runs to its end`, { timeout: 60000 }, async () => {
		if (b.language === "json") {
			const parsed = JSON.parse(`{${b.code}}`);
			const pkg = JSON.parse(fs.readFileSync(path.join(repositoryRoot, "package.json"), "utf8"));
			assert.deepEqual(parsed.dependencies, pkg.dependencies, "the guide's dependencies are package.json's");
			return;
		}
		if (b.language === "mjs") {
			const dir = path.join(repositoryRoot, ".gate", "guide");
			fs.mkdirSync(dir, { recursive: true });
			const file = path.join(dir, `example-${b.index}.mjs`);
			fs.writeFileSync(file, b.code);
			const example = await import(pathToFileURL(file).href);
			if (typeof example.inChrome === "function") {
				const t = await openTesterInChrome({ siteDir: siteRoot });
				try {
					await example.inChrome(t.chrome.send, t.keyCentre("KeyG"));
				} finally {
					await t.close();
				}
			}
			return;
		}
		const thrown = [];
		const off = chrome.on("Runtime.exceptionThrown", (p) => thrown.push(p.exceptionDetails.exception?.description ?? p.exceptionDetails.text));
		try {
			await chrome.send("Page.navigate", { url: `${server.origin}/guide-example-${b.index}.html` });
			let finished = false;
			for (let i = 0; i < 200 && !finished && thrown.length === 0; i++) {
				await sleep(25);
				finished = await chrome.evaluate("globalThis.exampleFinished === true").catch(() => false);
			}
			assert.deepEqual(thrown, [], `example ${b.index} threw`);
			assert.equal(finished, true, `example ${b.index} ran to its end`);
		} finally {
			off();
		}
	});
}

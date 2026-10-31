// deploy-sequence - the deploy, step by step, against local copies of the two buckets (docs/ARCHITECTURE-TARGET.md
// sections 8 and 9, IT-D10, IT-D11): tools/deploy's own steps (tools/deploy-steps.mjs) copy a second release, built
// from a planted difference in the source, over a first, and the page is loaded from the bucket each step wrote, as
// that step leaves it, between every pair of steps -- each load whole: every response's bytes those the manifest
// of the release whose entry was served names, every file present -- and at the end the first release's objects
// are byte for byte as they were. The entry is the one object a deploy replaces, so a rollback, the first release
// deployed again, switches it back. The deploy refuses an object at a release's path with other bytes, and stops
// at a check that fails -- wrong bytes, a wrong Cache-Control, a wrong content type, a stale entry, a missing
// object's 404 without the rule, the edge cache on, a failed smoke run -- before the entry, or production, is
// written.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { after, before, test } from "node:test";
import { setTimeout as sleep } from "node:timers/promises";

import { connectToPage, launchChrome, scratchFolder } from "@apnex/test-harness";

import { readRelease, runDeploy, sha256 } from "../../tools/deploy-steps.mjs";
import { siteRoot } from "../support/built-site.js";
import { buildPlantedRelease, localBucket, localHost, localStorage, manifestMap, serveBucket } from "../support/local-buckets.js";
import { readResponseHeaders, serveSite } from "./site-server.js";

const TEST = { timeout: 300000 };
const rule = readResponseHeaders();
const scratch = scratchFolder("input-tester-deploy-");
let releaseA;
let releaseB;
let browser;
let chrome;

/**
 * Loads the page from an origin with nothing cached, and answers what made it whole or not: the release whose entry
 * was served, every response's path and whether its bytes are that release's, the responses that were no 200, and
 * whether the tester composed.
 */
async function loadWhole(origin) {
	const responses = new Map();
	const finished = [];
	const off = [
		chrome.on("Network.responseReceived", (p) => responses.set(p.requestId, { url: p.response.url, status: p.response.status })),
		chrome.on("Network.loadingFinished", (p) => finished.push(p.requestId)),
	];
	try {
		await chrome.send("Page.navigate", { url: `${origin}/` });
		let composed = false;
		for (let i = 0; i < 200 && !composed; i++) {
			composed = await chrome.evaluate("globalThis.inputTester !== undefined && inputTester.problems.length === 0").catch(() => false);
			if (!composed) await sleep(10);
		}
		await sleep(30);
		const bodies = [];
		for (const id of finished) {
			const r = responses.get(id);
			if (!r) continue;
			const { body, base64Encoded } = await chrome.send("Network.getResponseBody", { requestId: id });
			const rel = new URL(r.url).pathname.slice(1) || "index.html";
			bodies.push({ rel, status: r.status, sha256: sha256(Buffer.from(body, base64Encoded ? "base64" : "utf8")) });
		}
		const entry = bodies.find((b) => b.rel === "index.html");
		const served = [releaseA, releaseB].find((r) => entry && manifestMap(r).get("index.html") === entry.sha256) ?? null;
		const wrong = served === null ? bodies.map((b) => b.rel) : bodies.filter((b) => manifestMap(served).get(b.rel) !== b.sha256).map((b) => b.rel);
		return { composed, served: served?.folder ?? null, wrong, missing: [...responses.values()].filter((r) => r.status !== 200).map((r) => `${r.url} ${r.status}`), files: bodies.length };
	} finally {
		for (const stop of off) stop();
	}
}

before(async () => {
	releaseA = readRelease(siteRoot);
	releaseB = readRelease(buildPlantedRelease(scratch, path.join(scratch, "release-b")));
	browser = await launchChrome({ args: ["--window-size=1600,1000"] });
	chrome = await connectToPage(browser.port);
	await chrome.send("Network.enable");
	await chrome.send("Network.setCacheDisabled", { cacheDisabled: true });
	await chrome.send("Page.enable");
}, { timeout: 120000 });

after(async () => {
	try {
		chrome?.close();
		await browser?.close();
	} finally {
		fs.rmSync(scratch, { recursive: true, force: true });
	}
}, { timeout: 30000 });

/** Two buckets, served as their backends serve them, and the deploy's targets and storage over them. */
async function twoBuckets(tag) {
	const lab = localBucket(path.join(scratch, `lab-${tag}`), `gs://lab-${tag}`);
	const prod = localBucket(path.join(scratch, `prod-${tag}`), `gs://prod-${tag}`);
	const servers = { "lab.test": await serveBucket(lab), "prod.test": await serveBucket(prod) };
	const targets = [{ name: "lab", bucket: lab.bucket, host: "lab.test", backend: "lab-backend" }, { name: "production", bucket: prod.bucket, host: "prod.test", backend: "prod-backend" }];
	return { lab, prod, servers, targets, storage: localStorage([lab, prod]), close: async () => Promise.all(Object.values(servers).map((s) => s.close())) };
}

const passing = { edgeCacheOn: async () => false, smokeRun: async () => [] };

/** Every object of a release's folder in a bucket, byte for byte as the release names it. */
function folderUnchanged(bucket, release) {
	return release.files.filter((f) => !bucket.has(f.name) || sha256(bucket.bytes(f.name)) !== f.sha256).map((f) => f.name);
}

test("a second release, built from a planted difference, deployed over a first, the page loaded from the bucket each step wrote between every pair of steps: every load whole, every response's bytes the served release's; the first release's objects unchanged; a rollback switches the entry back", TEST, async (ctx) => {
	assert.notEqual(manifestMap(releaseA).get("index.html"), undefined);
	assert.notEqual(releaseA.manifest.toString(), releaseB.manifest.toString().replaceAll(releaseB.folder, releaseA.folder), "the second release's files differ from the first's beyond its folder's name");
	const b = await twoBuckets("sequence");
	try {
		await runDeploy({ release: releaseA, targets: b.targets, storage: b.storage, host: localHost(b.servers), rule, ...passing });
		const first = await loadWhole(b.servers["prod.test"].origin);
		assert.deepEqual([first.composed, first.served, first.wrong, first.missing], [true, releaseA.folder, [], []]);
		const entryCopied = new Set();
		let loads = 0;
		const log = [];
		await runDeploy({
			release: releaseB,
			targets: b.targets,
			storage: b.storage,
			host: localHost(b.servers),
			rule,
			...passing,
			log: (line) => log.push(line),
			between: async (step) => {
				if (step.kind === "copy-entry") entryCopied.add(step.target.name);
				const load = await loadWhole(b.servers[step.target.host].origin);
				loads++;
				const where = `after ${step.kind} ${step.name ?? ""} at ${step.target.name}`;
				assert.equal(load.composed, true, `${where}: the tester composed`);
				assert.deepEqual(load.missing, [], `${where}: every request answered`);
				assert.equal(load.served, entryCopied.has(step.target.name) ? releaseB.folder : releaseA.folder, `${where}: the entry served`);
				assert.deepEqual(load.wrong, [], `${where}: every response's bytes are those ${load.served}'s manifest names`);
			},
		});
		ctx.diagnostic(`${loads} loads, one after every step, each checked byte for byte against the manifest of the release it served`);
		assert.equal(loads, 2 * (releaseB.files.length + 3));
		assert.ok(log.some((l) => /copied the entry, index\.html, replacing generation 1/.test(l)), "the entry replaced, under the generation read before");
		for (const bucket of [b.lab, b.prod]) {
			assert.deepEqual(folderUnchanged(bucket, releaseA), [], `${bucket.bucket}: the first release's objects byte for byte as they were`);
			assert.equal(bucket.metadata("index.html").cacheControl, "no-store");
			assert.equal(bucket.metadata(`${releaseB.folder}/app/page-entry.js`).cacheControl, "public, max-age=31536000, immutable");
			assert.equal(bucket.metadata(`${releaseB.folder}/app/page-entry.js`).contentType, "text/javascript; charset=utf-8");
		}
		const rollbackLog = [];
		await runDeploy({ release: releaseA, targets: b.targets, storage: b.storage, host: localHost(b.servers), rule, ...passing, log: (line) => rollbackLog.push(line) });
		assert.equal(rollbackLog.filter((l) => /skipped .*, already present with the same bytes/.test(l)).length, 2 * releaseA.files.length, "the rollback copied no folder object, and said so");
		for (const origin of [b.servers["lab.test"].origin, b.servers["prod.test"].origin]) {
			const rolledBack = await loadWhole(origin);
			assert.deepEqual([rolledBack.composed, rolledBack.served, rolledBack.wrong, rolledBack.missing], [true, releaseA.folder, [], []], "the rollback: the first release's entry copied again over its present folder");
		}
		assert.equal(b.lab.metadata("index.html").generation, 3, "the entry written three times: the first release, the second, the first again");
	} finally {
		await b.close();
	}
});

test("an object at a release's path with other bytes is refused, never replaced, and no later step is done", TEST, async () => {
	const b = await twoBuckets("refusal");
	try {
		const victim = releaseB.files[3].name;
		b.lab.write(victim, Buffer.from("other bytes"), { cacheControl: rule.cacheControl.folder, contentType: "text/plain" });
		await assert.rejects(runDeploy({ release: releaseB, targets: b.targets, storage: b.storage, host: localHost(b.servers), rule, ...passing }), /exists with other bytes, and a release's object is never replaced/);
		assert.equal(b.lab.bytes(victim).toString(), "other bytes");
		assert.equal(b.lab.has("index.html"), false, "the entry never copied");
		assert.deepEqual(fs.readdirSync(b.prod.dir), [], "production untouched");
	} finally {
		await b.close();
	}
});

test("a check that fails through the lab's host stops the deploy before the lab's entry is written, and production is untouched: wrong bytes, a wrong Cache-Control, a wrong content type, a header missing", TEST, async () => {
	const object = `${releaseB.folder}/app/input-router.js`;
	for (const [what, tamper, pattern] of [
		["wrong bytes", { body: "not the release's" }, /input-router\.js: its bytes through the host are not the release's/],
		["a wrong Cache-Control", { cacheControl: "no-cache" }, /input-router\.js: Cache-Control is "no-cache"/],
		["a wrong content type", { contentType: "text/plain; charset=utf-8" }, /input-router\.js: Content-Type is "text\/plain; charset=utf-8", not "text\/javascript; charset=utf-8"/],
		["Referrer-Policy missing", { drop: ["Referrer-Policy"] }, /input-router\.js: Referrer-Policy is null, not the rule's "no-referrer"/],
	]) {
		const b = await twoBuckets(what.replace(/\W+/g, "-"));
		try {
			const host = localHost(b.servers, (h, name) => (h === "lab.test" && name === object ? tamper : null));
			await assert.rejects(runDeploy({ release: releaseB, targets: b.targets, storage: b.storage, host, rule, ...passing }), pattern, what);
			assert.equal(b.lab.has("index.html"), false, `${what}: the lab's entry never written`);
			assert.deepEqual(fs.readdirSync(b.prod.dir), [], `${what}: production untouched`);
		} finally {
			await b.close();
		}
	}
});

test("every object is copied with its content type, and the host serves it as stored, so an object stored as plain text fails the check", TEST, async () => {
	const b = await twoBuckets("stored-type");
	try {
		const plain = { ...b.storage, copy: (bucket, rel, file, options) => b.storage.copy(bucket, rel, file, { ...options, contentType: "text/plain; charset=utf-8" }) };
		await assert.rejects(runDeploy({ release: releaseB, targets: b.targets, storage: plain, host: localHost(b.servers), rule, ...passing }), /Content-Type is "text\/plain; charset=utf-8", not "text\/javascript; charset=utf-8"/);
		assert.equal(b.lab.has("index.html"), false);
	} finally {
		await b.close();
	}
});

test("a stale entry through the lab's host, a missing object's 404 without the rule, the edge cache on, or a failed smoke run stops the deploy before production", TEST, async () => {
	for (const [what, overrides, pattern] of [
		["a stale entry", { host: (servers) => localHost(servers, (h, name) => (h === "lab.test" && name === "index.html" ? { body: "an earlier entry" } : null)) }, /index\.html: its bytes through the host are not the release's/],
		["a 404 without the rule", { host: (servers) => localHost(servers, (h, name) => (h === "lab.test" && name.endsWith("no-such-object") ? { drop: ["Content-Security-Policy"] } : null)) }, /no-such-object, which no release holds: Content-Security-Policy is null on its 404/],
		["the edge cache on", { edgeCacheOn: async (backend) => backend === "lab-backend" }, /the backend lab-backend's edge cache is on/],
		["a failed smoke run", { smokeRun: async (host) => (host === "lab.test" ? ["a request that is no file of the release"] : []) }, /a request that is no file of the release/],
	]) {
		const b = await twoBuckets(what.replace(/\W+/g, "-"));
		try {
			const host = overrides.host ? overrides.host(b.servers) : localHost(b.servers);
			await assert.rejects(runDeploy({ release: releaseB, targets: b.targets, storage: b.storage, rule, ...passing, ...overrides, host }), pattern, what);
			assert.deepEqual(fs.readdirSync(b.prod.dir), [], `${what}: production untouched`);
		} finally {
			await b.close();
		}
	}
});

test("production's folder is checked through its own host before its entry is written", TEST, async () => {
	const b = await twoBuckets("production-folder");
	try {
		const host = localHost(b.servers, (h, name) => (h === "prod.test" && name === `${releaseB.folder}/input-tester.css` ? { body: "a body production's host mangled" } : null));
		await assert.rejects(runDeploy({ release: releaseB, targets: b.targets, storage: b.storage, host, rule, ...passing }), /production's checks through prod\.test failed[\s\S]*input-tester\.css: its bytes through the host are not the release's/);
		assert.equal(b.lab.has("index.html"), true, "the lab deployed whole");
		assert.equal(b.prod.has("index.html"), false, "production's entry never written");
	} finally {
		await b.close();
	}
});

test("the deploy's smoke run passes against the site as its backend serves it, and fails a planted leak", TEST, async () => {
	const { smokeRunAt } = await import("../../tools/smoke-run.mjs");
	const { DELIVERY_OPENS, plantedSite } = await import("../support/planted-site.js");
	const server = await serveSite(siteRoot);
	try {
		assert.deepEqual(await smokeRunAt(server.origin, siteRoot), []);
	} finally {
		await server.close();
	}
	const planted = plantedSite([{ file: "app/composition-root.js", find: DELIVERY_OPENS, replace: `${DELIVERY_OPENS}\n        if (fact.type === "key-down") { new Image().src = "/leak.png?k=" + fact.key; }` }]);
	const leaky = await serveSite(planted.dir);
	try {
		const problems = await smokeRunAt(leaky.origin, planted.dir);
		assert.ok(problems.some((p) => p.includes("leak.png?k=a")), JSON.stringify(problems));
	} finally {
		await leaky.close();
		planted.remove();
	}
});

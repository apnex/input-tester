// deploy-sequence - the deploy, step by step, against local copies of the two buckets (docs/ARCHITECTURE-TARGET.md
// sections 8 and 9, IT-D10, IT-D11): tools/deploy's own steps (tools/deploy-steps.mjs) copy a second release over
// a first, and the page is loaded from the bucket each step wrote, as that step leaves it, between every pair of
// steps -- each load whole, one release's files only, every file it names present. A differing object at a
// release's path is refused and nothing after it done; a header missing at the lab stops the deploy before
// production; no step deletes, so an earlier entry still finds every file it names; and a rollback is the earlier
// release deployed again, its folder found present and its entry copied.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { after, before, test } from "node:test";

import { readRelease, runDeploy } from "../../tools/deploy-steps.mjs";
import { repositoryRoot, siteRoot } from "../support/built-site.js";
import { filesThePageLoads } from "../support/containment.js";
import { launchChrome, sleep } from "./chrome-driver.js";
import { readResponseHeaders, serveSite } from "./site-server.js";

const TEST = { timeout: 300000 };
const rule = readResponseHeaders();
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "input-tester-deploy-"));
let releaseA;
let releaseB;
let chrome;

/** A local copy of a bucket: a directory of objects, each object's metadata in a sidecar the server reads. */
function localBucket(name) {
	const dir = path.join(scratch, name);
	fs.mkdirSync(dir, { recursive: true });
	const metadataFile = path.join(scratch, `${name}.metadata.json`);
	fs.writeFileSync(metadataFile, "{}");
	return {
		dir,
		bucket: `gs://${name}`,
		metadata: (rel) => JSON.parse(fs.readFileSync(metadataFile, "utf8"))[rel] ?? null,
		write(rel, bytes, meta) {
			fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
			fs.writeFileSync(path.join(dir, rel), bytes);
			const all = JSON.parse(fs.readFileSync(metadataFile, "utf8"));
			all[rel] = meta;
			fs.writeFileSync(metadataFile, JSON.stringify(all));
		},
	};
}

/** Storage over local buckets, as tools/deploy's is over gcloud: an object's bytes or null, and a copy with its metadata. */
function localStorage(buckets) {
	const byName = new Map(buckets.map((b) => [b.bucket, b]));
	return {
		read: async (bucket, rel) => (fs.existsSync(path.join(byName.get(bucket).dir, rel)) ? fs.readFileSync(path.join(byName.get(bucket).dir, rel)) : null),
		copy: async (bucket, rel, file, { cacheControl, contentType }) => byName.get(bucket).write(rel, fs.readFileSync(file), { cacheControl, contentType }),
	};
}

/** A host over a local server: each response's status, headers by lower-case name, and bytes. */
function localHost(servers, strip = {}) {
	return {
		async get(host, name) {
			const response = await fetch(`${servers[host].origin}/${name === "index.html" ? "" : name}`);
			const headers = Object.fromEntries([...response.headers].map(([k, v]) => [k.toLowerCase(), v]));
			for (const header of strip[host] ?? []) delete headers[header.toLowerCase()];
			return { status: response.status, headers, body: Buffer.from(await response.arrayBuffer()) };
		},
	};
}

/** Loads the page from an origin with nothing cached, and answers what made it whole or not: every request's folder and status, and whether the tester composed. */
async function loadWhole(origin) {
	const requests = [];
	const byId = new Map();
	const offSent = chrome.on("Network.requestWillBeSent", (p) => {
		const r = { url: p.request.url, status: null };
		byId.set(p.requestId, r);
		requests.push(r);
	});
	const offReceived = chrome.on("Network.responseReceived", (p) => {
		const r = byId.get(p.requestId);
		if (r) r.status = p.response.status;
	});
	try {
		await chrome.send("Page.navigate", { url: `${origin}/` });
		let composed = false;
		for (let i = 0; i < 200 && !composed; i++) {
			composed = await chrome.evaluate("globalThis.inputTester !== undefined && inputTester.problems.length === 0").catch(() => false);
			if (!composed) await sleep(10);
		}
		await sleep(30);
		const entry = requests[0];
		const files = requests.slice(1).map((r) => new URL(r.url).pathname.slice(1));
		const folders = [...new Set(files.map((f) => f.split("/")[0]))];
		return { entryStatus: entry?.status ?? null, composed, folders, missing: requests.filter((r) => r.status !== 200).map((r) => `${r.url} ${r.status}`), files };
	} finally {
		offSent();
		offReceived();
	}
}

before(async () => {
	execFileSync(process.execPath, [path.join(repositoryRoot, "tools", "build-site.mjs"), "--out", path.join(scratch, "release-b"), "--folder", "v0.1.1"], { stdio: "ignore" });
	releaseA = readRelease(siteRoot);
	releaseB = readRelease(path.join(scratch, "release-b"));
	chrome = await launchChrome();
	await chrome.send("Network.enable");
	await chrome.send("Network.setCacheDisabled", { cacheDisabled: true });
	await chrome.send("Page.enable");
}, { timeout: 120000 });

after(async () => {
	try {
		await chrome?.close();
	} finally {
		fs.rmSync(scratch, { recursive: true, force: true });
	}
}, { timeout: 30000 });

/** Two buckets, served as their backends serve them, and the deploy's targets over them. */
async function twoBuckets(tag) {
	const lab = localBucket(`lab-${tag}`);
	const prod = localBucket(`prod-${tag}`);
	const servers = { "lab.test": await serveSite(lab.dir, { metadata: lab.metadata }), "prod.test": await serveSite(prod.dir, { metadata: prod.metadata }) };
	const targets = [{ name: "lab", bucket: lab.bucket, host: "lab.test", backend: "lab-backend" }, { name: "production", bucket: prod.bucket, host: "prod.test", backend: "prod-backend" }];
	return { lab, prod, servers, targets, storage: localStorage([lab, prod]), close: async () => Promise.all(Object.values(servers).map((s) => s.close())) };
}

const passing = { edgeCacheOn: async () => false, smokeRun: async () => [] };

test("a second release deployed over a first, the page loaded from the bucket each step wrote between every pair of steps: every load whole, one release's files only, every file present; the first release's folder never deleted; a rollback copies its entry again", TEST, async (ctx) => {
	const b = await twoBuckets("sequence");
	try {
		await runDeploy({ release: releaseA, targets: b.targets, storage: b.storage, host: localHost(b.servers), rule, ...passing });
		const first = await loadWhole(b.servers["prod.test"].origin);
		assert.deepEqual([first.composed, first.folders, first.missing], [true, [releaseA.folder], []]);
		let loads = 0;
		const seen = new Set();
		await runDeploy({
			release: releaseB,
			targets: b.targets,
			storage: b.storage,
			host: localHost(b.servers),
			rule,
			...passing,
			between: async (step) => {
				const load = await loadWhole(b.servers[step.target.host].origin);
				loads++;
				assert.equal(load.composed, true, `after ${step.kind} ${step.name ?? ""} at ${step.target.name}: the tester composed`);
				assert.deepEqual(load.missing, [], `after ${step.kind} ${step.name ?? ""} at ${step.target.name}: every request answered`);
				assert.equal(load.folders.length, 1, `after ${step.kind} ${step.name ?? ""}: one release's files only, not ${JSON.stringify(load.folders)}`);
				seen.add(load.folders[0]);
			},
		});
		ctx.diagnostic(`${loads} loads, one after every step; the releases the loads found: ${[...seen].join(", ")}`);
		assert.equal(loads, 2 * (releaseB.files.length + 3));
		assert.deepEqual([...seen].sort(), [releaseA.folder, releaseB.folder], "the first release's until its entry was replaced, then the second's");
		for (const bucket of [b.lab, b.prod]) {
			for (const f of releaseA.files) assert.ok(fs.existsSync(path.join(bucket.dir, f.name)), `${f.name} kept in ${bucket.bucket}`);
			assert.equal(bucket.metadata("index.html").cacheControl, "no-store");
			assert.equal(bucket.metadata(`${releaseB.folder}/app/page-entry.js`).cacheControl, "public, max-age=31536000, immutable");
		}
		for (const f of filesThePageLoads(siteRoot)) assert.equal((await fetch(`${b.servers["prod.test"].origin}/${f}`)).status, 200, `a tab on the first release's entry still finds ${f}`);
		await runDeploy({ release: releaseA, targets: b.targets, storage: b.storage, host: localHost(b.servers), rule, ...passing });
		const rolledBack = await loadWhole(b.servers["prod.test"].origin);
		assert.deepEqual([rolledBack.composed, rolledBack.folders, rolledBack.missing], [true, [releaseA.folder], []], "the rollback: the first release's entry copied again over its present folder");
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
		assert.equal(fs.readFileSync(path.join(b.lab.dir, victim), "utf8"), "other bytes");
		assert.equal(fs.existsSync(path.join(b.lab.dir, "index.html")), false, "the entry never copied");
		assert.deepEqual(fs.readdirSync(b.prod.dir), [], "production untouched");
	} finally {
		await b.close();
	}
});

test("a header missing at the lab stops the deploy before production; so do the lab's edge cache on and a failed smoke run", TEST, async () => {
	for (const [what, overrides, pattern] of [
		["Referrer-Policy missing", { host: (servers) => localHost(servers, { "lab.test": ["Referrer-Policy"] }) }, /Referrer-Policy is null, not the rule's "no-referrer"/],
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

test("tools/deploy takes its buckets, hosts and backends as arguments or from the environment, and refuses to run without them", async () => {
	const { readOptions } = await import("../../tools/deploy");
	assert.throws(() => readOptions(["release"], {}), /missing labBucket, labHost, labBackend, prodBucket, prodHost, prodBackend/);
	const fromArgs = readOptions(["release", "--lab-bucket", "gs://input-lab-apnex-io", "--lab-host", "input-lab.apnex.io", "--lab-backend", "lab", "--prod-bucket", "gs://input-apnex-io", "--prod-host", "input.apnex.io", "--prod-backend", "prod"], {});
	assert.deepEqual([fromArgs.release, fromArgs.labBucket, fromArgs.prodHost], ["release", "gs://input-lab-apnex-io", "input.apnex.io"]);
	const fromEnv = readOptions(["release"], { LAB_BUCKET: "gs://input-lab-apnex-io", LAB_HOST: "input-lab.apnex.io", LAB_BACKEND: "lab", PROD_BUCKET: "gs://input-apnex-io", PROD_HOST: "input.apnex.io", PROD_BACKEND: "prod" });
	assert.equal(fromEnv.prodBucket, "gs://input-apnex-io");
	assert.throws(() => readOptions(["release", "--lab-bucket", "input-lab", "--lab-host", "h", "--lab-backend", "b", "--lab-only"], {}), /is no gs:\/\/ bucket/);
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

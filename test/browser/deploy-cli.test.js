// deploy-cli - tools/deploy itself, run as an operator runs it, against stand-ins for `gcloud` and `gh` on PATH
// (test/support/fake-cloud/) that behave as the Cloud SDK's documentation and messages give and log every call:
// each call's exact arguments are held -- every folder object copied only where no object is
// (`--if-generation-match=0`), the entry replacing the one there under the generation read just before -- so a
// second release switches the entry and a rollback switches it back; the release is refused unless its manifest is
// the one attached to its tag's GitHub release; an object is taken as missing only on gcloud's `not found: 404.`;
// and the options are read in any order.
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";

import { readRelease } from "../../tools/deploy-steps.mjs";
import { repositoryRoot, siteRoot } from "../support/built-site.js";
import { buildPlantedRelease, localBucket, serveBucket } from "../support/local-buckets.js";

const TEST = { timeout: 300000 };
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "input-tester-deploy-cli-"));
const fakeBin = path.join(repositoryRoot, "test", "support", "fake-cloud");
const state = path.join(scratch, "cloud");
const releases = path.join(scratch, "attached");
const FOLDER_CACHE = "public, max-age=31536000, immutable";
let releaseA;
let releaseB;
let lab;
let prod;
let servers;

/**
 * Runs tools/deploy with the stand-ins first on PATH, without blocking this process, whose servers are the hosts it
 * checks through; answers its exit status, its output and the calls it made.
 */
async function deploy(args, env = {}) {
	const log = path.join(state, "calls.log");
	fs.rmSync(log, { force: true });
	const run = await new Promise((resolve) => {
		execFile(process.execPath, [path.join(repositoryRoot, "tools", "deploy"), ...args], { encoding: "utf8", cwd: repositoryRoot, env: { ...process.env, PATH: `${fakeBin}:${process.env.PATH}`, FAKE_GCS_ROOT: state, FAKE_GH_RELEASES: releases, ...env }, maxBuffer: 64 * 1024 * 1024, timeout: 240000 }, (error, stdout, stderr) => resolve({ status: error ? (error.code ?? 1) : 0, stdout, stderr }));
	});
	const calls = fs.existsSync(log) ? fs.readFileSync(log, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
	return { status: run.status, output: `${run.stdout}${run.stderr}`, calls };
}

/** The gcloud calls a release's folder object makes when no object is there: its generation asked, then a copy only where none is. */
const freshObjectCalls = (release, bucket, name, contentType) => [
	["storage", "objects", "describe", `${bucket}/${name}`, "--format=value(generation)"],
	["storage", "cp", "--if-generation-match=0", `--cache-control=${FOLDER_CACHE}`, `--content-type=${contentType}`, path.join(release.dir, name), `${bucket}/${name}`],
];
const typeOf = (name) => (name.endsWith(".js") ? "text/javascript; charset=utf-8" : name.endsWith(".css") ? "text/css; charset=utf-8" : name.endsWith(".map") ? "application/json; charset=utf-8" : "text/plain; charset=utf-8");

before(async () => {
	releaseA = readRelease(siteRoot);
	releaseB = readRelease(buildPlantedRelease(scratch, path.join(scratch, "release-b")));
	for (const r of [releaseA, releaseB]) {
		fs.mkdirSync(path.join(releases, r.folder), { recursive: true });
		fs.writeFileSync(path.join(releases, r.folder, "SHA256SUMS"), r.manifest);
	}
	lab = localBucket(path.join(state, "buckets", "lab-cli"), "gs://lab-cli");
	prod = localBucket(path.join(state, "buckets", "prod-cli"), "gs://prod-cli");
	servers = { lab: await serveBucket(lab), prod: await serveBucket(prod) };
}, { timeout: 120000 });

after(async () => {
	try {
		await Promise.all(Object.values(servers ?? {}).map((s) => s.close()));
	} finally {
		fs.rmSync(scratch, { recursive: true, force: true });
	}
}, { timeout: 30000 });

test("a first deploy: the manifest checked against the tag's attached SHA256SUMS, then every gcloud call exactly as section 9 lists them, the lab's then production's, the entry last under generation 0", TEST, async () => {
	const run = await deploy([releaseA.dir, "--tag", "v0.1.0", "--lab-bucket", lab.bucket, "--lab-host", servers.lab.origin, "--lab-backend", "lab-be", "--prod-bucket", prod.bucket, "--prod-host", servers.prod.origin, "--prod-backend", "prod-be"]);
	assert.equal(run.status, 0, run.output);
	const [gh, ...gcloud] = run.calls;
	assert.deepEqual(gh.slice(0, 8), ["gh", "release", "download", "v0.1.0", "--repo", "apnex/input-tester", "--pattern", "SHA256SUMS"]);
	assert.equal(gh[8], "--dir");
	const expected = [];
	for (const [bucket, backend] of [[lab.bucket, "lab-be"], [prod.bucket, "prod-be"]]) {
		for (const f of releaseA.files) expected.push(...freshObjectCalls(releaseA, bucket, f.name, typeOf(f.name)));
		expected.push(["storage", "objects", "describe", `${bucket}/index.html`, "--format=value(generation)"]);
		expected.push(["storage", "cp", "--if-generation-match=0", "--cache-control=no-store", "--content-type=text/html; charset=utf-8", path.join(releaseA.dir, "index.html"), `${bucket}/index.html`]);
		expected.push(["compute", "backend-buckets", "describe", backend, "--format=json"]);
	}
	assert.deepEqual(gcloud, expected);
	assert.match(run.output, /deploy: PASS -- v0\.1\.0: 274 step\(s\) done, lab at .* then production at /);
	assert.equal(prod.metadata("index.html").generation, 1);
});

test("a second release, its options in another order: every folder object copied where none is, and the entry replaced under the generation read just before -- the deploy switches the entry", TEST, async () => {
	const run = await deploy(["--lab-only", "--tag", "v0.1.1", "--lab-host", servers.lab.origin, releaseB.dir, "--lab-backend=lab-be", "--lab-bucket", lab.bucket]);
	assert.equal(run.status, 0, run.output);
	const gcloud = run.calls.slice(1);
	assert.deepEqual(gcloud.slice(-4), [
		["storage", "objects", "describe", `${lab.bucket}/index.html`, "--format=value(generation)"],
		["storage", "cat", `${lab.bucket}/index.html`],
		["storage", "cp", "--if-generation-match=1", "--cache-control=no-store", "--content-type=text/html; charset=utf-8", path.join(releaseB.dir, "index.html"), `${lab.bucket}/index.html`],
		["compute", "backend-buckets", "describe", "lab-be", "--format=json"],
	]);
	assert.ok(!gcloud.some((c) => c.includes("--no-clobber")), "no copy is made under --no-clobber, which skips silently");
	assert.ok(lab.bytes("index.html").equals(fs.readFileSync(path.join(releaseB.dir, "index.html"))), "the lab serves the second release's entry");
	assert.equal(lab.metadata("index.html").generation, 2);
	assert.ok(prod.bytes("index.html").equals(fs.readFileSync(path.join(releaseA.dir, "index.html"))), "--lab-only left production on the first");
});

test("a rollback, the first release deployed again: every folder object skipped, and said so; the entry switched back under generation 2", TEST, async () => {
	const run = await deploy([releaseA.dir, "--tag", "v0.1.0", "--lab-only", "--lab-bucket", lab.bucket, "--lab-host", servers.lab.origin, "--lab-backend", "lab-be"]);
	assert.equal(run.status, 0, run.output);
	const gcloud = run.calls.slice(1);
	assert.equal(gcloud.filter((c) => c[1] === "cp").length, 1, "only the entry copied");
	assert.deepEqual(gcloud.find((c) => c[1] === "cp"), ["storage", "cp", "--if-generation-match=2", "--cache-control=no-store", "--content-type=text/html; charset=utf-8", path.join(releaseA.dir, "index.html"), `${lab.bucket}/index.html`]);
	assert.equal(gcloud.filter((c) => c[1] === "cat").length, releaseA.files.length + 1, "each folder object read back to compare its bytes, and the entry");
	assert.equal((run.output.match(/skipped .*, already present with the same bytes/g) ?? []).length, releaseA.files.length);
	assert.ok(lab.bytes("index.html").equals(fs.readFileSync(path.join(releaseA.dir, "index.html"))));
});

test("a release whose manifest is not the SHA256SUMS attached to its tag, or whose folder is not its tag, is refused before any gcloud call", TEST, async () => {
	const wrongTag = await deploy([releaseB.dir, "--tag", "v0.1.0", "--lab-only", "--lab-bucket", lab.bucket, "--lab-host", servers.lab.origin, "--lab-backend", "lab-be"]);
	assert.notEqual(wrongTag.status, 0);
	assert.match(wrongTag.output, /the release's folder is v0\.1\.1, not the tag v0\.1\.0/);
	assert.deepEqual(wrongTag.calls, []);
	fs.writeFileSync(path.join(releases, "v0.1.0", "SHA256SUMS"), "not the manifest CI attached\n");
	try {
		const tampered = await deploy([releaseA.dir, "--tag", "v0.1.0", "--lab-only", "--lab-bucket", lab.bucket, "--lab-host", servers.lab.origin, "--lab-backend", "lab-be"]);
		assert.notEqual(tampered.status, 0);
		assert.match(tampered.output, /the release's manifest is not the SHA256SUMS attached to apnex\/input-tester's release v0\.1\.0/);
		assert.deepEqual(tampered.calls.map((c) => c[0]), ["gh"], "gh asked, and no gcloud call made");
	} finally {
		fs.writeFileSync(path.join(releases, "v0.1.0", "SHA256SUMS"), releaseA.manifest);
	}
});

test("an object is taken as missing only on gcloud's `not found: 404.`: any other error stops the deploy, nothing copied", TEST, async () => {
	fs.mkdirSync(path.join(scratch, "denied"), { recursive: true });
	fs.writeFileSync(path.join(scratch, "denied", "gcloud"), `#!/bin/sh\nif [ "$1 $2 $3" = "storage objects describe" ]; then echo 'ERROR: (gcloud.storage.objects.describe) HTTPError 403: caller does not have storage.objects.get access' >&2; exit 1; fi\nexec "${path.join(fakeBin, "gcloud")}" "$@"\n`, { mode: 0o755 });
	const denied = localBucket(path.join(state, "buckets", "denied-cli"), "gs://denied-cli");
	const refused = await deploy([releaseA.dir, "--tag", "v0.1.0", "--lab-only", "--lab-bucket", denied.bucket, "--lab-host", servers.lab.origin, "--lab-backend", "lab-be"], { PATH: `${path.join(scratch, "denied")}:${fakeBin}:${process.env.PATH}` });
	assert.notEqual(refused.status, 0);
	assert.match(refused.output, /HTTPError 403/);
	assert.deepEqual(refused.calls.filter((c) => c[1] === "cp"), [], "no copy attempted, though gcloud would have made it");
	assert.deepEqual(fs.readdirSync(denied.dir), []);
});

test("tools/deploy reads its options in any order, each from its flag or the environment, and refuses an unknown one, a missing one, and a value missing", async () => {
	const { readOptions, originOf } = await import("../../tools/deploy");
	const full = ["--tag", "v0.1.0", "--lab-bucket", "gs://input-lab-apnex-io", "--lab-host", "input-lab.apnex.io", "--lab-backend", "lab", "--prod-bucket", "gs://input-apnex-io", "--prod-host", "input.apnex.io", "--prod-backend", "prod"];
	const a = readOptions(["release", ...full], {});
	const b = readOptions([...full.slice(0, 6), "release", ...full.slice(6)], {});
	const c = readOptions(["--prod-backend", "prod", "--lab-host=input-lab.apnex.io", "--prod-host", "input.apnex.io", "release", "--tag", "v0.1.0", "--lab-backend", "lab", "--prod-bucket", "gs://input-apnex-io", "--lab-bucket", "gs://input-lab-apnex-io"], {});
	for (const o of [a, b, c]) assert.deepEqual([o.release, o.tag, o.labBucket, o.prodHost, o.repo, o.labOnly], ["release", "v0.1.0", "gs://input-lab-apnex-io", "input.apnex.io", "apnex/input-tester", false]);
	const fromEnv = readOptions(["release"], { TAG: "v0.1.0", LAB_BUCKET: "gs://input-lab-apnex-io", LAB_HOST: "input-lab.apnex.io", LAB_BACKEND: "lab", PROD_BUCKET: "gs://input-apnex-io", PROD_HOST: "input.apnex.io", PROD_BACKEND: "prod" });
	assert.equal(fromEnv.prodBucket, "gs://input-apnex-io");
	assert.throws(() => readOptions(["release"], {}), /missing tag, labBucket, labHost, labBackend, prodBucket, prodHost, prodBackend/);
	assert.throws(() => readOptions(["release", "--lab-bucket"], {}), /--lab-bucket takes a value/);
	assert.throws(() => readOptions(["release", "--no-such-thing", "x"], {}), /--no-such-thing is no option/);
	assert.throws(() => readOptions(["one", "two", ...full], {}), /one release directory, not 2/);
	assert.throws(() => readOptions(["release", ...full.slice(0, 8), "--lab-only", "--lab-bucket", "input-lab"], {}), /is no gs:\/\/ bucket/);
	assert.equal(originOf("input.apnex.io"), "https://input.apnex.io");
	assert.equal(originOf("http://127.0.0.1:8080/"), "http://127.0.0.1:8080");
});

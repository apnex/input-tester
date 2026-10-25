// deploy-steps - what a deploy does, step by step (docs/ARCHITECTURE-TARGET.md section 9, IT-D10, IT-D11, GT3,
// GT6): for the lab and then production, it copies the release's folder into the bucket, each object's
// Cache-Control `public, max-age=31536000, immutable`, never replacing an object -- one already present with the
// same bytes is skipped, and one with other bytes refuses the deploy; checks every object's bytes, its
// Cache-Control, its content type and the rule through the host, and that the host sends the rule on a missing
// object's 404 too; copies the entry, its Cache-Control `no-store`, replacing the entry already there -- the one
// object a deploy replaces, guarded by the generation read just before, so a second release and a rollback each
// switch the entry -- and runs the deploy's checks there, the entry's bytes and headers, the backend's edge cache
// off and the gate's smoke run; and only once the lab's checks passed does the same into production, the entry
// last. No step deletes anything, so a page loaded from an earlier entry finds every file it names, and a rollback
// is the deploy of an earlier release, which finds its folder present and copies its entry.
//
// The storage, the host, the edge-cache reading and the smoke run are handed in, so tools/deploy runs these steps
// against Google Cloud and the gate's deploy tests run the very same steps against local copies of the buckets.
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { contentTypeOf } from "./content-types.mjs";

/** The SHA-256 of bytes, in hex. */
export const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

/**
 * A release as extracted: the entry `index.html` and one folder named by its tag holding everything else, its
 * manifest `SHA256SUMS` among them. Answers { dir, folder, entry, files } -- `files` every object but the entry,
 * each { name, sha256 } -- after checking every file against the manifest.
 */
export function readRelease(dir) {
	const folders = fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
	if (folders.length !== 1 || !/^v\d+\.\d+\.\d+$/.test(folders[0])) throw new Error(`deploy: a release holds one folder named by its tag, and ${dir} holds ${JSON.stringify(folders)}`);
	const folder = folders[0];
	const manifestFile = path.join(dir, folder, "SHA256SUMS");
	const listed = fs.readFileSync(manifestFile, "utf8").trim().split("\n").map((line) => ({ sha256: line.slice(0, 64), name: line.slice(66) }));
	for (const { name, sha256: digest } of listed) {
		const file = path.join(dir, name);
		if (!fs.existsSync(file) || sha256(fs.readFileSync(file)) !== digest) throw new Error(`deploy: ${name} is not the file the release's manifest names`);
	}
	const entry = listed.find((f) => f.name === "index.html");
	if (!entry) throw new Error("deploy: the release's manifest names no index.html");
	const files = listed.filter((f) => f.name !== "index.html");
	files.push({ name: `${folder}/SHA256SUMS`, sha256: sha256(fs.readFileSync(manifestFile)) });
	return { dir, folder, entry, files, manifest: fs.readFileSync(manifestFile) };
}

/**
 * The deploy's steps, in order, each { target, kind, name? }: per target, one copy per folder object, the folder
 * checked through the host, the entry copied, and the entry checked with the rest of the deploy's checks.
 */
export function deploySteps(release, targets) {
	const steps = [];
	for (const target of targets) {
		for (const f of release.files) steps.push({ target, kind: "copy-folder-object", name: f.name });
		steps.push({ target, kind: "check-folder" });
		steps.push({ target, kind: "copy-entry", name: "index.html" });
		steps.push({ target, kind: "check-entry" });
	}
	return steps;
}

/** The name the deploy asks the host for to find the rule on a missing object's 404. */
export const missingObjectName = (release) => `${release.folder}/no-such-object`;

/** Every way a response through the host differs from what the deploy put there: its bytes, the rule and its companions, its Cache-Control and its content type. */
export function responseProblems(response, { name, sha256: digest, cacheControl }, headers) {
	const problems = [];
	if (response.status !== 200) problems.push(`${name}: answered ${response.status}`);
	else if (sha256(response.body) !== digest) problems.push(`${name}: its bytes through the host are not the release's`);
	for (const [header, value] of Object.entries(headers)) if (response.headers[header.toLowerCase()] !== value) problems.push(`${name}: ${header} is ${JSON.stringify(response.headers[header.toLowerCase()] ?? null)}, not the rule's ${JSON.stringify(value)}`);
	if (response.headers["cache-control"] !== cacheControl) problems.push(`${name}: Cache-Control is ${JSON.stringify(response.headers["cache-control"] ?? null)}, not ${JSON.stringify(cacheControl)}`);
	if (response.headers["content-type"] !== contentTypeOf(name)) problems.push(`${name}: Content-Type is ${JSON.stringify(response.headers["content-type"] ?? null)}, not ${JSON.stringify(contentTypeOf(name))}`);
	return problems;
}

/** Every way the host's answer for a missing object differs from a 404 carrying the rule and its companions. */
export function missingObjectProblems(response, name, headers) {
	const problems = response.status === 404 ? [] : [`${name}, which no release holds: answered ${response.status}, not 404`];
	for (const [header, value] of Object.entries(headers)) if (response.headers[header.toLowerCase()] !== value) problems.push(`${name}, which no release holds: ${header} is ${JSON.stringify(response.headers[header.toLowerCase()] ?? null)} on its ${response.status}, not the rule's`);
	return problems;
}

/**
 * Runs a deploy: `targets` [{ name, bucket, host, backend }], the lab first; `storage` { read(bucket, name) ->
 * { bytes, generation } or null, copy(bucket, name, file, { cacheControl, contentType, replace, generation }) },
 * which never replaces an object unless `replace` is set, and then only the generation given; `host` { get(host,
 * name) -> { status, headers, body } }; `edgeCacheOn(backend)` -> boolean; `smokeRun(host)` -> problems; `rule`
 * tools/response-headers.json's content; `between(step, index)` called after every step. Throws at the first step
 * that fails, having done no later one.
 */
export async function runDeploy({ release, targets, storage, host, edgeCacheOn, smokeRun, rule, between = async () => {}, log = () => {} }) {
	const steps = deploySteps(release, targets);
	const folderCache = rule.cacheControl.folder;
	const entryCache = rule.cacheControl.entry;
	for (const [index, step] of steps.entries()) {
		const target = step.target;
		if (step.kind === "copy-folder-object") {
			const file = release.files.find((f) => f.name === step.name);
			const present = await storage.read(target.bucket, step.name);
			if (present !== null) {
				if (sha256(present.bytes) !== file.sha256) throw new Error(`deploy: ${target.bucket}/${step.name} exists with other bytes, and a release's object is never replaced; nothing after this step was done`);
				log(`${target.name}: skipped ${step.name}, already present with the same bytes`);
			} else {
				await storage.copy(target.bucket, step.name, path.join(release.dir, step.name), { cacheControl: folderCache, contentType: contentTypeOf(step.name), replace: false, generation: 0 });
				log(`${target.name}: copied ${step.name}`);
			}
		} else if (step.kind === "check-folder" || step.kind === "check-entry") {
			const objects = step.kind === "check-folder" ? release.files.map((f) => ({ ...f, cacheControl: folderCache })) : [{ ...release.entry, cacheControl: entryCache }];
			const problems = [];
			for (const object of objects) problems.push(...responseProblems(await host.get(target.host, object.name), object, rule.headers));
			if (step.kind === "check-entry") {
				const missing = missingObjectName(release);
				problems.push(...missingObjectProblems(await host.get(target.host, missing), missing, rule.headers));
				if (await edgeCacheOn(target.backend)) problems.push(`the backend ${target.backend}'s edge cache is on`);
				problems.push(...(await smokeRun(target.host)));
			}
			if (problems.length) throw new Error(`deploy: ${target.name}'s checks through ${target.host} failed, so nothing after this step was done:\n  ${problems.join("\n  ")}`);
			log(`${target.name}: ${step.kind === "check-folder" ? `${objects.length} folder object(s)` : "the entry, a missing object's 404, the edge cache and the smoke run"} checked through ${target.host}`);
		} else if (step.kind === "copy-entry") {
			const present = await storage.read(target.bucket, "index.html");
			const generation = present === null ? 0 : present.generation;
			await storage.copy(target.bucket, "index.html", path.join(release.dir, "index.html"), { cacheControl: entryCache, contentType: contentTypeOf("index.html"), replace: true, generation });
			log(`${target.name}: copied the entry, index.html, ${present === null ? "where there was none" : `replacing generation ${generation}`}`);
		}
		await between(step, index);
	}
	return steps.length;
}

// deploy-steps - what a deploy does, step by step (docs/ARCHITECTURE-TARGET.md section 9, IT-D10, IT-D11, GT3,
// GT6): for the lab and then production, it copies the release's folder into the bucket, each object's
// Cache-Control set to `public, max-age=31536000, immutable`, refusing to replace an object whose bytes differ;
// checks every object's bytes and headers through the host; copies the entry, its Cache-Control `no-store`, and
// runs the deploy's checks there -- the entry's bytes and headers, the backend's edge cache off, and the gate's
// smoke run -- and only once the lab's checks passed does the same into production, the entry last. No step
// deletes anything, so a page loaded from an earlier entry finds every file it names, and a rollback is the
// deploy of an earlier release, which finds its folder present and copies its entry.
//
// The storage, the host, the edge-cache reading and the smoke run are handed in, so tools/deploy runs these
// steps against Google Cloud and the gate's deploy-sequence test runs the very same steps against a local copy
// of a bucket, loading the page between every pair of them.
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

/** The SHA-256 of bytes, in hex. */
export const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

/** The content type each object is copied with, by its extension: the gate's own server's table. */
export const OBJECT_CONTENT_TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".map": "application/json; charset=utf-8", ".ts": "text/plain; charset=utf-8", "": "text/plain; charset=utf-8" };

/** An object's content type, by its name. */
export const contentTypeOf = (name) => OBJECT_CONTENT_TYPES[path.extname(name)] ?? OBJECT_CONTENT_TYPES[""];

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
	return { dir, folder, entry, files };
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

/** Every way a response through the host differs from what the deploy put there: its bytes, the rule and its companions, and its Cache-Control. */
export function responseProblems(response, { name, sha256: digest, cacheControl }, headers) {
	const problems = [];
	if (response.status !== 200) problems.push(`${name}: answered ${response.status}`);
	else if (sha256(response.body) !== digest) problems.push(`${name}: its bytes through the host are not the release's`);
	for (const [header, value] of Object.entries(headers)) if (response.headers[header.toLowerCase()] !== value) problems.push(`${name}: ${header} is ${JSON.stringify(response.headers[header.toLowerCase()] ?? null)}, not the rule's ${JSON.stringify(value)}`);
	if (response.headers["cache-control"] !== cacheControl) problems.push(`${name}: Cache-Control is ${JSON.stringify(response.headers["cache-control"] ?? null)}, not ${JSON.stringify(cacheControl)}`);
	return problems;
}

/**
 * Runs a deploy: `targets` [{ name, bucket, host, backend }], the lab first; `storage` { read(bucket, name) -> bytes
 * or null, copy(bucket, name, file, { cacheControl, contentType }) }; `host` { get(host, name) -> { status, headers,
 * body } }; `edgeCacheOn(backend)` -> boolean; `smokeRun(host)` -> problems; `rule` tools/response-headers.json's
 * content; `between(step, index)` called after every step. Throws at the first step that fails, having done no
 * later one.
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
				if (sha256(present) !== file.sha256) throw new Error(`deploy: ${target.bucket}/${step.name} exists with other bytes, and a release's object is never replaced; nothing after this step was done`);
				log(`${target.name}: ${step.name} already present, the same bytes`);
			} else {
				await storage.copy(target.bucket, step.name, path.join(release.dir, step.name), { cacheControl: folderCache, contentType: contentTypeOf(step.name) });
				log(`${target.name}: copied ${step.name}`);
			}
		} else if (step.kind === "check-folder" || step.kind === "check-entry") {
			const objects = step.kind === "check-folder" ? release.files.map((f) => ({ ...f, cacheControl: folderCache })) : [{ ...release.entry, cacheControl: entryCache }];
			const problems = [];
			for (const object of objects) problems.push(...responseProblems(await host.get(target.host, object.name), object, rule.headers));
			if (step.kind === "check-entry") {
				if (await edgeCacheOn(target.backend)) problems.push(`the backend ${target.backend}'s edge cache is on`);
				problems.push(...(await smokeRun(target.host)));
			}
			if (problems.length) throw new Error(`deploy: ${target.name}'s checks through ${target.host} failed, so nothing after this step was done:\n  ${problems.join("\n  ")}`);
			log(`${target.name}: ${step.kind === "check-folder" ? `${objects.length} folder object(s)` : "the entry, the edge cache and the smoke run"} checked through ${target.host}`);
		} else if (step.kind === "copy-entry") {
			await storage.copy(target.bucket, "index.html", path.join(release.dir, "index.html"), { cacheControl: entryCache, contentType: contentTypeOf("index.html") });
			log(`${target.name}: copied the entry, index.html`);
		}
		await between(step, index);
	}
	return steps.length;
}

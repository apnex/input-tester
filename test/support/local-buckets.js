// local-buckets - local copies of the two buckets for the gate's deploy tests (docs/ARCHITECTURE-TARGET.md
// section 9): each bucket a directory of objects with each object's metadata -- its Cache-Control, its content
// type and its generation -- in a sidecar, served as its backend serves it by the gate's own server; storage over
// them that, as the deploy's storage must, never replaces an object unless asked to and then only the generation
// named; a host over the servers that can be made to answer wrong bytes, a wrong header or a stale entry; and a
// second release built from a planted difference in the source.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { serveSite } from "../browser/site-server.js";
import { repositoryRoot } from "./built-site.js";

/** A local copy of a bucket in `dir`: its objects, and their metadata in `<dir>.metadata.json`, the sidecar tools/deploy's stand-in gcloud keeps too. */
export function localBucket(dir, bucket) {
	fs.mkdirSync(dir, { recursive: true });
	const metadataFile = `${dir}.metadata.json`;
	if (!fs.existsSync(metadataFile)) fs.writeFileSync(metadataFile, "{}");
	const all = () => JSON.parse(fs.readFileSync(metadataFile, "utf8"));
	return {
		dir,
		bucket,
		metadataFile,
		metadata: (rel) => all()[rel] ?? null,
		has: (rel) => fs.existsSync(path.join(dir, rel)),
		bytes: (rel) => fs.readFileSync(path.join(dir, rel)),
		write(rel, bytes, meta) {
			const before = all()[rel]?.generation ?? 0;
			fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
			fs.writeFileSync(path.join(dir, rel), bytes);
			const next = all();
			next[rel] = { ...meta, generation: before + 1 };
			fs.writeFileSync(metadataFile, JSON.stringify(next));
		},
	};
}

/** Serves a bucket as its backend does: every object with its stored Cache-Control and content type, the rule on every response. */
export const serveBucket = (bucket) => serveSite(bucket.dir, { metadata: bucket.metadata });

/**
 * Storage over local buckets, as tools/deploy's is over gcloud: an object's bytes and generation, or null; and a
 * copy that refuses to replace an object unless `replace` is set, and then unless the generation it names is the
 * object's, as `--if-generation-match` does.
 */
export function localStorage(buckets) {
	const byName = new Map(buckets.map((b) => [b.bucket, b]));
	return {
		read: async (bucket, rel) => {
			const b = byName.get(bucket);
			return b.has(rel) ? { bytes: b.bytes(rel), generation: b.metadata(rel).generation } : null;
		},
		copy: async (bucket, rel, file, { cacheControl, contentType, replace, generation }) => {
			const b = byName.get(bucket);
			const current = b.has(rel) ? b.metadata(rel).generation : 0;
			if (current !== 0 && !replace) throw new Error(`storage: ${bucket}/${rel} exists, and the copy did not ask to replace it`);
			if (String(current) !== String(generation)) throw new Error(`storage: ${bucket}/${rel} is at generation ${current}, not the ${generation} the copy named`);
			b.write(rel, fs.readFileSync(file), { cacheControl, contentType });
		},
	};
}

/**
 * A host over local servers, by host name: each response's status, headers by lower-case name and bytes, as
 * `tamper(host, name)` may change them -- `{ body, cacheControl, contentType, drop }`, `drop` a header removed.
 */
export function localHost(servers, tamper = () => null) {
	return {
		async get(host, name) {
			const response = await fetch(`${servers[host].origin}/${name === "index.html" ? "" : name}`);
			const headers = Object.fromEntries([...response.headers].map(([k, v]) => [k.toLowerCase(), v]));
			let body = Buffer.from(await response.arrayBuffer());
			const t = tamper(host, name) ?? {};
			if (t.body !== undefined) body = Buffer.from(t.body);
			if (t.cacheControl !== undefined) headers["cache-control"] = t.cacheControl;
			if (t.contentType !== undefined) headers["content-type"] = t.contentType;
			for (const header of t.drop ?? []) delete headers[header.toLowerCase()];
			return { status: response.status, headers, body };
		},
	};
}

/** The difference planted in the source of the second release: its log's heading, so every one of its built modules that holds it differs. */
export const PLANTED_DIFFERENCE = { file: "src/picture-painter.ts", find: '"Log, newest first"', replace: '"Log, newest first -- the second release"' };

/**
 * Builds a second release, `v0.1.1`, from a copy of the repository's source with a difference planted in it, into
 * `out`; the repository itself is untouched.
 */
export function buildPlantedRelease(scratch, out) {
	const copy = path.join(scratch, "source-b");
	fs.mkdirSync(copy, { recursive: true });
	for (const name of ["src", "page", "vendor", "tools"]) fs.cpSync(path.join(repositoryRoot, name), path.join(copy, name), { recursive: true });
	for (const name of ["tsconfig.json", "package.json", "package-lock.json"]) fs.copyFileSync(path.join(repositoryRoot, name), path.join(copy, name));
	fs.symlinkSync(path.join(repositoryRoot, "node_modules"), path.join(copy, "node_modules"));
	const file = path.join(copy, PLANTED_DIFFERENCE.file);
	const text = fs.readFileSync(file, "utf8");
	if (text.split(PLANTED_DIFFERENCE.find).length !== 2) throw new Error("local-buckets: the planted difference's text is not in the source once");
	fs.writeFileSync(file, text.replace(PLANTED_DIFFERENCE.find, PLANTED_DIFFERENCE.replace));
	execFileSync(process.execPath, [path.join(copy, "tools", "build-site.mjs"), "--out", out, "--folder", "v0.1.1"], { stdio: "ignore" });
	return out;
}

/** The manifest of a release as a map from each file's path to its SHA-256. */
export function manifestMap(release) {
	return new Map(release.manifest.toString("utf8").trim().split("\n").map((line) => [line.slice(66), line.slice(0, 64)]));
}

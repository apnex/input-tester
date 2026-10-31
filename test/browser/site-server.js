// site-server - the gate's own server (docs/ARCHITECTURE-TARGET.md section 8, IT-D5, GT6): serves a built
// site or a local copy of a bucket, sending the browser rule and its two companions, exactly as
// tools/response-headers.json holds them, in every response -- a missing file's among them -- with each
// object's Cache-Control and content type as a bucket would: the entry `no-store`, every file of a release's
// folder `public, max-age=31536000, immutable`, or what a bucket copy's own metadata names.
//
// The server is test-harness's serveStatic, its headers function adding the rule, its companions and each object's
// Cache-Control and content type to every answer; the rule, its table and the bucket's metadata are this
// repository's. It records every request it answers, so a test holds the browser's own account of its requests
// against a second witness. It never holds the process open, and close() ends every connection and never throws.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { serveStatic } from "@apnex/test-harness";

import { contentTypeOf } from "../../tools/content-types.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const headersFile = path.resolve(here, "..", "..", "tools", "response-headers.json");

/** The rule and its companions, and the two Cache-Control values, as tools/response-headers.json holds them. */
export function readResponseHeaders(file = headersFile) {
	return JSON.parse(fs.readFileSync(file, "utf8"));
}

/** The content type a file is served with: the one table tools/deploy sets as each object's metadata. */
export { CONTENT_TYPES, contentTypeOf } from "../../tools/content-types.mjs";

/**
 * Serves `root` on a port of its own. `metadata(relativePath)` may answer `{ cacheControl, contentType }` for an
 * object, as a bucket copy's sidecar does, each served as stored; otherwise `index.html` is the entry, every other
 * file a folder's, and the content type the one table's. A missing file is answered 404, `text/plain` and `no-store`,
 * the rule with it. Unless `hold` is set the server never holds the process open.
 * Answers { origin, requests, close }, each request recorded with its method, path, query and status.
 */
export async function serveSite(root, { metadata = () => null, headers = readResponseHeaders(), hold = false } = {}) {
	const folder = path.resolve(root);
	return serveStatic({
		folders: { "/": folder },
		hold,
		headers: ({ file }) => {
			if (file === null) return { ...headers.headers };
			const rel = path.relative(folder, file).split(path.sep).join("/");
			const meta = metadata(rel) ?? {};
			return { ...headers.headers, "content-type": meta.contentType ?? contentTypeOf(rel), "cache-control": meta.cacheControl ?? (rel === "index.html" ? headers.cacheControl.entry : headers.cacheControl.folder) };
		},
	});
}

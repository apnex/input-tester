// site-server - the gate's own server (docs/ARCHITECTURE-TARGET.md section 8, IT-D5, GT6): serves a built
// site or a local copy of a bucket, sending the browser rule and its two companions, exactly as
// tools/response-headers.json holds them, in every response -- a missing file's among them -- with each
// object's Cache-Control and content type as a bucket would: the entry `no-store`, every file of a release's
// folder `public, max-age=31536000, immutable`, or what a bucket copy's own metadata names.
//
// It records every request it answers, so a test holds the browser's own account of its requests against a
// second witness. It never holds the process open, and close() ends every connection and never throws.
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
 * Serves `root` on a port of its own, or on `port`. `metadata(relativePath)` may answer `{ cacheControl, contentType }`
 * for an object, as a bucket copy's sidecar does, each served as stored; otherwise `index.html` is the entry, every
 * other file a folder's, and the content type the one table's.
 * Unless `hold` is set the server never holds the process open.
 * Answers { origin, requests, close }.
 */
export async function serveSite(root, { metadata = () => null, headers = readResponseHeaders(), port = 0, hold = false } = {}) {
	const requests = [];
	const server = http.createServer((req, res) => {
		const url = new URL(req.url, "http://localhost");
		requests.push({ method: req.method, path: url.pathname, query: url.search });
		const rule = { ...headers.headers };
		let rel = decodeURIComponent(url.pathname).replace(/^\/+/, "");
		if (rel === "") rel = "index.html";
		const file = path.resolve(root, rel);
		const inside = file.startsWith(path.resolve(root) + path.sep);
		if (!inside || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
			res.writeHead(404, { ...rule, "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" });
			res.end("not found");
			return;
		}
		const meta = metadata(rel) ?? {};
		const cacheControl = meta.cacheControl ?? (rel === "index.html" ? headers.cacheControl.entry : headers.cacheControl.folder);
		res.writeHead(200, { ...rule, "Content-Type": meta.contentType ?? contentTypeOf(rel), "Cache-Control": cacheControl });
		res.end(req.method === "HEAD" ? undefined : fs.readFileSync(file));
	});
	await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));
	if (!hold) server.unref();
	const close = async () => {
		try {
			server.closeAllConnections?.();
			await Promise.race([new Promise((resolve) => server.close(() => resolve())), new Promise((resolve) => setTimeout(resolve, 2000))]);
		} catch (error) {
			process.stderr.write(`site-server: warning: did not close cleanly: ${error?.message ?? error}\n`);
		}
	};
	return { origin: `http://127.0.0.1:${server.address().port}`, requests, close };
}

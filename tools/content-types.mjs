// content-types - the one table of the content type each file of a release is served with, by its extension
// (docs/ARCHITECTURE-TARGET.md section 9): set as each object's metadata by tools/deploy, checked through each host
// by the deploy's checks, and sent by the gate's own server, so the three can never disagree.
import path from "node:path";

/** The content type of each extension a release holds; a `.d.ts` declaration and every unknown extension plain text. */
export const CONTENT_TYPES = Object.freeze({
	".html": "text/html; charset=utf-8",
	".js": "text/javascript; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".map": "application/json; charset=utf-8",
	".json": "application/json; charset=utf-8",
	".ts": "text/plain; charset=utf-8",
	".txt": "text/plain; charset=utf-8",
	"": "text/plain; charset=utf-8",
});

/** A file's content type, by its name. */
export function contentTypeOf(name) {
	return CONTENT_TYPES[path.extname(name)] ?? CONTENT_TYPES[""];
}

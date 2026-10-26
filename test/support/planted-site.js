// planted-site - a planted build (docs/ARCHITECTURE-TARGET.md section 8): a copy of the built site in a scratch
// directory, with edits planted in its built files -- a leak, a slow delivery, a claim taken away -- so a test
// shows that a check fails it. Every edit must find its text exactly once, or the plant refuses, so a plant
// that silently planted nothing can never pass for a check that failed to fail.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { releaseFolder, siteRoot } from "./built-site.js";

/**
 * Copies the built site and applies each edit -- `{ file, find, replace }`, `file` relative to the release folder,
 * `{ entry: true, find, replace }` for the entry document, or `{ add, text }`, a file the release does not hold
 * added at `add` in its folder, refused if it would replace one -- answering `{ dir, remove }`.
 */
export function plantedSite(edits, from = siteRoot) {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "input-tester-planted-"));
	fs.cpSync(from, dir, { recursive: true });
	for (const edit of edits) {
		if (edit.add !== undefined) {
			const added = path.join(dir, releaseFolder, edit.add);
			if (fs.existsSync(added)) {
				fs.rmSync(dir, { recursive: true, force: true });
				throw new Error(`planted-site: ${edit.add} is a file of the release, so adding it would replace it`);
			}
			fs.writeFileSync(added, edit.text);
			continue;
		}
		const file = edit.entry ? path.join(dir, "index.html") : path.join(dir, releaseFolder, edit.file);
		const text = fs.readFileSync(file, "utf8");
		const found = text.split(edit.find).length - 1;
		if (found !== 1) {
			fs.rmSync(dir, { recursive: true, force: true });
			throw new Error(`planted-site: ${edit.find} found ${found} time(s) in ${path.relative(dir, file)}, not once`);
		}
		fs.writeFileSync(file, text.replace(edit.find, edit.replace));
	}
	return { dir, remove: () => fs.rmSync(dir, { recursive: true, force: true }) };
}

/** The text of the composition root's delivery as built, where a plant inserts code that runs inside every delivery. */
export const DELIVERY_OPENS = "function deliverFact(fact, reply) {";

/** The router's claim as built, which the pinch's positive control takes away. */
export const CLAIM_IN_ROUTER = "if (claimed)\n            reply.claim();";

// release-layout - the site as a release lays it out (docs/ARCHITECTURE-TARGET.md section 9, IT-D1, IT-D10, P7,
// GT3): the entry document `index.html` and one folder named `v` and the version, holding everything else; the
// entry names only its own folder, its stylesheet and its one module script, with no inline script; every
// module imports by relative path within the folder; the four parts' files are byte-identical to their pinned
// release files, declarations among them; and the manifest names every file with its SHA-256.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

import { filesUnder } from "../tools/build-site.mjs";
import { SHARED_PARTS, vendoredFilesOf } from "../tools/vendor-parts.mjs";
import { releaseFolder, repositoryRoot, siteRoot } from "./support/built-site.js";
import { filesThePageLoads } from "./support/containment.js";

const files = filesUnder(siteRoot);

test("the site holds the entry and one folder named by the release, and nothing else", () => {
	assert.equal(releaseFolder, `v${JSON.parse(fs.readFileSync(path.join(repositoryRoot, "package.json"), "utf8")).version}`);
	assert.deepEqual([...new Set(files.map((f) => (f.includes("/") ? f.split("/")[0] + "/" : f)))].sort(), ["index.html", `${releaseFolder}/`]);
});

test("the entry names only its own folder -- its stylesheet and its one module script -- and holds no inline script and no other address", () => {
	const entry = fs.readFileSync(path.join(siteRoot, "index.html"), "utf8");
	const addresses = [...entry.matchAll(/\b(?:src|href)="([^"]*)"/g)].map((m) => m[1]);
	assert.deepEqual(addresses, ["data:,", `${releaseFolder}/input-tester.css`, `${releaseFolder}/app/page-entry.js`, "?plan=ansi", "?plan=chromebook"]);
	assert.equal([...entry.matchAll(/<script\b/g)].length, 1, "one script element");
	assert.match(entry, /<script type="module" src="[^"]+"><\/script>/, "and it is the module script, with no inline body");
	assert.ok(!/<style\b|\bstyle="|\bon[a-z]+="/i.test(entry), "no inline style and no handler attribute");
	assert.ok(!/importmap/.test(entry), "no import map (IT-D1)");
});

test("every module the page loads imports by relative path within the release's folder, and every one exists", () => {
	const loads = filesThePageLoads(siteRoot);
	for (const f of loads) {
		assert.ok(f.startsWith(`${releaseFolder}/`), f);
		assert.ok(fs.existsSync(path.join(siteRoot, f)), `${f} exists`);
	}
	const app = files.filter((f) => f.startsWith(`${releaseFolder}/app/`));
	assert.deepEqual(app.map((f) => path.basename(f)).sort(), ["composition-root.js", "input-bindings.js", "input-router.js", "key-labels.js", "keyboard-plans.js", "page-entry.js", "picture-painter.js", "picture-state.js"]);
	for (const f of app) assert.ok(loads.includes(f), `${f} is reached from the page's one module script`);
});

test("GT3 at build: each part's files in the release are byte-identical to its pinned release file's, its declarations and licence among them", () => {
	for (const part of SHARED_PARTS) {
		const wanted = vendoredFilesOf(part);
		const held = files.filter((f) => f.startsWith(`${releaseFolder}/vendor/${part}/`)).map((f) => f.slice(`${releaseFolder}/vendor/${part}/`.length));
		assert.deepEqual(held.sort(), wanted.map((w) => w.name).sort(), `${part}: the same files`);
		for (const w of wanted) assert.ok(fs.readFileSync(path.join(siteRoot, releaseFolder, "vendor", part, w.name)).equals(fs.readFileSync(w.source)), `${part}/${w.name}`);
		assert.ok(held.includes("index.d.ts") && held.includes("LICENSE"));
	}
});

test("the manifest names every file of the site but itself, each with its SHA-256", () => {
	const lines = fs.readFileSync(path.join(siteRoot, releaseFolder, "SHA256SUMS"), "utf8").trim().split("\n");
	const listed = lines.map((l) => l.slice(66));
	assert.deepEqual(listed, files.filter((f) => f !== `${releaseFolder}/SHA256SUMS`));
	for (const line of lines) assert.equal(line.slice(0, 64), createHash("sha256").update(fs.readFileSync(path.join(siteRoot, line.slice(66)))).digest("hex"), line.slice(66));
});

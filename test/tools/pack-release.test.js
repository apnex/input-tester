// pack-release - a release's files as the release workflow makes them (docs/ARCHITECTURE-TARGET.md section 9,
// IT-D10): the archive holds the entry and one folder named by the tag, every file the manifest names with its
// SHA-256; the digest file names the archive's; packing the same build twice gives the same bytes; and the
// archive, extracted, is a release tools/deploy reads.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import { sha256Of } from "../../tools/build-site.mjs";
import { readRelease } from "../../tools/deploy-steps.mjs";
import { packRelease, releaseFileNames } from "../../tools/pack-release.mjs";

test("a release packs into an archive of the entry and its tag's folder, its digest and its manifest, the same bytes each time, and extracts to a release the deploy reads", { timeout: 120000 }, () => {
	const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "input-tester-pack-"));
	try {
		const first = packRelease("v0.1.0", path.join(scratch, "first"));
		const second = packRelease("v0.1.0", path.join(scratch, "second"));
		assert.ok(fs.readFileSync(first.archive).equals(fs.readFileSync(second.archive)), "packed twice, the same bytes");
		assert.deepEqual(Object.values(releaseFileNames("v0.1.0")), ["input-tester-v0.1.0.tar.gz", "input-tester-v0.1.0.tar.gz.sha256", "SHA256SUMS"]);
		assert.equal(fs.readFileSync(first.digest, "utf8"), `${sha256Of(first.archive)}  input-tester-v0.1.0.tar.gz\n`);
		const listing = execFileSync("tar", ["-tzf", first.archive], { encoding: "utf8" }).trim().split("\n");
		assert.ok(listing.includes("index.html") && listing.every((f) => f === "index.html" || f.startsWith("v0.1.0")));
		const extracted = path.join(scratch, "extracted");
		fs.mkdirSync(extracted);
		execFileSync("tar", ["-xzf", first.archive, "-C", extracted]);
		const release = readRelease(extracted);
		assert.equal(release.folder, "v0.1.0");
		assert.ok(fs.readFileSync(first.manifest).equals(fs.readFileSync(path.join(extracted, "v0.1.0", "SHA256SUMS"))), "the attached manifest is the folder's");
		assert.match(fs.readFileSync(path.join(extracted, "index.html"), "utf8"), /href="v0\.1\.0\/input-tester\.css"/);
		assert.throws(() => packRelease("latest", path.join(scratch, "bad")), /no v<major>/);
	} finally {
		fs.rmSync(scratch, { recursive: true, force: true });
	}
});

#!/usr/bin/env node
// pack-release - a release's files (docs/ARCHITECTURE-TARGET.md section 9, IT-D10), made by the release workflow
// from a tag: the site built with its folder named by the tag, packed into one archive holding the entry
// `index.html` and that folder -- packed by name, with no owner and no time, so packing the same build twice
// gives the same bytes -- beside the archive's SHA-256 and the release's manifest, `SHA256SUMS`, every file's
// SHA-256. The three are what the GitHub release attaches; tools/deploy takes the archive extracted.
//
// Usage:  node tools/pack-release.mjs TAG OUT_DIR
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildSite, sha256Of } from "./build-site.mjs";

/** The names of a release's three files, by its tag. */
export const releaseFileNames = (tag) => ({ archive: `input-tester-${tag}.tar.gz`, digest: `input-tester-${tag}.tar.gz.sha256`, manifest: "SHA256SUMS" });

/** Builds the site for `tag` and packs it into `out`; answers the paths of the three release files. */
export function packRelease(tag, out) {
	if (!/^v\d+\.\d+\.\d+$/.test(tag)) throw new Error(`pack-release: ${tag} is no v<major>.<minor>.<patch> tag`);
	const site = path.join(out, "site");
	fs.rmSync(out, { recursive: true, force: true });
	fs.mkdirSync(out, { recursive: true });
	buildSite({ out: site, folder: tag });
	const names = releaseFileNames(tag);
	const archive = path.join(out, names.archive);
	const tarred = execFileSync("tar", ["--sort=name", "--mtime=@0", "--owner=0", "--group=0", "--numeric-owner", "--format=gnu", "-C", site, "-cf", "-", "index.html", tag], { maxBuffer: 256 * 1024 * 1024 });
	fs.writeFileSync(archive, execFileSync("gzip", ["-n", "-9"], { input: tarred, maxBuffer: 256 * 1024 * 1024 }));
	fs.writeFileSync(path.join(out, names.digest), `${sha256Of(archive)}  ${names.archive}\n`);
	fs.copyFileSync(path.join(site, tag, "SHA256SUMS"), path.join(out, names.manifest));
	fs.rmSync(site, { recursive: true, force: true });
	return { archive, digest: path.join(out, names.digest), manifest: path.join(out, names.manifest) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const [tag, out] = process.argv.slice(2);
	if (!tag || !out) {
		console.log("usage: node tools/pack-release.mjs TAG OUT_DIR");
		process.exit(2);
	}
	const files = packRelease(tag, path.resolve(out));
	console.log(`pack-release: PASS -- ${Object.values(files).map((f) => path.basename(f)).join(", ")} in ${out}`);
}

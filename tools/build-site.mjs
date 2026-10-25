#!/usr/bin/env node
// build-site - the build (docs/ARCHITECTURE-TARGET.md IT-D1, section 9): `tsc` compiles `src/` to ES2022
// modules, unminified and unbundled, and the site is laid out as a release is: the entry document `index.html`,
// and one folder named by the release holding everything else -- the stylesheet, the built modules in `app/`,
// and the four parts' files in `vendor/`, copied unchanged from `vendor/`, which holds their pinned release
// files -- with a manifest of every file's SHA-256, `SHA256SUMS`, in the folder. The entry names only its own
// folder, and every module imports by relative path within it, so two releases never share a file's address.
//
// The folder is named `v` and package.json's version unless `--folder` names it; a release's CI names it by
// its tag, which the release workflow refuses unless it is that very name.
//
// Usage:  node tools/build-site.mjs [--out DIR] [--folder NAME]    (default: site, v<version>)
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { pinProblems, vendorProblems } from "./vendor-parts.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** The placeholder the entry document names its folder by, replaced at build. */
export const FOLDER_PLACEHOLDER = "RELEASE_FOLDER";

/** Every file under a directory, as paths relative to it with forward slashes, sorted. */
export function filesUnder(dir, prefix = "") {
	if (!fs.existsSync(dir)) return [];
	return fs
		.readdirSync(dir, { withFileTypes: true })
		.sort((a, b) => (a.name < b.name ? -1 : 1))
		.flatMap((e) => (e.isDirectory() ? filesUnder(path.join(dir, e.name), `${prefix}${e.name}/`) : [`${prefix}${e.name}`]));
}

/** The SHA-256 of a file's bytes, in hex. */
export function sha256Of(file) {
	return createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

/** The manifest of a site: one line per file but the manifest itself, `<sha256>  <path>`, sorted by path, as `sha256sum -c` reads it from the site's root. */
export function manifestOf(siteDir, folder) {
	return filesUnder(siteDir)
		.filter((f) => f !== `${folder}/SHA256SUMS`)
		.map((f) => `${sha256Of(path.join(siteDir, f))}  ${f}`)
		.join("\n")
		.concat("\n");
}

/** The release folder's name: `--folder`, or `v` and package.json's version. */
export function releaseFolderName(args = process.argv.slice(2), repository = root) {
	const i = args.indexOf("--folder");
	if (i !== -1) return args[i + 1];
	return `v${JSON.parse(fs.readFileSync(path.join(repository, "package.json"), "utf8")).version}`;
}

/** Builds the site into `out`, its folder named `folder`; answers the files written. */
export function buildSite({ out = path.join(root, "site"), folder = releaseFolderName() } = {}) {
	if (!/^v[0-9]+\.[0-9]+\.[0-9]+$/.test(folder)) throw new Error(`build-site: the folder name ${JSON.stringify(folder)} is no v<major>.<minor>.<patch>`);
	const problems = [...pinProblems(root), ...vendorProblems(root)];
	if (problems.length) throw new Error(`build-site: vendor/ is not the pinned release files:\n  ${problems.join("\n  ")}`);
	fs.rmSync(path.join(root, "build"), { recursive: true, force: true });
	execFileSync(process.execPath, [path.join(root, "node_modules", "typescript", "bin", "tsc"), "-p", root], { stdio: "inherit" });
	fs.rmSync(out, { recursive: true, force: true });
	const release = path.join(out, folder);
	fs.mkdirSync(release, { recursive: true });
	fs.cpSync(path.join(root, "build", "app"), path.join(release, "app"), { recursive: true });
	fs.cpSync(path.join(root, "vendor"), path.join(release, "vendor"), { recursive: true });
	fs.copyFileSync(path.join(root, "page", "input-tester.css"), path.join(release, "input-tester.css"));
	const entry = fs.readFileSync(path.join(root, "page", "index.html"), "utf8");
	const named = entry.split(FOLDER_PLACEHOLDER).length - 1;
	if (named !== 2) throw new Error(`build-site: page/index.html names ${FOLDER_PLACEHOLDER} ${named} time(s), not twice -- its stylesheet and its one module script`);
	fs.writeFileSync(path.join(out, "index.html"), entry.replaceAll(FOLDER_PLACEHOLDER, folder));
	fs.writeFileSync(path.join(release, "SHA256SUMS"), manifestOf(out, folder));
	return filesUnder(out);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const args = process.argv.slice(2);
	const o = args.indexOf("--out");
	const out = o === -1 ? path.join(root, "site") : path.resolve(args[o + 1]);
	const folder = releaseFolderName(args);
	const files = buildSite({ out, folder });
	console.log(`build-site: PASS -- ${files.length} file(s) in ${path.relative(process.cwd(), out) || "."}: index.html and ${folder}/, its manifest SHA256SUMS among them`);
}

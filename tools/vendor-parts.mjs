#!/usr/bin/env node
// vendor-parts - the vendoring (docs/ARCHITECTURE-TARGET.md section 9, IT-D1): copies each shared part's
// release files -- its package's `dist` folder, declarations and maps among them, and its LICENSE -- from the
// package `npm ci` installed from the release file package-lock.json pins, into `vendor/<part>/`, unchanged,
// so the tester imports `../vendor/<part>/index.js` by relative path and a release serves the parts byte for
// byte as published (P7, GT3).
//
// With `--check` it changes nothing and fails when `vendor/` differs from the installed packages in any byte,
// holds a file they do not, or lacks one they hold, or when an installed package is not the version and the
// release file package-lock.json pins.
//
// Usage:  node tools/vendor-parts.mjs [--check]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** The four shared parts, by their package names, in the order the guide teaches them. */
export const SHARED_PARTS = ["input-capture", "input-binding", "vector-scene", "snap-grid"];

/** Every file under a directory, as paths relative to it, sorted. */
function filesUnder(dir, prefix = "") {
	if (!fs.existsSync(dir)) return [];
	return fs
		.readdirSync(dir, { withFileTypes: true })
		.sort((a, b) => (a.name < b.name ? -1 : 1))
		.flatMap((e) => (e.isDirectory() ? filesUnder(path.join(dir, e.name), path.join(prefix, e.name)) : [path.join(prefix, e.name)]));
}

/** What `vendor/<part>/` must hold: [{ name, source }] -- every file of the package's dist, and its LICENSE. */
export function vendoredFilesOf(part, repository = root) {
	const pkg = path.join(repository, "node_modules", "@apnex", part);
	const files = filesUnder(path.join(pkg, "dist")).map((name) => ({ name, source: path.join(pkg, "dist", name) }));
	files.push({ name: "LICENSE", source: path.join(pkg, "LICENSE") });
	return files.sort((a, b) => (a.name < b.name ? -1 : 1));
}

/** Every way the installed packages differ from package-lock.json's pins: an installed version or release file that is not the one pinned. */
export function pinProblems(repository = root) {
	const problems = [];
	const lock = JSON.parse(fs.readFileSync(path.join(repository, "package-lock.json"), "utf8"));
	const manifest = JSON.parse(fs.readFileSync(path.join(repository, "package.json"), "utf8"));
	for (const part of SHARED_PARTS) {
		const name = `@apnex/${part}`;
		const wanted = manifest.dependencies?.[name];
		const locked = lock.packages?.[`node_modules/${name}`];
		if (!wanted || !/^https:\/\/github\.com\/apnex\/[a-z-]+\/releases\/download\/v[0-9.]+\/apnex-[a-z-]+-[0-9.]+\.tgz$/.test(wanted)) problems.push(`package.json names ${name} by no release file: ${wanted}`);
		if (!locked || locked.resolved !== wanted || !/^sha512-/.test(locked.integrity ?? "")) {
			problems.push(`package-lock.json pins no release file and hash for ${name}`);
			continue;
		}
		const installedFile = path.join(repository, "node_modules", "@apnex", part, "package.json");
		if (!fs.existsSync(installedFile)) {
			problems.push(`${name} is not installed: run npm ci`);
			continue;
		}
		const installed = JSON.parse(fs.readFileSync(installedFile, "utf8"));
		if (installed.version !== locked.version) problems.push(`${name} installed at ${installed.version}, pinned at ${locked.version}`);
	}
	return problems;
}

/** Every way `vendor/` differs from the installed packages, byte for byte and file for file. */
export function vendorProblems(repository = root) {
	const problems = [];
	const vendor = path.join(repository, "vendor");
	const expectedParts = new Set(SHARED_PARTS);
	for (const entry of fs.existsSync(vendor) ? fs.readdirSync(vendor) : []) if (!expectedParts.has(entry)) problems.push(`vendor/${entry} is no shared part`);
	for (const part of SHARED_PARTS) {
		const wanted = vendoredFilesOf(part, repository);
		const held = filesUnder(path.join(vendor, part));
		const wantedNames = new Set(wanted.map((f) => f.name));
		for (const name of held) if (!wantedNames.has(name)) problems.push(`vendor/${part}/${name} is no file of the release`);
		for (const file of wanted) {
			const copy = path.join(vendor, part, file.name);
			if (!fs.existsSync(copy)) problems.push(`vendor/${part}/${file.name} is missing`);
			else if (!fs.readFileSync(copy).equals(fs.readFileSync(file.source))) problems.push(`vendor/${part}/${file.name} differs from the release's bytes`);
		}
	}
	return problems;
}

/** Copies every part's release files into `vendor/`, replacing what was there. */
export function vendorParts(repository = root) {
	const vendor = path.join(repository, "vendor");
	fs.rmSync(vendor, { recursive: true, force: true });
	for (const part of SHARED_PARTS) {
		for (const file of vendoredFilesOf(part, repository)) {
			const copy = path.join(vendor, part, file.name);
			fs.mkdirSync(path.dirname(copy), { recursive: true });
			fs.copyFileSync(file.source, copy);
		}
	}
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const check = process.argv.includes("--check");
	const pins = pinProblems();
	if (pins.length) {
		for (const p of pins) console.log(`  ${p}`);
		console.log(`vendor-parts: FAIL -- ${pins.length} pin problem(s)`);
		process.exit(1);
	}
	if (!check) vendorParts();
	const problems = vendorProblems();
	for (const p of problems) console.log(`  ${p}`);
	if (problems.length) {
		console.log(`vendor-parts: FAIL -- ${problems.length} difference(s) between vendor/ and the pinned release files`);
		process.exit(1);
	}
	const count = SHARED_PARTS.reduce((n, part) => n + vendoredFilesOf(part).length, 0);
	console.log(`vendor-parts: PASS -- ${count} file(s) of ${SHARED_PARTS.length} parts in vendor/, each byte-identical to its pinned release file`);
}

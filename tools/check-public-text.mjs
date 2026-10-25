#!/usr/bin/env node
// check-public-text - the repository is public (docs/ARCHITECTURE-TARGET.md section 1; the build's brief): fails
// when a file git would keep, or a commit message reachable from HEAD, holds a run of sixteen or more hex digits,
// the shape of an identifier that must never be published -- a project number, a trace, a key -- so none is.
//
// The files are those git would keep: tracked, and untracked but not ignored, so a new file is checked before
// its first commit.
//
// Usage:  node tools/check-public-text.mjs
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Sixteen or more hex digits in a row, bounded by no further hex digit. */
export const HEX_IDENTIFIER = /(?<![0-9A-Fa-f])[0-9A-Fa-f]{16,}(?![0-9A-Fa-f])/g;

/** Every hex identifier a text holds: [{ line, text }]. */
export function findHexIdentifiers(text) {
	const found = [];
	text.split("\n").forEach((line, i) => {
		for (const m of line.matchAll(HEX_IDENTIFIER)) found.push({ line: i + 1, text: `${m[0].slice(0, 4)}...(${m[0].length} hex digits)` });
	});
	return found;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const files = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { cwd: root, encoding: "utf8" }).split("\n").filter((f) => f && fs.existsSync(path.join(root, f)));
	const problems = [];
	for (const file of files) for (const f of findHexIdentifiers(fs.readFileSync(path.join(root, file), "utf8"))) problems.push(`${file}:${f.line}: ${f.text}`);
	let messages = "";
	try {
		messages = execFileSync("git", ["log", "--format=%H%x00%B%x00"], { cwd: root, encoding: "utf8" });
	} catch {
		messages = "";
	}
	const parts = messages.split("\0");
	for (let i = 0; i + 1 < parts.length; i += 2) for (const f of findHexIdentifiers(parts[i + 1])) problems.push(`the commit message of ${parts[i].trim().slice(0, 7)}: ${f.text}`);
	for (const p of problems) console.log(`  ${p}`);
	if (problems.length) {
		console.log(`check-public-text: FAIL -- ${problems.length} hex identifier(s) in what the public repository holds`);
		process.exit(1);
	}
	console.log(`check-public-text: PASS -- ${files.length} file(s) and every commit message hold no run of sixteen or more hex digits`);
}

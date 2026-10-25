#!/usr/bin/env node
// check-backlog - the backlog check (docs/ARCHITECTURE-TARGET.md GT4, IT-D7; mission-kit's AR5 and RU3): fails
// when docs/BACKLOG.md holds a workaround row still open while the shared part's release named to retire it is
// the one package-lock.json pins, or a later one; a workaround row that names no part and release to retire it;
// or a deferral row, open or parked, with no revival trigger.
//
// A table is a deferral table when its header's last column is `revival trigger`, and the workaround table when
// its header is `| id | workaround | evidence | retired by | state |`; a workaround's `retired by` cell names a
// part and a version in backticks, `` `input-binding` `0.3.0` ``, and its `state` is `open` or `retired`.
//
// Usage:  node tools/check-backlog.mjs [BACKLOG.md [package-lock.json]]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PARTS = ["input-capture", "input-binding", "vector-scene", "snap-grid"];

/** Every markdown table of a document: { header: [cells], rows: [{ line, cells }] }. */
export function tablesOf(text) {
	const tables = [];
	const lines = text.split("\n");
	for (let i = 0; i < lines.length; i++) {
		if (!/^\|/.test(lines[i]) || !/^\|[-| ]+\|$/.test(lines[i + 1] ?? "")) continue;
		const cellsOf = (line) => line.replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
		const table = { header: cellsOf(lines[i]).map((c) => c.toLowerCase()), rows: [] };
		for (i += 2; i < lines.length && /^\|/.test(lines[i]); i++) table.rows.push({ line: i + 1, cells: cellsOf(lines[i]) });
		tables.push(table);
	}
	return tables;
}

/** Whether version a is at least version b, both `major.minor.patch`. */
export function versionAtLeast(a, b) {
	const [x, y] = [a, b].map((v) => v.split(".").map(Number));
	for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i];
	return true;
}

/** Every problem a backlog has against the pinned versions `{ part: version }`. */
export function backlogProblems(text, pinned) {
	const problems = [];
	for (const table of tablesOf(text)) {
		if (table.header.at(-1) === "revival trigger") {
			for (const row of table.rows) if (!row.cells.at(-1) || /^(later|tbd|-+|none)$/i.test(row.cells.at(-1))) problems.push(`line ${row.line}: ${row.cells[0]} has no revival trigger`);
		}
		if (JSON.stringify(table.header) === JSON.stringify(["id", "workaround", "evidence", "retired by", "state"])) {
			for (const row of table.rows) {
				const [id, , , retiredBy, state] = row.cells;
				const named = /`([a-z-]+)`\s+`(\d+\.\d+\.\d+)`/.exec(retiredBy ?? "");
				if (!named || !PARTS.includes(named[1])) {
					problems.push(`line ${row.line}: ${id} names no shared part and release to retire it`);
					continue;
				}
				if (state !== "open" && state !== "retired") problems.push(`line ${row.line}: ${id}'s state is ${JSON.stringify(state)}, not open or retired`);
				const installed = pinned[named[1]];
				if (state === "open" && installed !== undefined && versionAtLeast(installed, named[2])) problems.push(`line ${row.line}: ${id} is open while \`${named[1]}\` ${installed}, at or beyond the ${named[2]} named to retire it, is installed (GT4)`);
			}
		}
	}
	return problems;
}

/** The versions package-lock.json pins for the four parts. */
export function pinnedVersions(lockFile = path.join(root, "package-lock.json")) {
	const lock = JSON.parse(fs.readFileSync(lockFile, "utf8"));
	return Object.fromEntries(PARTS.map((part) => [part, lock.packages?.[`node_modules/@apnex/${part}`]?.version]).filter(([, v]) => v !== undefined));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const [backlog = path.join(root, "docs", "BACKLOG.md"), lock = path.join(root, "package-lock.json")] = process.argv.slice(2);
	if (!fs.existsSync(backlog)) {
		console.log(`check-backlog: FAIL -- ${backlog} does not exist`);
		process.exit(1);
	}
	const text = fs.readFileSync(backlog, "utf8");
	const problems = backlogProblems(text, pinnedVersions(lock));
	const workarounds = tablesOf(text).find((t) => t.header[1] === "workaround");
	if (!workarounds) problems.push("the backlog holds no workaround table, so GT4 has nothing to hold");
	for (const p of problems) console.log(`  ${p}`);
	if (problems.length) {
		console.log(`check-backlog: FAIL -- ${problems.length} problem(s)`);
		process.exit(1);
	}
	const open = workarounds.rows.filter((r) => r.cells[4] === "open").length;
	console.log(`check-backlog: PASS -- ${workarounds.rows.length} workaround row(s), ${open} open, none while its retiring release is installed; every deferral carries a revival trigger`);
}

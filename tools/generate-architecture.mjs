#!/usr/bin/env node
// generate-architecture - derives docs/ARCHITECTURE.md, the current instant (docs/ARCHITECTURE-TARGET.md section
// 10, row 1; mission-kit's AR1): never written by hand, every line of it read from the code and the gate's
// results -- the parts and their duties from each module's leading comment and exports, the shared parts from
// package-lock.json and vendor/, the binding table, the plans, the session and the scene's layers from the built
// modules themselves, the browser rule from tools/response-headers.json, the deploy's steps from
// tools/deploy-steps.mjs, the gate's results from the gate's last run (.gate/results.json, written by
// tools/run-gate.mjs), and the owed and the decided from docs/BACKLOG.md and docs/DECISIONS.md. Its reasoning is
// the target's, which it cites and never restates.
//
// With `--check` it writes nothing and fails when docs/ARCHITECTURE.md is not what it derives now.
//
// Usage:  node tools/generate-architecture.mjs [--check]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

import { readRelease, deploySteps } from "./deploy-steps.mjs";
import { tablesOf } from "./check-backlog.mjs";
import { SHARED_PARTS, vendoredFilesOf } from "./vendor-parts.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = path.join(root, "docs", "ARCHITECTURE.md");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const cell = (text) => String(text).replace(/\|/g, "/").replace(/\s+/g, " ").trim();

/** A source file's leading doc comment's first sentence, its exported names, and the modules it imports, read by TypeScript's parser. */
export function describeModule(rel) {
	const text = read(rel);
	const file = ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
	const lead = /^\/\*\*([\s\S]*?)\*\//.exec(text)?.[1].replace(/^\s*\* ?/gm, "").replace(/\s+/g, " ").trim() ?? "";
	const duty = lead.split(/(?<=\.) /)[0].replace(/\.$/, "");
	const exported = [];
	const imports = [];
	for (const s of file.statements) {
		const isExported = ts.canHaveModifiers(s) && (ts.getModifiers(s) ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
		if (isExported && (ts.isFunctionDeclaration(s) || ts.isInterfaceDeclaration(s) || ts.isTypeAliasDeclaration(s)) && s.name) exported.push(s.name.text);
		if (isExported && ts.isVariableStatement(s)) for (const d of s.declarationList.declarations) if (ts.isIdentifier(d.name)) exported.push(d.name.text);
		if ((ts.isImportDeclaration(s) || ts.isExportDeclaration(s)) && s.moduleSpecifier && ts.isStringLiteral(s.moduleSpecifier)) imports.push(s.moduleSpecifier.text);
	}
	return { duty, exported, imports: [...new Set(imports)] };
}

/** The gate's last results, or null when the gate has not run here. */
function gateResults() {
	const file = path.join(root, ".gate", "results.json");
	return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : null;
}

/** Derives the whole document. */
export async function deriveArchitecture() {
	const pkg = JSON.parse(read("package.json"));
	const lock = JSON.parse(read("package-lock.json"));
	const folder = `v${pkg.version}`;
	const siteApp = path.join(root, "site", folder, "app");
	if (!fs.existsSync(siteApp)) throw new Error("generate-architecture: the site is not built; run npm run build");
	const load = (name) => import(pathToFileURL(path.join(siteApp, name)).href);
	const bindings = await load("input-bindings.js");
	const plans = await load("keyboard-plans.js");
	const painter = await load("picture-painter.js");
	const state = await load("picture-state.js");
	const headers = JSON.parse(read("tools/response-headers.json"));
	const targetRevision = /Revision (\d+),/.exec(read("docs/ARCHITECTURE-TARGET.md"))?.[1] ?? "unknown";
	const decisions = [...read("docs/DECISIONS.md").matchAll(/^## (\d{4}) - (.+)$/gm)].map((m) => [m[1], m[2]]);
	const results = gateResults();
	const out = [];
	const line = (...l) => out.push(...l);

	line("---", "instant: current", "---", "", "# input-tester - system architecture, current", "");
	line("**Instant: current.** input-tester as its code and its gate's last run show it, derived by `tools/generate-architecture.mjs` and never written by hand.\\");
	line(`Its reasoning -- identity, justification, alignment and decisions -- is the target's, \`docs/ARCHITECTURE-TARGET.md\` revision ${targetRevision}, which this document cites and never restates.\\`);
	line("Every section is derived; each changes when the code, the gate's results or the records it is read from change, and `npm run gate` fails while this file differs from what the generator derives.", "", "---", "");

	line("## 1. Status", "", "| Field | Value |", "|---|---|");
	line(`| Version | \`${pkg.version}\`, its release folder \`${folder}\` |`);
	line(`| Target it builds | \`docs/ARCHITECTURE-TARGET.md\`, revision ${targetRevision} |`);
	line(`| Rulings recorded | ${decisions.map(([id]) => `\`${id}\``).join(", ")}, in \`docs/DECISIONS.md\` |`);
	line(`| The gate's last run | ${results === null ? "not run here" : results.steps.every((s) => s.passed) ? `every one of its ${results.steps.length} steps passed` : `failed at ${results.steps.filter((s) => !s.passed).map((s) => s.name).join(", ")}`} |`, "", "---", "");

	line("## 2. The shared parts composed", "", "Each pinned by its release file and hash in `package-lock.json`, vendored unchanged into `vendor/`, and imported by relative path from the release's `vendor` folder (IT-D1).", "");
	line("| Part | Version pinned | Release file | Files vendored |", "|---|---|---|---|");
	for (const part of SHARED_PARTS) {
		const entry = lock.packages[`node_modules/@apnex/${part}`];
		line(`| \`${part}\` | \`${entry.version}\` | \`${entry.resolved.split("/").pop()}\` | ${vendoredFilesOf(part).length} |`);
	}
	line("", "---", "");

	line("## 3. The anchored core, as built", "", "Each part's duty is the first sentence of its module's leading comment; its exports and imports are read from its source.", "");
	line("| Module | Duty | Exports | Imports |", "|---|---|---|---|");
	const modules = fs.readdirSync(path.join(root, "src")).filter((f) => f.endsWith(".ts")).sort();
	for (const m of modules) {
		const d = describeModule(`src/${m}`);
		line(`| \`src/${m}\` | ${cell(d.duty)} | ${d.exported.map((e) => `\`${e}\``).join(", ") || "none"} | ${d.imports.map((i) => `\`${i}\``).join(", ")} |`);
	}
	line(`| \`page/index.html\` | The entry document: its stylesheet and its one module script, both in the release's folder, and the plans to choose | none | \`${folder}/input-tester.css\`, \`${folder}/app/page-entry.js\` |`, "", "---", "");

	line("## 4. The binding table, as composed", "", `${bindings.TESTER_ROWS.length} rows, in the legend's order, composed by \`input-binding\` from \`src/input-bindings.ts\`; a row claims when its \`claims\` flag is true, and a press row opens the gesture its \`gesture\` field names.`, "");
	line("| Row | Words in the legend | Claims | Opens | Proved by |", "|---|---|---|---|---|");
	for (const r of bindings.TESTER_ROWS) line(`| \`${r.id}\` | ${cell(r.words)} | ${r.claims ? "yes" : "no"} | ${r.gesture ? `\`${r.gesture}\`` : "--"} | ${r.proof.join(" and ")} |`);
	line("", "The browser's own keys, left unclaimed on every platform at once:", "");
	line("| Code | Shift | Ctrl | Alt | Meta | Platform | Does |", "|---|---|---|---|---|---|---|");
	const held = (v) => (v === null ? "either" : v ? "held" : "not held");
	for (const k of bindings.BROWSERS_OWN_KEYS) line(`| \`${k.code}\` | ${held(k.shift)} | ${held(k.ctrl)} | ${held(k.alt)} | ${held(k.meta)} | ${k.platform} | ${k.does} |`);
	const session = bindings.TESTER_SESSION_DECLARATION;
	line("", `The session's threshold is ${session.threshold} drawing units; its gestures are ${session.gestures.map((g) => `\`${g.name}\` (button ${g.button}${g.engaged ? ", engaged" : ""})`).join(", ")}.`, "", "---", "");

	line("## 5. The picture and the page", "", `The scene's layers, back to front: ${painter.SCENE_LAYERS.map((l) => `\`${l.name}\`${l.attrs["pointer-events"] === "none" ? " (looked through)" : ""}`).join(", ")}.\\`);
	line(`The painter's shapes are of the tags ${painter.PAINTER_TAGS.map((t) => `\`${t}\``).join(", ")}, with the attributes ${painter.PAINTER_ATTRIBUTES.map((a) => `\`${a}\``).join(", ")}.\\`);
	line(`The log keeps ${state.LOG_LINES} lines; the buttons drawn follow the \`buttons\` of a mouse's ${state.BUTTONS_REPORTED_BY.map((t) => `\`${t}\``).join(", ")} and of a \`wheel\`.`, "");
	line("| Plan | Keys drawn | Codes of Chromium's own | Keys carrying a note |", "|---|---|---|---|");
	for (const p of Object.values(plans.KEYBOARD_PLANS)) line(`| \`${p.name}\`, ${p.title} | ${p.keys.length} | ${p.keys.filter((k) => k.codeSource === "chromium").map((k) => `\`${k.code}\``).join(", ") || "none"} | ${p.keys.filter((k) => k.notes.length > 0).length} |`);
	line("", "What no page can know, shown always:", "");
	for (const l of painter.NOT_REPORTED_LINES) line(`- ${l}`);
	line("", "---", "");

	line("## 6. Verification, as the gate's last run found it", "");
	if (results === null) line("The gate has not run here; run `npm run gate`.");
	else {
		line("| Step | Holds | Result | Tests |", "|---|---|---|---|");
		for (const s of results.steps) line(`| ${s.name} | ${cell(s.holds)} | ${s.passed ? "pass" : "FAIL"} | ${s.tests === undefined ? "--" : `${s.pass} of ${s.tests} passed`} |`);
	}
	line("", "---", "");

	line("## 7. Delivery and hosting", "");
	line(`Every response carries the rule, \`${cell(headers.headers["Content-Security-Policy"])}\`, with \`Referrer-Policy: ${headers.headers["Referrer-Policy"]}\` and \`X-Content-Type-Options: ${headers.headers["X-Content-Type-Options"]}\` (\`tools/response-headers.json\`).\\`);
	line(`A release's folder is copied with \`Cache-Control: ${headers.cacheControl.folder}\` and its entry with \`${headers.cacheControl.entry}\`.`);
	const release = readRelease(path.join(root, "site"));
	const steps = deploySteps(release, [{ name: "lab" }, { name: "production" }]);
	line("", `A deploy of this release is ${steps.length} steps (\`tools/deploy-steps.mjs\`): for the lab and then production, ${release.files.length} folder objects copied where none is, the folder checked through the host, the entry copied -- the one object a deploy replaces -- and the entry, a missing object's 404, the edge cache and the smoke run checked; no step deletes.\\`);
	line(`The release workflow is \`.github/workflows/release.yml\`${fs.existsSync(path.join(root, ".github", "workflows", "release.yml")) ? "" : ", absent"}; the gate's is \`.github/workflows/gate.yml\`${fs.existsSync(path.join(root, ".github", "workflows", "gate.yml")) ? "" : ", absent"}.`, "", "---", "");

	line("## 8. Owed and open", "", "The open rows of `docs/BACKLOG.md`, each with its revival trigger there.", "");
	const backlogTables = tablesOf(read("docs/BACKLOG.md"));
	const workarounds = backlogTables.find((t) => t.header[1] === "workaround");
	line(`Workarounds open: ${workarounds ? workarounds.rows.filter((r) => r.cells[4] === "open").length : "no table"}.`, "");
	const open = backlogTables.filter((t) => t.header.at(-1) === "revival trigger").flatMap((t) => t.rows);
	line("| Row | Finding |", "|---|---|");
	for (const r of open) line(`| ${r.cells[0]} | ${cell(r.cells[1])} |`);
	line("", "---", "");

	line("## 9. Decisions", "", "| Ruling | Title |", "|---|---|");
	for (const [id, title] of decisions) line(`| \`${id}\` | ${cell(title)} |`);
	return `${out.join("\n")}\n`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const check = process.argv.includes("--check");
	try {
		const derived = await deriveArchitecture();
		const current = fs.existsSync(target) ? fs.readFileSync(target, "utf8") : null;
		if (check) {
			if (current !== derived) {
				console.log("generate-architecture: FAIL -- docs/ARCHITECTURE.md is not what the code and the gate's results derive; run npm run architecture after the gate");
				process.exit(1);
			}
			console.log("generate-architecture: PASS -- docs/ARCHITECTURE.md is what the code and the gate's last results derive");
		} else {
			fs.writeFileSync(target, derived);
			console.log("generate-architecture: docs/ARCHITECTURE.md derived");
		}
	} catch (error) {
		console.log(error.message);
		process.exit(1);
	}
}

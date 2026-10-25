// containment - the request monitor's judgement (docs/ARCHITECTURE-TARGET.md section 8, Containment; P4): of
// every request a page made from before its navigation through teardown, the entry comes first, then each file
// the page loads from the release once -- its stylesheet and every module its one module script reaches -- and
// nothing after, a request the browser rule refused counted as a request all the same. Used by the gate's
// containment test and by the deploy's smoke run against a host.
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

/** The files a page loads from a release: its stylesheet, and every module its one module script reaches by static import -- `import` and `export ... from`, never a dynamic `import()`, which GT1's source check refuses, as paths from the site's root. */
export function filesThePageLoads(siteDir) {
	const entry = fs.readFileSync(path.join(siteDir, "index.html"), "utf8");
	const sheets = [...entry.matchAll(/<link rel="stylesheet" href="([^"]+)">/g)].map((m) => m[1]);
	const scripts = [...entry.matchAll(/<script type="module" src="([^"]+)"><\/script>/g)].map((m) => m[1]);
	if (sheets.length !== 1 || scripts.length !== 1) throw new Error(`containment: the entry names ${sheets.length} stylesheet(s) and ${scripts.length} module script(s), not one of each`);
	const seen = new Set();
	const visit = (rel) => {
		if (seen.has(rel)) return;
		seen.add(rel);
		const text = fs.readFileSync(path.join(siteDir, rel), "utf8");
		const file = ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, false, ts.ScriptKind.JS);
		const specifiers = file.statements.filter((n) => (ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) && n.moduleSpecifier && ts.isStringLiteral(n.moduleSpecifier)).map((n) => n.moduleSpecifier.text);
		for (const fileName of specifiers) {
			if (!fileName.startsWith("./") && !fileName.startsWith("../")) throw new Error(`containment: ${rel} imports ${fileName}, not by relative path`);
			visit(path.posix.normalize(path.posix.join(path.posix.dirname(rel), fileName)));
		}
	};
	visit(scripts[0]);
	return [sheets[0], ...[...seen].sort()];
}

/**
 * Every way a page's requests break containment: `requests` as the browser's monitor saw them, `{ url, blocked }`,
 * in order; `origin` the page's own; `loads` the files the page loads from the release. An empty list passes.
 */
export function containmentProblems(requests, { origin, loads }) {
	const problems = [];
	const [first, ...rest] = requests;
	const entryPath = (url) => {
		const u = new URL(url);
		return u.origin === origin && (u.pathname === "/" || u.pathname === "/index.html") ? u : null;
	};
	if (first === undefined || entryPath(first.url) === null) problems.push(`the first request is not the entry: ${first?.url ?? "none"}`);
	const wanted = new Set(loads.map((f) => `${origin}/${f}`));
	const seen = new Map();
	for (const r of rest) {
		const u = new URL(r.url);
		const bare = `${u.origin}${u.pathname}`;
		if (!wanted.has(bare) || u.search !== "" || u.hash !== "") problems.push(`a request that is no file of the release: ${r.url}${r.blocked ? ` (refused: ${r.blocked})` : ""}`);
		else seen.set(bare, (seen.get(bare) ?? 0) + 1);
	}
	for (const [url, n] of seen) if (n > 1) problems.push(`${url} requested ${n} times, not once`);
	for (const url of wanted) if (!seen.has(url)) problems.push(`${url} never requested: the page did not load it`);
	return problems;
}

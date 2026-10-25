#!/usr/bin/env node
// check-source - the source check (docs/ARCHITECTURE-TARGET.md GT1, P4): fails when `src/` names a network
// interface, a navigation, storage, a clock, a timer or a source of chance, or a dynamic import, or makes or
// writes an element but through `vector-scene` -- so what the browser rule cannot stop (a same-origin script,
// stylesheet or prefetch, a navigation carrying data in its address) has no way into the tester's code.
//
// Each file under src/ is parsed by TypeScript, and the walk finds, in source order:
// - a free name of a network interface, a navigation, storage, a clock, a timer, a source of chance or code
//   made from text -- `fetch`, `location`, `localStorage`, `Date`, `setTimeout`, `eval` and the rest below;
// - a member of that kind, however reached -- `.sendBeacon`, `.location`, `.cookie` -- and every member that
//   makes, inserts or writes an element -- `.createElement`, `.appendChild`, `.innerHTML`, `.setAttribute`,
//   `.style` -- by name or by a string in brackets;
// - a member of `navigator` other than `keyboard` and `userAgentData`, the two the tester reads;
// - `Math.random`, and a dynamic `import()`;
// - an ambient declaration (`declare`) or a triple-slash directive, which could bring any of these back.
// It also checks that tsconfig.json compiles `src` alone, with the ES2022 and DOM libraries and no others.
//
// Usage:  node tools/check-source.mjs [DIR_OR_FILE ...]    (default: src)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Free names the source may not hold: network interfaces, navigation, storage, clocks, timers, chance, and code made from text. */
export const FORBIDDEN_NAMES = Object.freeze(["fetch", "XMLHttpRequest", "WebSocket", "WebTransport", "EventSource", "RTCPeerConnection", "BroadcastChannel", "Worker", "SharedWorker", "Request", "Image", "Audio", "FontFace", "importScripts", "postMessage", "open", "location", "history", "navigation", "localStorage", "sessionStorage", "indexedDB", "caches", "cookieStore", "Date", "performance", "setTimeout", "setInterval", "setImmediate", "clearTimeout", "clearInterval", "requestAnimationFrame", "requestIdleCallback", "queueMicrotask", "Temporal", "Intl", "crypto", "eval", "Function"]);

/** Members the source may not reach, however reached: those same powers, and every way to make, insert or write an element but through the scene. */
export const FORBIDDEN_MEMBERS = Object.freeze(["fetch", "sendBeacon", "serviceWorker", "open", "location", "history", "navigation", "reload", "cookie", "localStorage", "sessionStorage", "indexedDB", "caches", "storage", "href", "src", "action", "submit", "createElement", "createElementNS", "createTextNode", "createDocumentFragment", "innerHTML", "outerHTML", "insertAdjacentHTML", "insertAdjacentElement", "insertAdjacentText", "write", "writeln", "appendChild", "append", "prepend", "insertBefore", "replaceChild", "replaceChildren", "replaceWith", "cloneNode", "importNode", "adoptNode", "attachShadow", "setAttribute", "setAttributeNS", "removeAttribute", "style", "className", "classList", "textContent", "innerText", "outerText", "random", "now"]);

/** The members of `navigator` the tester reads: the Keyboard Map and the browser's brands. */
export const NAVIGATOR_MEMBERS = Object.freeze(["keyboard", "userAgentData"]);

/** The text of a string literal or a template with no substitution, or undefined. */
const literalText = (node) => (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) ? node.text : undefined);

/** Whether an identifier is a name being declared or a property's own name, not a reference to a free name. */
function isDeclaredOrPropertyName(node) {
	const p = node.parent;
	if (!p) return false;
	if ((ts.isPropertyAccessExpression(p) || ts.isPropertyAccessChain?.(p)) && p.name === node) return true;
	if ((ts.isPropertyAssignment(p) || ts.isPropertySignature(p) || ts.isPropertyDeclaration(p) || ts.isMethodDeclaration(p) || ts.isMethodSignature(p) || ts.isGetAccessor(p) || ts.isSetAccessor(p) || ts.isEnumMember(p)) && p.name === node) return true;
	if (ts.isBindingElement(p) && p.propertyName === node) return true;
	if ((ts.isImportSpecifier(p) || ts.isExportSpecifier(p)) && (p.propertyName === node || p.name === node)) return true;
	if (ts.isQualifiedName(p) && p.right === node) return true;
	if ((ts.isVariableDeclaration(p) || ts.isParameter(p) || ts.isFunctionDeclaration(p) || ts.isClassDeclaration(p) || ts.isInterfaceDeclaration(p) || ts.isTypeAliasDeclaration(p) || ts.isBindingElement(p) || ts.isTypeParameterDeclaration(p)) && p.name === node) return true;
	return false;
}

/** Every finding in one source file's text: [{ line, finding }], in source order. */
export function findSourceProblems(source, fileName = "source.ts") {
	const file = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
	const diagnostics = file.parseDiagnostics ?? [];
	if (diagnostics.length) return [{ line: file.getLineAndCharacterOfPosition(diagnostics[0].start ?? 0).line + 1, finding: `TypeScript could not parse the file: ${ts.flattenDiagnosticMessageText(diagnostics[0].messageText, " ")}` }];
	const found = [];
	const lineOf = (node) => file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1;
	const visit = (node) => {
		if (ts.isIdentifier(node) && FORBIDDEN_NAMES.includes(node.text) && !isDeclaredOrPropertyName(node) && !ts.isTypeReferenceNode(node.parent)) found.push({ line: lineOf(node), finding: `names ${node.text}` });
		if (ts.isPropertyAccessExpression(node)) {
			const name = node.name.text;
			if (FORBIDDEN_MEMBERS.includes(name)) found.push({ line: lineOf(node), finding: `reaches the member ${name}` });
			if (ts.isIdentifier(node.expression) && node.expression.text === "navigator" && !NAVIGATOR_MEMBERS.includes(name)) found.push({ line: lineOf(node), finding: `reaches navigator.${name}` });
		}
		if (ts.isElementAccessExpression(node)) {
			const name = literalText(node.argumentExpression);
			if (name === undefined) {
				if (ts.isIdentifier(node.expression) && ["navigator", "window", "document", "globalThis", "self"].includes(node.expression.text)) found.push({ line: lineOf(node), finding: `reaches a member of ${node.expression.text} by a computed name` });
			} else if (FORBIDDEN_MEMBERS.includes(name) || FORBIDDEN_NAMES.includes(name)) found.push({ line: lineOf(node), finding: `reaches the member ${name} by brackets` });
		}
		if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) found.push({ line: lineOf(node), finding: "imports dynamically" });
		const modifiers = ts.canHaveModifiers(node) ? (ts.getModifiers(node) ?? []) : [];
		if (modifiers.some((m) => m.kind === ts.SyntaxKind.DeclareKeyword)) found.push({ line: lineOf(node), finding: "declares with `declare`" });
		ts.forEachChild(node, visit);
	};
	visit(file);
	if (file.referencedFiles.length || file.typeReferenceDirectives.length || file.libReferenceDirectives.length || /^\s*\/\/\/\s*</m.test(source)) found.push({ line: 1, finding: "holds a triple-slash directive" });
	return found.sort((a, b) => a.line - b.line);
}

/** Every problem with tsconfig.json that could widen what the source may name: it compiles `src` alone, with the ES2022 and DOM libraries. */
export function findConfigProblems(config) {
	const problems = [];
	const options = config.compilerOptions ?? {};
	if (JSON.stringify(options.lib) !== JSON.stringify(["ES2022", "DOM"])) problems.push(`compilerOptions.lib is ${JSON.stringify(options.lib)}, not ["ES2022", "DOM"]`);
	if (JSON.stringify(options.types) !== JSON.stringify([])) problems.push(`compilerOptions.types is ${JSON.stringify(options.types)}, not []`);
	if (JSON.stringify(config.include) !== JSON.stringify(["src"])) problems.push(`include is ${JSON.stringify(config.include)}, not ["src"]`);
	for (const key of ["extends", "files", "references"]) if (config[key] !== undefined) problems.push(`it names ${key}`);
	return problems;
}

function filesUnder(target) {
	if (!fs.existsSync(target)) return [];
	if (fs.statSync(target).isFile()) return [target];
	return fs.readdirSync(target, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1)).flatMap((e) => filesUnder(path.join(target, e.name)));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const targets = process.argv.slice(2);
	const files = (targets.length ? targets : [path.join(root, "src")]).flatMap((t) => filesUnder(path.resolve(t))).filter((f) => /\.[mc]?ts$/.test(f));
	const problems = [];
	if (files.length === 0) problems.push("no source file found, so nothing was checked");
	for (const file of files) for (const f of findSourceProblems(fs.readFileSync(file, "utf8"), path.basename(file))) problems.push(`${path.relative(process.cwd(), file)}:${f.line}: ${f.finding}`);
	if (targets.length === 0) for (const p of findConfigProblems(JSON.parse(fs.readFileSync(path.join(root, "tsconfig.json"), "utf8")))) problems.push(`tsconfig.json: ${p}`);
	for (const p of problems) console.log(`  ${p}`);
	if (problems.length) {
		console.log(`check-source: FAIL -- ${problems.length} problem(s): the source reaches what GT1 refuses`);
		process.exit(1);
	}
	console.log(`check-source: PASS -- ${files.length} file(s) name no network interface, navigation, storage, clock, timer or dynamic import, and make no element but through vector-scene`);
}

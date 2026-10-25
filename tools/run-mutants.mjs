#!/usr/bin/env node
// run-mutants - every mutant planted against the tester and its gate, and the test that must fail it
// (docs/DECISIONS.md 0002; mission-kit's W5, a test able to fail): each mutant's edit is applied in place, the
// site rebuilt when the edit is to what the site is built from, the named tests run, and the edit taken back; a
// mutant the tests pass survives, and the run fails. Not a gate step -- it runs the browser tests many times
// over -- but the record of which test kills what.
//
// Usage:  node tools/run-mutants.mjs [ID ...]    (default: every mutant)
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Each mutant: its id, what it breaks, the file and the text it replaces, and the tests that must fail it. */
export const MUTANTS = [
	["M1", "the first press ignores another key held", "src/input-bindings.ts", "when: (c) => !c.otherHeld,", "when: (c) => true,", ["test/table-overlaps.test.js"]],
	["M2", "a browser's own key is a keyed fact", "src/input-bindings.ts", '&& fact.code !== "" && !isBrowsersOwnKey(fact);', '&& fact.code !== "";', ["test/table-overlaps.test.js"]],
	["M3", "F5 with Alt held is the browser's own", "src/input-bindings.ts", '{ code: "F5", shift: null, ctrl: null, alt: false,', '{ code: "F5", shift: null, ctrl: null, alt: null,', ["test/table-overlaps.test.js"]],
	["M4", "a chorded press reads its button's bit clear", "src/input-bindings.ts", "((f.buttons as number) & (BUTTON_BITS[f.button] as number)) !== 0", "((f.buttons as number) & (BUTTON_BITS[f.button] as number)) === 0", ["test/table-overlaps.test.js"]],
	["M5", "a button's release is not claimed", "src/input-bindings.ts", "on: (f) => isMouseFact(f, \"up\") && f.button === button, claims: true", "on: (f) => isMouseFact(f, \"up\") && f.button === button, claims: false", ["test/browser/rows.test.js"]],
	["M6", "the threshold is 5 drawing units", "src/input-bindings.ts", "threshold: 4,", "threshold: 5,", ["test/browser/rows.test.js"]],
	["M7", "the drag is become from the move's point", "src/input-router.ts", "session.becomeGesture({ gesture: drag })", "session.becomeGesture({ gesture: drag, from: fact.at })", ["test/worked-verdicts.test.js"]],
	["M8", "a mouse press takes no pointer", "src/input-router.ts", "\t\t\treply.takePointer();\n", "", ["test/worked-verdicts.test.js"]],
	["M9", "nothing is claimed", "src/input-router.ts", "if (claimed) reply.claim();", "if (claimed && false) reply.claim();", ["test/worked-verdicts.test.js"]],
	["M10", "focus lost leaves the gesture live", "src/input-router.ts", 'const pointer = step({ operation: "pointerLost", outcome: session.pointerLost(), derived: null });\n\t\t\treturn verdictOf(fact, claimed, trace, [keys, pointer]);', "return verdictOf(fact, claimed, trace, [keys]);", ["test/worked-verdicts.test.js"]],
	["M11", "a modifier held makes another key's press a roll-over", "src/input-router.ts", "heldKeys.some((held) => held !== code && !isModifierCode(held))", "heldKeys.some((held) => held !== code)", ["test/browser/rows.test.js"]],
	["M12", "repeats are not counted", "src/picture-state.ts", "repeats: before.repeats + 1,", "repeats: before.repeats,", ["test/picture-state.test.js"]],
	["M13", "the repeat interval is taken from the first fact", "src/picture-state.ts", "interval: timeBetween(before.latest.time, fact.time)", "interval: timeBetween(before.firstTime, fact.time)", ["test/picture-state.test.js"]],
	["M14", "wheel facts of another unit are alike", "src/picture-state.ts", "a.deltaMode === b.deltaMode && ", "", ["test/picture-state.test.js"]],
	["M15", "the buttons drawn follow boundary facts", "src/picture-state.ts", '["down", "move", "up", "cancel", "context-menu"]', '["down", "move", "up", "cancel", "context-menu", "over", "out", "leave"]', ["test/picture-state.test.js"]],
	["M16", "a hold first seen repeating is not 'at least'", "src/picture-state.ts", 'before.firstSeen === "repeat"));', "false));", ["test/picture-state.test.js"]],
	["M17", "a lit key's look by a style attribute", "src/picture-painter.ts", '{ tag: "g", attrs: { class: lit ? "key lit" : "key" }, children }', '{ tag: "g", attrs: { class: lit ? "key lit" : "key", style: "opacity: 1" }, children }', ["test/painter-allowlist.test.js"]],
	["M18", "a shape taking an address", "src/picture-painter.ts", '{ tag: "path", attrs: { d, class: lit ? "wheel lit" : "wheel" } }', '{ tag: "image", attrs: { href: "wheel.png", class: lit ? "wheel lit" : "wheel" } }', ["test/painter-allowlist.test.js"]],
	["M19", "the paint deferred past the delivery", "src/composition-root.ts", "paintPictureChanges(scene, view, previous, picture, applied.changed);", "void Promise.resolve().then(() => paintPictureChanges(scene, view, previous, picture, applied.changed));", ["test/painter-allowlist.test.js"]],
	["M20", "a page closed before the map answers paints", "src/composition-root.ts", "if (map === null || closed) return;", "if (map === null) return;", ["test/painter-allowlist.test.js"]],
	["M21", "every browser counts as covered", "src/composition-root.ts", 'return browser.userAgentData?.brands?.some((b) => b.brand === "Chromium") === true;', "return true;", ["test/browser/rows.test.js"]],
	["M22", "a key's code mistyped", "src/keyboard-plans.ts", '[["KeyQ", "Q"],', '[["KeyQQ", "Q"],', ["test/keyboard-plans.test.js"]],
	["M23", "a Chromium code marked a UI Events code value", "src/keyboard-plans.ts", 'chromiumKey("ZoomToggle", "Full", 19, 0, 5, 4,', 'key("ZoomToggle", "Full", 19, 0, 5, 4,', ["test/keyboard-plans.test.js"]],
	["M24", "a key's rect one position short", "src/keyboard-plans.ts", "const to = Object.freeze({ col: col + width, row: row + height });", "const to = Object.freeze({ col: col + width - 1, row: row + height });", ["test/keyboard-plans.test.js"]],
	["M25", "a reported label marked assumed", "src/key-labels.ts", '{ text: reported, source: "reported" as const }', '{ text: reported, source: "assumed" as const }', ["test/keyboard-plans.test.js"]],
	["M26", "the entry copied before the folder", "tools/deploy-steps.mjs", '\t\tfor (const f of release.files) steps.push({ target, kind: "copy-folder-object", name: f.name });\n\t\tsteps.push({ target, kind: "check-folder" });\n\t\tsteps.push({ target, kind: "copy-entry", name: "index.html" });', '\t\tsteps.push({ target, kind: "copy-entry", name: "index.html" });\n\t\tfor (const f of release.files) steps.push({ target, kind: "copy-folder-object", name: f.name });\n\t\tsteps.push({ target, kind: "check-folder" });', ["test/browser/deploy-sequence.test.js"]],
	["M27", "a differing object replaced", "tools/deploy-steps.mjs", "if (sha256(present) !== file.sha256) throw new Error(", "if (false) throw new Error(", ["test/browser/deploy-sequence.test.js"]],
	["M28", "the rule's headers not checked through the host", "tools/deploy-steps.mjs", "for (const [header, value] of Object.entries(headers)) if (", "for (const [header, value] of Object.entries({})) if (", ["test/browser/deploy-sequence.test.js"]],
	["M29", "the source check lets fetch through", "tools/check-source.mjs", '["fetch", "XMLHttpRequest",', '["XMLHttpRequest",', ["test/tools/gate-checks.test.js"]],
	["M30", "the vocabulary check lets a listed word through", "tools/check-vocabulary.mjs", "if (owner.has(candidate)) return candidate;", "if (owner.has(candidate) && candidate !== \"layout\") return candidate;", ["test/tools/gate-checks.test.js"]],
	["M31", "the backlog check never finds a release installed", "tools/check-backlog.mjs", "if (x[i] !== y[i]) return x[i] > y[i];\n\treturn true;", "return false;", ["test/tools/gate-checks.test.js"]],
	["M32", "the monitor ignores a request the rule refused", "test/support/containment.js", "\tfor (const r of rest) {", "\tfor (const r of rest.filter((x) => x.blocked === null)) {", ["test/browser/containment.test.js"]],
	["M33", "an inline script in the entry", "page/index.html", "</body>", "<script>window.inlineRan = true;</script>\n</body>", ["test/release-layout.test.js"]],
	["M34", "the rule without script-src", "tools/response-headers.json", "default-src 'none'; script-src 'self'; style-src", "default-src 'none'; style-src", ["test/browser/containment.test.js"]],
	["M35", "the browser's own keys claimed", "src/input-bindings.ts", 'on: (f) => isBrowsersOwnKey(f), claims: false', 'on: (f) => isBrowsersOwnKey(f), claims: true', ["test/table-overlaps.test.js"]],
	["M36", "the vendoring check passes any bytes", "tools/vendor-parts.mjs", "else if (!fs.readFileSync(copy).equals(fs.readFileSync(file.source)))", "else if (false)", ["test/tools/gate-checks.test.js"]],
	["M37", "a pen's press routed to the session", "src/composition-root.ts", 'return fact.pointerType === "mouse" ? router.routeMousePress(fact, reply) : router.routeFactAlone(fact, reply);', 'return fact.pointerType !== "touch" ? router.routeMousePress(fact, reply) : router.routeFactAlone(fact, reply);', ["test/picture-state.test.js"]],
	["M38", "a held key never relit", "src/picture-painter.ts", "for (const code of keysLitChanged(previous, picture)) {", "for (const code of []) {", ["test/browser/rows.test.js"]],
	["M39", "a delivery slower than the bound by 12 ms", "src/composition-root.ts", "const verdict = routeByFamily(router, fact, reply);", "for (const until = performance.now() + 12; performance.now() < until; );\n        const verdict = routeByFamily(router, fact, reply);", ["test/browser/immediacy.test.js"]],
	["M40", "the overlap space without the fixtures' facts", "src/input-bindings.ts", "for (const buttons of [null, ...Array.from({ length: 32 }, (_, i) => i)])", "for (const buttons of Array.from({ length: 32 }, (_, i) => i))", ["test/table-overlaps.test.js"]],
];

const rebuilds = (file) => file.startsWith("src/") || file.startsWith("page/");
const node = process.execPath;

/** Runs one mutant: applies its edit, rebuilds when needed, runs its tests, and takes the edit back. Answers whether the tests failed it. */
function runMutant([id, what, file, find, replace, tests]) {
	const full = path.join(root, file);
	const original = fs.readFileSync(full, "utf8");
	const found = original.split(find).length - 1;
	if (found !== 1) return { id, what, killed: false, note: `its text was found ${found} time(s), so nothing was planted` };
	try {
		fs.writeFileSync(full, original.replace(find, replace));
		if (rebuilds(file)) {
			const build = spawnSync(node, ["tools/build-site.mjs"], { cwd: root, encoding: "utf8" });
			if (build.status !== 0) return { id, what, killed: true, note: "the build refused it" };
		}
		const run = spawnSync(node, ["--test", "--test-concurrency=1", "--test-reporter=tap", ...tests], { cwd: root, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
		const failed = /^# fail (\d+)$/m.exec(run.stdout)?.[1] ?? "?";
		return { id, what, killed: run.status !== 0, note: `${tests.join(", ")}: ${failed} failing` };
	} finally {
		fs.writeFileSync(full, original);
	}
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const only = process.argv.slice(2);
	const results = MUTANTS.filter((m) => only.length === 0 || only.includes(m[0])).map((m) => {
		const r = runMutant(m);
		console.log(`${r.id}  ${r.killed ? "killed  " : "SURVIVED"}  ${r.what} -- ${r.note}`);
		return r;
	});
	spawnSync(node, ["tools/build-site.mjs"], { cwd: root, encoding: "utf8" });
	const survived = results.filter((r) => !r.killed);
	console.log(`run-mutants: ${survived.length ? "FAIL" : "PASS"} -- ${results.length - survived.length} of ${results.length} mutants killed${survived.length ? `; survived: ${survived.map((r) => r.id).join(", ")}` : ""}`);
	process.exit(survived.length ? 1 : 0);
}

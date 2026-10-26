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
	["M4", "a chorded press reads its button's bit clear", "src/input-bindings.ts", "((f.buttons as number) & bitOfButton(f.button)) !== 0", "((f.buttons as number) & bitOfButton(f.button)) === 0", ["test/table-overlaps.test.js"]],
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
	["M27", "a differing object replaced", "tools/deploy-steps.mjs", "if (sha256(present.bytes) !== file.sha256) throw new Error(", "if (false) throw new Error(", ["test/browser/deploy-sequence.test.js"]],
	["M28", "the rule's headers not checked through the host", "tools/deploy-steps.mjs", "for (const [header, value] of Object.entries(headers)) if (response.headers[header.toLowerCase()] !== value) problems.push(`${name}: ${header}", "for (const [header, value] of Object.entries({})) if (response.headers[header.toLowerCase()] !== value) problems.push(`${name}: ${header}", ["test/browser/deploy-sequence.test.js"]],
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
	// review A's mutants, each a survivor of the first release's gate
	["MU1", "buttons drawn ignore a mouse cancel's buttons", "src/picture-state.ts", 'Object.freeze(["down", "move", "up", "cancel", "context-menu"])', 'Object.freeze(["down", "move", "up", "context-menu"])', ["test/picture-state.test.js"]],
	["MU2", "a mouse cancel never reaches pointerLost", "src/composition-root.ts", 'return fact.pointerType === "mouse" ? router.routeMouseCancel(fact, reply) : router.routeFactAlone(fact, reply);', "return router.routeFactAlone(fact, reply);", ["test/picture-state.test.js"]],
	["MU3", "otherHeld counts the fact's own code", "src/input-router.ts", "heldKeys.some((held) => held !== code && !isModifierCode(held))", "heldKeys.some((held) => !isModifierCode(held))", ["test/picture-state.test.js"]],
	["MU4", "wheel lines ignore the sign of deltaX", "src/picture-state.ts", " && signOf(a.deltaX) === signOf(b.deltaX)", "", ["test/picture-state.test.js"]],
	["MU5", "macOS Meta+Alt+J dropped from the browser's own keys", "src/input-bindings.ts", '\t\t{ code: "KeyJ", shift: false, ctrl: false, alt: true, meta: true, platform: "macOS", does: "developer tools" },\n', "", ["test/table-overlaps.test.js"]],
	["MU6", "Meta is no chord modifier", "src/input-bindings.ts", "fact.ctrlKey || fact.altKey || fact.metaKey;", "fact.ctrlKey || fact.altKey;", ["test/table-overlaps.test.js"]],
	["MU7", "the wheel sideways only rightward", "src/input-bindings.ts", "f.deltaY === 0 && f.deltaX !== 0, claims: true", "f.deltaY === 0 && f.deltaX > 0, claims: true", ["test/table-overlaps.test.js"]],
	["MU8", "the context menu not claimed", "src/input-bindings.ts", 'on: (f) => f.type === "context-menu", claims: true', 'on: (f) => f.type === "context-menu", claims: false', ["test/table-overlaps.test.js"]],
	["MU8c", "the context menu not claimed, against trusted input", "src/input-bindings.ts", 'on: (f) => f.type === "context-menu", claims: true', 'on: (f) => f.type === "context-menu", claims: false', ["test/browser/rows.test.js"]],
	["MU9", "a chorded press not claimed", "src/input-bindings.ts", "bitOfButton(f.button)) !== 0, claims: true", "bitOfButton(f.button)) !== 0, claims: false", ["test/table-overlaps.test.js"]],
	["MU10", "the status line not repainted when only the buttons change", "src/picture-painter.ts", '["heldKeys", "unidentifiedKey", "buttons", "gesture", "press", "under"]', '["heldKeys", "unidentifiedKey", "gesture", "press", "under"]', ["test/picture-state.test.js"]],
	["MU11", "the item under the pointer never updates", "src/picture-state.ts", "const under = fact.at !== null && !touchOrPen && !sameItem(picture.under, fact.hit) ? fact.hit : picture.under;", "const under = picture.under;", ["test/picture-state.test.js"]],
	["MU12", "MetaRight no modifier code", "src/input-bindings.ts", '"MetaLeft", "MetaRight"]', '"MetaLeft"]', ["test/table-overlaps.test.js"]],
	["MU13", "a chord naming button 4 matches no chord row", "src/input-bindings.ts", "fact.button >= 0 && fact.button <= 4;", "fact.button >= 0 && fact.button <= 3;", ["test/table-overlaps.test.js"]],
	["MU14", "a commit's derived fact always a click", "src/input-router.ts", "gesture: outcome.gesture.name, trigger: outcome.trigger });", 'gesture: outcome.gesture.name, trigger: "click" });', ["test/worked-verdicts.test.js"]],
	["MU15", "hit without IT-D4's itemAt fallback", "src/composition-root.ts", "hit: (target, fact) => scene.itemOf(target) ?? scene.itemAt(fact.screen),", "hit: (target) => scene.itemOf(target),", ["test/picture-state.test.js"]],
	["MU15c", "hit without IT-D4's itemAt fallback, against trusted input", "src/composition-root.ts", "hit: (target, fact) => scene.itemOf(target) ?? scene.itemAt(fact.screen),", "hit: (target) => scene.itemOf(target),", ["test/browser/rows.test.js"]],
	// the reviews' other findings, each now held
	["R1", "the browser's own keys matched by code alone, not by the letter a key prints", "src/input-bindings.ts", 'return letter !== null && typeof fact.key === "string" && fact.key.toLowerCase() === letter;', "return false;", ["test/table-overlaps.test.js"]],
	["R2", "view source not among the browser's own keys", "src/input-bindings.ts", '\t\t{ code: "KeyU", shift: false, ctrl: true, alt: false, meta: false, platform: "Windows, Linux, ChromeOS", does: "view source" },\n', "", ["test/table-overlaps.test.js"]],
	["R3", "a touch's or a pen's fact changes the item under the pointer", "src/picture-state.ts", 'const touchOrPen = "pointerType" in fact && (fact.pointerType === "touch" || fact.pointerType === "pen");', "const touchOrPen = false;", ["test/picture-state.test.js"]],
	["R4", "held keys past three dropped unsaid", "src/picture-painter.ts", "if (more.length > 0) lines.splice(HELD_KEY_LINES, lines.length, `and ${more.length} more held: ${more.map((k) => k.code).join(\" \")}`);", "if (more.length > 0) lines.splice(HELD_KEY_LINES, lines.length);", ["test/picture-state.test.js"]],
	["R5", "a threshold shown that is not the session's", "src/composition-root.ts", "threshold: openedSession.session.declaration.threshold,", "threshold: 5,", ["test/picture-state.test.js"]],
	["R6", "GT9 judged at the maximum", "test/browser/immediacy.test.js", "return { p95: nearestRank(took, 0.95),", "return { p95: nearestRank(took, 1),", ["test/browser/immediacy.test.js"]],
	["R7", "the gate's failure blocks without their YAML", "tools/run-gate.mjs", 'if (/^\\s*---$/.test(lines[j] ?? "")) {', "if (false) {", ["test/tools/run-gate.test.js"]],
	// review B's mutants of the deploy, each a survivor of the first release's gate
	["B-L", "the deploy's byte check through the host disabled", "tools/deploy-steps.mjs", "else if (sha256(response.body) !== digest) problems.push(", "else if (false) problems.push(", ["test/browser/deploy-sequence.test.js"]],
	["B-G", "the deploy's Cache-Control check disabled", "tools/deploy-steps.mjs", 'if (response.headers["cache-control"] !== cacheControl) problems.push(', "if (false) problems.push(", ["test/browser/deploy-sequence.test.js"]],
	["B-A", "the entry copied before the folder is checked", "tools/deploy-steps.mjs", '\t\tsteps.push({ target, kind: "check-folder" });\n\t\tsteps.push({ target, kind: "copy-entry", name: "index.html" });', '\t\tsteps.push({ target, kind: "copy-entry", name: "index.html" });\n\t\tsteps.push({ target, kind: "check-folder" });', ["test/browser/deploy-sequence.test.js"]],
	["B-B", "production's folder unchecked", "tools/deploy-steps.mjs", '\t\tsteps.push({ target, kind: "check-folder" });\n', '\t\tif (target.name !== "production") steps.push({ target, kind: "check-folder" });\n', ["test/browser/deploy-sequence.test.js"]],
	["B-Q", "every object copied text/plain", "tools/deploy-steps.mjs", "{ cacheControl: folderCache, contentType: contentTypeOf(step.name), replace: false, generation: 0 }", '{ cacheControl: folderCache, contentType: "text/plain; charset=utf-8", replace: false, generation: 0 }', ["test/browser/deploy-sequence.test.js"]],
	["B-C", "the entry copied as a folder object is, never replacing", "tools/deploy-steps.mjs", '{ cacheControl: entryCache, contentType: contentTypeOf("index.html"), replace: true, generation }', '{ cacheControl: entryCache, contentType: contentTypeOf("index.html"), replace: false, generation: 0 }', ["test/browser/deploy-sequence.test.js"]],
	["B-D", "the gcloud wrapper copies under --no-clobber", "tools/deploy", 'await run("gcloud", ["storage", "cp", `--if-generation-match=${generation}`,', 'await run("gcloud", ["storage", "cp", "--no-clobber",', ["test/browser/deploy-cli.test.js"]],
	["B-N", "any gcloud error taken as a missing object", "tools/deploy", 'if (/not found: 404\\./.test(String(error.stderr ?? ""))) return null;', "return null;", ["test/browser/deploy-cli.test.js"]],
	["B-T", "the release not checked against its tag's attached manifest", "tools/deploy", "\t\tawait checkReleaseIsTags(release, options.tag, options.repo);\n", "", ["test/browser/deploy-cli.test.js"]],
	["B-O", "the release directory read only as the first argument", "tools/deploy", "} else positional.push(arg);", "} else if (i === 0) positional.push(arg);", ["test/browser/deploy-cli.test.js"]],
	["B-6", "a missing object's 404 not checked for the rule", "tools/deploy-steps.mjs", "problems.push(...missingObjectProblems(await host.get(target.host, missing), missing, rule.headers));", "await host.get(target.host, missing);", ["test/browser/deploy-sequence.test.js"]],
	["B-M", "the archive's file modes left to the umask", "tools/pack-release.mjs", '"--mode=u=rwX,go=rX", ', "", ["test/tools/pack-release.test.js"]],
	["B-P", "the public-text check lets a hex identifier stand anywhere in a workflow", "tools/check-public-text.mjs", "const kept = workflow && ACTION_PIN.test(line) ? line.replace(ACTION_PIN.exec(line)[1], \"\") : line;", "const kept = workflow ? line.replace(/[0-9a-f]{40}/, \"\") : line;", ["test/tools/gate-checks.test.js"]],
	// review A's confirming pass: three test gaps, each now held
	["N2", "the overlap space without the letters r and U", "src/input-bindings.ts", 'Object.freeze(["x", "r", "I", "j", "C", "f", "U", null]);', 'Object.freeze(["x", "I", "j", "C", "f", null]);', ["test/table-overlaps.test.js"]],
	["N3", "a touch's or a pen's fact moves the drag line's end", "src/picture-state.ts", "const pointerAt = isMouse ? fact.at : picture.pointerAt;", 'const pointerAt = isMouse || ("pointerType" in fact && (fact.pointerType === "pen" || fact.pointerType === "touch")) ? fact.at : picture.pointerAt;', ["test/picture-state.test.js"]],
	["N4", "the driver names a move's held button only when it is the left, so Chrome drops the other buttons' drags", "test/browser/tester-in-chrome.js", "const i = BUTTON_BITS.findIndex((bit) => (buttons & bit) !== 0);", "const i = (buttons & 1) !== 0 ? 0 : -1;", ["test/browser/rows.test.js"]],
	// review B's confirming pass
	["B-I", "the deploy's smoke run takes its request monitor from the browser tests' helper, which loads the built site", "tools/smoke-run.mjs", 'import { watchRequests } from "../test/browser/request-monitor.js";', 'import { watchRequests } from "../test/browser/tester-in-chrome.js";', ["test/tools/deploy-imports.test.js"]],
	["B-K", "a workflow's checkout persists the token in .git/config", ".github/workflows/release.yml", "          repository: apnex/mission-kit\n          path: .mission-kit\n          persist-credentials: false\n", "          repository: apnex/mission-kit\n          path: .mission-kit\n", ["test/tools/workflows.test.js"]],
	// GitHub's newer Chrome refuses a worker by an error event, not a throw
	["W1", "the header rule without worker-src 'none'", "tools/response-headers.json", " worker-src 'none';", "", ["test/browser/containment.test.js"]],
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

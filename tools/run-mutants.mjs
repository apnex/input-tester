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
	["M6", "the threshold is 5 screen pixels", "src/input-bindings.ts", "threshold: 4,", "threshold: 5,", ["test/browser/rows.test.js"]],
	["M7", "the drag is become from the move's point", "src/input-router.ts", "session.becomeGesture({ gesture: pan ?? drag })", "session.becomeGesture({ gesture: pan ?? drag, from: fact.screen })", ["test/worked-verdicts.test.js"]],
	["M8", "a mouse press takes no pointer", "src/input-router.ts", "if (match === null || !panOfRow.has(match.id)) reply.takePointer();", "", ["test/worked-verdicts.test.js"]],
	["M9", "nothing is claimed", "src/input-router.ts", "if (claimed) reply.claim();", "if (claimed && false) reply.claim();", ["test/worked-verdicts.test.js"]],
	["M10", "focus lost leaves the gesture live", "src/input-router.ts", 'const pointer = step({ operation: "pointerLost", outcome: session.pointerLost(), derived: null });\n\t\t\treturn verdictOf(fact, claimed, trace, [keys, pointer]);', "return verdictOf(fact, claimed, trace, [keys]);", ["test/worked-verdicts.test.js"]],
	["M11", "a modifier held makes another key's press a roll-over", "src/input-router.ts", "state.keys.some((held) => held !== code && !isModifierCode(held))", "state.keys.some((held) => held !== code)", ["test/browser/rows.test.js"]],
	["M12", "repeats are not counted", "src/picture-state.ts", "repeats: before.repeats + 1,", "repeats: before.repeats,", ["test/picture-state.test.js"]],
	["M13", "the repeat interval is taken from the first fact", "src/picture-state.ts", "interval: timeBetween(before.latest.time, fact.time)", "interval: timeBetween(before.firstTime, fact.time)", ["test/picture-state.test.js"]],
	["M14", "wheel facts of another unit are alike", "src/picture-state.ts", "a.deltaMode === b.deltaMode && ", "", ["test/picture-state.test.js"]],
	["M15", "the buttons drawn follow boundary facts", "src/picture-state.ts", '["down", "move", "up", "cancel", "context-menu"]', '["down", "move", "up", "cancel", "context-menu", "over", "out", "leave"]', ["test/picture-state.test.js"]],
	["M16", "a hold first seen repeating is not 'at least'", "src/picture-state.ts", 'before.firstSeen === "repeat"));', "false));", ["test/picture-state.test.js"]],
	["M17", "a lit key's look by a style attribute", "src/picture-painter.ts", '{ tag: "g", attrs: { class: lit ? "key lit" : "key" }, children }', '{ tag: "g", attrs: { class: lit ? "key lit" : "key", style: "opacity: 1" }, children }', ["test/painter-allowlist.test.js"]],
	["M18", "a shape taking an address", "src/picture-painter.ts", '{ tag: "path", attrs: { d, class: lit ? "wheel lit" : "wheel" } }', '{ tag: "image", attrs: { href: "wheel.png", class: lit ? "wheel lit" : "wheel" } }', ["test/painter-allowlist.test.js"]],
	["M19", "the paint deferred past the delivery", "src/composition-root.ts", "paintPictureChanges(scene, view, previous, picture, changed);", "void Promise.resolve().then(() => paintPictureChanges(scene, view, previous, picture, changed));", ["test/painter-allowlist.test.js"]],
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
	["MU3", "otherHeld counts the fact's own code", "src/input-router.ts", "state.keys.some((held) => held !== code && !isModifierCode(held))", "state.keys.some((held) => !isModifierCode(held))", ["test/picture-state.test.js"]],
	["MU4", "wheel lines ignore the sign of deltaX", "src/picture-state.ts", " && signOf(a.deltaX) === signOf(b.deltaX)", "", ["test/picture-state.test.js"]],
	["MU5", "macOS Meta+Alt+J dropped from the browser's own keys", "src/input-bindings.ts", '\t\t{ code: "KeyJ", shift: false, ctrl: false, alt: true, meta: true, platform: "macOS", does: "developer tools" },\n', "", ["test/table-overlaps.test.js"]],
	["MU6", "Meta is no chord modifier", "src/input-bindings.ts", "fact.ctrlKey || fact.altKey || fact.metaKey;", "fact.ctrlKey || fact.altKey;", ["test/table-overlaps.test.js"]],
	["MU7", "a scroll pan for a vertical delta only, the sideways wheel's row retired by 0007", "src/input-bindings.ts", "on: (f) => isWheel(f, false), claims: true", "on: (f) => isWheel(f, false) && f.deltaY !== 0, claims: true", ["test/table-overlaps.test.js"]],
	["MU8", "the context menu not claimed", "src/input-bindings.ts", 'on: (f) => f.type === "context-menu", claims: true', 'on: (f) => f.type === "context-menu", claims: false', ["test/table-overlaps.test.js"]],
	["MU8c", "the context menu not claimed, against trusted input", "src/input-bindings.ts", 'on: (f) => f.type === "context-menu", claims: true', 'on: (f) => f.type === "context-menu", claims: false', ["test/browser/rows.test.js"]],
	["MU9", "a chorded press not claimed", "src/input-bindings.ts", "bitOfButton(f.button)) !== 0, claims: true", "bitOfButton(f.button)) !== 0, claims: false", ["test/table-overlaps.test.js"]],
	["MU10", "the status line not repainted when only the buttons change", "src/picture-painter.ts", '["heldKeys", "unidentifiedKey", "buttons", "gesture", "press", "under"]', '["heldKeys", "unidentifiedKey", "gesture", "press", "under"]', ["test/picture-state.test.js"]],
	["MU11", "the item under the pointer never updates", "src/picture-state.ts", "const under = fact.at !== null && !touchOrPen && surface.fromPane !== true && !sameItem(picture.under, fact.hit) ? fact.hit : picture.under;", "const under = picture.under;", ["test/picture-state.test.js"]],
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
	["N2", "the overlap space without the letters r and U", "src/input-bindings.ts", 'Object.freeze(["x", "r", "I", "j", "C", "f", "U", "=", "+", "-", "h", null]);', 'Object.freeze(["x", "I", "j", "C", "f", "=", "+", "-", "h", null]);', ["test/table-overlaps.test.js"]],
	["N3", "a touch's or a pen's fact moves the drag line's end", "src/picture-state.ts", "const pointerAt = isMouse && surface.fromPane !== true ? fact.at : picture.pointerAt;", 'const pointerAt = (isMouse || ("pointerType" in fact && (fact.pointerType === "pen" || fact.pointerType === "touch"))) && surface.fromPane !== true ? fact.at : picture.pointerAt;', ["test/picture-state.test.js"]],
	["N4", "the driver names a move's held button only when it is the left, so Chrome drops the other buttons' drags", "test/browser/tester-in-chrome.js", "mouseEventParams(type, point, options)", 'mouseEventParams(type, point, { ...options, button: options.button ?? (type === "mouseMoved" && ((options.buttons ?? 0) & 1) !== 0 ? "left" : "none") })', ["test/browser/rows.test.js"]],
	// review B's confirming pass
	["B-I", "the deploy's smoke run takes its request monitor from the browser tests' helper, which loads the built site", "tools/smoke-run.mjs", 'import { watchRequests } from "../test/browser/request-monitor.js";', 'import { watchRequests } from "../test/browser/tester-in-chrome.js";', ["test/tools/deploy-imports.test.js"]],
	["B-K", "a workflow's checkout persists the token in .git/config", ".github/workflows/release.yml", "          repository: apnex/mission-kit\n          path: .mission-kit\n          persist-credentials: false\n", "          repository: apnex/mission-kit\n          path: .mission-kit\n", ["test/tools/workflows.test.js"]],
	// GitHub's newer Chrome refuses a worker by an error event, not a throw
	["W1", "the header rule without worker-src 'none'", "tools/response-headers.json", " worker-src 'none';", "", ["test/browser/containment.test.js"]],
	["M40", "the overlap space without the fixtures' facts", "src/input-bindings.ts", "for (const buttons of [null, ...Array.from({ length: 32 }, (_, i) => i)])", "for (const buttons of Array.from({ length: 32 }, (_, i) => i))", ["test/table-overlaps.test.js"]],
	["M41", "a right press pans off open ground", "src/input-bindings.ts", "const panRightWhen = (c: TesterContext): boolean => !c.gestureLive && c.openGround;", "const panRightWhen = (c: TesterContext): boolean => !c.gestureLive;", ["test/table-overlaps.test.js"]],
	["M42", "a pan takes the pointer at its press", "src/input-router.ts", "if (match === null || !panOfRow.has(match.id)) reply.takePointer();", "reply.takePointer();", ["test/worked-verdicts.test.js"]],
	["M43", "a pan engages as a drag", "src/input-router.ts", "session.becomeGesture({ gesture: pan ?? drag })", "session.becomeGesture({ gesture: drag })", ["test/worked-verdicts.test.js"]],
	["M44", "the session measures drawing units", "src/input-bindings.ts", 'measure: "screen",', 'measure: "at",', ["test/worked-verdicts.test.js"]],
	["M45", "the pinch keeps its held pixels across a change of sign", "src/view-steps.ts", "let held = delta !== 0 && acc !== 0 && Math.sign(delta) !== Math.sign(acc) ? 0 : acc;", "let held = acc;", ["test/worked-verdicts.test.js"]],
	["M46", "a wheel's line is one pixel", "src/view-steps.ts", "if (deltaMode === 1) return delta * LINE_PIXELS;", "if (deltaMode === 1) return delta;", ["test/worked-verdicts.test.js"]],
	["M47", "focus lost keeps the pinch's held pixels", "src/picture-state.ts", 'if (step.operation === "keysLost" && view.acc !== 0) return', 'if (false) return', ["test/worked-verdicts.test.js"]],
	["M48", "a drawn mouse button counted as open ground (move 5's verifier, v3)", "src/input-router.ts", 'openGround: fact.hit === null || fact.hit.layer === "precision" });', 'openGround: fact.hit === null || fact.hit.layer === "precision" || fact.hit.key.startsWith("mouse button") });', ["test/browser/rows.test.js"]],
	["M49", "a scroll pan sets the pinch's held pixels to 0 (move 5's verifier, v5)", "src/picture-state.ts", "return Object.freeze({ ...view, words });", "return Object.freeze({ ...view, acc: 0, words });", ["test/worked-verdicts.test.js"]],
	["M50", "the view's words on one line at the legend's height, as move 5 first drew them", "src/picture-painter.ts", 'scene.put("panel", "view line", [columnText(viewLinesY(picture), "view-line", viewLines(picture))]);', 'scene.put("panel", "view line", [text(MOUSE_TEXT_X, 271, "view-line", viewLines(picture).join(" | "))]);', ["test/browser/panel-layout.test.js"]],
	["M51", "the wheel's words on one line, as v0.1.0 drew them", "src/picture-painter.ts", "return wrapWords(words, MOUSE_COLUMN_CHARACTERS);", "return [words];", ["test/browser/panel-layout.test.js"]],
	["M52", "a fixed room of three wheel lines above the view's (move 5's re-review, w2)", "src/picture-painter.ts", "Math.max(WHEEL_ROOM_LINES, wheelLines(picture).length)", "(WHEEL_ROOM_LINES - 1)", ["test/browser/panel-layout.test.js"]],
	["M53", "a column's lines all at one height (move 5's re-review, w4)", "src/picture-painter.ts", "attrs: { x: MOUSE_TEXT_X, y: y + i * MOUSE_COLUMN_LEADING }", "attrs: { x: MOUSE_TEXT_X, y }", ["test/browser/panel-layout.test.js"]],
	["M54", "the log's entries each on one line, unwrapped, as 0008 drew them", "src/picture-painter.ts", "const lines = entry === undefined ? [] : wrapWords(logLineWords(entry, view), LOG_CHARACTERS);", "const lines = entry === undefined ? [] : [logLineWords(entry, view)];", ["test/browser/panel-layout.test.js"]],
	["M55", "every legend row on one line, the pinch's as 0008 drew it", "src/picture-painter.ts", "if (words.length <= width) return [words];", "return [words];", ["test/browser/panel-layout.test.js"]],
	["M56", "the status line's press point written exact, not to a tenth (move 5's targeted check, B4)", "src/picture-painter.ts", "press from screen ${tenthWords(picture.press.at.x)}, ${tenthWords(picture.press.at.y)}", "press from screen ${picture.press.at.x}, ${picture.press.at.y}", ["test/browser/panel-layout.test.js"]],
	["M57", "the status lines unwrapped", "src/picture-painter.ts", "statusWords(picture, view.threshold).flatMap((line) => wrapWords(line, LEFT_COLUMN_CHARACTERS))", "statusWords(picture, view.threshold)", ["test/browser/panel-layout.test.js"]],
	["M58", "the held keys' lines unwrapped", "src/picture-painter.ts", "heldKeyLines(picture).flatMap((line) => wrapWords(line, LEFT_COLUMN_CHARACTERS))", "heldKeyLines(picture)", ["test/browser/panel-layout.test.js"]],
	["M59", "the held keys at a fixed place, whatever the status lines' count", "src/picture-painter.ts", "const heldY = Math.max(statusY + 36, statusY + (status.length - 1) * FLOW_LEADING + 20);", "const heldY = statusY + 36;", ["test/browser/panel-layout.test.js"]],
	["M60", "the log's heading at a fixed place, whatever the held keys' count", "src/picture-painter.ts", "const headingY = Math.max(heldY + 84, heldY + (held.length - 1) * FLOW_LEADING + 20);", "const headingY = heldY + 84;", ["test/browser/panel-layout.test.js"]],
	["M61", "the plan line unwrapped, the address's plan name with it", "src/picture-painter.ts", 'const plan = view.notices.planLine.split("\\n").flatMap((line) => wrapWords(line, LEFT_COLUMN_CHARACTERS));', 'const plan = view.notices.planLine.split("\\n");', ["test/browser/panel-layout.test.js"]],
	["M62", "a word longer than a line left whole", "src/picture-painter.ts", "(word.length <= width ? [word] :", "(true ? [word] :", ["test/browser/panel-layout.test.js"]],
	["M63", "room for exactly four wheel lines above the view's (move 5's bounded-layout check, b4)", "src/picture-painter.ts", "Math.max(WHEEL_ROOM_LINES, wheelLines(picture).length)", "WHEEL_ROOM_LINES", ["test/browser/panel-layout.test.js"]],
	["M64", "the view's pan line unwrapped", "src/picture-painter.ts", 'panWords, words ?? "no view row yet"].flatMap((line) => wrapWords(line, MOUSE_COLUMN_CHARACTERS));', 'panWords, ...wrapWords(words ?? "no view row yet", MOUSE_COLUMN_CHARACTERS)];', ["test/browser/panel-layout.test.js"]],
	["M65", "a refused capture's problems not drawn (move 5's bounded-layout check, B5)", "src/picture-painter.ts", '	if (head.problems.length > 0) scene.put("panel", "problems", [leftText(head.problemsY, "problems", head.problems, NOTICE_LEADING)]);\n', "", ["test/painter-allowlist.test.js"]],
	["M66", "the early path draws nothing: paintRefusedOpening puts no problems (move 5's check, p2)", "src/picture-painter.ts", '	scene.put("panel", "problems", [leftText(LEFT_COLUMN_TOP, "problems", problemLines(problems), NOTICE_LEADING)]);\n', "", ["test/painter-allowlist.test.js", "test/browser/panel-layout.test.js"]],
	["M67", "the early path draws nothing: the composition root never calls paintRefusedOpening (move 5's check, p2)", "src/composition-root.ts", "		paintRefusedOpening(scene, problems);\n", "", ["test/painter-allowlist.test.js", "test/browser/panel-layout.test.js"]],
	["M68", "the problems left unwrapped (move 5's check, p3)", "src/picture-painter.ts", "problems.flatMap((p) => wrapWords(p, LEFT_COLUMN_CHARACTERS));", "[...problems];", ["test/painter-allowlist.test.js", "test/browser/panel-layout.test.js"]],
	["M69", "the status lines not moved below the problems (move 5's check, p4)", "src/picture-painter.ts", "flowTop: problemsY + problems.length * NOTICE_LEADING + 12", "flowTop: problemsY + 12", ["test/painter-allowlist.test.js", "test/browser/panel-layout.test.js"]],
	["M70", "a view key also a first press: the first press's complement dropped (move 6a)", "src/input-bindings.ts", '{ id: "key-first-press", words: "a first press", on: (f) => isFreshPress(f) && !isModifierCode(f.code) && !chordModifierHeld(f) && viewKeyVerb(f) === null,', '{ id: "key-first-press", words: "a first press", on: (f) => isFreshPress(f) && !isModifierCode(f.code) && !chordModifierHeld(f),', ["test/table-overlaps.test.js"]],
	["M71", "a scroll pan moves the centre by its pixels, not over the scale (move 6a)", "src/picture-state.ts", "centre: Object.freeze({ x: view.centre.x + dx / scale, y: view.centre.y + dy / scale })", "centre: Object.freeze({ x: view.centre.x + dx, y: view.centre.y + dy })", ["test/worked-verdicts.test.js"]],
	["M72", "a pan moves the centre with the pointer, the drawing the other way (move 6a)", "src/picture-state.ts", "x: pan.centreFrom.x - (screen.x - pan.from.x) / scale, y: pan.centreFrom.y - (screen.y - pan.from.y) / scale", "x: pan.centreFrom.x + (screen.x - pan.from.x) / scale, y: pan.centreFrom.y + (screen.y - pan.from.y) / scale", ["test/worked-verdicts.test.js"]],
	["M73", "a pinch on the pane steps about the pane's centre, not keeping the point under the pointer (move 6a)", "src/picture-state.ts", "const keepsPointer = !paneLaidOut(pane) || onPane(pane, fact.screen);", "const keepsPointer = !paneLaidOut(pane);", ["test/worked-verdicts.test.js", "test/browser/view-pane.test.js"]],
	["M74", "home keeps the centre (move 6a, PZ6)", "src/picture-state.ts", 'set({ x: 0, y: 0 }, view.level, `${by}, home:', 'set(view.centre, view.level, `${by}, home:', ["test/worked-verdicts.test.js"]],
	["M75", "the pane draws no grid when its view moves (move 6a, PZ24)", "src/view-pane.ts", "				if (gridStale(view.level, visible)) drawGrid(view.level, visible);\n", "", ["test/browser/view-pane.test.js"]],
	["M76", "the pane shows every level at the default's scale (move 6a, PZ12)", "src/view-steps.ts", "return Math.min(pane.width / DEFAULT_FRAME.w, pane.height / DEFAULT_FRAME.h) / level;", "return Math.min(pane.width / DEFAULT_FRAME.w, pane.height / DEFAULT_FRAME.h);", ["test/worked-verdicts.test.js", "test/browser/view-pane.test.js"]],
	["M77", "a precision button brings the centre a cell off its line (move 6b, PZ31)", "src/picture-state.ts", "set({ x: distance, y: 0 }, nearest,", "set({ x: distance + 60, y: 0 }, nearest,", ["test/worked-verdicts.test.js"]],
	["M78", "the pane's readout never finds where a precision line is hit (move 6b, PZ31)", "src/view-pane.ts", "if (scene.itemAt({ x: expected + k / 8, y })?.key === `line ${distance}`) hit = k / 8;", "if (scene.itemAt({ x: expected + k / 8, y })?.key === `line ${distance}`) hit = null;", ["test/browser/view-pane.test.js", "test/browser/guide-examples.test.js"]],
	["M79", "the pane shown only when the view changes, so a resize is never followed (move 6b)", "src/composition-root.ts", "		pane?.show(picture.view, paneGeometry);\n	}", "		if (changed.has(\"view\")) pane?.show(picture.view, paneGeometry);\n	}", ["test/browser/view-pane.test.js"]],
	["M80", "the view's scale not shown beside its level (move 6b)", "src/picture-painter.ts", 'scale ${scale === null ? "not yet known" : Math.round(scale * 10000) / 10000}`', '`', ["test/worked-verdicts.test.js"]],
	["M81", "the large pane's split not applied when the layout is large (move 6b)", "page/input-tester.css", "#view-large:checked ~ main #view-pane-box { flex-basis: 48vw; flex-basis: round(down, 48vw, 1px); }\n", "", ["test/browser/view-pane.test.js"]],
	["M82", "each pan move measured from the centre the last move left, not from where the pan engaged (move 6's verifier, m2)", "src/picture-state.ts", "x: pan.centreFrom.x - (screen.x - pan.from.x) / scale, y: pan.centreFrom.y - (screen.y - pan.from.y) / scale", "x: view.centre.x - (screen.x - pan.from.x) / scale, y: view.centre.y - (screen.y - pan.from.y) / scale", ["test/worked-verdicts.test.js"]],
	["M83", "the large layout not set from the address before the first paint (move 6's verifier, B1)", "src/page-entry.ts", 'large.checked = new URL(document.URL).hash === "#view";', "large.checked = false;", ["test/browser/view-pane.test.js"]],
	["M84", "the header's buttons set the layout but leave the pane for the next input to mend (move 6's verifier, B1)", "src/composition-root.ts", "			const applied = applyPaneGeometry(previous, paneGeometry);\n			picture = applied.picture;\n			paintChanges(previous, applied.changed, paneGeometry);\n", "", ["test/browser/view-pane.test.js"]],
	["M85", "a precision line counted as a thing, not ground, so a right drag on it never pans (move 6's verifier, S2)", "src/input-router.ts", 'openGround: fact.hit === null || fact.hit.layer === "precision" });', "openGround: fact.hit === null });", ["test/browser/view-pane.test.js"]],
	["M86", "the first paint without the pane's scale (move 6's verifier, low)", "src/composition-root.ts", "	if (pane !== null) picture = applyPaneGeometry(picture, pane.geometry()).picture;\n", "", ["test/worked-verdicts.test.js", "test/browser/view-pane.test.js"]],
	["M87", "the pane's height a constant below the header, as before, so a taller header scrolls the page (move 6's re-review, L1)", "page/input-tester.css", "flex-basis: round(down, 20vw, 1px); align-self: stretch; }", "flex-basis: round(down, 20vw, 1px); height: calc(100vh - 70px); }", ["test/browser/view-pane.test.js"]],
	["M88", "the header held at 46 pixels tall, so its wrapped line runs under the picture and its buttons cannot be pressed (the targeted check's x1)", "page/input-tester.css", "header { flex: 0 0 auto; padding: 8px 16px; }", "header { flex: 0 0 auto; padding: 8px 16px; height: 46px; }", ["test/browser/view-pane.test.js"]],
	["M89", "the grid thinned again to a least spacing of 24 pixels (0016)", "src/view-pane.ts", "const listing = grid.inView({ region, scale: visible.scale }, { minSpacing: 0,", "const listing = grid.inView({ region, scale: visible.scale }, { minSpacing: 24,", ["test/browser/view-pane.test.js"]],
	["M90", "the emphasis not anchored at the origin, a cell off (0016)", "src/view-steps.ts", "col % interval === 0 && row % interval === 0", "(col + 1) % interval === 0 && (row + 1) % interval === 0", ["test/browser/view-pane.test.js"]],
	["M91", "the faded points at an opacity of 1 (0016)", "src/view-steps.ts", "export const GRID_FADE = 0.5;", "export const GRID_FADE = 1;", ["test/browser/view-pane.test.js"]],
	["M92", "the listing's bound raised past 10,000, so the view is listed whole at the count's floor (0016)", "src/view-pane.ts", "export const PANE_MAX_DOTS = 10000;", "export const PANE_MAX_DOTS = 1_000_000;", ["test/browser/view-pane.test.js"]],
	["M93", "the spacing's floor ignored: faded points drawn under 4 pixels apart (0016)", "src/view-pane.ts", "const tooClose = spacing < GRID_FLOOR;", "const tooClose = false;", ["test/browser/view-pane.test.js"]],
	["M94", "the emphasis table not the director's: every fifth point at 3x (0016)", "src/view-steps.ts", "{ 0.5: 1, 1: 1, 2: 5, 3: 7 }", "{ 0.5: 1, 1: 1, 2: 5, 3: 5 }", ["test/browser/view-pane.test.js"]],
	["M95", "the grid never drawn again at one level and scale, however far the view goes (0016)", "src/view-pane.ts", "		return (\n			region.x < drawnRegion.x ||", "		return region.x !== region.x && (\n			region.x < drawnRegion.x ||", ["test/browser/view-pane.test.js"]],
	["M96", "a vertical pan never counts as leaving the drawn area (the dots check's y1)", "src/view-pane.ts", "			region.y < drawnRegion.y ||\n			region.x + region.w > drawnRegion.x + drawnRegion.w ||\n			region.y + region.h > drawnRegion.y + drawnRegion.h", "			region.x + region.w > drawnRegion.x + drawnRegion.w", ["test/browser/view-pane.test.js"]],
	["M97", "a left or an up pan never counts as leaving the drawn area (the dots check's y9)", "src/view-pane.ts", "			region.x < drawnRegion.x ||\n			region.y < drawnRegion.y ||\n", "", ["test/browser/view-pane.test.js"]],
	["M98", "the margin never narrowed, so the listing passes 10,000 (the dots check's y2)", "src/view-pane.ts", "		while (margin > 0 && pointsIn(grown(margin), PANE_GRID.pitch) > PANE_MAX_DOTS) margin--;\n", "", ["test/browser/view-pane.test.js"]],
	["M99", "the drawn area recorded as 3 cells beyond the view whatever was drawn (the dots check's y3)", "src/view-pane.ts", "		drawnRegion = region;", "		drawnRegion = grown(PANE_MARGIN_CELLS);", ["test/browser/view-pane.test.js"]],
	["M100", "at the floor, the full points taken from the thinned listing, not the lattice (the dots check's y6)", "src/view-pane.ts", "const lattice = emphasisGrid(interval).inView(", "const lattice = grid.inView(", ["test/browser/view-pane.test.js"]],
	["M101", "no drawing again on a change of scale at the same level (the dots check's y8)", "src/view-pane.ts", "		if (PANE_GRID.pitch * scale !== drawnDots.spacing) return true;\n", "", ["test/browser/view-pane.test.js"]],
	["M102", "the emphasised lattice listed past the bound, never thinned (draw's reading 10, o:F1)", "src/view-pane.ts", "const lattice = emphasisGrid(interval).inView({ region, scale: visible.scale }, { minSpacing: 0, max: PANE_MAX_DOTS });", "const lattice = emphasisGrid(interval).inView({ region, scale: visible.scale }, { minSpacing: 0, max: 1_000_000 });", ["test/browser/view-pane.test.js"]],
	["M103", "every point listed before the spacing is asked, the listing thrown away at the spacing's floor (0017)", "src/view-pane.ts", "		if (!tooClose && !tooMany) {", "		if (!tooMany) {", ["test/browser/view-pane.test.js"]],
	["M104", "the view's count not asked before listing, the listing thrown away at the count's floor (0017)", "src/view-pane.ts", "		let tooMany = inView > PANE_MAX_DOTS;", "		let tooMany = false;", ["test/browser/view-pane.test.js"]],
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

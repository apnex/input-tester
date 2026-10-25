// worked-verdicts - the worked verdicts of docs/ARCHITECTURE-TARGET.md section 6, as tests: each input made as
// events handed to the tester's own composition, `input-capture` opened over a platform of plain objects
// (test/support/fake-platform.js), and each fact's verdict -- the rows it hit, its claim, and every session
// step in order -- held to the table, with the picture it leaves where the table names one.
import assert from "node:assert/strict";
import { test } from "node:test";

import { importBuilt } from "./support/built-site.js";
import { fakePlatform } from "./support/fake-platform.js";

const { composeTesterPage } = await importBuilt("composition-root.js");

/** A fresh page composed on a fake platform. */
function freshPage() {
	const platform = fakePlatform();
	return { platform, page: composeTesterPage(platform) };
}

/** The rows a trace hit, in table order. */
const hitsOf = (trace) => trace.filter((r) => r.hit).map((r) => r.id);

/** Each step of a verdict, as the worked verdicts name it. */
function stepsOf(verdict) {
	return verdict.steps.map(({ operation, outcome, derived }) => {
		const named = { operation, phase: outcome.phase ?? null, gesture: outcome.gesture?.name ?? null };
		if (operation === "resolvePress") Object.assign(named, { taken: outcome.taken, match: outcome.match?.id ?? null, cancelled: outcome.cancelled === null ? null : `${outcome.cancelled.phase} ${outcome.cancelled.gesture?.name}` });
		if (operation === "pointerMove") Object.assign(named, { crossed: outcome.crossed });
		if (operation === "pointerUp") Object.assign(named, { trigger: outcome.trigger, meaning: derived === null ? null : hitsOf(derived.trace) });
		if (operation === "keyDown" || operation === "keyUp") Object.assign(named, { tracked: outcome.tracked, held: outcome.held });
		if (operation === "keysLost") Object.assign(named, { released: [...outcome.released] });
		return named;
	});
}

test("worked verdict: A pressed, nothing held -- a first press; keyDown: tracked, not held before", () => {
	const { platform, page } = freshPage();
	const { claimed } = platform.key("key-down", { key: "a", code: "KeyA" });
	const v = page.latestVerdict;
	assert.deepEqual(hitsOf(v.trace), ["key-first-press"]);
	assert.deepEqual(stepsOf(v), [{ operation: "keyDown", phase: null, gesture: null, tracked: true, held: false }]);
	assert.equal(claimed, true, "claimed, so the browser does nothing with it");
	assert.deepEqual(page.picture.heldKeys.map((k) => [k.code, k.firstSeen, k.repeats]), [["KeyA", "press", 0]]);
});

test("worked verdict: a left click -- a press of button 0 starting press-0, then a release of button 0 committing it, a click, its derived fact a click of button 0", () => {
	const { platform, page } = freshPage();
	const down = platform.pointer("down", { clientX: 100, clientY: 100, button: 0, buttons: 1 });
	assert.deepEqual(down, { claimed: true, taken: true }, "the press claimed and its pointer taken");
	assert.deepEqual(hitsOf(page.latestVerdict.trace), ["button-0-press"]);
	assert.deepEqual(stepsOf(page.latestVerdict), [{ operation: "resolvePress", phase: "start", gesture: "press-0", taken: false, match: "button-0-press", cancelled: null }]);
	platform.pointer("up", { clientX: 100, clientY: 100, button: 0, buttons: 0 });
	assert.deepEqual(hitsOf(page.latestVerdict.trace), ["button-0-release"]);
	assert.deepEqual(stepsOf(page.latestVerdict), [{ operation: "pointerUp", phase: "commit", gesture: "press-0", trigger: "click", meaning: ["button-0-click"] }]);
	assert.deepEqual(page.latestVerdict.steps[0].derived.fact, { type: "commit", gesture: "press-0", trigger: "click" });
	assert.deepEqual(hitsOf(page.picture.legend.meaning), ["button-0-click"], "the legend marks the derived fact's hit as the meaning");
});

test("worked verdict: a left drag -- the move crossing the threshold hits no row; pointerMove: update, crossed; becomeGesture: become drag-0; the release a drop, meaning a drag of button 0", () => {
	const { platform, page } = freshPage();
	platform.pointer("down", { clientX: 100, clientY: 100, button: 0, buttons: 1 });
	platform.pointer("move", { clientX: 103, clientY: 100, button: -1, buttons: 1 });
	assert.deepEqual(stepsOf(page.latestVerdict), [{ operation: "pointerMove", phase: "update", gesture: "press-0", crossed: false }], "three units is within the threshold of four");
	platform.pointer("move", { clientX: 110, clientY: 100, button: -1, buttons: 1 });
	assert.deepEqual(hitsOf(page.latestVerdict.trace), []);
	assert.deepEqual(stepsOf(page.latestVerdict), [
		{ operation: "pointerMove", phase: "update", gesture: "press-0", crossed: true },
		{ operation: "becomeGesture", phase: "become", gesture: "drag-0" },
	]);
	platform.pointer("up", { clientX: 110, clientY: 100, button: 0, buttons: 0 });
	assert.deepEqual(stepsOf(page.latestVerdict), [{ operation: "pointerUp", phase: "commit", gesture: "drag-0", trigger: "drop", meaning: ["button-0-drag"] }]);
});

test("worked verdict: the right button pressed mid-drag, the left released, then the right -- a chorded press, a chorded release, a release of button 2 committing drag-0, meaning a drag of button 0", () => {
	const { platform, page } = freshPage();
	platform.pointer("down", { clientX: 100, clientY: 100, button: 0, buttons: 1 });
	platform.pointer("move", { clientX: 120, clientY: 100, button: -1, buttons: 1 });
	platform.pointer("move", { clientX: 120, clientY: 100, button: 2, buttons: 3 });
	assert.deepEqual(hitsOf(page.latestVerdict.trace), ["chorded-press"]);
	assert.deepEqual(stepsOf(page.latestVerdict), [{ operation: "pointerMove", phase: "update", gesture: "drag-0", crossed: false }]);
	platform.pointer("move", { clientX: 120, clientY: 100, button: 0, buttons: 2 });
	assert.deepEqual(hitsOf(page.latestVerdict.trace), ["chorded-release"]);
	assert.deepEqual(stepsOf(page.latestVerdict), [{ operation: "pointerMove", phase: "update", gesture: "drag-0", crossed: false }]);
	platform.pointer("up", { clientX: 120, clientY: 100, button: 2, buttons: 0 });
	assert.deepEqual(hitsOf(page.latestVerdict.trace), ["button-2-release"]);
	assert.deepEqual(stepsOf(page.latestVerdict), [{ operation: "pointerUp", phase: "commit", gesture: "drag-0", trigger: "drop", meaning: ["button-0-drag"] }]);
	assert.equal(page.picture.buttons, 0, "the buttons drawn follow the facts' buttons");
});

test("worked verdict: Ctrl and the wheel -- Ctrl and wheel, or a touchpad pinch; no step; claimed and drawn", () => {
	const { platform, page } = freshPage();
	const { claimed } = platform.wheel({ ctrlKey: true, deltaY: -12.5 });
	assert.deepEqual(hitsOf(page.latestVerdict.trace), ["ctrl-wheel-or-pinch"]);
	assert.deepEqual(stepsOf(page.latestVerdict), []);
	assert.equal(claimed, true);
	assert.equal(page.picture.wheel.latest.deltaY, -12.5, "drawn with its delta, exact");
});

test("worked verdict: a press of another button while a gesture is still live, its release unseen -- resolvePress: the live gesture cancelled, then press-b started", () => {
	const { platform, page } = freshPage();
	platform.pointer("down", { clientX: 100, clientY: 100, button: 0, buttons: 1 });
	platform.pointer("down", { clientX: 100, clientY: 100, button: 2, buttons: 2 });
	assert.deepEqual(hitsOf(page.latestVerdict.trace), ["button-2-press"]);
	assert.deepEqual(stepsOf(page.latestVerdict), [{ operation: "resolvePress", phase: "start", gesture: "press-2", taken: false, match: "button-2-press", cancelled: "cancel press-0" }]);
	assert.match(page.picture.log[0].notes.join("; "), /cancelled press-0; started press-2/);
});

test("worked verdict: a press of the live gesture's own button, its release unseen -- resolvePress: taken, match never asked, nothing cancelled or started, the gesture still live", () => {
	const { platform, page } = freshPage();
	platform.pointer("down", { clientX: 100, clientY: 100, button: 0, buttons: 1 });
	platform.pointer("down", { clientX: 100, clientY: 100, button: 0, buttons: 1 });
	assert.deepEqual(hitsOf(page.latestVerdict.trace), ["button-0-press"]);
	assert.deepEqual(stepsOf(page.latestVerdict), [{ operation: "resolvePress", phase: null, gesture: null, taken: true, match: null, cancelled: null }]);
	assert.equal(page.latestVerdict.steps[0].outcome.state.gesture.name, "press-0", "the gesture stays live");
	assert.deepEqual([page.picture.gesture.name, page.picture.gesture.live], ["press-0", true]);
});

test("worked verdict: focus lost mid-drag -- focus lost; keysLost; pointerLost: cancel of the drag, its release said not reported", () => {
	const { platform, page } = freshPage();
	platform.key("key-down", { key: "Shift", code: "ShiftLeft", shiftKey: true });
	platform.pointer("down", { clientX: 100, clientY: 100, button: 0, buttons: 1 });
	platform.pointer("move", { clientX: 120, clientY: 100, button: -1, buttons: 1 });
	platform.blur();
	assert.deepEqual(hitsOf(page.latestVerdict.trace), ["focus-lost"]);
	assert.deepEqual(stepsOf(page.latestVerdict), [
		{ operation: "keysLost", phase: null, gesture: null, released: ["ShiftLeft"] },
		{ operation: "pointerLost", phase: "cancel", gesture: "drag-0" },
	]);
	assert.deepEqual(page.picture.heldKeys, [], "every held key unlit");
	assert.equal(page.picture.press, null, "the press ended");
	assert.match(page.picture.log[0].notes.join("; "), /released ShiftLeft: their releases not reported; cancelled drag-0: its release not reported/);
	assert.equal(page.picture.buttons, 1, "a blur never changes the buttons drawn: they follow mouse facts alone");
});

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
	assert.deepEqual(stepsOf(page.latestVerdict), [{ operation: "pointerMove", phase: "update", gesture: "press-0", crossed: false }], "three screen pixels is within the threshold of four");
	platform.pointer("move", { clientX: 110, clientY: 100, button: -1, buttons: 1 });
	assert.deepEqual(hitsOf(page.latestVerdict.trace), []);
	assert.deepEqual(stepsOf(page.latestVerdict), [
		{ operation: "pointerMove", phase: "update", gesture: "press-0", crossed: true },
		{ operation: "becomeGesture", phase: "become", gesture: "drag-0" },
	]);
	platform.pointer("up", { clientX: 110, clientY: 100, button: 0, buttons: 0 });
	assert.deepEqual(stepsOf(page.latestVerdict), [{ operation: "pointerUp", phase: "commit", gesture: "drag-0", trigger: "drop", meaning: ["button-0-drag"] }]);
	assert.deepEqual(page.latestVerdict.steps[0].derived.fact, { type: "commit", gesture: "drag-0", trigger: "drop" }, "the derived fact carries the commit's own trigger");
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

test("worked verdict: Ctrl and the wheel -- a pinch zoom, Ctrl and wheel or a touchpad pinch alike; no step; claimed and drawn; short of a step, the level kept and the delta held", () => {
	const { platform, page } = freshPage();
	const { claimed } = platform.wheel({ ctrlKey: true, deltaY: -12.5 });
	assert.deepEqual(hitsOf(page.latestVerdict.trace), ["pinch-zoom"]);
	assert.deepEqual(stepsOf(page.latestVerdict), []);
	assert.equal(claimed, true);
	assert.equal(page.picture.wheel.latest.deltaY, -12.5, "drawn with its delta, exact");
	assert.deepEqual([page.picture.view.level, page.picture.view.acc], [1, -12.5]);
	assert.match(platform.textOf("view-line"), /^view: 1x, pinch held -12\.5 px \| no pan \| pinch zoom: at 1x, -12\.5 of 100 pixels held toward the next level$/);
});

/** The view's level and the pinch's held pixels, as the picture keeps them. */
const levelAndHeld = (page) => [page.picture.view.level, page.picture.view.acc];

test("worked verdict: a pinch zoom steps one level per 100 pixels -- in to 0.5x about the fact's screen point; one fact of 250 out steps twice, to 2x, keeping 50, and two of 125 step as one; a delta of the other sign starts again; past the farthest level what remains is dropped", () => {
	const { platform, page } = freshPage();
	platform.wheel({ ctrlKey: true, deltaY: -100, clientX: 30, clientY: 40 });
	assert.deepEqual(levelAndHeld(page), [0.5, 0]);
	assert.match(page.picture.view.words, /^pinch zoom: 1x to 0\.5x, 1 level, the scale times 2, about screen 30, 40/);
	assert.match(page.picture.log[0].notes.join("; "), /pinch zoom: 1x to 0\.5x/, "the step logged beside the fact");
	platform.wheel({ ctrlKey: true, deltaY: -10 });
	assert.deepEqual(levelAndHeld(page), [0.5, 0], "no level nearer than 0.5x: dropped");
	assert.match(page.picture.view.words, /at 0\.5x, no level lies that way, so dropped/);
	platform.wheel({ ctrlKey: true, deltaY: 250 });
	assert.deepEqual(levelAndHeld(page), [2, 50]);
	platform.wheel({ ctrlKey: true, deltaY: -60 });
	assert.deepEqual(levelAndHeld(page), [2, -60], "the other sign: the 50 held set to 0 first");
	platform.wheel({ ctrlKey: true, deltaY: 30 });
	assert.deepEqual(levelAndHeld(page), [2, 30]);
	platform.wheel({ ctrlKey: true, deltaY: 170 });
	assert.deepEqual(levelAndHeld(page), [3, 0], "one step to 3x, and the 100 past it dropped");
	assert.match(page.picture.view.words, /2x to 3x, 1 level, the scale times 0\.667, about screen 0, 0, the rest dropped at the last level/);

	const other = freshPage();
	other.platform.wheel({ ctrlKey: true, deltaY: -100 });
	other.platform.wheel({ ctrlKey: true, deltaY: 125 });
	other.platform.wheel({ ctrlKey: true, deltaY: 125 });
	assert.deepEqual(levelAndHeld(other.page), [2, 50], "two facts of 125 step as one of 250");
});

test("worked verdict: a wheel's delta normalised by its unit -- pixels as given, a line 40 pixels, a page the surface's height; a page of a surface whose height is not known moves no view", () => {
	const { platform, page } = freshPage();
	platform.wheel({ deltaX: 3, deltaY: -1, deltaMode: 1 });
	assert.deepEqual(hitsOf(page.latestVerdict.trace), ["scroll-pan"]);
	assert.deepEqual(stepsOf(page.latestVerdict), [], "a scroll pan makes no session step");
	assert.equal(page.picture.view.words, "scroll pan: the centre moved 120, -40 screen pixels, the drawing the other way");
	platform.wheel({ deltaY: 0.5, deltaMode: 2 });
	assert.equal(page.picture.view.words, "scroll pan: the centre moved 0, 450 screen pixels, the drawing the other way", "half a page of a surface 900 high");
	platform.wheel({ ctrlKey: true, deltaY: 3, deltaMode: 1 });
	assert.deepEqual(levelAndHeld(page), [2, 20], "three lines are 120 pixels: one level out, 20 held");
	platform.wheel({ ctrlKey: true, deltaY: 0.25, deltaMode: 2 });
	assert.deepEqual(levelAndHeld(page), [3, 0], "a quarter of a page of 900 is 225: one step, the rest dropped past 3x");

	const unknown = fakePlatform({ clientHeight: null });
	const unknownPage = composeTesterPage(unknown);
	unknown.wheel({ ctrlKey: true, deltaY: 1, deltaMode: 2 });
	assert.deepEqual(levelAndHeld(unknownPage), [1, 0]);
	assert.equal(unknownPage.picture.view.words, "pinch zoom: its unit, or the page's height, not known, so the view kept");
});

test("worked verdict: a middle pan -- a press of button 1, no gesture live, is pan-middle opening press-1, the pointer not taken; 4 screen pixels engage nothing; beyond them becomeGesture: pan-middle, the pointer taken then; the view follows; the release commits pan-middle, a drop, meaning nothing", () => {
	const { platform, page } = freshPage();
	const down = platform.pointer("down", { clientX: 100, clientY: 100, button: 1, buttons: 4 });
	assert.deepEqual(down, { claimed: true, taken: false }, "below the threshold nothing is taken");
	assert.deepEqual(hitsOf(page.latestVerdict.trace), ["pan-middle"]);
	assert.deepEqual(stepsOf(page.latestVerdict), [{ operation: "resolvePress", phase: "start", gesture: "press-1", taken: false, match: "pan-middle", cancelled: null }]);
	const within = platform.pointer("move", { clientX: 104, clientY: 100, button: -1, buttons: 4 });
	assert.equal(within.taken, false);
	assert.deepEqual(stepsOf(page.latestVerdict), [{ operation: "pointerMove", phase: "update", gesture: "press-1", crossed: false }]);
	assert.equal(page.picture.view.pan, null, "no pan before it engages");
	const beyond = platform.pointer("move", { clientX: 105, clientY: 100, button: -1, buttons: 4 });
	assert.equal(beyond.taken, true, "the pointer taken as the pan engages");
	assert.deepEqual(stepsOf(page.latestVerdict), [
		{ operation: "pointerMove", phase: "update", gesture: "press-1", crossed: true },
		{ operation: "becomeGesture", phase: "become", gesture: "pan-middle" },
	]);
	assert.deepEqual(page.picture.view.pan, { gesture: "pan-middle", from: { x: 105, y: 100 }, at: { x: 105, y: 100 }, distance: 0 });
	platform.pointer("move", { clientX: 108, clientY: 104, button: -1, buttons: 4 });
	assert.equal(page.picture.view.pan.distance, 5);
	assert.match(platform.textOf("view-line"), /pan-middle live, 5 screen pixels \| pan-middle: the view follows 3, 4 screen pixels, 5 in all$/);
	platform.pointer("up", { clientX: 108, clientY: 104, button: 1, buttons: 0 });
	assert.deepEqual(stepsOf(page.latestVerdict), [{ operation: "pointerUp", phase: "commit", gesture: "pan-middle", trigger: "drop", meaning: [] }]);
	assert.equal(page.picture.view.pan, null);
	assert.equal(page.picture.view.words, "pan-middle released after 5 screen pixels: nothing committed, the view left where it is");
});

test("worked verdict: a middle press that never travels the threshold is a click of button 1, as today; a middle press while a gesture is live is a press of button 1", () => {
	const { platform, page } = freshPage();
	platform.pointer("down", { clientX: 100, clientY: 100, button: 1, buttons: 4 });
	platform.pointer("up", { clientX: 102, clientY: 100, button: 1, buttons: 0 });
	assert.deepEqual(stepsOf(page.latestVerdict), [{ operation: "pointerUp", phase: "commit", gesture: "press-1", trigger: "click", meaning: ["button-1-click"] }]);
	platform.pointer("down", { clientX: 100, clientY: 100, button: 0, buttons: 1 });
	platform.pointer("down", { clientX: 100, clientY: 100, button: 1, buttons: 5 });
	assert.deepEqual(hitsOf(page.latestVerdict.trace), ["button-1-press"], "press-0 live: no pan");
});

test("worked verdict: a right pan -- a press of button 2 on open ground, no gesture live, is pan-right; on a key it is a press of button 2; travelled, it becomes pan-right", () => {
	let under = [];
	const platform = fakePlatform({ elementsAt: () => under });
	const page = composeTesterPage(platform);
	const keysLayer = platform.root.children[0];
	under = [platform.root, keysLayer, keysLayer.children[0]];
	platform.pointer("down", { clientX: 15, clientY: 15, button: 2, buttons: 2, target: platform.root });
	assert.deepEqual(hitsOf(page.latestVerdict.trace), ["button-2-press"], "on a key: not open ground");
	platform.pointer("up", { clientX: 15, clientY: 15, button: 2, buttons: 0, target: platform.root });
	under = [];
	platform.pointer("down", { clientX: 600, clientY: 600, button: 2, buttons: 2, target: platform.root });
	assert.deepEqual(hitsOf(page.latestVerdict.trace), ["pan-right"]);
	platform.pointer("move", { clientX: 600, clientY: 610, button: -1, buttons: 2, target: platform.root });
	assert.deepEqual(stepsOf(page.latestVerdict).map((s) => [s.operation, s.gesture]), [["pointerMove", "press-2"], ["becomeGesture", "pan-right"]]);
});

test("worked verdict: a Space pan -- a press of button 0 with Space held, no gesture live, is pan-space; travelled, it becomes pan-space; focus lost mid-pan cancels it and sets the pinch's held pixels to 0", () => {
	const { platform, page } = freshPage();
	platform.wheel({ ctrlKey: true, deltaY: 40 });
	platform.key("key-down", { key: " ", code: "Space" });
	platform.pointer("down", { clientX: 100, clientY: 100, button: 0, buttons: 1 });
	assert.deepEqual(hitsOf(page.latestVerdict.trace), ["pan-space"]);
	platform.pointer("move", { clientX: 100, clientY: 90, button: -1, buttons: 1 });
	assert.deepEqual(stepsOf(page.latestVerdict).map((s) => [s.operation, s.gesture]), [["pointerMove", "press-0"], ["becomeGesture", "pan-space"]]);
	assert.equal(page.picture.view.acc, 0, "a pan's view is not the wheel's: the held pixels set to 0");
	platform.wheel({ ctrlKey: true, deltaY: 40 });
	platform.blur();
	assert.deepEqual(stepsOf(page.latestVerdict), [
		{ operation: "keysLost", phase: null, gesture: null, released: ["Space"] },
		{ operation: "pointerLost", phase: "cancel", gesture: "pan-space" },
	]);
	assert.deepEqual([page.picture.view.pan, page.picture.view.acc], [null, 0]);
	assert.match(page.picture.view.words, /^pan-space cancelled after 0 screen pixels: its release not reported$/);
	platform.pointer("down", { clientX: 100, clientY: 100, button: 0, buttons: 1 });
	assert.deepEqual(hitsOf(page.latestVerdict.trace), ["button-0-press"], "Space no longer held");
});

test("worked verdict: the threshold is measured on screen (PZ17) -- at 2 screen pixels per unit, 5 pixels cross it though 2.5 units would not; at 0.5, 3 pixels do not though 6 units would; the drag line starts at the press's drawing point", () => {
	const near = fakePlatform({ screenScale: 2 });
	const nearPage = composeTesterPage(near);
	near.pointer("down", { clientX: 100, clientY: 100, button: 0, buttons: 1 });
	assert.deepEqual([nearPage.picture.press.at, nearPage.picture.pressFrom], [{ x: 100, y: 100 }, { x: 50, y: 50 }], "the press's point on screen; its drawing point for the line");
	near.pointer("move", { clientX: 105, clientY: 100, button: -1, buttons: 1 });
	assert.deepEqual(stepsOf(nearPage.latestVerdict).map((s) => [s.operation, s.gesture]), [["pointerMove", "press-0"], ["becomeGesture", "drag-0"]]);
	const line = near.elements().find((e) => e.attributes.get("class") === "drag-line");
	assert.deepEqual([line.attributes.get("x1"), line.attributes.get("y1"), line.attributes.get("x2")], ["50", "50", "52.5"], "the drag line from the press's drawing point to the pointer's");

	const far = fakePlatform({ screenScale: 0.5 });
	const farPage = composeTesterPage(far);
	far.pointer("down", { clientX: 100, clientY: 100, button: 0, buttons: 1 });
	far.pointer("move", { clientX: 103, clientY: 100, button: -1, buttons: 1 });
	assert.deepEqual(stepsOf(farPage.latestVerdict), [{ operation: "pointerMove", phase: "update", gesture: "press-0", crossed: false }]);
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

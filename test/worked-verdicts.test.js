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

test("worked verdict: Ctrl and the wheel -- a wheel zoom, Ctrl and wheel or a touchpad pinch alike; no step; claimed and drawn; short of a step, the level kept and the delta held", () => {
	const { platform, page } = freshPage();
	const { claimed } = platform.wheel({ ctrlKey: true, deltaY: -12.5 });
	assert.deepEqual(hitsOf(page.latestVerdict.trace), ["wheel-zoom"]);
	assert.deepEqual(stepsOf(page.latestVerdict), []);
	assert.equal(claimed, true);
	assert.equal(page.picture.wheel.latest.deltaY, -12.5, "drawn with its delta, exact");
	assert.deepEqual([page.picture.view.level, page.picture.view.acc], [1, -12.5]);
	assert.equal(platform.textOf("view-line"), "view: 1x, scale 0.3125\ncentre 0, 0\nwheel held -12.5 px\nno pan\nwheel zoom: at 1x, -12.5 of 100\npixels held toward the next level", "the view's lines, wrapped to the mouse column");
});

/** The view's level and the wheel's held pixels, as the picture keeps them. */
const levelAndHeld = (page) => [page.picture.view.level, page.picture.view.acc];

test("worked verdict: a wheel zoom steps one level per 100 pixels -- in to 0.5x about the fact's screen point; one fact of 250 out steps twice, to 2x, keeping 50, and two of 125 step as one; a delta of the other sign starts again; past the farthest level what remains is dropped", () => {
	const { platform, page } = freshPage();
	platform.wheel({ ctrlKey: true, deltaY: -100, clientX: 30, clientY: 40 });
	assert.deepEqual(levelAndHeld(page), [0.5, 0]);
	assert.match(page.picture.view.words, /^wheel zoom: 1x to 0\.5x, 1 level, the scale times 2, about screen 30, 40/);
	assert.match(page.picture.log[0].notes.join("; "), /wheel zoom: 1x to 0\.5x/, "the step logged beside the fact");
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

test("worked verdict: every wheel zooms, one accumulator for all (0025, draw's H27-1) -- Ctrl and the wheel 30, a scroll of 40 with no Ctrl, then a pinch of 40, is 2x with 10 pixels held; a sideways scroll is claimed and moves nothing; a scroll of -100 steps back to 1x about its screen point", () => {
	const { platform, page } = freshPage();
	platform.wheel({ ctrlKey: true, deltaY: 30 });
	assert.deepEqual(levelAndHeld(page), [1, 30]);
	const plain = platform.wheel({ deltaY: 40 });
	assert.deepEqual([hitsOf(page.latestVerdict.trace), plain.claimed], [["wheel-zoom"], true], "a wheel without Ctrl is the wheel zoom too, claimed");
	assert.deepEqual(levelAndHeld(page), [1, 70], "held in the same accumulator");
	platform.wheel({ ctrlKey: true, deltaY: 40 });
	assert.deepEqual(levelAndHeld(page), [2, 10]);
	const centre = { ...page.picture.view.centre };
	const sideways = platform.wheel({ deltaX: 250, deltaY: 0 });
	assert.deepEqual([hitsOf(page.latestVerdict.trace), sideways.claimed], [["wheel-zoom"], true]);
	assert.deepEqual([levelAndHeld(page), page.picture.view.centre], [[2, 10], centre], "deltaX moves nothing: no pan, no step");
	platform.wheel({ deltaY: -100, clientX: 450, clientY: 120 });
	assert.deepEqual(levelAndHeld(page), [1, 0], "the other sign: the 10 set to 0, then one level in");
	assert.match(page.picture.view.words, /^wheel zoom: 2x to 1x, 1 level, the scale times 2, about screen 450, 120/);
});

test("worked verdict: a wheel's delta normalised by its unit -- pixels as given, a line 40 pixels, a page the surface's height; a page of a surface whose height is not known moves no view", () => {
	const { platform, page } = freshPage();
	platform.wheel({ deltaX: 3, deltaY: -1, deltaMode: 1 });
	assert.deepEqual(hitsOf(page.latestVerdict.trace), ["wheel-zoom"]);
	assert.deepEqual(stepsOf(page.latestVerdict), [], "a wheel makes no session step");
	assert.deepEqual(levelAndHeld(page), [1, -40], "a line is 40 pixels; the 3 lines sideways move nothing");
	platform.wheel({ deltaY: 0.5, deltaMode: 2 });
	assert.deepEqual(levelAndHeld(page), [3, 0], "half a page of a surface 900 high is 450: the -40 set to 0, two levels out, the rest dropped past 3x");
	platform.wheel({ deltaY: -3, deltaMode: 1 });
	assert.deepEqual(levelAndHeld(page), [2, -20], "three lines are 120 pixels: one level in, 20 held");
	platform.wheel({ ctrlKey: true, deltaY: 3, deltaMode: 1 });
	assert.deepEqual(levelAndHeld(page), [3, 0], "three lines of the other sign: the -20 set to 0, one level out, the 20 past 3x dropped");
	platform.wheel({ ctrlKey: true, deltaY: -3, deltaMode: 1 });
	platform.wheel({ ctrlKey: true, deltaY: 1.2, deltaMode: 1 });
	assert.deepEqual(levelAndHeld(page), [2, 48], "the other sign: 1.2 lines, 48 pixels");
	platform.wheel({ ctrlKey: true, deltaY: 0.25, deltaMode: 2 });
	assert.deepEqual(levelAndHeld(page), [3, 0], "a quarter of a page of 900 is 225: one step, the rest dropped past 3x");

	const unknown = fakePlatform({ clientHeight: null });
	const unknownPage = composeTesterPage(unknown);
	unknown.wheel({ ctrlKey: true, deltaY: 1, deltaMode: 2 });
	assert.deepEqual(levelAndHeld(unknownPage), [1, 0]);
	assert.equal(unknownPage.picture.view.words, "wheel zoom: its unit, or the page's height, not known, so the view kept");
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
	assert.deepEqual(page.picture.view.pan, { gesture: "pan-middle", from: { x: 105, y: 100 }, at: { x: 105, y: 100 }, distance: 0, centreFrom: { x: 0, y: 0 } });
	platform.pointer("move", { clientX: 108, clientY: 104, button: -1, buttons: 4 });
	assert.equal(page.picture.view.pan.distance, 5);
	assert.match(platform.textOf("view-line"), /\npan-middle live, 5 screen pixels\npan-middle: the view follows 3, 4\nscreen pixels, 5 in all$/);
	platform.pointer("up", { clientX: 108, clientY: 104, button: 1, buttons: 0 });
	assert.deepEqual(stepsOf(page.latestVerdict), [{ operation: "pointerUp", phase: "commit", gesture: "pan-middle", trigger: "drop", meaning: [] }]);
	assert.equal(page.picture.view.pan, null);
	assert.equal(page.picture.view.words, "pan-middle released after 5 screen pixels: no edit, the view left where it is");
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

/** The view's centre and level, as the picture keeps them. */
const centreAndLevel = (page) => [page.picture.view.centre.x, page.picture.view.centre.y, page.picture.view.level];

/** The fake pane's scale at a level: the 1920 by 1080 frame's fit in its 600 by 600, 0.3125, over the level. */
const paneScaleAt = (level) => 600 / 1920 / level;

test("move 6a, the view pane: a scroll no longer pans (0025) -- its deltas move no centre; a pan by its travel on screen over the scale, the other way; the pane's scene view follows, its centre at the pane's centre", () => {
	const { platform, page } = freshPage();
	assert.deepEqual(centreAndLevel(page), [0, 0, 1]);
	assert.deepEqual(page.paneView, { x: -300 / paneScaleAt(1), y: -300 / paneScaleAt(1), scale: paneScaleAt(1) }, "the first opening: 0, 0 at the pane's centre, at 1x");
	platform.wheel({ deltaX: 50, deltaY: -25 });
	assert.deepEqual(centreAndLevel(page), [0, 0, 1], "the scroll short of a level's step: no centre moved, no level stepped");
	platform.pointer("down", { clientX: 100, clientY: 100, button: 1, buttons: 4 });
	platform.pointer("move", { clientX: 110, clientY: 100, button: -1, buttons: 4 });
	platform.pointer("move", { clientX: 140, clientY: 130, button: -1, buttons: 4 });
	assert.deepEqual(centreAndLevel(page), [-30 / paneScaleAt(1), -30 / paneScaleAt(1), 1], "dragged right and down, the drawing follows: the centre moves left and up");
	const v = page.paneView;
	assert.deepEqual([v.x + 300 / v.scale, v.y + 300 / v.scale], [page.picture.view.centre.x, page.picture.view.centre.y], "the pane's scene view holds the centre at its centre");
	platform.pointer("up", { clientX: 140, clientY: 130, button: 1, buttons: 0 });
});

test("move 6a, the view pane: a pinch keeps the drawing point under the pointer when it is on the pane, and steps about the pane's centre when it is off it; every level reached and none between", () => {
	const { platform, page } = freshPage();
	const under = (q) => [page.picture.view.centre.x + (q.x - 300) / paneScaleAt(page.picture.view.level), page.picture.view.centre.y + (q.y - 300) / paneScaleAt(page.picture.view.level)];
	const q = { x: 450, y: 120 };
	const before = under(q);
	platform.wheel({ ctrlKey: true, deltaY: -100, clientX: q.x, clientY: q.y });
	assert.equal(page.picture.view.level, 0.5);
	const after = under(q);
	assert.ok(Math.abs(after[0] - before[0]) < 1e-9 && Math.abs(after[1] - before[1]) < 1e-9, `the point under the pointer kept: ${before} then ${after}`);
	const seen = [page.picture.view.level];
	for (const dy of [100, 100, 100]) {
		platform.wheel({ ctrlKey: true, deltaY: dy, clientX: q.x, clientY: q.y });
		seen.push(page.picture.view.level);
		const kept = under(q);
		assert.ok(Math.abs(kept[0] - before[0]) < 1e-6 && Math.abs(kept[1] - before[1]) < 1e-6, `kept at ${page.picture.view.level}x`);
	}
	assert.deepEqual(seen, [0.5, 1, 2, 3], "each level reached in turn, none between");
	const off = fakePlatform({ pane: { width: 600, height: 600, left: 1000, top: 0 } });
	const offPage = composeTesterPage(off);
	off.wheel({ ctrlKey: true, deltaY: -100, clientX: 30, clientY: 40 });
	assert.deepEqual(centreAndLevel(offPage), [0, 0, 0.5], "off the pane: about the pane's centre, so the centre holds");
	assert.match(offPage.picture.view.words, /about the pane's centre, the pointer off the pane at screen 30, 40/);
});

test("move 6a, the view keys: = and + a level in, - a level out, about the pane's centre; Shift+0 the default level; h home, the level kept; Shift+1 fit, the first opening with no diagram; each a view key, claimed; a verb that changes nothing does nothing", () => {
	const { platform, page } = freshPage();
	platform.wheel({ deltaX: 90, deltaY: 30 });
	const moved = page.picture.view.centre;
	const { claimed } = platform.key("key-down", { key: "=", code: "Equal" });
	assert.deepEqual(hitsOf(page.latestVerdict.trace), ["view-key"]);
	assert.equal(claimed, true);
	assert.deepEqual([page.picture.view.centre, page.picture.view.level], [moved, 0.5], "a level in about the pane's centre: the centre holds");
	platform.key("key-up", { key: "=", code: "Equal" });
	platform.key("key-down", { key: "+", code: "Equal", shiftKey: true });
	assert.match(page.picture.view.words, /zoom in: at 0\.5x, the nearest level, so nothing/);
	platform.key("key-up", { key: "+", code: "Equal", shiftKey: true });
	for (const level of [1, 2, 3, 3]) {
		platform.key("key-down", { key: "-", code: "Minus" });
		platform.key("key-up", { key: "-", code: "Minus" });
		assert.equal(page.picture.view.level, level);
	}
	platform.key("key-down", { key: ")", code: "Digit0", shiftKey: true });
	platform.key("key-up", { key: ")", code: "Digit0", shiftKey: true });
	assert.deepEqual([page.picture.view.centre, page.picture.view.level], [moved, 1], "the default level about the centre");
	platform.key("key-down", { key: "-", code: "Minus" });
	platform.key("key-up", { key: "-", code: "Minus" });
	platform.key("key-down", { key: "h", code: "KeyH" });
	assert.deepEqual([page.picture.view.centre, page.picture.view.level], [{ x: 0, y: 0 }, 2], "home: the centre to 0, 0, the level kept");
	platform.key("key-up", { key: "h", code: "KeyH" });
	platform.key("key-down", { key: "!", code: "Digit1", shiftKey: true });
	assert.deepEqual([page.picture.view.centre, page.picture.view.level], [{ x: 0, y: 0 }, 1], "fit, with nothing drawn to fit: the first opening");
	assert.match(page.picture.view.words, /fit: nothing drawn here to fit, so the first opening/);
	platform.key("key-up", { key: "!", code: "Digit1", shiftKey: true });
	platform.key("key-down", { key: "H", code: "KeyH", shiftKey: true });
	assert.deepEqual(hitsOf(page.latestVerdict.trace), ["key-first-press"], "Shift and h is no view key");
});

test("move 6a, the reticle: its press brings the centre home to 0, 0, the level kept (PZ6); the pane's scene view follows", () => {
	const { platform, page } = freshPage();
	platform.wheel({ deltaX: 120, deltaY: -60 });
	platform.wheel({ ctrlKey: true, deltaY: 100, clientX: 450, clientY: 450 });
	assert.notDeepEqual(page.picture.view.centre, { x: 0, y: 0 });
	platform.pressReticle();
	assert.deepEqual(centreAndLevel(page), [0, 0, 2]);
	assert.match(page.picture.view.words, /^the reticle, home: the centre to 0, 0, the level kept at 2x$/);
	assert.deepEqual(page.paneView, { x: -300 / paneScaleAt(2), y: -300 / paneScaleAt(2), scale: paneScaleAt(2) });
});

test("move 6a, the pane's own surface: a pan on the pane moves the view and is shown in the picture's verdicts, but its points are the pane's, so the picture's pointer, press line and item under the pointer keep theirs", () => {
	const { platform, page } = freshPage();
	platform.pointer("move", { clientX: 15, clientY: 15, button: -1, buttons: 0 });
	const pointerAt = page.picture.pointerAt;
	platform.panePointer("down", { clientX: 200, clientY: 200, button: 2, buttons: 2 });
	assert.deepEqual(hitsOf(page.latestVerdict.trace), ["pan-right"], "the pane is open ground");
	platform.panePointer("move", { clientX: 260, clientY: 200, button: -1, buttons: 2 });
	assert.equal(page.picture.view.pan.gesture, "pan-right", "engaged at the move that crossed the threshold");
	platform.panePointer("move", { clientX: 315, clientY: 200, button: -1, buttons: 2 });
	assert.deepEqual(centreAndLevel(page), [-55 / paneScaleAt(1), 0, 1], "the view follows the travel since engaging");
	assert.deepEqual([page.picture.pointerAt, page.picture.pressFrom], [pointerAt, null], "the picture's own points kept");
	platform.panePointer("up", { clientX: 315, clientY: 200, button: 2, buttons: 0 });
});

test("move 6b, the precision buttons: each brings the centre to its line, 1,000,000 or 2^21 from the origin, at the nearest level; the pane's scene view follows, the view's scale shown", () => {
	const { platform, page } = freshPage();
	platform.pressGoMillion();
	assert.deepEqual(centreAndLevel(page), [1_000_000, 0, 0.5]);
	assert.equal(page.picture.view.scale, paneScaleAt(0.5));
	assert.match(page.picture.view.words, /^a precision button, to the line at 1,000,000: the centre to 1000000, 0 at the nearest level, 0\.5x$/);
	assert.deepEqual(page.paneView, { x: 1_000_000 - 300 / paneScaleAt(0.5), y: -300 / paneScaleAt(0.5), scale: paneScaleAt(0.5) });
	assert.match(platform.textOf("view-line"), /^view: 0\.5x, scale 0\.625\ncentre 1000000, 0\n/);
	platform.pressGoTwoTo21();
	assert.deepEqual(centreAndLevel(page), [2 ** 21, 0, 0.5]);
	platform.pressReticle();
	assert.deepEqual(centreAndLevel(page), [0, 0, 0.5]);
});

test("move 6, a pan of several moves: the centre follows the travel since the pan engaged, each move measured from where it engaged and not from the centre the last move left", () => {
	const { platform, page } = freshPage();
	platform.pointer("down", { clientX: 100, clientY: 100, button: 1, buttons: 4 });
	platform.pointer("move", { clientX: 110, clientY: 100, button: -1, buttons: 4 });
	for (const [x, y] of [[130, 110], [170, 90], [200, 140]]) {
		platform.pointer("move", { clientX: x, clientY: y, button: -1, buttons: 4 });
		assert.deepEqual(centreAndLevel(page), [-(x - 110) / paneScaleAt(1), -(y - 100) / paneScaleAt(1), 1], `after the move to ${x}, ${y}`);
	}
	platform.pointer("up", { clientX: 200, clientY: 140, button: 1, buttons: 0 });
});

test("move 6, the first paint: the view's scale is the pane's from the start, so the picture's view lines and the pane agree before any input", () => {
	const { platform, page } = freshPage();
	assert.equal(page.picture.view.scale, paneScaleAt(1));
	assert.match(platform.textOf("view-line"), /^view: 1x, scale 0\.3125\n/);
});


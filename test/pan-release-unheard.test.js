// pan-release-unheard - a pan's press released where the tester does not hear it ends as a lost pointer
// (docs/DECISIONS.md 0024, draw's B447): a pan row's press takes no pointer until it travels the threshold, so a press
// on the pane released over the header is never heard; the next hover, no button down, must move no view and show no
// pan. Each pan's press -- the right button, the middle, Space and the left -- on the pane, then a live pan, a chord
// heard, and the controls, each through the tester's own composition on a fake platform.
import assert from "node:assert/strict";
import { test } from "node:test";

import { importBuilt } from "./support/built-site.js";
import { fakePlatform } from "./support/fake-platform.js";

const { composeTesterPage } = await importBuilt("composition-root.js");

/** A fresh page composed on a fake platform, its pane 600 by 600 at 0, 0, nothing under the pointer: open ground. */
function freshPage() {
	const platform = fakePlatform();
	return { platform, page: composeTesterPage(platform) };
}

/** The view's centre and level, and whether a pan is live. */
const viewOf = (page) => [page.picture.view.centre.x, page.picture.view.centre.y, page.picture.view.level, page.picture.view.pan];

/** The pan presses: a right press, a middle press, and a left press with Space held -- each its button and buttons bits. */
const PRESSES = [
	{ name: "pan-right", button: 2, buttons: 2 },
	{ name: "pan-middle", button: 1, buttons: 4 },
	{ name: "pan-space", button: 0, buttons: 1, space: true },
];

for (const p of PRESSES) {
	test(`0024: a ${p.name} press on the pane released outside it, unheard, then a hover with no button -- no view moved, no pan shown, the press ended as a lost pointer`, () => {
		const { platform, page } = freshPage();
		if (p.space) platform.key("key-down", { key: " ", code: "Space" });
		const before = viewOf(page);
		platform.panePointer("down", { clientX: 300, clientY: 300, button: p.button, buttons: p.buttons });
		assert.deepEqual(page.picture.log[0].hits, [p.name], "the press is the pan row's");
		// released over the header: no up reaches the tester; then the hover, no button held
		platform.panePointer("move", { clientX: 320, clientY: 310, button: -1, buttons: 0 });
		const steps = page.latestVerdict.steps.map((s) => [s.operation, s.outcome.phase, s.outcome.gesture?.name ?? null]);
		assert.deepEqual(steps, [["pointerLost", "cancel", `press-${p.button}`], ["pointerMove", null, null]], "the press ended as a lost pointer, then the move a hover");
		platform.panePointer("move", { clientX: 500, clientY: 400, button: -1, buttons: 0 });
		assert.deepEqual(viewOf(page), before, "the view where it was, no pan live");
		assert.equal(page.picture.press, null, "no press held");
		assert.doesNotMatch(String(page.picture.view.words), /the view follows|engaged/, `no pan shown: ${page.picture.view.words}`);
		// the next press is an ordinary one again, and a heard pan pans
		platform.panePointer("down", { clientX: 100, clientY: 100, button: p.button, buttons: p.buttons });
		platform.panePointer("move", { clientX: 110, clientY: 100, button: -1, buttons: p.buttons });
		platform.panePointer("move", { clientX: 130, clientY: 100, button: -1, buttons: p.buttons });
		assert.equal(page.picture.view.pan?.gesture, p.name, "a heard pan still pans");
		assert.ok(page.picture.view.centre.x < before[0], "the drawing follows the pointer");
	});
}

test("0024: a live pan whose release was not heard -- the next move holding no button cancels it, the view left where the last heard move had it", () => {
	const { platform, page } = freshPage();
	platform.panePointer("down", { clientX: 300, clientY: 300, button: 2, buttons: 2 });
	platform.panePointer("move", { clientX: 310, clientY: 300, button: -1, buttons: 2 });
	platform.panePointer("move", { clientX: 340, clientY: 320, button: -1, buttons: 2 });
	assert.equal(page.picture.view.pan?.gesture, "pan-right");
	const panned = viewOf(page).slice(0, 3);
	platform.panePointer("move", { clientX: 500, clientY: 450, button: -1, buttons: 0 });
	assert.deepEqual(page.latestVerdict.steps.map((s) => [s.operation, s.outcome.phase, s.outcome.gesture?.name ?? null]), [["pointerLost", "cancel", "pan-right"], ["pointerMove", null, null]]);
	assert.deepEqual(viewOf(page), [...panned, null], "the view where the last heard move left it, the pan cancelled");
	assert.match(page.picture.view.words, /^pan-right cancelled after 36\.1 screen pixels: its release not reported$/);
});

test("0024: a chord heard keeps IB11 -- the left button joined a right pan and still held keeps the pan when the right's release goes unheard; it ends only when neither is held", () => {
	const { platform, page } = freshPage();
	platform.panePointer("down", { clientX: 300, clientY: 300, button: 2, buttons: 2 });
	platform.panePointer("move", { clientX: 310, clientY: 300, button: -1, buttons: 2 });
	platform.panePointer("move", { clientX: 312, clientY: 300, button: 0, buttons: 3 });
	assert.deepEqual(page.picture.log[0].hits, ["chorded-press"]);
	platform.panePointer("move", { clientX: 330, clientY: 300, button: -1, buttons: 1 });
	assert.equal(page.picture.view.pan?.gesture, "pan-right", "the left still held: the pan goes on");
	assert.match(page.picture.view.words, /^pan-right: the view follows 20, 0 screen pixels/);
	platform.panePointer("move", { clientX: 360, clientY: 300, button: -1, buttons: 0 });
	assert.equal(page.picture.view.pan, null, "neither held: the pan cancelled");
});

test("0024: the controls -- a pan released where it is heard, a right click, and a right drag on a key, none of them a lost pointer", () => {
	let under = [];
	const platform = fakePlatform({ elementsAt: () => under });
	const page = composeTesterPage(platform);
	const lost = () => page.latestVerdict.steps.some((s) => s.operation === "pointerLost");
	platform.panePointer("down", { clientX: 300, clientY: 300, button: 2, buttons: 2 });
	platform.panePointer("move", { clientX: 320, clientY: 300, button: -1, buttons: 2 });
	platform.panePointer("move", { clientX: 340, clientY: 300, button: -1, buttons: 2 });
	platform.panePointer("up", { clientX: 340, clientY: 300, button: 2, buttons: 0 });
	assert.match(page.picture.view.words, /^pan-right released after 20 screen pixels/);
	platform.panePointer("move", { clientX: 400, clientY: 300, button: -1, buttons: 0 });
	assert.equal(lost(), false, "a hover after a heard release: nothing lost");
	platform.panePointer("down", { clientX: 400, clientY: 300, button: 2, buttons: 2 });
	platform.panePointer("up", { clientX: 400, clientY: 300, button: 2, buttons: 0 });
	assert.deepEqual(page.picture.log.slice(0, 2).map((l) => l.hits).flat().includes("button-2-click"), true, "a right click as before");
	const keysLayer = platform.root.children[0];
	under = [platform.root, keysLayer, keysLayer.children[0]];
	platform.pointer("down", { clientX: 15, clientY: 15, button: 2, buttons: 2, target: platform.root });
	assert.deepEqual(page.picture.log[0].hits, ["button-2-press"], "on a key: no pan row");
	platform.pointer("move", { clientX: 40, clientY: 15, button: -1, buttons: 0, target: platform.root });
	assert.equal(lost(), false, "a press no pan row opened is not ended by this rule");
});

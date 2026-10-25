// picture-state - what the person is shown (docs/ARCHITECTURE-TARGET.md sections 6 and 7, P1): held keys read
// from the session, never kept twice; repeats counted as observed, intervals from the facts' times and never a
// clock; a key first seen repeating marked so and its hold "at least"; wheel facts in a row with the same
// modifiers, unit and sign of each delta as one line; the buttons drawn following mouse and wheel facts alone;
// and an entry that did not change keeping its very value.
import assert from "node:assert/strict";
import { test } from "node:test";

import { importBuilt } from "./support/built-site.js";
import { fakePlatform } from "./support/fake-platform.js";

const { composeTesterPage } = await importBuilt("composition-root.js");
const { LOG_LINES, applyVerdict, EMPTY_PICTURE, timeBetween } = await importBuilt("picture-state.js");

function freshPage() {
	const platform = fakePlatform();
	return { platform, page: composeTesterPage(platform) };
}

test("a key held and repeated: one log line rewritten, its count the repeats observed and its fact the latest, exact; the interval from two facts' times; the release shows how long it was held", () => {
	const { platform, page } = freshPage();
	platform.key("key-down", { key: "a", code: "KeyA", timeStamp: 100 });
	platform.key("key-down", { key: "a", code: "KeyA", repeat: true, timeStamp: 130.5 });
	platform.key("key-down", { key: "a", code: "KeyA", repeat: true, timeStamp: 163 });
	const [held] = page.picture.heldKeys;
	assert.deepEqual([held.code, held.firstTime, held.firstSeen, held.repeats, held.latest.time, held.interval], ["KeyA", 100, "press", 2, 163, 32.5]);
	assert.equal(page.picture.log.length, 1, "the press's line rewritten by each repeat");
	assert.deepEqual([page.picture.log[0].count, page.picture.log[0].fact.time, page.picture.log[0].hits], [2, 163, ["key-repeat"]]);
	assert.deepEqual(page.picture.log[0].notes, ["2 repeats observed", "last interval 32.5 ms"]);
	platform.key("key-up", { key: "a", code: "KeyA", timeStamp: 200 });
	assert.deepEqual(page.picture.log[0].hits, ["key-release"]);
	assert.deepEqual(page.picture.log[0].notes, ["held 100 ms"]);
	assert.deepEqual(page.picture.heldKeys, []);
});

test("a repeat for a key the session did not hold: pressed before it was seen, its count of repeats observed, and its release 'at least' that long", () => {
	const { platform, page } = freshPage();
	platform.key("key-down", { key: "b", code: "KeyB", repeat: true, timeStamp: 50 });
	const [held] = page.picture.heldKeys;
	assert.deepEqual([held.firstSeen, held.repeats, held.firstTime], ["repeat", 1, 50]);
	assert.ok(page.picture.log[0].notes.includes("pressed before it was seen"));
	platform.key("key-down", { key: "b", code: "KeyB", repeat: true, timeStamp: 80 });
	assert.equal(page.picture.log.length, 1);
	assert.equal(page.picture.log[0].count, 2);
	platform.key("key-up", { key: "b", code: "KeyB", timeStamp: 90 });
	assert.deepEqual(page.picture.log[0].notes, ["held at least 40 ms"]);
});

test("a key-up for a key not held is shown as such; a time the platform did not report leaves the hold and the interval not reported, never filled in", () => {
	const { platform, page } = freshPage();
	platform.key("key-up", { key: "c", code: "KeyC" });
	assert.deepEqual(page.picture.log[0].hits, ["key-release-press-unseen"]);
	assert.deepEqual(page.picture.log[0].notes, ["not held: its press was not seen"]);
	platform.key("key-down", { key: "d", code: "KeyD", timeStamp: undefined });
	platform.key("key-down", { key: "d", code: "KeyD", repeat: true, timeStamp: 70 });
	assert.equal(page.picture.heldKeys[0].interval, null);
	platform.key("key-up", { key: "d", code: "KeyD", timeStamp: 90 });
	assert.deepEqual(page.picture.log[0].notes, ["held for a time not reported"]);
	assert.equal(timeBetween(null, 5), null);
	assert.equal(timeBetween(2, 5.5), 3.5);
});

test("the held keys are the session's, in the order first pressed: the picture's codes are the state the verdict's last step left", () => {
	const { platform, page } = freshPage();
	for (const code of ["ShiftLeft", "KeyA", "KeyS"]) platform.key("key-down", { key: code, code });
	platform.key("key-up", { key: "KeyA", code: "KeyA" });
	assert.deepEqual(page.picture.heldKeys.map((k) => k.code), ["ShiftLeft", "KeyS"]);
	assert.deepEqual(page.picture.heldKeys.map((k) => k.code), [...page.latestVerdict.steps.at(-1).outcome.state.keys]);
	platform.key("key-down", { key: "j", code: "KeyJ" });
	assert.deepEqual(page.latestVerdict.trace.filter((r) => r.hit).map((r) => r.id), ["key-roll-over-press"], "KeyS held, a non-modifier other than J");
});

test("wheel facts in a row with the same modifiers, unit and sign of each delta make one line, its count and the latest fact's exact values; any difference starts a new line", () => {
	const { platform, page } = freshPage();
	platform.wheel({ deltaY: 120 });
	platform.wheel({ deltaY: 100 });
	platform.wheel({ deltaY: 53.25 });
	assert.deepEqual([page.picture.log.length, page.picture.log[0].count, page.picture.log[0].fact.deltaY, page.picture.wheel.count], [1, 3, 53.25, 3]);
	platform.wheel({ deltaY: -10 });
	assert.deepEqual([page.picture.log.length, page.picture.log[0].count], [2, 1], "another sign");
	platform.wheel({ deltaY: -10, deltaMode: 1 });
	assert.deepEqual([page.picture.log.length, page.picture.log[0].count], [3, 1], "another unit");
	platform.wheel({ deltaY: -10, deltaMode: 1, shiftKey: true });
	assert.deepEqual([page.picture.log.length, page.picture.log[0].count], [4, 1], "other modifiers");
	platform.key("key-down", { key: "x", code: "KeyX" });
	platform.wheel({ deltaY: -10, deltaMode: 1, shiftKey: true });
	assert.deepEqual([page.picture.log.length, page.picture.log[0].count], [6, 1], "not in a row");
	assert.equal(page.picture.log[0].fact.deltaMode, 1, "unconverted: in the unit the browser gave");
});

test("the buttons drawn follow buttons, when not null, of a mouse's press, move, release, cancel and context menu, and of a wheel; a boundary fact, a double click, a touch or pen fact and a key never change them", () => {
	const { platform, page } = freshPage();
	platform.pointer("move", { buttons: 4, button: -1 });
	assert.equal(page.picture.buttons, 4);
	platform.pointer("down", { pointerType: "touch", buttons: 1, pointerId: 9 });
	platform.pointer("down", { pointerType: "pen", buttons: 1, pointerId: 10 });
	platform.pointer("double", { pointerType: undefined, pointerId: undefined, buttons: 0 });
	platform.key("key-down", { key: "z", code: "KeyZ" });
	assert.equal(page.picture.buttons, 4);
	platform.menu({ pointerType: "mouse", buttons: 2 });
	assert.equal(page.picture.buttons, 2);
	platform.menu({ pointerType: "", buttons: 0, pointerId: undefined });
	assert.equal(page.picture.buttons, 2, "a context menu from the keyboard, its pointer type not mouse");
	platform.wheel({ buttons: 8 });
	assert.equal(page.picture.buttons, 8);
	for (const type of ["over", "out", "leave"]) platform.pointer(type, { buttons: 1, button: -1 });
	assert.equal(page.picture.buttons, 8, "boundary facts, which the browser derives from a crossing or a capture, change no button drawn");
	platform.pointer("move", { buttons: undefined, button: -1 });
	assert.equal(page.picture.buttons, 8, "buttons not reported change nothing drawn");
});

test("a touch or a pen pointer's facts match their one row, are logged as delivered, and the session never sees them", () => {
	const { platform, page } = freshPage();
	for (const pointerType of ["touch", "pen"]) {
		for (const type of ["over", "down", "move", "up", "out", "leave", "cancel"]) {
			platform.pointer(type, { pointerType, pointerId: 5, buttons: type === "down" || type === "move" ? 1 : 0 });
			assert.deepEqual(page.latestVerdict.trace.filter((r) => r.hit).map((r) => r.id), ["touch-or-pen-pointer"], `${pointerType} ${type}`);
			assert.deepEqual(page.latestVerdict.steps, []);
		}
	}
	assert.equal(page.picture.press, null);
	assert.equal(page.picture.gesture, null);
});

test("the log keeps a fixed number of lines, newest first; an entry that did not change keeps its very value", () => {
	const { platform, page } = freshPage();
	for (let i = 0; i < LOG_LINES + 5; i++) platform.key(i % 2 === 0 ? "key-down" : "key-up", { key: "q", code: "KeyQ", timeStamp: i });
	assert.equal(page.picture.log.length, LOG_LINES);
	assert.equal(page.picture.log[0].fact.time, LOG_LINES + 4);
	const before = page.picture;
	platform.pointer("move", { clientX: 5, clientY: 5, button: -1, buttons: 0 });
	assert.equal(page.picture.heldKeys, before.heldKeys, "a move changes no held key");
	assert.equal(page.picture.log, before.log, "a move that hits no row and makes no step adds no line");
	const { changed } = applyVerdict(EMPTY_PICTURE, page.latestVerdict);
	assert.ok(changed.has("legend") && changed.has("latestFact") && !changed.has("heldKeys") && !changed.has("log"));
});

test("a mouse's cancel reaches the session's pointerLost, ending the press and the gesture, and its buttons are drawn", () => {
	const { platform, page } = freshPage();
	platform.pointer("down", { clientX: 10, clientY: 10, button: 0, buttons: 1 });
	platform.pointer("cancel", { clientX: 10, clientY: 10, button: -1, buttons: 0 });
	const [step] = page.latestVerdict.steps;
	assert.deepEqual([step.operation, step.outcome.phase, step.outcome.gesture.name], ["pointerLost", "cancel", "press-0"]);
	assert.deepEqual(page.latestVerdict.trace.filter((r) => r.hit), [], "section 6 gives a mouse's cancel no row");
	assert.deepEqual([page.picture.press, page.picture.gesture.live, page.picture.buttons], [null, false, 0]);
	assert.match(page.picture.log[0].notes.join(" "), /cancelled press-0: its release not reported/);
});

test("otherHeld is a non-modifier code held other than the fact's own: a key pressed again while held, its release unseen, is a first press, not a roll-over", () => {
	const { platform, page } = freshPage();
	platform.key("key-down", { key: "a", code: "KeyA" });
	platform.key("key-down", { key: "a", code: "KeyA" });
	assert.deepEqual(page.latestVerdict.trace.filter((r) => r.hit).map((r) => r.id), ["key-first-press"]);
	assert.match(page.picture.log[0].notes.join(" "), /pressed again while held: its release was not seen/);
});

test("wheel facts with a delta of another sign on any axis start a new line: sideways right, then left", () => {
	const { platform, page } = freshPage();
	platform.wheel({ deltaX: 40 });
	platform.wheel({ deltaX: 25 });
	platform.wheel({ deltaX: -40 });
	assert.deepEqual(page.picture.log.map((l) => [l.fact.deltaX, l.count, l.hits[0]]), [[-40, 1, "wheel-sideways"], [25, 2, "wheel-sideways"]]);
	assert.equal(page.latestVerdict.claimed, true, "a leftward turn is the wheel sideways too, claimed");
});

test("the status line is painted again when only the buttons drawn change", () => {
	const { platform, page } = freshPage();
	assert.match(platform.textOf("status-line"), /buttons held: not reported/);
	platform.pointer("move", { clientX: 5, clientY: 5, button: -1, buttons: 4 });
	assert.equal(page.picture.buttons, 4);
	assert.match(platform.textOf("status-line"), /buttons held: 1 \|/);
});

test("IT-D4: the item under the pointer is itemOf the target, and, when that answers nothing -- as for a taken pointer, whose events target the svg -- itemAt the fact's screen point; a touch's or a pen's fact changes nothing drawn", () => {
	let under = [];
	const platform = fakePlatform({ elementsAt: () => under });
	const page = composeTesterPage(platform);
	const keysLayer = platform.root.children[0];
	const firstKey = keysLayer.children[0];
	under = [platform.root, keysLayer, firstKey];
	platform.pointer("move", { clientX: 15, clientY: 15, button: -1, buttons: 0, target: platform.root });
	assert.deepEqual([page.picture.under?.layer, page.picture.under?.key, page.picture.under?.path], ["keys", "key Escape", [0]], "itemAt names the first item the scene holds under the point, looking through the root and the layer");
	assert.match(platform.textOf("status-line"), /under the pointer: key Escape \(keys\)/);
	under = [];
	platform.pointer("move", { clientX: 900, clientY: 15, button: -1, buttons: 0, target: platform.root });
	assert.equal(page.picture.under, null);
	under = [firstKey];
	for (const pointerType of ["touch", "pen"]) {
		platform.pointer("move", { clientX: 15, clientY: 15, button: -1, buttons: 0, pointerType, pointerId: 7, target: platform.root });
		assert.equal(page.picture.under, null, `a ${pointerType}'s fact changes nothing drawn`);
		assert.equal(page.latestVerdict.fact.hit?.key, "key Escape", "though its fact holds what lies under it, as delivered");
	}
});

test("every held key is shown: the first three a line each, the rest named on one line, and the latest key with no identity beside them", () => {
	const { platform, page } = freshPage();
	for (const code of ["KeyA", "KeyS", "KeyD", "KeyF", "KeyJ", "KeyK"]) platform.key("key-down", { key: code.slice(3).toLowerCase(), code });
	platform.key("key-down", { key: "AudioVolumeUp", code: "" });
	assert.equal(page.picture.heldKeys.length, 6);
	const lines = platform.textOf("held-keys").split("\n");
	assert.equal(lines.length, 5);
	assert.match(lines[0], /^KeyA "a": 0 repeats observed/);
	assert.equal(lines[3], "and 3 more held: KeyF KeyJ KeyK");
	assert.match(lines[4], /^latest key with no identity: key-down key "AudioVolumeUp"/);
	assert.match(platform.textOf("status-line"), /keys held: KeyA KeyS KeyD KeyF KeyJ KeyK \|/);
});

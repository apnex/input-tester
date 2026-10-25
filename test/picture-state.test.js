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

test("the buttons drawn follow buttons, when not null, of a mouse fact -- a mouse's context menu among them -- and of a wheel; a double click, a touch or pen fact and a key never change them", () => {
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

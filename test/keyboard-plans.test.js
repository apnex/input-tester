// keyboard-plans - the keyboard plans and the labels (docs/ARCHITECTURE-TARGET.md sections 5 and 8, IT-D2):
// every code in each plan is a UI Events code value or one of Chromium's, marked so; the plans are the ones
// IT-D2 describes; no two keys overlap; every rect is `snap-grid`'s `span` of the key's block; and the labels
// are reported where the Keyboard Map names a code and assumed everywhere else.
import assert from "node:assert/strict";
import { test } from "node:test";

import { importBuilt, importVendored } from "./support/built-site.js";
import { SELDOM_REPORTED_CODES, UI_EVENTS_CODES } from "./support/ui-events-codes.js";

const { KEYBOARD_PLANS, FULL_SIZE_ANSI_PLAN, CHROMEBOOK_PLAN, QUARTER_KEY_GRID, placePlanOnGrid } = await importBuilt("keyboard-plans.js");
const { labelsPrintedOnPlan, labelsFromKeyboardMap, askKeyboardMap } = await importBuilt("key-labels.js");
const { openGrid } = await importVendored("snap-grid");

const grid = openGrid(QUARTER_KEY_GRID).grid;
const ACTION_KEYS = ["BrowserBack", "BrowserForward", "BrowserRefresh", "ZoomToggle", "ShowAllWindows", "BrightnessDown", "BrightnessUp", "AudioVolumeMute", "AudioVolumeDown", "AudioVolumeUp"];

test("coverage: every code in each plan is a UI Events code value, or one of Chromium's marked so; codes are unique within a plan", () => {
	for (const plan of Object.values(KEYBOARD_PLANS)) {
		const codes = plan.keys.map((k) => k.code);
		assert.equal(new Set(codes).size, codes.length, `${plan.name}: a code drawn twice`);
		for (const k of plan.keys) {
			if (k.codeSource === "ui-events") assert.ok(UI_EVENTS_CODES.includes(k.code), `${plan.name}: ${k.code} is marked a UI Events code value and is none`);
			else assert.ok(k.codeSource === "chromium" && !UI_EVENTS_CODES.includes(k.code), `${plan.name}: ${k.code} is marked Chromium's but is a UI Events code value`);
			if (SELDOM_REPORTED_CODES.includes(k.code)) assert.ok(k.notes.includes("seldom-reported"), `${k.code} is one the code values call seldom reported`);
		}
	}
});

test("IT-D2: full-size ANSI draws 104 keys, the numeric keypad and the control pad among them", () => {
	assert.equal(FULL_SIZE_ANSI_PLAN.keys.length, 104);
	for (const code of ["Numpad0", "NumpadEnter", "Insert", "Home", "End", "PageUp", "PageDown", "Delete", "CapsLock", "MetaRight", "ContextMenu", "F12"]) assert.ok(FULL_SIZE_ANSI_PLAN.keys.some((k) => k.code === code), code);
});

test("IT-D2: the Chromebook draws no numeric keypad and no Insert, Home, End, Page or Delete keys; its Search key, MetaLeft, where Caps Lock is; and a top row of the ten action keys, Chromium's four of them, every one marked unmeasured", () => {
	const codes = CHROMEBOOK_PLAN.keys.map((k) => k.code);
	for (const code of codes) assert.ok(!code.startsWith("Numpad") && !["Insert", "Home", "End", "PageUp", "PageDown", "Delete", "CapsLock", "NumLock"].includes(code), code);
	const search = CHROMEBOOK_PLAN.keys.find((k) => k.code === "MetaLeft");
	const caps = FULL_SIZE_ANSI_PLAN.keys.find((k) => k.code === "CapsLock");
	assert.deepEqual([search.col, search.label], [caps.col, "Search"]);
	assert.equal(search.row, CHROMEBOOK_PLAN.keys.find((k) => k.code === "KeyA").row, "on the home row, where Caps Lock is");
	const top = CHROMEBOOK_PLAN.keys.filter((k) => k.row === 0 && k.code !== "Escape").sort((a, b) => a.col - b.col);
	assert.deepEqual(top.map((k) => k.code), ACTION_KEYS);
	assert.deepEqual(top.filter((k) => k.codeSource === "chromium").map((k) => k.code), ["ZoomToggle", "ShowAllWindows", "BrightnessDown", "BrightnessUp"]);
	assert.ok(top.every((k) => k.notes.includes("unmeasured")), "every action key's code marked unmeasured");
	assert.ok(search.notes.includes("unmeasured"));
	assert.ok(top.filter((k) => ["BrowserBack", "BrowserForward", "BrowserRefresh"].includes(k.code)).every((k) => k.notes.includes("kept-by-browser")), "Chromium reserves Refresh, Back and Forward");
});

test("each key's rect is snap-grid's span of its block of quarter-key positions, and no two drawn things overlap", () => {
	for (const plan of Object.values(KEYBOARD_PLANS)) {
		const placed = placePlanOnGrid(grid, plan);
		const rects = [];
		for (const k of placed.keys.values()) {
			assert.deepEqual(k.rect, grid.span({ col: k.col, row: k.row }, { col: k.col + k.width, row: k.row + k.height }).through);
			assert.deepEqual([k.rect.x, k.rect.y, k.rect.w, k.rect.h], [k.col * 10, k.row * 10, k.width * 10, k.height * 10]);
			rects.push([k.code, k.rect]);
		}
		for (const b of placed.mouseButtons) rects.push([`button ${b.button}`, b.rect]);
		for (let i = 0; i < rects.length; i++)
			for (let j = i + 1; j < rects.length; j++) {
				const [an, a] = rects[i];
				const [bn, b] = rects[j];
				const overlap = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 0 && Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > 0;
				assert.equal(overlap, false, `${plan.name}: ${an} overlaps ${bn}`);
			}
		assert.deepEqual(placed.mouseButtons.map((b) => [b.button, b.bit]), [[0, 1], [1, 4], [2, 2], [3, 8], [4, 16]]);
	}
});

test("labels: before the map answers, or with none, every label is the plan's printing, assumed; the map's answer is reported where it names a code", async () => {
	const printed = labelsPrintedOnPlan(FULL_SIZE_ANSI_PLAN);
	assert.ok([...printed.values()].every((l) => l.source === "assumed"));
	assert.deepEqual(printed.get("KeyQ"), { text: "Q", source: "assumed" });
	const fromMap = labelsFromKeyboardMap(FULL_SIZE_ANSI_PLAN, new Map([["KeyQ", "a"], ["Semicolon", "m"], ["Escape", ""]]));
	assert.deepEqual(fromMap.get("KeyQ"), { text: "a", source: "reported" }, "an AZERTY keyboard's KeyQ");
	assert.deepEqual(fromMap.get("Semicolon"), { text: "m", source: "reported" });
	assert.deepEqual(fromMap.get("Escape"), { text: "Esc", source: "assumed" }, "an empty answer is no label");
	assert.deepEqual(fromMap.get("ShiftLeft"), { text: "Shift", source: "assumed" });
	assert.equal(await askKeyboardMap({}), null, "no keyboard: no map");
	assert.equal(await askKeyboardMap({ keyboard: { getLayoutMap: () => Promise.reject(new Error("refused")) } }), null, "a refusal: no map");
	const map = new Map([["KeyA", "q"]]);
	assert.equal(await askKeyboardMap({ keyboard: { getLayoutMap: async () => map } }), map);
});

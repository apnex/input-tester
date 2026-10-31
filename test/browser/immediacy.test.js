// immediacy - each input shows while it happens (docs/ARCHITECTURE-TARGET.md section 8, P3, GT2, GT9): a
// harness set into the page before its own scripts wraps every listener the capture adds, so each delivery is
// timed from the listener's start to its end, the composition root's delivery and every put inside it. By the
// recorder's ruling (docs/DECISIONS.md 0002) the bound is judged at the 95th percentile of deliveries, which must
// complete within 10 ms in the gate's Chrome, generous against one frame of 16.7 ms -- the maximum and the median
// reported beside it, since one delivery delayed by another process on a loaded machine is no lag the page made --
// and planted builds that wait 50 ms and 12 ms in every delivery each fail it. The same harness finds every write
// to the page made inside an input's delivery (GT2), and the time from each fact's `time` to the end of its put is
// reported.
import assert from "node:assert/strict";
import { test } from "node:test";
import { setTimeout as sleep } from "node:timers/promises";

import { siteRoot } from "../support/built-site.js";
import { DELIVERY_OPENS, plantedSite } from "../support/planted-site.js";
import { MODIFIERS, openTesterInChrome } from "./tester-in-chrome.js";

const TEST = { timeout: 120000 };

/** The bound every delivery must complete within, in milliseconds (GT9). */
export const DELIVERY_BOUND_MS = 10;

/** The harness, evaluated before the page's own scripts: times each listener added for the capture's events, and notes whether each write to the page happens inside one. */
const HARNESS = `(() => {
	const names = new Set(["pointerdown", "pointermove", "pointerup", "pointercancel", "pointerover", "pointerout", "pointerleave", "dblclick", "keydown", "keyup", "wheel", "contextmenu", "blur"]);
	const record = (globalThis.deliveryHarness = { deliveries: [], writes: [], depth: 0 });
	const wrapped = new WeakMap();
	const add = EventTarget.prototype.addEventListener;
	const remove = EventTarget.prototype.removeEventListener;
	EventTarget.prototype.addEventListener = function (type, listener, options) {
		if (!names.has(type) || typeof listener !== "function") return add.call(this, type, listener, options);
		const timed = function (event) {
			const start = performance.now();
			record.depth++;
			try {
				return listener.call(this, event);
			} finally {
				record.depth--;
				record.deliveries.push({ type, start, end: performance.now(), timeStamp: event.timeStamp });
			}
		};
		wrapped.set(listener, timed);
		return add.call(this, type, timed, options);
	};
	EventTarget.prototype.removeEventListener = function (type, listener, options) {
		return remove.call(this, type, wrapped.get(listener) ?? listener, options);
	};
	for (const [proto, name] of [[Element.prototype, "setAttribute"], [Element.prototype, "removeAttribute"], [Node.prototype, "appendChild"], [Node.prototype, "insertBefore"], [Element.prototype, "remove"]]) {
		const original = proto[name];
		proto[name] = function (...args) {
			record.writes.push({ name, inside: record.depth > 0 });
			return original.apply(this, args);
		};
	}
	const text = Object.getOwnPropertyDescriptor(Node.prototype, "textContent");
	Object.defineProperty(Node.prototype, "textContent", { ...text, set(value) { record.writes.push({ name: "textContent", inside: record.depth > 0 }); text.set.call(this, value); } });
})();`;

/** The q-th quantile of numbers by nearest rank: the smallest at or above that share of them. */
export function nearestRank(values, q) {
	const sorted = [...values].sort((a, b) => a - b);
	return sorted[Math.max(0, Math.ceil(q * sorted.length) - 1)];
}

/** The deliveries' times: their 95th percentile, which the bound judges, and their maximum and median, reported beside it. */
export function deliveryTimes(deliveries) {
	const took = deliveries.map((d) => d.end - d.start);
	return { p95: nearestRank(took, 0.95), max: Math.max(...took), median: nearestRank(took, 0.5), count: took.length };
}

/** Why the deliveries break the bound, as words; empty when their 95th percentile is within it. */
export function immediacyProblems(deliveries, boundMs = DELIVERY_BOUND_MS) {
	if (deliveries.length === 0) return ["no delivery was timed"];
	const { p95, max, median, count } = deliveryTimes(deliveries);
	return p95 > boundMs ? [`the 95th percentile of ${count} deliveries took ${p95.toFixed(2)} ms, beyond ${boundMs} ms (maximum ${max.toFixed(2)}, median ${median.toFixed(2)})`] : [];
}

/** Typing fast, a chord, a drag of many moves, wheels and a pinch: the inputs a person makes quickly. */
async function driveQuickly(t) {
	for (const [key, code, vk] of [["t", "KeyT", 84], ["y", "KeyY", 89], ["p", "KeyP", 80], ["e", "KeyE", 69], ["d", "KeyD", 68], ["f", "KeyF", 70], ["a", "KeyA", 65], ["s", "KeyS", 83], ["t", "KeyT", 84]]) {
		await t.key("keyDown", key, code, { text: key, windowsVirtualKeyCode: vk });
		await t.key("keyDown", key, code, { text: key, autoRepeat: true, windowsVirtualKeyCode: vk });
		await t.key("keyUp", key, code, { windowsVirtualKeyCode: vk });
	}
	await t.key("keyDown", "Control", "ControlLeft", { modifiers: MODIFIERS.ctrl, windowsVirtualKeyCode: 17 });
	await t.key("keyDown", "Shift", "ShiftLeft", { modifiers: MODIFIERS.ctrl | MODIFIERS.shift, windowsVirtualKeyCode: 16 });
	await t.key("keyDown", "K", "KeyK", { modifiers: MODIFIERS.ctrl | MODIFIERS.shift, windowsVirtualKeyCode: 75 });
	await t.key("keyUp", "K", "KeyK", { modifiers: MODIFIERS.ctrl | MODIFIERS.shift, windowsVirtualKeyCode: 75 });
	await t.key("keyUp", "Shift", "ShiftLeft", { modifiers: MODIFIERS.ctrl, windowsVirtualKeyCode: 16 });
	await t.key("keyUp", "Control", "ControlLeft", { windowsVirtualKeyCode: 17 });
	const at = t.keyCentre("KeyG");
	await t.mouse("mouseMoved", at);
	await t.mouse("mousePressed", at, { button: "left", buttons: 1 });
	for (let i = 1; i <= 40; i++) await t.mouse("mouseMoved", { x: at.x + i * 7, y: at.y + (i % 9) }, { buttons: 1 });
	await t.mouse("mousePressed", { x: at.x + 280, y: at.y }, { button: "right", buttons: 3 });
	await t.mouse("mouseReleased", { x: at.x + 280, y: at.y }, { button: "left", buttons: 2 });
	await t.mouse("mouseReleased", { x: at.x + 280, y: at.y }, { button: "right", buttons: 0 });
	for (let i = 0; i < 6; i++) await t.wheel(at, 0, i < 3 ? 100 : -100);
	await t.chrome.send("Input.synthesizePinchGesture", { x: at.x, y: at.y, scaleFactor: 1.5, relativeSpeed: 800, gestureSourceType: "mouse" });
	await t.settle();
}

/** Opens the tester with the harness set, waits until the Keyboard Map's labels are painted, and empties the harness's record. */
async function openTimed(siteDir) {
	const t = await openTesterInChrome({ siteDir, beforeLoad: [HARNESS] });
	try {
		for (let i = 0; i < 60 && !(await t.chrome.evaluate("document.querySelector('#input-surface .label-reported') !== null")); i++) await sleep(50);
		await t.chrome.evaluate("deliveryHarness.deliveries.length = 0; deliveryHarness.writes.length = 0");
		return t;
	} catch (error) {
		await t.close();
		throw error;
	}
}

test("GT9: the deliveries -- each the composition root's routing, the picture state and every put inside it -- complete within 10 ms at their 95th percentile, the maximum and the median reported; the time from each fact's time to the end of its put is reported", TEST, async (ctx) => {
	const t = await openTimed(siteRoot);
	try {
		await driveQuickly(t);
		const deliveries = await t.page("deliveryHarness.deliveries");
		assert.ok(deliveries.length > 80, `${deliveries.length} deliveries timed`);
		assert.deepEqual(immediacyProblems(deliveries), []);
		const { p95, max, median } = deliveryTimes(deliveries);
		const latency = deliveries.map((d) => d.end - d.timeStamp);
		ctx.diagnostic(`${deliveries.length} deliveries: 95th percentile ${p95.toFixed(2)} ms, the bound's measure; maximum ${max.toFixed(2)} ms, median ${median.toFixed(2)} ms; from each fact's time to the end of its put, at most ${Math.max(...latency).toFixed(2)} ms (median ${nearestRank(latency, 0.5).toFixed(2)})`);
	} finally {
		await t.close();
	}
});

test("GT2: once the page is composed and its labels painted, every write to the page happens inside an input's delivery", TEST, async () => {
	const t = await openTimed(siteRoot);
	try {
		await driveQuickly(t);
		const writes = await t.page("deliveryHarness.writes");
		assert.ok(writes.length > 100, `${writes.length} writes`);
		assert.deepEqual(writes.filter((w) => !w.inside), []);
	} finally {
		await t.close();
	}
});

for (const wait of [50, 12]) {
	test(`GT9: a planted build that waits ${wait} ms in every delivery fails the bound at its 95th percentile`, TEST, async () => {
		const planted = plantedSite([{ file: "app/composition-root.js", find: DELIVERY_OPENS, replace: `${DELIVERY_OPENS}\n        { const until = performance.now() + ${wait}; while (performance.now() < until) { } }` }]);
		let t;
		try {
			t = await openTimed(planted.dir);
			for (let i = 0; i < 10; i++) {
				await t.key("keyDown", "a", "KeyA", { text: "a", windowsVirtualKeyCode: 65 });
				await t.key("keyUp", "a", "KeyA", { windowsVirtualKeyCode: 65 });
			}
			await t.settle();
			const deliveries = await t.page("deliveryHarness.deliveries");
			assert.ok(deliveries.length >= 20, `${deliveries.length} deliveries`);
			const problems = immediacyProblems(deliveries);
			assert.equal(problems.length, 1, JSON.stringify(problems));
			assert.ok(deliveryTimes(deliveries).p95 >= wait, problems[0]);
		} finally {
			await t?.close();
			planted.remove();
		}
	});
}

test("GT9's measure: the 95th percentile by nearest rank, so one slow delivery in twenty-one passes and two fail", () => {
	const at = (ms) => ({ type: "keydown", start: 0, end: ms, timeStamp: 0 });
	assert.deepEqual(immediacyProblems([...Array(20).fill(at(1)), at(40)]), [], "one delivery in twenty-one delayed by another process");
	assert.equal(immediacyProblems([...Array(19).fill(at(1)), at(40), at(40)]).length, 1, "two in twenty-one");
	assert.equal(nearestRank([5, 1, 3], 0.5), 3);
});

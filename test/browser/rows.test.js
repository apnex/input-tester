// rows - fidelity in a real browser (docs/ARCHITECTURE-TARGET.md section 8, GT5): the built site opened in
// headless Chrome and driven with trusted input over the DevTools protocol over every row the browser can
// produce -- keys held, repeated and released, a media key with no code, the browser's own keys, every button's
// press, click and drag, presses travelling exactly the threshold and just beyond, the view's pans with the
// middle button, the right on open ground and the left with Space held, chords in both release orders, double
// clicks, wheels of every direction and of no distance, a scroll pan and a pinch zoom, a synthesized touchpad pinch, the context
// menu, a pen's and a touch's pointers, and focus lost by opening a second tab, once during a captured drag
// released in the other tab and returned to with no up or cancel -- and after each input the verdict, the
// picture record and the page held to section 6. A claimed pinch leaves `visualViewport.scale` 1, and a planted
// build with its claim taken away makes it 2, the positive control. Every row marked trusted must be hit.
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { setTimeout as sleep } from "node:timers/promises";

import { loseFocus } from "@apnex/headless-chromium";

import { importBuilt, siteRoot } from "../support/built-site.js";
import { CLAIM_IN_ROUTER, plantedSite } from "../support/planted-site.js";
import { SPEC_ROW_CLAIMS } from "../support/architecture-section-6.js";
import { BUTTON_BITS, BUTTON_NAMES, MODIFIERS, openTesterInChrome } from "./tester-in-chrome.js";

const { TESTER_ROWS } = await importBuilt("input-bindings.js");
const WORDS_OF = new Map(TESTER_ROWS.map((r) => [r.id, r.words]));
const { NOT_REPORTED_LINES, CLAIMS_LINE } = await importBuilt("picture-painter.js");
const TEST = { timeout: 60000 };
const rowsHit = new Set();
/** Every claim seen for each row's hit by trusted input, by the row's words. */
const claimsSeen = new Map();
let t;

/** Counts a row hit by trusted input, with whether its fact was claimed. */
function sawHit(id, claimed) {
	rowsHit.add(id);
	const words = WORDS_OF.get(id);
	if (!claimsSeen.has(words)) claimsSeen.set(words, new Set());
	claimsSeen.get(words).add(claimed);
}

/** The latest verdict, its hits and their claims counted toward the rows the trusted input reached. */
async function verdict() {
	const v = await t.verdict();
	for (const id of v?.hits ?? []) sawHit(id, v.claimed);
	for (const s of v?.steps ?? []) for (const id of s.meaning ?? []) sawHit(id, false);
	return v;
}

/** The rows the log's lines hit, counted with their claims toward the rows reached; answers the log's lines as [type, hits, claimed, notes]. */
async function logHits() {
	const log = await t.page("inputTester.picture.log.map((l) => [l.fact.type, l.hits, l.claimed, l.notes])");
	for (const [, hits, claimed] of log) for (const id of hits) sawHit(id, claimed);
	return log;
}

/**
 * A release's verdict as the log shows it -- its line, and its derived fact's line above it -- since the platform
 * follows a captured pointer's release with boundary facts, `over` and `out`, which hit no row and log nothing.
 */
async function releaseLines() {
	const log = await logHits();
	const [meaning, release] = log;
	return { meaning: meaning[0] === "commit" ? meaning[1] : null, release: release.slice(0, 3), notes: release[3] };
}

before(async () => {
	t = await openTesterInChrome({ siteDir: siteRoot });
}, { timeout: 60000 });

after(async () => {
	await t?.close();
}, { timeout: 30000 });

test("the page composes: no problem, the full-size ANSI plan, a Chromium browser with no uncovered line, a screen pixel one drawing unit, and what no page can know and what is claimed shown (IT-D8, IT-D9)", TEST, async () => {
	assert.deepEqual(await t.page("inputTester.problems"), []);
	assert.equal(await t.page("inputTester.plan"), "ansi");
	const [a, b, c, d] = t.matrix();
	assert.deepEqual([a, b, c, d], [1, 0, 0, 1], "the svg is drawn at one pixel to a drawing unit");
	assert.equal(await t.chrome.evaluate("document.querySelector('#input-surface .uncovered') === null"), true);
	const shown = await t.chrome.evaluate("document.getElementById('input-surface').textContent");
	for (const line of [...NOT_REPORTED_LINES, CLAIMS_LINE]) assert.ok(shown.includes(line), `the page shows: ${line}`);
	const pinchRow = await t.page("[...document.querySelectorAll('#input-surface g.legend-row text.legend-words')].map((e) => [...e.querySelectorAll('tspan')].map((s) => s.textContent)).find((lines) => lines.join(' ').includes('touchpad pinch'))");
	assert.deepEqual(pinchRow, ["a pinch zoom: Ctrl and wheel, or a touchpad pinch:", "the browser does not tell them apart"], "the Ctrl row's sentence beside it in the legend, IT-D8's sentence whole on a line of its own (0009)");
	await t.chrome.evaluate("window.notReloaded = true");
});

test("labels: the Keyboard Map headless Chrome offers names a writing key, marked reported; a key it does not name keeps the plan's printing, assumed", TEST, async () => {
	for (let i = 0; i < 40 && !(await t.chrome.evaluate("[...document.querySelectorAll('#input-surface .label-reported')].length > 0")); i++) await sleep(50);
	const labels = await t.page("[...document.querySelectorAll('#input-surface .key-label')].map((e) => [e.textContent, e.getAttribute('class')])");
	assert.ok(labels.some(([text, cls]) => text === "q" && cls.includes("label-reported")), "KeyQ as the map reported it");
	assert.ok(labels.some(([text, cls]) => text === "Shift" && cls.includes("label-assumed")));
});

test("keys: a modifier press, a first press with Shift held, a repeat, a roll-over press and releases; each claimed, the keys lit while held", TEST, async () => {
	const shift = MODIFIERS.shift;
	await t.key("keyDown", "Shift", "ShiftLeft", { modifiers: shift, windowsVirtualKeyCode: 16 });
	let v = await verdict();
	assert.deepEqual([v.hits, v.claimed, v.steps], [["key-modifier-press"], true, [{ operation: "keyDown", phase: null, gesture: null, tracked: true, held: false }]]);
	assert.equal(await t.litAt(t.keyCentre("ShiftLeft")), true, "the page lights the key");
	await t.key("keyDown", "A", "KeyA", { modifiers: shift, text: "A", windowsVirtualKeyCode: 65 });
	v = await verdict();
	assert.deepEqual(v.hits, ["key-first-press"], "Shift makes no chord");
	await t.key("keyDown", "A", "KeyA", { modifiers: shift, text: "A", autoRepeat: true, windowsVirtualKeyCode: 65 });
	v = await verdict();
	assert.deepEqual([v.hits, v.steps[0].held], [["key-repeat"], true]);
	const held = await t.page("inputTester.picture.heldKeys.map((k) => [k.code, k.firstSeen, k.repeats, typeof k.interval])");
	assert.deepEqual(held, [["ShiftLeft", "press", 0, "object"], ["KeyA", "press", 1, "number"]]);
	await t.key("keyDown", "S", "KeyS", { modifiers: shift, text: "S", windowsVirtualKeyCode: 83 });
	assert.deepEqual((await verdict()).hits, ["key-roll-over-press"]);
	for (const [k, code, vk] of [["S", "KeyS", 83], ["A", "KeyA", 65]]) {
		await t.key("keyUp", k, code, { modifiers: shift, windowsVirtualKeyCode: vk });
		assert.deepEqual((await verdict()).hits, ["key-release"]);
	}
	await t.key("keyUp", "Shift", "ShiftLeft", { windowsVirtualKeyCode: 16 });
	assert.deepEqual((await verdict()).hits, ["key-release"]);
	assert.equal(await t.litAt(t.keyCentre("ShiftLeft")), false);
	assert.match(await t.newestLogLine(), /^key-up code ShiftLeft, key "Shift".*-> a release \(claimed\); held [0-9.]+ ms$/);
});

test("keys: a modifier chord, a release whose press was not seen, a media key with no code, and Tab claimed so focus never wanders", TEST, async () => {
	await t.key("keyDown", "Control", "ControlLeft", { modifiers: MODIFIERS.ctrl, windowsVirtualKeyCode: 17 });
	assert.deepEqual((await verdict()).hits, ["key-modifier-press"]);
	await t.key("keyDown", "a", "KeyA", { modifiers: MODIFIERS.ctrl, windowsVirtualKeyCode: 65 });
	assert.deepEqual((await verdict()).hits, ["key-modifier-chord"]);
	await t.key("keyUp", "a", "KeyA", { modifiers: MODIFIERS.ctrl, windowsVirtualKeyCode: 65 });
	await t.key("keyUp", "Control", "ControlLeft", { windowsVirtualKeyCode: 17 });
	await t.key("keyUp", "z", "KeyZ", { windowsVirtualKeyCode: 90 });
	let v = await verdict();
	assert.deepEqual([v.hits, v.steps[0].held], [["key-release-press-unseen"], false]);
	await t.key("keyDown", "AudioVolumeUp", "", { windowsVirtualKeyCode: 175 });
	v = await verdict();
	assert.deepEqual([v.code, v.hits, v.claimed, v.steps[0].tracked], ["", ["key-no-identity"], true, false]);
	assert.deepEqual(await t.page("inputTester.picture.heldKeys"), [], "no key lights");
	assert.match(await t.newestLogLine(), /code "", key "AudioVolumeUp".*a key with no identity.*its physical key not reported/);
	await t.key("keyUp", "AudioVolumeUp", "", { windowsVirtualKeyCode: 175 });
	await t.key("keyDown", "Tab", "Tab", { windowsVirtualKeyCode: 9 });
	v = await verdict();
	assert.deepEqual([v.hits, v.claimed], [["key-first-press"], true]);
	await t.key("keyUp", "Tab", "Tab", { windowsVirtualKeyCode: 9 });
	assert.equal(await t.chrome.evaluate("document.activeElement === document.body"), true, "Tab claimed: focus stays where it was");
});

test("the browser's own keys reach the page and match the unclaimed row -- reload, fullscreen and the developer tools, every platform's at once -- and the page is not reloaded", TEST, async () => {
	const { ctrl, shift, alt, meta } = MODIFIERS;
	const combos = [["F5", "F5", 0, 116], ["F5", "F5", ctrl, 116], ["F5", "F5", shift, 116], ["r", "KeyR", ctrl, 82], ["R", "KeyR", ctrl | shift, 82], ["F11", "F11", 0, 122], ["F12", "F12", 0, 123], ["I", "KeyI", ctrl | shift, 73], ["J", "KeyJ", ctrl | shift, 74], ["C", "KeyC", ctrl | shift, 67], ["BrowserRefresh", "BrowserRefresh", 0, 168], ["r", "KeyR", meta, 82], ["f", "KeyF", ctrl | meta, 70], ["i", "KeyI", meta | alt, 73], ["c", "KeyC", meta | shift, 67]];
	for (const [key, code, modifiers, vk] of combos) {
		await t.key("rawKeyDown", key, code, { modifiers, windowsVirtualKeyCode: vk });
		const v = await verdict();
		assert.deepEqual([v.code, v.hits, v.claimed], [code, ["key-left-to-browser"], false], `${code} with modifiers ${modifiers}`);
		await t.key("keyUp", key, code, { modifiers, windowsVirtualKeyCode: vk });
	}
	assert.equal(await t.chrome.evaluate("window.notReloaded === true"), true);
	assert.deepEqual(await t.page("inputTester.picture.heldKeys"), []);
});

test("the recorder's ruling: the browser's own keys are matched by the layout's letter -- Dvorak's Ctrl+R, the key printing r being KeyO -- and view source, Ctrl+U and macOS's Meta+Alt+U, is among them; the letter on another key with no modifier is claimed", TEST, async () => {
	const { ctrl, alt, meta } = MODIFIERS;
	for (const [key, code, modifiers, vk] of [["r", "KeyO", ctrl, 82], ["u", "KeyU", ctrl, 85], ["u", "KeyU", meta | alt, 85]]) {
		await t.key("rawKeyDown", key, code, { modifiers, windowsVirtualKeyCode: vk });
		const v = await verdict();
		assert.deepEqual([v.code, v.hits, v.claimed], [code, ["key-left-to-browser"], false], `${code} "${key}" with modifiers ${modifiers}`);
		await t.key("keyUp", key, code, { modifiers, windowsVirtualKeyCode: vk });
	}
	await t.key("keyDown", "r", "KeyO", { text: "r", windowsVirtualKeyCode: 82 });
	const v = await verdict();
	assert.deepEqual([v.hits, v.claimed], [["key-first-press"], true]);
	await t.key("keyUp", "r", "KeyO", { windowsVirtualKeyCode: 82 });
	assert.equal(await t.chrome.evaluate("window.notReloaded === true"), true);
});

test("every button: a press starts its press gesture, lit while held, and its release commits it, a click -- claimed, so the back and forward buttons navigate nowhere", TEST, async () => {
	const at = t.keyCentre("KeyG");
	for (let b = 0; b <= 4; b++) {
		await t.mouse("mouseMoved", at);
		await t.mouse("mousePressed", at, { button: BUTTON_NAMES[b], buttons: BUTTON_BITS[b] });
		await t.settle();
		const log = await logHits();
		const press = log.find(([type]) => type === "down");
		assert.deepEqual(press.slice(1, 3), [[b === 1 ? "pan-middle" : `button-${b}-press`], true], `button ${b}'s press, the middle button's a pan row with no gesture live, opening press-1 as its press row does`);
		assert.match(press[3].join(" "), new RegExp(`started press-${b}`));
		assert.equal(await t.litAt(t.buttonCentre(b)), true, `button ${b} drawn lit`);
		await t.mouse("mouseReleased", at, { button: BUTTON_NAMES[b], buttons: 0 });
		await t.settle();
		const { meaning, release, notes } = await releaseLines();
		assert.deepEqual([release, notes, meaning], [["up", [`button-${b}-release`], true], [`committed press-${b}, a click`], [`button-${b}-click`]], `button ${b}'s release`);
		assert.equal(await t.litAt(t.buttonCentre(b)), false);
	}
	assert.equal(await t.chrome.evaluate("window.notReloaded === true && inputTester.plan === 'ansi'"), true, "the back and forward buttons' releases claimed: the page not left");
});

test("the back and forward buttons navigate nowhere: with history behind and ahead of the page, each one's press and release, claimed, leaves the page where it was", TEST, async () => {
	await t.load("?plan=ansi&history=first");
	await t.load("?plan=ansi&history=second");
	await t.chrome.evaluate("history.back()");
	for (let i = 0; i < 100 && !/history=first/.test(await t.chrome.evaluate("location.href").catch(() => "")); i++) await sleep(25);
	await t.ready();
	assert.deepEqual(await t.page("[location.search, history.length >= 3]"), ["?plan=ansi&history=first", true], "history behind (the blank page and more) and ahead (the second load)");
	await t.chrome.evaluate("window.stillHere = true");
	const at = t.keyCentre("KeyG");
	for (const [name, bit, b] of [["back", 8, 3], ["forward", 16, 4]]) {
		await t.mouse("mouseMoved", at);
		await t.mouse("mousePressed", at, { button: name, buttons: bit });
		await t.mouse("mouseReleased", at, { button: name, buttons: 0 });
		await sleep(500);
		assert.deepEqual(await t.page("[location.search, window.stillHere === true]"), ["?plan=ansi&history=first", true], `the ${name} button navigated nowhere`);
		const { release } = await releaseLines();
		assert.deepEqual(release, ["up", [`button-${b}-release`], true]);
	}
	await t.chrome.evaluate("window.notReloaded = true");
});

test("every button's drag but the middle's, which pans, its pointer taken through every move, each move targeting the svg: a move of exactly the threshold is no crossing, a move just beyond it becomes the drag without a from, plain drag moves hit no row, and the release is a drop meaning a drag of that button", TEST, async () => {
	const at = t.keyCentre("KeyH");
	for (const b of [0, 2, 3, 4]) {
		await t.mouse("mouseMoved", at);
		await t.mouse("mousePressed", at, { button: BUTTON_NAMES[b], buttons: BUTTON_BITS[b] });
		await t.settle();
		await t.trackMoves();
		await t.mouse("mouseMoved", { x: at.x + 4, y: at.y }, { buttons: BUTTON_BITS[b] });
		await t.assertTaken(`button ${b}, after a move of exactly the threshold`);
		let v = await verdict();
		assert.deepEqual([v.button, v.hits, v.steps], [-1, [], [{ operation: "pointerMove", phase: "update", gesture: `press-${b}`, crossed: false }]], `button ${b}: exactly the threshold`);
		await t.mouse("mouseMoved", { x: at.x + 5, y: at.y }, { buttons: BUTTON_BITS[b] });
		await t.assertTaken(`button ${b}, after a move just beyond the threshold`);
		v = await verdict();
		assert.deepEqual([v.hits, v.steps], [[], [{ operation: "pointerMove", phase: "update", gesture: `press-${b}`, crossed: true }, { operation: "becomeGesture", phase: "become", gesture: `drag-${b}` }]], `button ${b}: just beyond`);
		await t.mouse("mouseMoved", { x: at.x + 40, y: at.y + 12 }, { buttons: BUTTON_BITS[b] });
		await t.assertTaken(`button ${b}, after a plain drag's move`);
		v = await verdict();
		assert.deepEqual([v.buttons, v.hits], [BUTTON_BITS[b], []], "a plain drag's move matches no chord row");
		assert.equal(await t.chrome.evaluate("document.querySelector('#input-surface .drag-line') !== null"), true, "the drag's line drawn");
		await t.mouse("mouseReleased", { x: at.x + 40, y: at.y + 12 }, { button: BUTTON_NAMES[b], buttons: 0 });
		await t.settle();
		const { meaning, release, notes } = await releaseLines();
		assert.deepEqual([release, notes, meaning], [["up", [`button-${b}-release`], true], [`committed drag-${b}, a drop`], [`button-${b}-drag`]]);
		assert.equal(await t.chrome.evaluate("document.querySelector('#input-surface .drag-line') === null"), true);
	}
	await t.mouse("mouseMoved", at);
	await t.mouse("mousePressed", at, { button: "left", buttons: 1 });
	await t.mouse("mouseMoved", { x: at.x + 4, y: at.y }, { buttons: 1 });
	await t.mouse("mouseReleased", { x: at.x + 4, y: at.y }, { button: "left", buttons: 0 });
	await t.settle();
	assert.deepEqual((await releaseLines()).meaning, ["button-0-click"], "a press travelling exactly the threshold is a click");
});

test("IT-D4: while the pointer is taken every fact targets the svg, and the item under the pointer is itemAt the fact's screen point -- the key it is over, then the next", TEST, async () => {
	const from = t.keyCentre("KeyG");
	const to = t.keyCentre("KeyH");
	await t.chrome.evaluate("window.moveTargets = []; document.getElementById('input-surface').addEventListener('pointermove', (e) => moveTargets.push(e.target.localName), true)");
	await t.mouse("mouseMoved", from);
	await t.mouse("mousePressed", from, { button: "left", buttons: 1 });
	assert.equal(await t.chrome.evaluate("document.getElementById('input-surface').hasPointerCapture(1)"), true, "the press took the pointer");
	assert.equal(await t.page("inputTester.picture.under.key"), "key KeyG");
	await t.chrome.evaluate("moveTargets.length = 0");
	await t.mouse("mouseMoved", to, { buttons: 1 });
	assert.deepEqual(await t.page("[moveTargets, document.getElementById('input-surface').hasPointerCapture(1)]"), [["svg"], true], "the pointer still taken: the move targets the svg, for which itemOf answers nothing");
	assert.deepEqual(await t.page("[inputTester.latestVerdict.fact.hit.key, inputTester.picture.under.key]"), ["key KeyH", "key KeyH"]);
	assert.match(await t.chrome.evaluate("document.querySelector('#input-surface .status-line').textContent"), /under the pointer: key KeyH \(keys\)/);
	await t.mouse("mouseReleased", to, { button: "left", buttons: 0 });
	await t.settle();
});

test("trusted input: a move that names its held button keeps the taken pointer; one that names none, its bit held, loses it at once, and its fact targets what lies under it (0002, the driver's correction)", TEST, async () => {
	const from = t.keyCentre("KeyJ");
	const to = t.keyCentre("KeyK");
	const captured = () => t.chrome.evaluate("document.getElementById('input-surface').hasPointerCapture(1)");
	for (const [named, kept] of [[undefined, true], ["none", false]]) {
		await t.mouse("mouseMoved", from);
		await t.mouse("mousePressed", from, { button: "left", buttons: 1 });
		assert.equal(await captured(), true);
		await t.mouse("mouseMoved", to, { buttons: 1, ...(named === undefined ? {} : { button: named }) });
		assert.equal(await captured(), kept, `a move naming ${named ?? "its held button"}`);
		await t.mouse("mouseReleased", to, { button: "left", buttons: 0 });
		await t.settle();
	}
});

test("section 7, resize: nothing is repainted when the page is resized, and the next press lands on the key under it, each conversion following the root's screen transform as it stands", TEST, async () => {
	await t.mouse("mouseMoved", { x: 4, y: 4 });
	await t.settle();
	const facts = await t.facts();
	await t.chrome.evaluate("window.mutations = 0; window.watcher = new MutationObserver((records) => (window.mutations += records.length)); window.watcher.observe(document.getElementById('input-surface'), { subtree: true, childList: true, attributes: true, characterData: true })");
	await t.chrome.send("Emulation.setDeviceMetricsOverride", { width: 1200, height: 900, deviceScaleFactor: 1, mobile: false });
	await sleep(300);
	assert.equal(await t.facts(), facts, "with the pointer off the picture, the resize delivered no fact");
	assert.equal(await t.chrome.evaluate("window.mutations"), 0, "a resize repaints nothing");
	await t.ready();
	assert.ok(t.matrix()[0] < 1, `the root is drawn smaller: ${t.matrix()}`);
	const at = t.keyCentre("KeyT");
	await t.mouse("mouseMoved", at);
	await t.mouse("mousePressed", at, { button: "left", buttons: 1 });
	assert.equal(await t.page("inputTester.picture.under.key"), "key KeyT");
	await t.mouse("mouseReleased", at, { button: "left", buttons: 0 });
	await t.settle();
	await t.chrome.evaluate("window.watcher.disconnect()");
	await t.chrome.send("Emulation.setDeviceMetricsOverride", { width: 1656, height: 1000, deviceScaleFactor: 1, mobile: false });
	await sleep(200);
	await t.ready();
	assert.deepEqual(t.matrix().slice(0, 4), [1, 0, 0, 1]);
});

test("chords in both release orders, the pointer taken through every move with either button or both held: during a drag the right pressed, the left released, then the right, committing drag-0; and with no drag the right released first, the left last, committing press-0", TEST, async () => {
	const at = t.keyCentre("KeyJ");
	await t.mouse("mouseMoved", at);
	await t.mouse("mousePressed", at, { button: "left", buttons: 1 });
	await t.trackMoves();
	await t.mouse("mouseMoved", { x: at.x + 30, y: at.y }, { buttons: 1 });
	await t.assertTaken("the left button's drag, after its move");
	await t.mouse("mousePressed", { x: at.x + 30, y: at.y }, { button: "right", buttons: 3 });
	await t.settle();
	await t.assertTaken("the right button joining the drag, its chorded press a move");
	let log = await logHits();
	assert.deepEqual(log.slice(0, 2).map(([type, hits]) => [type, hits]), [["context-menu", ["context-menu"]], ["move", ["chorded-press"]]], "the menu's event after the chord's press, on Linux");
	await t.mouse("mouseMoved", { x: at.x + 40, y: at.y }, { buttons: 3 });
	await t.assertTaken("both buttons held, after a move");
	await t.mouse("mouseReleased", { x: at.x + 40, y: at.y }, { button: "left", buttons: 2 });
	let v = await verdict();
	assert.deepEqual([v.type, v.button, v.buttons, v.hits, v.steps], ["move", 0, 2, ["chorded-release"], [{ operation: "pointerMove", phase: "update", gesture: "drag-0", crossed: false }]]);
	await t.assertTaken("the left button released, its chorded release a move");
	await t.mouse("mouseMoved", { x: at.x + 50, y: at.y }, { buttons: 2 });
	await t.assertTaken("the right button alone held, after a move");
	await t.mouse("mouseReleased", { x: at.x + 50, y: at.y }, { button: "right", buttons: 0 });
	await t.settle();
	const drop = await releaseLines();
	assert.deepEqual([drop.release, drop.notes, drop.meaning], [["up", ["button-2-release"], true], ["committed drag-0, a drop"], ["button-0-drag"]]);
	await t.mouse("mousePressed", at, { button: "left", buttons: 1 });
	await t.trackMoves();
	await t.mouse("mousePressed", at, { button: "right", buttons: 3 });
	await t.assertTaken("with no drag, the right button's chorded press a move");
	await t.mouse("mouseReleased", at, { button: "right", buttons: 1 });
	v = await verdict();
	assert.deepEqual([v.type, v.button, v.buttons, v.hits], ["move", 2, 1, ["chorded-release"]]);
	await t.assertTaken("with no drag, the right button's chorded release a move");
	await t.mouse("mouseReleased", at, { button: "left", buttons: 0 });
	await t.settle();
	const { meaning, release, notes } = await releaseLines();
	assert.deepEqual([release, notes, meaning], [["up", ["button-0-release"], true], ["committed press-0, a click"], ["button-0-click"]]);
	log = await logHits();
	assert.ok(log.some(([type, hits]) => type === "context-menu" && hits[0] === "context-menu"));
});

test("a press of another button while a gesture is live, its release unseen, cancels it and starts its own; a second press of the live gesture's own button is taken, nothing cancelled or started", TEST, async () => {
	const at = t.keyCentre("KeyK");
	await t.mouse("mouseMoved", at);
	await t.mouse("mousePressed", at, { button: "left", buttons: 1 });
	await t.mouse("mousePressed", at, { button: "left", buttons: 1 });
	let v = await verdict();
	assert.deepEqual([v.type, v.hits, v.steps], ["down", ["button-0-press"], [{ operation: "resolvePress", phase: null, gesture: null, taken: true }]]);
	assert.deepEqual(await t.page("[inputTester.picture.gesture.name, inputTester.picture.gesture.live]"), ["press-0", true]);
	await t.mouse("mousePressed", at, { button: "middle", buttons: 4 });
	v = await verdict();
	assert.deepEqual([v.type, v.button, v.hits, v.steps], ["down", 1, ["button-1-press"], [{ operation: "resolvePress", phase: "start", gesture: "press-1", taken: false, cancelled: "press-0" }]]);
	await t.mouse("mouseReleased", at, { button: "middle", buttons: 0 });
	await t.settle();
	assert.deepEqual((await releaseLines()).meaning, ["button-1-click"]);
});

/**
 * The notes of the newest move the log shows: a pan's crossing move, whose verdict the boundary facts that follow
 * the pointer taken at engagement, `over` and `out`, leave behind as the latest, hitting no row and logging nothing.
 */
async function crossingNotes() {
	await t.settle();
	return (await logHits()).find(([type]) => type === "move")?.[3] ?? null;
}

/** The view's pan as the picture keeps it, and whether the `<svg>` holds the pointer's capture. */
const panAndTaken = async () => [await t.page("inputTester.picture.view.pan === null ? null : [inputTester.picture.view.pan.gesture, inputTester.picture.view.pan.distance]"), await t.taken()];

test("the view's middle pan: a press of button 1, no gesture live, is pan-middle opening press-1, nothing taken; a move of exactly the threshold engages nothing; one just beyond becomes pan-middle, the pointer taken then; the view follows the travel on screen; the release commits nothing", TEST, async () => {
	const at = t.keyCentre("KeyJ");
	await t.mouse("mouseMoved", at);
	await t.mouse("mousePressed", at, { button: "middle", buttons: 4 });
	let v = await verdict();
	assert.deepEqual([v.type, v.hits, v.claimed, v.steps], ["down", ["pan-middle"], true, [{ operation: "resolvePress", phase: "start", gesture: "press-1", taken: false }]]);
	assert.deepEqual(await panAndTaken(), [null, false], "below the threshold nothing is taken");
	await t.mouse("mouseMoved", { x: at.x + 4, y: at.y }, { buttons: 4 });
	v = await verdict();
	assert.deepEqual([v.steps, await panAndTaken()], [[{ operation: "pointerMove", phase: "update", gesture: "press-1", crossed: false }], [null, false]], "exactly the threshold: no pan");
	await t.mouse("mouseMoved", { x: at.x + 5, y: at.y }, { buttons: 4 });
	assert.deepEqual(await crossingNotes(), ["press-1 became pan-middle: beyond the threshold", `pan-middle engaged at screen ${at.x + 5}, ${at.y}: the pointer taken`]);
	assert.deepEqual(await panAndTaken(), [["pan-middle", 0], true], "the pointer taken as the pan engages");
	await t.trackMoves();
	await t.mouse("mouseMoved", { x: at.x + 8, y: at.y + 4 }, { buttons: 4 });
	await t.assertTaken("a live pan's move");
	assert.deepEqual(await panAndTaken(), [["pan-middle", 5], true]);
	assert.equal(await t.chrome.evaluate("document.querySelector('#input-surface .drag-line') === null"), true, "a pan draws no drag line");
	await t.mouse("mouseReleased", { x: at.x + 8, y: at.y + 4 }, { button: "middle", buttons: 0 });
	await t.settle();
	const { meaning, release, notes } = await releaseLines();
	assert.deepEqual([release, meaning], [["up", ["button-1-release"], true], []]);
	assert.deepEqual(notes, ["committed pan-middle, a drop", "pan-middle released after 5 screen pixels: no edit, the view left where it is"]);
	assert.deepEqual(await panAndTaken(), [null, false]);
});

test("a drag of button 1 still exists where no pan row takes the press: the middle pressed while press-0 is live, its release unseen, is a press of button 1, and travelled it becomes drag-1, a drop meaning a drag of button 1", TEST, async () => {
	const at = t.keyCentre("KeyU");
	await t.mouse("mouseMoved", at);
	await t.mouse("mousePressed", at, { button: "left", buttons: 1 });
	await t.mouse("mousePressed", at, { button: "middle", buttons: 4 });
	let v = await verdict();
	assert.deepEqual([v.hits, v.steps], [["button-1-press"], [{ operation: "resolvePress", phase: "start", gesture: "press-1", taken: false, cancelled: "press-0" }]]);
	await t.mouse("mouseMoved", { x: at.x + 10, y: at.y }, { buttons: 4 });
	v = await verdict();
	assert.deepEqual(v.steps.map((s) => [s.operation, s.gesture]), [["pointerMove", "press-1"], ["becomeGesture", "drag-1"]]);
	assert.equal(await t.chrome.evaluate("document.querySelector('#input-surface .drag-line') !== null"), true, "the drag's line drawn");
	await t.mouse("mouseReleased", { x: at.x + 10, y: at.y }, { button: "middle", buttons: 0 });
	await t.settle();
	assert.deepEqual((await releaseLines()).meaning, ["button-1-drag"]);
});

test("the view's right pan: a press of button 2 on a key is a press of button 2; on open ground, no gesture live, it is pan-right, and travelled it becomes pan-right, the pointer taken then; its release is claimed, so no menu", TEST, async () => {
	const ground = t.screenOf({ x: 925, y: 30 });
	await t.mouse("mouseMoved", ground);
	await t.settle();
	assert.equal(await t.page("inputTester.picture.under"), null, "the point is open ground: nothing of the picture under it");
	await t.mouse("mousePressed", ground, { button: "right", buttons: 2 });
	await t.settle();
	const downLine = async () => (await logHits()).find(([type]) => type === "down");
	assert.deepEqual((await downLine()).slice(1, 3), [["pan-right"], true], "the press's line, the context menu Linux sends at a right press after it");
	assert.deepEqual(await panAndTaken(), [null, false]);
	await t.mouse("mouseMoved", { x: ground.x, y: ground.y + 6 }, { buttons: 2 });
	assert.match((await crossingNotes()).join("; "), /^press-2 became pan-right: beyond the threshold; pan-right engaged at screen/);
	assert.deepEqual(await panAndTaken(), [["pan-right", 0], true]);
	await t.mouse("mouseReleased", { x: ground.x, y: ground.y + 6 }, { button: "right", buttons: 0 });
	await t.settle();
	assert.deepEqual((await releaseLines()).meaning, []);
	const key = t.keyCentre("KeyY");
	await t.mouse("mouseMoved", key);
	await t.mouse("mousePressed", key, { button: "right", buttons: 2 });
	await t.settle();
	assert.deepEqual((await downLine()).slice(1, 3), [["button-2-press"], true], "on a key: not open ground");
	assert.deepEqual(await panAndTaken(), [null, true], "a press row's pointer taken at the press, as today");
	await t.mouse("mouseReleased", key, { button: "right", buttons: 0 });
	await t.settle();
	assert.deepEqual((await releaseLines()).meaning, ["button-2-click"]);
});

test("open ground is nothing of the picture under the press: a right press on a drawn mouse button or on the mouse's body is a press of button 2; one on the panel's text, which the platform looks through, is pan-right", TEST, async () => {
	const labels = await t.page("(() => { const e = [...document.querySelectorAll('#input-surface text.notice')].find((n) => n.textContent.startsWith('Labels:')); const b = e.getBBox(); return [b.x, b.y, b.width, b.height]; })()");
	const onText = { x: labels[0] + 40, y: labels[1] + labels[3] / 2 };
	for (const [where, drawing, under, row] of [
		["a drawn mouse button", null, "mouse button 0", "button-2-press"],
		["the mouse's body", { x: 1040, y: 180 }, "mouse body", "button-2-press"],
		["the panel's text", onText, null, "pan-right"],
	]) {
		const point = drawing === null ? t.buttonCentre(0) : t.screenOf(drawing);
		await t.mouse("mouseMoved", point);
		await t.settle();
		assert.equal(await t.page("inputTester.picture.under === null ? null : inputTester.picture.under.key"), under, `${where}: what lies under the press`);
		await t.mouse("mousePressed", point, { button: "right", buttons: 2 });
		await t.settle();
		assert.deepEqual((await logHits()).find(([type]) => type === "down").slice(1, 3), [[row], true], `a right press on ${where}`);
		await t.mouse("mouseReleased", point, { button: "right", buttons: 0 });
		await t.settle();
		assert.deepEqual((await releaseLines()).meaning, ["button-2-click"], `${where}: untravelled, a click of button 2`);
	}
});

test("the view's Space pan: a press of button 0 with Space held, no gesture live, is pan-space, and travelled it becomes pan-space; Space released, the left press is a press of button 0 again", TEST, async () => {
	const at = t.keyCentre("KeyT");
	await t.mouse("mouseMoved", at);
	await t.key("keyDown", " ", "Space", { text: " ", windowsVirtualKeyCode: 32 });
	await t.mouse("mousePressed", at, { button: "left", buttons: 1 });
	let v = await verdict();
	assert.deepEqual([v.hits, v.claimed], [["pan-space"], true]);
	await t.mouse("mouseMoved", { x: at.x, y: at.y - 7 }, { buttons: 1 });
	assert.match((await crossingNotes()).join("; "), /^press-0 became pan-space: beyond the threshold; pan-space engaged at screen/);
	assert.deepEqual(await panAndTaken(), [["pan-space", 0], true]);
	await t.mouse("mouseReleased", { x: at.x, y: at.y - 7 }, { button: "left", buttons: 0 });
	await t.key("keyUp", " ", "Space", { windowsVirtualKeyCode: 32 });
	await t.settle();
	await t.mouse("mousePressed", at, { button: "left", buttons: 1 });
	await t.settle();
	assert.deepEqual((await logHits()).find(([type]) => type === "down").slice(1, 3), [["button-0-press"], true]);
	await t.mouse("mouseReleased", at, { button: "left", buttons: 0 });
	await t.settle();
});

test("a double click: one double, matching its row, claimed", TEST, async () => {
	const at = t.keyCentre("KeyL");
	await t.mouse("mouseMoved", at);
	for (const n of [1, 2]) {
		await t.mouse("mousePressed", at, { button: "left", buttons: 1, clickCount: n });
		await t.mouse("mouseReleased", at, { button: "left", buttons: 0, clickCount: n });
	}
	await t.settle();
	const [double] = await logHits();
	assert.deepEqual(double.slice(0, 3), ["double", ["double-click"], true]);
	assert.match(await t.newestLogLine(), /^double no pointer type button 0/, "the platform's double click carries no pointer type");
});

test("wheels: up, down, sideways and still, each a scroll pan, claimed, in the unit the browser gave, the centre moved by its pixels; Ctrl and the wheel a pinch zoom, one level out per 100 pixels about the pointer", TEST, async () => {
	await t.load("?plan=ansi");
	const at = t.keyCentre("KeyB");
	await t.mouse("mouseMoved", at);
	for (const [dx, dy] of [[0, -120], [0, 120], [60, 0], [-60, 0], [0, 0]]) {
		await t.wheel(at, dx, dy);
		await t.settle();
		const v = await verdict();
		assert.deepEqual([v.type, v.hits, v.claimed], ["wheel", ["scroll-pan"], true], `deltas ${dx}, ${dy}`);
		assert.deepEqual(await t.page("[inputTester.picture.wheel.latest.deltaX, inputTester.picture.wheel.latest.deltaY, inputTester.picture.wheel.latest.deltaMode]"), [dx, dy, 0]);
		assert.equal(await t.page("inputTester.picture.view.words"), `scroll pan: the centre moved ${dx}, ${dy} screen pixels, the drawing the other way`);
	}
	await t.wheel(at, 0, 120, MODIFIERS.ctrl);
	await t.settle();
	const v = await verdict();
	assert.deepEqual([v.hits, v.claimed], [["pinch-zoom"], true]);
	assert.deepEqual(await t.page("[inputTester.picture.view.level, inputTester.picture.view.acc, inputTester.picture.view.words]"), [2, 20, `pinch zoom: 1x to 2x, 1 level, the scale times 0.5, about screen ${at.x}, ${at.y}, 20 pixels held`]);
	assert.match(await t.chrome.evaluate("document.querySelector('#input-surface .view-line').textContent"), /^view: 2x, pinch held 20 pxno panpinch zoom: 1x to 2x/, "the view's lines drawn");
	assert.equal(await t.chrome.evaluate("visualViewport.scale"), 1, "Ctrl and a mouse wheel make no page zoom in headless Chrome, claimed or not (section 10, row 9)");
	await t.chrome.evaluate("window.notReloaded = true");
});

test("a touchpad pinch synthesized over the protocol arrives as wheel facts with Ctrl, matching the pinch zoom, claimed, stepping the view in, and visualViewport.scale stays 1", TEST, async (tc) => {
	await t.load("?plan=ansi");
	const at = t.keyCentre("KeyN");
	await t.mouse("mouseMoved", at);
	await sleep(1000);
	const before = await t.facts();
	await t.chrome.send("Input.synthesizePinchGesture", { x: at.x, y: at.y, scaleFactor: 2, relativeSpeed: 800, gestureSourceType: "mouse" });
	const after = await t.settle();
	assert.ok(after - before >= 5, `${after - before} facts`);
	const v = await verdict();
	assert.deepEqual([v.type, v.hits, v.claimed], ["wheel", ["pinch-zoom"], true]);
	const line = (await logHits())[0];
	assert.deepEqual(line.slice(0, 3), ["wheel", ["pinch-zoom"], true]);
	const [level, acc, total] = await t.page("[inputTester.picture.view.level, inputTester.picture.view.acc, inputTester.picture.log.filter((l) => l.fact.type === 'wheel').length]");
	tc.diagnostic(`a synthesized pinch to twice the scale, in ${after - before} facts over ${total} log lines, left the view at ${level}x with ${acc} pixels held`);
	assert.ok(level < 1 || acc < 0, "a pinch outward, apart, steps the view in, toward 0.5x: its deltas negative");
	assert.equal(await t.chrome.evaluate("visualViewport.scale"), 1, "claimed: the page did not zoom");
	await t.chrome.evaluate("window.notReloaded = true");
});

test("a pen's and a touch's pointers match their one row, unclaimed, and the session never sees them", TEST, async () => {
	const at = t.keyCentre("KeyM");
	await t.mouse("mousePressed", at, { button: "left", buttons: 1, pointerType: "pen" });
	await t.mouse("mouseReleased", at, { button: "left", buttons: 0, pointerType: "pen" });
	await t.settle();
	const pen = (await logHits()).filter(([type]) => type === "down" || type === "up").slice(0, 2);
	assert.deepEqual(pen.map(([type, hits, claimed]) => [type, hits, claimed]), [["up", ["touch-or-pen-pointer"], false], ["down", ["touch-or-pen-pointer"], false]]);
	assert.match(await t.page("inputTester.picture.log.find((l) => l.fact.type === 'down').fact.pointerType"), /^pen$/);
	await t.chrome.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 2 });
	await sleep(100);
	await t.chrome.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: at.x, y: at.y, id: 1 }] });
	await t.chrome.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: at.x + 20, y: at.y, id: 1 }] });
	await t.chrome.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
	await t.settle();
	const log = await logHits();
	assert.ok(log.filter(([type]) => ["down", "move", "up"].includes(type)).slice(0, 3).every(([, hits, claimed]) => hits[0] === "touch-or-pen-pointer" && claimed === false));
	await t.chrome.send("Emulation.setTouchEmulationEnabled", { enabled: false });
	await sleep(100);
	assert.equal(await t.page("inputTester.picture.press"), null);
});

test("focus lost by opening a second tab: keysLost then pointerLost, every held key unlit and each release said not reported", TEST, async () => {
	await t.chrome.send("Page.bringToFront");
	for (let i = 0; i < 40 && !(await t.chrome.evaluate("document.hasFocus()")); i++) await sleep(50);
	await t.key("keyDown", "Shift", "ShiftLeft", { modifiers: MODIFIERS.shift, windowsVirtualKeyCode: 16 });
	await loseFocus(t.chrome, () => t.settle());
	const v = await verdict();
	assert.deepEqual([v.type, v.hits, v.steps.map((s) => s.operation)], ["blur", ["focus-lost"], ["keysLost", "pointerLost"]]);
	assert.deepEqual(await t.page("inputTester.picture.heldKeys"), []);
	assert.match(await t.newestLogLine(), /released ShiftLeft: their releases not reported/);
	// loseFocus answered once the page held the window's focus again
	await t.key("keyUp", "Shift", "ShiftLeft", { windowsVirtualKeyCode: 16 });
	assert.deepEqual((await verdict()).hits, ["key-release-press-unseen"], "its release, back in focus, is one whose press was not seen");
});

test("focus lost during a captured drag of each button, the middle button's a pan, released in the other tab: the pointer taken until then, the drag or the pan cancelled, its release not reported; returned to, the page sees no up and no cancel", TEST, async () => {
	for (let b = 0; b <= 4; b++) {
		const gesture = b === 1 ? "pan-middle" : `drag-${b}`;
		await t.chrome.send("Page.bringToFront");
		for (let i = 0; i < 40 && !(await t.chrome.evaluate("document.hasFocus()")); i++) await sleep(50);
		assert.equal(await t.chrome.evaluate("document.hasFocus()"), true, `button ${b}: the page holds the focus`);
		const at = t.keyCentre("KeyU");
		await t.mouse("mouseMoved", at);
		await t.mouse("mousePressed", at, { button: BUTTON_NAMES[b], buttons: BUTTON_BITS[b] });
		if (b === 1) await t.mouse("mouseMoved", { x: at.x + 5, y: at.y }, { buttons: BUTTON_BITS[b] });
		await t.trackMoves();
		await t.mouse("mouseMoved", { x: at.x + 30, y: at.y }, { buttons: BUTTON_BITS[b] });
		await t.assertTaken(`button ${b}'s ${gesture}, before focus is lost`);
		assert.equal(await t.page("inputTester.picture.gesture.name"), gesture);
		await loseFocus(t.chrome, async ({ targetId }) => {
			const { sessionId } = await t.chrome.send("Target.attachToTarget", { targetId, flatten: true });
			await t.settle();
			await t.chrome.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: at.x + 30, y: at.y, button: BUTTON_NAMES[b], buttons: 0, clickCount: 1 }, sessionId);
		});
		await t.settle();
		const v = await verdict();
		assert.deepEqual([v.type, v.hits, v.steps.map((s) => [s.operation, s.phase, s.gesture])], ["blur", ["focus-lost"], [["keysLost", null, null], ["pointerLost", "cancel", gesture]]], `button ${b}`);
		const log = await logHits();
		assert.ok(!log.slice(0, 1).some(([type]) => type === "up" || type === "cancel"), `button ${b}: no up and no cancel reached the page`);
		assert.match(log[0][3].join("; "), new RegExp(`cancelled ${gesture}: its release not reported`));
		if (b === 1) assert.deepEqual(await t.page("[inputTester.picture.view.pan, inputTester.picture.view.words]"), [null, "pan-middle cancelled after 25 screen pixels: its release not reported"], "the view left where the pan had it");
		assert.deepEqual(await t.page("[inputTester.picture.press, inputTester.picture.buttons]"), [null, BUTTON_BITS[b]], `button ${b}: the buttons drawn are the last mouse fact's, as delivered`);
		for (let i = 0; i < 40 && !(await t.chrome.evaluate("document.hasFocus()")); i++) await sleep(50);
		await t.mouse("mouseMoved", { x: at.x + 31, y: at.y });
		assert.equal(await t.page("inputTester.picture.buttons"), 0, `button ${b}: the next mouse fact reports the button released`);
	}
});

test("every row marked trusted was hit by trusted input in this run", TEST, async () => {
	await logHits();
	const trusted = TESTER_ROWS.filter((r) => r.proof.includes("trusted")).map((r) => r.id);
	assert.deepEqual(trusted.filter((id) => !rowsHit.has(id)), []);
});

test("every row hit by trusted input in this run was claimed exactly as section 6's Claims column says, the context menu and the chord rows among them", TEST, async () => {
	await logHits();
	const spec = new Map(SPEC_ROW_CLAIMS);
	for (const [words, seen] of claimsSeen) assert.deepEqual([...seen], [spec.get(words)], `${words}: claimed ${[...seen]}, section 6 says ${spec.get(words)}`);
	for (const words of ["the context menu", "a chorded press", "a chorded release", "a double click", "focus lost", "left to the browser", "a touch or a pen pointer"]) assert.ok(claimsSeen.has(words), `${words} was hit`);
});

test("the Chromebook plan, chosen by the address's plan parameter: its action keys drawn, ZoomToggle left to the browser, and a code not drawn logged as not on the drawn keyboard", TEST, async () => {
	await t.load("?plan=chromebook");
	assert.equal(await t.page("inputTester.plan"), "chromebook");
	assert.match(await t.chrome.evaluate("document.querySelector('#input-surface .plan-line').textContent"), /Plan: Chromebook, a reference drawing.*not measured on a Chromebook/);
	await t.key("rawKeyDown", "ZoomToggle", "ZoomToggle", {});
	assert.deepEqual([(await verdict()).hits, (await verdict()).claimed], [["key-left-to-browser"], false]);
	await t.key("keyUp", "ZoomToggle", "ZoomToggle", {});
	await t.key("keyDown", "5", "Numpad5", { windowsVirtualKeyCode: 101 });
	assert.match(await t.newestLogLine(), /code Numpad5, not on the drawn keyboard/);
	await t.key("keyUp", "5", "Numpad5", { windowsVirtualKeyCode: 101 });
	await t.load("?plan=nothing-known");
	assert.equal(await t.page("inputTester.plan"), "ansi");
	assert.match(await t.chrome.evaluate("document.querySelector('#input-surface .plan-line').textContent"), /names no plan/);
});

test("a page without navigator.userAgentData naming Chromium, simulated, shows that its coverage is not proved there", TEST, async () => {
	const { identifier } = await t.chrome.send("Page.addScriptToEvaluateOnNewDocument", { source: "Object.defineProperty(Navigator.prototype, 'userAgentData', { get: () => undefined, configurable: true });" });
	try {
		await t.load("");
		assert.match(await t.chrome.evaluate("document.querySelector('#input-surface .uncovered')?.textContent ?? ''"), /coverage is proved in Chromium-based browsers.*not proved here/);
	} finally {
		await t.chrome.send("Page.removeScriptToEvaluateOnNewDocument", { identifier });
	}
	await t.load("");
	assert.equal(await t.chrome.evaluate("document.querySelector('#input-surface .uncovered') === null"), true);
});

test("the positive control: in a planted build whose claim is taken away, the same synthesized pinch zooms the page to 2", TEST, async () => {
	const planted = plantedSite([{ file: "app/input-router.js", find: CLAIM_IN_ROUTER, replace: "if (claimed && false)\n            reply.claim();" }]);
	let control;
	try {
		control = await openTesterInChrome({ siteDir: planted.dir });
		const at = control.keyCentre("KeyN");
		await control.mouse("mouseMoved", at);
		await control.chrome.send("Input.synthesizePinchGesture", { x: at.x, y: at.y, scaleFactor: 2, relativeSpeed: 800, gestureSourceType: "mouse" });
		await control.settle();
		let scale = 1;
		for (let i = 0; i < 40 && Math.abs(scale - 2) >= 0.01; i++, await sleep(50)) scale = await control.chrome.evaluate("visualViewport.scale");
		assert.ok(Math.abs(scale - 2) < 0.01, `unclaimed, the page zoomed to 2 (${scale})`);
	} finally {
		await control?.close();
		planted.remove();
	}
});

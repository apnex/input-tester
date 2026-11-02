// painter-allowlist - GT8 and GT2 over the platform's own writes (docs/ARCHITECTURE-TARGET.md sections 4 and 6,
// Shape): every element the painter has the scene make is a `g`, `rect`, `line`, `path`, `text` or `tspan`, with
// attributes among the allowlist and no value holding `url(`; the stylesheet holds no `url(` and no `@import`;
// and, once the page is composed, every write to the platform happens inside an input's delivery.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

import { pathToFileURL } from "node:url";

import { importBuilt, releaseFolder, repositoryRoot, siteRoot } from "./support/built-site.js";
import { fakePlatform } from "./support/fake-platform.js";
import { plantedSite } from "./support/planted-site.js";

const { composeTesterPage } = await importBuilt("composition-root.js");
const { PAINTER_TAGS, PAINTER_ATTRIBUTES, SCENE_LAYERS, LEFT_COLUMN_CHARACTERS, CLAIMS_LINE, NOT_REPORTED_LINES, paintRefusedOpening } = await importBuilt("picture-painter.js");

/** Drives every family of input the tester names through a page on a fake platform. */
function driveEveryFamily(platform) {
	platform.key("key-down", { key: "Shift", code: "ShiftLeft", shiftKey: true });
	platform.key("key-down", { key: "A", code: "KeyA", shiftKey: true });
	platform.key("key-down", { key: "A", code: "KeyA", shiftKey: true, repeat: true });
	platform.key("key-down", { key: "AudioVolumeUp", code: "" });
	platform.key("key-down", { key: "F5", code: "F5" });
	platform.key("key-down", { key: "x", code: "IntlRo" });
	platform.key("key-up", { key: "A", code: "KeyA" });
	platform.pointer("move", { clientX: 30, clientY: 30, button: -1, buttons: 0 });
	platform.pointer("down", { clientX: 30, clientY: 30, button: 0, buttons: 1 });
	platform.pointer("move", { clientX: 60, clientY: 50, button: -1, buttons: 1 });
	platform.pointer("move", { clientX: 60, clientY: 50, button: 2, buttons: 3 });
	platform.menu({ clientX: 60, clientY: 50 });
	platform.pointer("move", { clientX: 60, clientY: 50, button: 0, buttons: 2 });
	platform.pointer("up", { clientX: 60, clientY: 50, button: 2, buttons: 0 });
	platform.pointer("double", { clientX: 60, clientY: 50, pointerType: undefined, pointerId: undefined });
	platform.wheel({ deltaY: 120 });
	platform.wheel({ deltaY: -3.5, ctrlKey: true });
	platform.pointer("down", { pointerType: "touch", pointerId: 7, buttons: 1 });
	platform.pointer("down", { clientX: 30, clientY: 30, button: 3, buttons: 8 });
	platform.pointer("up", { clientX: 30, clientY: 30, button: 3, buttons: 0 });
	platform.blur();
}

test("GT8: every shape the painter puts, across every family of input, is of the allowlist's tags and attributes, with no value holding url(", () => {
	const platform = fakePlatform({ keyboardMap: null });
	composeTesterPage(platform);
	driveEveryFamily(platform);
	const layers = platform.root.children;
	assert.deepEqual(layers.map((l) => l.attributes.get("class")), SCENE_LAYERS.map((l) => l.attrs.class), "the scene's four layers, back to front");
	const paneLayers = platform.paneRoot.children;
	assert.ok(paneLayers.length >= 3, "the view pane's layers");
	const shapes = [...layers, ...paneLayers].flatMap((layer) => {
		const out = [];
		const walk = (e) => e.children.forEach((c) => (out.push(c), walk(c)));
		walk(layer);
		return out;
	});
	assert.ok(shapes.length > 400, `${shapes.length} elements painted`);
	for (const e of shapes) {
		assert.ok(PAINTER_TAGS.includes(e.tag), `the tag ${e.tag}`);
		for (const [name, value] of e.attributes) {
			assert.ok(PAINTER_ATTRIBUTES.includes(name), `the attribute ${name} on ${e.tag}`);
			assert.ok(!String(value).includes("url("), `${name}="${value}"`);
		}
	}
	for (const tag of ["script", "foreignObject", "use", "image", "a", "style"]) assert.ok(!PAINTER_TAGS.includes(tag), tag);
	for (const name of ["href", "xlink:href", "style", "onclick", "src", "fill"]) assert.ok(!PAINTER_ATTRIBUTES.includes(name), name);
	const opacities = shapes.filter((e) => e.attributes.has("opacity")).map((e) => Number(e.attributes.get("opacity")));
	assert.ok(opacities.length > 0 && opacities.every((o) => Number.isFinite(o) && o >= 0 && o <= 1), `every opacity a number from 0 to 1: ${opacities}`);
});

test("GT8: the stylesheet, as built into the release, holds no url( and no @import", () => {
	for (const file of [path.join(repositoryRoot, "page", "input-tester.css"), path.join(siteRoot, releaseFolder, "input-tester.css")]) {
		const sheet = fs.readFileSync(file, "utf8");
		assert.ok(!/url\s*\(/i.test(sheet), `${file} holds url(`);
		assert.ok(!/@import/i.test(sheet), `${file} holds @import`);
	}
});

test("GT2: once the page is composed, every write to the platform happens inside an input's delivery", () => {
	const platform = fakePlatform({ keyboardMap: null });
	composeTesterPage(platform);
	const composedAt = platform.writes.length;
	assert.ok(composedAt > 0, "the first paint wrote");
	driveEveryFamily(platform);
	const after = platform.writes.slice(composedAt);
	assert.ok(after.length > 50, `${after.length} writes after composition`);
	assert.deepEqual(after.filter((w) => !w.insideDelivery), []);
});

test("the labels' answer, which is no input, paints every key again with the person's labels, marked reported", async () => {
	const platform = fakePlatform({ keyboardMap: { KeyQ: "a", KeyA: "q" } });
	const page = composeTesterPage(platform);
	await new Promise((resolve) => setImmediate(resolve));
	const texts = platform.elements().filter((e) => e.tag === "text" && /key-label/.test(e.attributes.get("class") ?? ""));
	const q = texts.find((e) => e.text === "a" && e.attributes.get("class") === "key-label label-reported");
	assert.ok(q, "KeyQ labelled as the map reported it");
	assert.ok(texts.some((e) => e.text === "Shift" && e.attributes.get("class") === "key-label label-assumed"), "a key the map does not name keeps the plan's label, assumed");
	assert.equal(page.problems.length, 0);
});

test("a page closed before the Keyboard Map answers paints nothing when it does: the answer, which is no input, finds the page closed", async () => {
	const platform = fakePlatform({ keyboardMap: { KeyQ: "a" } });
	const page = composeTesterPage(platform);
	const rejections = [];
	const onRejection = (reason) => rejections.push(reason);
	process.on("unhandledRejection", onRejection);
	try {
		page.close();
		const closedAt = platform.writes.length;
		await new Promise((resolve) => setImmediate(resolve));
		await new Promise((resolve) => setImmediate(resolve));
		assert.deepEqual(rejections, []);
		assert.equal(platform.writes.length, closedAt, "no write after close");
	} finally {
		process.off("unhandledRejection", onRejection);
	}
});

/** The lines of each text of the given class, a tspan's text each, or the text's own when it has none, with each line's `y`. */
function linesOf(platform, className) {
	return platform
		.elements()
		.filter((e) => e.tag === "text" && (e.attributes.get("class") ?? "").split(" ").includes(className))
		.map((e) => (e.children.length > 0 ? e.children.map((c) => ({ text: c.text, y: Number(c.attributes.get("y")) })) : [{ text: e.text, y: Number(e.attributes.get("y")) }]));
}

/** How far apart two lines of the panel's 11 pixels must start for their boxes not to meet: a line's box is 13 units high, so the 14 of the notices' leading. */
const LINE_APART = 14;

/** Holds a problems text drawn whole: more than one line, each within the left column's characters, together the problem. */
function assertProblemWrapped(lines, problem) {
	assert.ok(lines !== undefined && lines.length > 1, `a problems text on the page, on more than one line: ${JSON.stringify(lines)}`);
	assert.equal(lines.map((l) => l.text).join("").replace(/\s/g, ""), problem.replace(/\s/g, ""), "the problem drawn whole");
	for (const line of lines) assert.ok(line.text.length <= LEFT_COLUMN_CHARACTERS, `a line of ${line.text.length} characters, past the column's ${LEFT_COLUMN_CHARACTERS}`);
	for (const [i, line] of lines.entries()) if (i > 0) assert.ok(line.y - lines[i - 1].y >= LINE_APART, "the problem's own lines apart");
}

test("a refused opening shows its problems on the page: a surface and a key source the capture refuses leave its problem of 133 characters drawn whole, wrapped within the left column, below the head, and the status lines moved below it (0011)", () => {
	const platform = fakePlatform({ brands: ["Firefox"] });
	const page = composeTesterPage({ ...platform, surface: { ...platform.surface, addEventListener: undefined }, keySource: {} });
	assert.equal(page.problems.length, 1);
	assert.match(page.problems[0], /^the capture refused its declaration: /);
	assert.ok(page.problems[0].length > LEFT_COLUMN_CHARACTERS, `a problem of ${page.problems[0].length} characters, longer than a line`);
	const [problems] = linesOf(platform, "problems");
	assertProblemWrapped(problems, page.problems[0]);
	const [browserLine] = linesOf(platform, "uncovered");
	const [status] = linesOf(platform, "status-line");
	assert.ok(problems[0].y - browserLine.at(-1).y >= LINE_APART, "the problems below the head's browser line, their boxes apart");
	assert.ok(status[0].y - problems.at(-1).y >= LINE_APART, `the status lines below the problems' last line, their boxes apart: the problems end at y ${problems.at(-1).y}, the status lines start at ${status[0].y}`);
});

test("a refusal before anything is drawn -- the session's, planted in a built copy -- is drawn by paintRefusedOpening alone: its problem of 138 characters whole, wrapped within the left column, and nothing else of the panel (0011)", async () => {
	const planted = plantedSite([
		{ file: "app/input-bindings.js", find: "threshold: 4,", replace: "threshold: -4," },
		{ file: "app/input-bindings.js", find: 'measure: "screen",', replace: 'measure: "nowhere",' },
	]);
	try {
		const { composeTesterPage: composeRefused } = await import(pathToFileURL(path.join(planted.dir, releaseFolder, "app", "composition-root.js")).href);
		const platform = fakePlatform();
		const page = composeRefused(platform);
		assert.equal(page.problems.length, 1);
		assert.match(page.problems[0], /^the session refused its declaration: /);
		assert.ok(page.problems[0].length > LEFT_COLUMN_CHARACTERS, `a problem of ${page.problems[0].length} characters, longer than a line`);
		assertProblemWrapped(linesOf(platform, "problems")[0], page.problems[0]);
		assert.deepEqual(["status-line", "log-line", "legend-row", "plan-line"].filter((c) => platform.elements().some((e) => (e.attributes.get("class") ?? "").split(" ").includes(c))), [], "nothing else of the panel drawn");
	} finally {
		planted.remove();
	}
});

test("paintRefusedOpening, called directly: one put, of the panel's problems item, every problem whole on lines of at most the left column's characters, a word longer than a line broken (0011)", () => {
	const puts = [];
	const target = { put: (layer, key, shapes) => puts.push({ layer, key, shapes }), remove: () => undefined };
	const problems = ["the grid refused its declaration: a problem of a few words", `the table refused its declaration: ${"x".repeat(300)}`];
	paintRefusedOpening(target, problems);
	assert.deepEqual(puts.map((p) => [p.layer, p.key]), [["panel", "problems"]]);
	const [text] = puts[0].shapes;
	assert.equal(text.attrs.class, "problems");
	const lines = text.children.map((c) => c.text);
	assert.ok(lines.length >= 4, `${lines.length} lines`);
	for (const line of lines) assert.ok(line.length <= LEFT_COLUMN_CHARACTERS, `a line of ${line.length} characters`);
	assert.equal(lines.join("").replace(/\s/g, ""), problems.join("").replace(/\s/g, ""), "every problem whole");
	for (const [i, c] of text.children.entries()) if (i > 0) assert.ok(c.attrs.y - text.children[i - 1].attrs.y >= LINE_APART, "each line below the last, their boxes apart");
});

test("0011: every text the painter drew before 0010 is drawn -- the keys and the mouse, the wheel's and the view's lines, the plan, labels and browser lines, the problems, the status and held keys, the log's heading and lines, what no page can know, the claims, the notes' key, and the legend's heading and rows", () => {
	const platform = fakePlatform({ brands: ["Firefox"] });
	composeTesterPage({ ...platform, keySource: {} });
	const classes = platform.elements().map((e) => e.attributes.get("class") ?? "");
	const count = (name) => classes.filter((c) => c.split(" ").includes(name)).length;
	for (const [name, atLeast] of [["key", 104], ["key-label", 104], ["mouse-body", 1], ["mouse-button", 5], ["button-label", 5], ["wheel", 1], ["wheel-line", 1], ["view-line", 1], ["plan-line", 1], ["uncovered", 1], ["problems", 1], ["status-line", 1], ["held-keys", 1], ["log-line", 14], ["not-reported", 1], ["notes-key", 1], ["legend-row", 42], ["legend-standing", 42], ["legend-words", 42]]) assert.ok(count(name) >= atLeast, `${count(name)} of class ${name}, at least ${atLeast}`);
	const shown = platform.elements().flatMap((e) => (e.tag === "text" ? (e.children.length > 0 ? e.children.map((c) => c.text) : [e.text]) : [])).join(" ");
	for (const words of ["Log, newest first", "Every rule, and its standing for the latest fact", "What no page can know", "Labels: every label is the plan's printing", "a key's corner marked so:", CLAIMS_LINE, ...NOT_REPORTED_LINES]) assert.ok(shown.includes(words), `the page shows: ${words}`);
});


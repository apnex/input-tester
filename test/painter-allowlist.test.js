// painter-allowlist - GT8 and GT2 over the platform's own writes (docs/ARCHITECTURE-TARGET.md sections 4 and 6,
// Shape): every element the painter has the scene make is a `g`, `rect`, `line`, `path`, `text` or `tspan`, with
// attributes among the allowlist and no value holding `url(`; the stylesheet holds no `url(` and no `@import`;
// and, once the page is composed, every write to the platform happens inside an input's delivery.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

import { importBuilt, releaseFolder, repositoryRoot, siteRoot } from "./support/built-site.js";
import { fakePlatform } from "./support/fake-platform.js";

const { composeTesterPage } = await importBuilt("composition-root.js");
const { PAINTER_TAGS, PAINTER_ATTRIBUTES, SCENE_LAYERS } = await importBuilt("picture-painter.js");

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
	const shapes = layers.flatMap((layer) => {
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

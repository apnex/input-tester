// rows-fixtures - the rows Chromium never produces (docs/ARCHITECTURE-TARGET.md section 6, GT5): a `move` whose
// `buttons` is `null`, a button above 4, and a key whose `code` is `null`, each driven by an event handed to the
// tester's own composition, `input-capture` opened over fakes, so each fact is the one capture makes -- and
// matched by its row, and only its row, with the claim, the session's answer and the picture the row names.
import assert from "node:assert/strict";
import { test } from "node:test";

import { importBuilt } from "./support/built-site.js";
import { fakePlatform } from "./support/fake-platform.js";

const { composeTesterPage } = await importBuilt("composition-root.js");
const hitsOf = (trace) => trace.filter((r) => r.hit).map((r) => r.id);

test("fixture: a chorded change whose buttons the platform does not report -- the move's fact holds buttons null, matching only its row, unclaimed", () => {
	const platform = fakePlatform();
	const page = composeTesterPage(platform);
	platform.pointer("down", { clientX: 10, clientY: 10, button: 0, buttons: 1 });
	for (const button of [0, 1, 2, 3, 4]) {
		const { claimed } = platform.pointer("move", { clientX: 10, clientY: 10, button, buttons: undefined });
		const v = page.latestVerdict;
		assert.equal(v.fact.buttons, null, "capture makes buttons null for a value that is no safe integer");
		assert.deepEqual(hitsOf(v.trace), ["chorded-change-buttons-unreported"], `button ${button}`);
		assert.equal(claimed, false);
		assert.equal(v.claimed, false);
	}
	assert.equal(page.picture.buttons, 1, "buttons not reported change no button drawn");
});

test("fixture: a button beyond the five -- a down, an up and a move of buttons 5 and 6, matching only their row, unclaimed", () => {
	const platform = fakePlatform();
	const page = composeTesterPage(platform);
	for (const button of [5, 6]) {
		for (const type of ["down", "move", "up"]) {
			const { claimed } = platform.pointer(type, { clientX: 20, clientY: 20, button, buttons: type === "up" ? 0 : 32 });
			assert.deepEqual(hitsOf(page.latestVerdict.trace), ["button-beyond-five"], `${type} of button ${button}`);
			assert.equal(claimed, false);
		}
	}
});

test("fixture: a key whose code is null -- the fact holds code null, matching a key with no identity, claimed; keyDown and keyUp answer it untracked, and no key lights", () => {
	const platform = fakePlatform();
	const page = composeTesterPage(platform);
	for (const type of ["key-down", "key-up"]) {
		const { claimed } = platform.key(type, { key: "AudioVolumeUp", code: undefined });
		const v = page.latestVerdict;
		assert.equal(v.fact.code, null);
		assert.deepEqual(hitsOf(v.trace), ["key-no-identity"]);
		assert.equal(claimed, true);
		assert.deepEqual([v.steps[0].operation, v.steps[0].outcome.tracked, v.steps[0].outcome.held], [type === "key-down" ? "keyDown" : "keyUp", false, null]);
		assert.deepEqual(page.picture.heldKeys, []);
		assert.equal(page.picture.unidentifiedKey.key, "AudioVolumeUp", "shown as delivered");
		assert.match(page.picture.log[0].notes.join(" "), /its physical key not reported/);
	}
});

test("every row the table marks fixture is driven here, and every other row by trusted input in test/browser/rows.test.js", async () => {
	const { TESTER_ROWS } = await importBuilt("input-bindings.js");
	assert.deepEqual(TESTER_ROWS.filter((r) => r.proof.includes("fixture")).map((r) => r.id), ["key-no-identity", "chorded-change-buttons-unreported", "button-beyond-five"]);
	assert.deepEqual(TESTER_ROWS.filter((r) => !r.proof.includes("trusted")).map((r) => r.id), ["chorded-change-buttons-unreported", "button-beyond-five"]);
});

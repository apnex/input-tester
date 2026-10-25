// table-overlaps - the overlap check (docs/ARCHITECTURE-TARGET.md section 6, GT5, IB8): the tester's table,
// composed by the released `input-binding`, run through `findOverlaps` over every key fact's type, repeat flag,
// code and sixteen modifier states with the four contexts, and every pointer, wheel, context-menu, `blur` and
// derived commit fact -- the facts the browser produces and the fixtures' alike -- hits no two rows together;
// no fact of a browser's own key is claimed; a plain drag of every button matches no chord row; and every row
// is hit by some fact, so none is dead.
import assert from "node:assert/strict";
import { test } from "node:test";

import { importBuilt, importVendored } from "./support/built-site.js";

const { TESTER_ROWS, TESTER_TABLE_DECLARATION, OVERLAP_PROOF_CONTEXTS, overlapProofFacts, isBrowsersOwnKey, BROWSERS_OWN_KEYS, BUTTON_BITS } = await importBuilt("input-bindings.js");
const { KEYBOARD_PLANS } = await importBuilt("keyboard-plans.js");
const { composeBindingTable } = await importVendored("input-binding");

const composed = composeBindingTable(TESTER_TABLE_DECLARATION);
const table = composed.table;
const codes = [...new Set([...Object.values(KEYBOARD_PLANS).flatMap((p) => p.keys.map((k) => k.code)), ...BROWSERS_OWN_KEYS.map((k) => k.code), "Fn", "Unidentified", "IntlBackslash", "", null])];
const facts = overlapProofFacts(codes);

test("GT5: the tester's table composes, 42 rows in the legend's order, each with words, a claim flag and how the gate proves it", () => {
	assert.equal(composed.ok, true, JSON.stringify(composed.problems));
	assert.equal(table.rows.length, 42);
	assert.equal(TESTER_ROWS.length, 42);
	for (const entry of table.rows) {
		assert.equal(typeof entry.row.words, "string");
		assert.equal(typeof entry.row.claims, "boolean");
		assert.ok(entry.row.proof.length > 0 && entry.row.proof.every((p) => p === "trusted" || p === "fixture"), entry.id);
	}
	assert.deepEqual(table.rows.filter((r) => r.opens !== null).map((r) => [r.id, r.opens]), [0, 1, 2, 3, 4].map((b) => [`button-${b}-press`, `press-${b}`]), "only the press rows open a gesture");
});

test("GT5, IB8: over the rows' whole cross-product -- every fact the browser produces and every fixture, with the four contexts -- no two rows hit together", (t) => {
	const overlaps = table.findOverlaps(facts, OVERLAP_PROOF_CONTEXTS, [{}]);
	assert.deepEqual(overlaps.map((o) => ({ fact: o.fact, context: o.context, ids: o.ids })).slice(0, 5), [], `${overlaps.length} overlap(s)`);
	t.diagnostic(`the overlap check ran ${facts.length} facts with ${OVERLAP_PROOF_CONTEXTS.length} contexts: ${facts.length * OVERLAP_PROOF_CONTEXTS.length} combinations, over ${codes.length} codes`);
});

test("GT5: every row is hit by some fact of the proof's space, so the space reaches every row and no row is dead", () => {
	const hit = new Set();
	for (const fact of facts) for (const context of OVERLAP_PROOF_CONTEXTS) for (const r of table.traceInput(fact, context)) if (r.hit) hit.add(r.id);
	assert.deepEqual(table.rows.map((r) => r.id).filter((id) => !hit.has(id)), []);
});

test("IT-D9: no fact of a browser's own key is claimed, on any platform, whatever its context; every other key fact is", () => {
	let own = 0;
	for (const fact of facts) {
		if (fact.type !== "key-down" && fact.type !== "key-up") continue;
		for (const context of OVERLAP_PROOF_CONTEXTS) {
			const { claimed, match } = table.matchInput(fact, context);
			if (isBrowsersOwnKey(fact)) {
				own++;
				assert.equal(claimed, false, `${fact.type} ${fact.code} ${[fact.shiftKey, fact.ctrlKey, fact.altKey, fact.metaKey]}`);
				assert.equal(match?.id, "key-left-to-browser");
			} else assert.equal(claimed, true, `${fact.type} ${fact.code} must be claimed`);
		}
	}
	assert.ok(own > 0);
});

test("IT-D9: the browser's own keys are F5, Ctrl+R, F11, F12 and Ctrl+Shift+I, J and C, BrowserRefresh and ZoomToggle, and macOS's Meta+R, Ctrl+Meta+F, Meta+Alt+I, J and C and Meta+Shift+C", () => {
	const key = (code, mods = {}) => ({ type: "key-down", code, key: "x", repeat: false, shiftKey: false, ctrlKey: false, altKey: false, metaKey: false, ...mods });
	const own = (code, mods) => isBrowsersOwnKey(key(code, mods));
	for (const [code, mods] of [["F5"], ["F5", { ctrlKey: true }], ["F5", { shiftKey: true }], ["F5", { ctrlKey: true, shiftKey: true }], ["KeyR", { ctrlKey: true }], ["KeyR", { ctrlKey: true, shiftKey: true }], ["F11"], ["F12"], ["KeyI", { ctrlKey: true, shiftKey: true }], ["KeyJ", { ctrlKey: true, shiftKey: true }], ["KeyC", { ctrlKey: true, shiftKey: true }], ["BrowserRefresh"], ["ZoomToggle", { altKey: true }], ["KeyR", { metaKey: true }], ["KeyR", { metaKey: true, shiftKey: true }], ["KeyF", { ctrlKey: true, metaKey: true }], ["KeyI", { metaKey: true, altKey: true }], ["KeyC", { metaKey: true, shiftKey: true }]]) assert.equal(own(code, mods), true, `${code} ${JSON.stringify(mods ?? {})}`);
	for (const [code, mods] of [["F5", { altKey: true }], ["KeyR"], ["KeyR", { ctrlKey: true, altKey: true }], ["F11", { shiftKey: true }], ["F12", { ctrlKey: true }], ["KeyI", { ctrlKey: true }], ["KeyC", { ctrlKey: true }], ["KeyF", { metaKey: true }], ["KeyA", { ctrlKey: true }], ["F6"]]) assert.equal(own(code, mods), false, `${code} ${JSON.stringify(mods ?? {})}`);
});

test("GT5: a plain drag of every button -- moves naming no button, its bit held -- matches no chord row, and no row at all", () => {
	for (let b = 0; b <= 4; b++) {
		for (const buttons of [BUTTON_BITS[b], BUTTON_BITS[b] | 1]) {
			const fact = { type: "move", at: { x: 0, y: 0 }, screen: { x: 0, y: 0 }, hit: null, focus: null, button: -1, buttons, pointerId: 1, pointerType: "mouse", key: null, code: null, repeat: null, shiftKey: false, ctrlKey: false, altKey: false, metaKey: false, deltaX: null, deltaY: null, deltaZ: null, deltaMode: null, time: 1 };
			assert.deepEqual(table.traceInput(fact, OVERLAP_PROOF_CONTEXTS[0]).filter((r) => r.hit).map((r) => r.id), [], `drag of button ${b}, buttons ${buttons}`);
		}
	}
});

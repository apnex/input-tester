// table-overlaps - the table against the specification (docs/ARCHITECTURE-TARGET.md section 6, GT5, IB8, IT-D9):
// every expectation here is a literal copied from section 6 and the recorder's rulings (test/support/
// architecture-section-6.js), never read from the code under test. Each row's words and claim are section 6's;
// the browser's own keys are its per-platform list, matched by code or by the layout's letter, each entry tested
// with a positive case and with each asked modifier flipped; the tester's table, composed by the released
// `input-binding`, hits exactly one row for every fact and context of the proof's space but those section 6 gives
// no row, named, and never two; no fact of a browser's own key is claimed and every other key fact is; and a
// plain drag of every button matches no row.
import assert from "node:assert/strict";
import { test } from "node:test";

import { BUTTON_BITS as CHROMIUM_BUTTON_BITS } from "@apnex/headless-chromium";

import { importBuilt, importVendored } from "./support/built-site.js";
import { SPEC_BROWSERS_OWN_KEYS, SPEC_BUTTON_BITS, SPEC_CHORD_MODIFIERS, SPEC_MODIFIER_CODES, SPEC_ROW_CLAIMS, hitsNoRowBySpec, keyFact, ownBySpec, signatureOf } from "./support/architecture-section-6.js";

const { TESTER_ROWS, TESTER_TABLE_DECLARATION, OVERLAP_PROOF_CONTEXTS, overlapProofFacts, isBrowsersOwnKey, BROWSERS_OWN_KEYS, MODIFIER_CODES } = await importBuilt("input-bindings.js");
const { KEYBOARD_PLANS, BUTTON_BITS } = await importBuilt("keyboard-plans.js");
const { composeBindingTable } = await importVendored("input-binding");

const composed = composeBindingTable(TESTER_TABLE_DECLARATION);
const table = composed.table;
const LAYOUT_CODES = ["KeyO", "KeyS", "KeyG", "KeyE"];
const codes = [...new Set([...Object.values(KEYBOARD_PLANS).flatMap((p) => p.keys.map((k) => k.code)), ...SPEC_BROWSERS_OWN_KEYS.map((k) => k.code), ...LAYOUT_CODES, "Fn", "Unidentified", "IntlBackslash", "", null])];
const facts = overlapProofFacts(codes);
const hitsOf = (fact, context) => table.traceInput(fact, context).filter((r) => r.hit).map((r) => r.id);
const MODIFIERS = ["shift", "ctrl", "alt", "meta"];

test("section 6: the table holds exactly its rows, in its order, each with its words and its Claims column", () => {
	assert.equal(composed.ok, true, JSON.stringify(composed.problems));
	assert.deepEqual(table.rows.map((r) => r.row.words), SPEC_ROW_CLAIMS.map(([words]) => words));
	assert.deepEqual(table.rows.map((r) => [r.row.words, r.row.claims]), SPEC_ROW_CLAIMS.map(([words, claims]) => [words, claims]));
	assert.deepEqual(table.rows.filter((r) => r.opens !== null).map((r) => [r.row.words, r.opens]), [0, 1, 2, 3, 4].map((b) => [`a press of button ${b}`, `press-${b}`]), "only the press rows open a gesture, each its button's press gesture");
	assert.deepEqual(BUTTON_BITS, SPEC_BUTTON_BITS, "the one definition of the buttons' bits is the Mouse button entity's");
	assert.deepEqual(CHROMIUM_BUTTON_BITS, SPEC_BUTTON_BITS, "the bits the browser tests' trusted input sends, headless-chromium's, are the entity's too");
});

test("section 6: the browser's own keys are its per-platform list, with the recorder's view source, and nothing else", () => {
	assert.deepEqual([...new Set(BROWSERS_OWN_KEYS.map(signatureOf))].sort(), [...new Set(SPEC_BROWSERS_OWN_KEYS.map(signatureOf))].sort());
});

test("IT-D9: each of the browser's own keys left unclaimed in a positive case, by its code and, for a letter key, by the layout's letter on another code; each asked modifier flipped claims it unless the list names that combination too", () => {
	for (const e of SPEC_BROWSERS_OWN_KEYS) {
		const held = Object.fromEntries(MODIFIERS.map((m) => [m, e[m] === true]));
		const letter = /^Key[A-Z]$/.test(e.code) ? e.code.slice(3).toLowerCase() : null;
		const cases = [keyFact("key-down", e.code, letter ?? e.code, held), keyFact("key-up", e.code, letter ?? e.code, held)];
		if (letter !== null) cases.push(keyFact("key-down", "KeyO", held.shift ? letter.toUpperCase() : letter, held), keyFact("key-down", "KeyS", letter, held));
		for (const f of cases) {
			assert.equal(isBrowsersOwnKey(f), true, `${e.platform} ${e.code} as ${f.code} "${f.key}" ${JSON.stringify(held)}`);
			const { match, claimed } = table.matchInput(f, OVERLAP_PROOF_CONTEXTS[0]);
			assert.deepEqual([match?.row.words, claimed], ["left to the browser", false], `${e.code} as ${f.code} "${f.key}"`);
		}
		for (const m of MODIFIERS.filter((name) => e[name] !== null)) {
			const flipped = keyFact("key-down", e.code, letter ?? e.code, { ...held, [m]: !held[m] });
			assert.equal(isBrowsersOwnKey(flipped), ownBySpec(flipped), `${e.platform} ${e.code} with ${m} flipped`);
			if (!ownBySpec(flipped)) assert.equal(table.matchInput(flipped, OVERLAP_PROOF_CONTEXTS[0]).claimed, true, `${e.code} with ${m} flipped is claimed`);
		}
	}
	assert.equal(isBrowsersOwnKey(keyFact("key-down", "KeyO", "o", { ctrl: true })), false, "Dvorak's Ctrl+O, the key printing o, is no reload");
	assert.equal(isBrowsersOwnKey(keyFact("key-down", "", "r", { ctrl: true })), false, "a key with no identity stays one, its letter whatever it is");
});

test("IT-D9: over every code, key, type and modifier state, the code's browser's own keys are the specification's, matched by code or by the layout's letter", () => {
	const keys = ["x", "r", "R", "i", "I", "j", "c", "f", "u", "U", "o", "F5", null];
	let own = 0;
	for (const code of codes)
		for (const key of keys)
			for (const type of ["key-down", "key-up"])
				for (let m = 0; m < 16; m++) {
					const f = keyFact(type, code, key, { shift: (m & 1) !== 0, ctrl: (m & 2) !== 0, alt: (m & 4) !== 0, meta: (m & 8) !== 0 });
					const spec = ownBySpec(f);
					if (spec) own++;
					assert.equal(isBrowsersOwnKey(f), spec, `${type} ${code} "${key}" modifiers ${m}`);
				}
	assert.ok(own > 1000, `${own} combinations the browser's own`);
});

test("the proof's space holds, for every letter entry of section 6's browser's own keys, a key fact printing that letter on another key, so the space cannot shrink unseen", () => {
	const letters = [...new Set(SPEC_BROWSERS_OWN_KEYS.map((e) => (/^Key[A-Z]$/.test(e.code) ? e.code.slice(3).toLowerCase() : null)).filter((l) => l !== null))];
	assert.deepEqual(letters.sort(), ["c", "f", "i", "j", "r", "u"], "section 6's letter entries, with the recorder's view source");
	for (const letter of letters) {
		const own = `Key${letter.toUpperCase()}`;
		const onAnother = facts.filter((f) => (f.type === "key-down" || f.type === "key-up") && typeof f.code === "string" && f.code !== own && /^Key[A-Z]$/.test(f.code) && typeof f.key === "string" && f.key.toLowerCase() === letter);
		assert.ok(onAnother.length > 0, `the letter ${letter} printed on a key other than ${own}`);
		assert.ok(onAnother.some((f) => f.code === "KeyO"), `the letter ${letter} printed on KeyO, as Dvorak prints r`);
	}
	assert.ok(facts.some((f) => typeof f.key === "string" && f.key !== f.key.toLowerCase() && /^[A-Z]$/.test(f.key)), "an upper-case letter among them, so case folding is met");
});

test("GT5, IB8: over the proof's space -- every fact the browser produces and every fixture, with the four contexts -- exactly one row hits, but for the facts section 6 gives no row, which hit none", (t) => {
	const overlaps = table.findOverlaps(facts, OVERLAP_PROOF_CONTEXTS, [{}]);
	assert.deepEqual(overlaps.slice(0, 5).map((o) => ({ fact: o.fact, context: o.context, ids: o.ids })), [], `${overlaps.length} overlap(s)`);
	let unbound = 0;
	for (const fact of facts) {
		for (const context of OVERLAP_PROOF_CONTEXTS) {
			const hits = hitsOf(fact, context);
			if (hitsNoRowBySpec(fact)) {
				unbound++;
				assert.deepEqual(hits, [], `a fact section 6 gives no row hits none: ${JSON.stringify(fact)}`);
			} else assert.equal(hits.length, 1, `exactly one row: ${JSON.stringify(fact)} in ${JSON.stringify(context)}, hit ${hits}`);
		}
	}
	t.diagnostic(`the overlap check ran ${facts.length} facts with ${OVERLAP_PROOF_CONTEXTS.length} contexts: ${facts.length * OVERLAP_PROOF_CONTEXTS.length} combinations over ${codes.length} codes, ${unbound} of them the facts section 6 gives no row`);
});

test("IT-D9: a key fact is claimed exactly when the specification does not name it one of the browser's own keys, in every context", () => {
	let checked = 0;
	for (const fact of facts) {
		if (fact.type !== "key-down" && fact.type !== "key-up") continue;
		for (const context of OVERLAP_PROOF_CONTEXTS) {
			const { claimed, match } = table.matchInput(fact, context);
			assert.equal(claimed, !ownBySpec(fact), `${fact.type} ${fact.code} "${fact.key}" ${[fact.shiftKey, fact.ctrlKey, fact.altKey, fact.metaKey]}`);
			if (ownBySpec(fact)) assert.equal(match?.row.words, "left to the browser");
			checked++;
		}
	}
	assert.ok(checked > 10000);
});

test("section 6: whatever fact hits a row, its claim is that row's Claims column", () => {
	const claims = new Map(SPEC_ROW_CLAIMS);
	for (const fact of facts) {
		for (const context of OVERLAP_PROOF_CONTEXTS) {
			const { match, claimed } = table.matchInput(fact, context);
			if (match !== null) assert.equal(claimed, claims.get(match.row.words), `${match.row.words}: ${JSON.stringify(fact)}`);
		}
	}
});

test("GT5: a plain drag of every button -- moves naming no button, its bit held -- matches no chord row, and no row at all", () => {
	for (let b = 0; b <= 4; b++) {
		for (const buttons of [SPEC_BUTTON_BITS[b], SPEC_BUTTON_BITS[b] | 1]) {
			const fact = { type: "move", at: { x: 0, y: 0 }, screen: { x: 0, y: 0 }, hit: null, focus: null, button: -1, buttons, pointerId: 1, pointerType: "mouse", key: null, code: null, repeat: null, shiftKey: false, ctrlKey: false, altKey: false, metaKey: false, deltaX: null, deltaY: null, deltaZ: null, deltaMode: null, time: 1 };
			assert.deepEqual(hitsOf(fact, OVERLAP_PROOF_CONTEXTS[0]), [], `drag of button ${b}, buttons ${buttons}`);
		}
	}
});

test("every row is hit by some fact of the proof's space, and each row marked fixture is one Chromium never produces", () => {
	const hit = new Set();
	for (const fact of facts) for (const context of OVERLAP_PROOF_CONTEXTS) for (const id of hitsOf(fact, context)) hit.add(id);
	assert.deepEqual(table.rows.map((r) => r.id).filter((id) => !hit.has(id)), []);
	assert.deepEqual(TESTER_ROWS.filter((r) => !r.proof.includes("trusted")).map((r) => r.words), ["a chorded change, buttons not reported", "a button beyond the five"]);
});

test("section 6's terms: the modifier codes are its eight, each one's fresh press a modifier press; Ctrl, Alt and Meta each make a chord, and Shift none", () => {
	assert.deepEqual(MODIFIER_CODES, SPEC_MODIFIER_CODES);
	const context = OVERLAP_PROOF_CONTEXTS[0];
	const words = (f) => table.matchInput(f, context).match?.row.words;
	for (const code of SPEC_MODIFIER_CODES) assert.equal(words(keyFact("key-down", code, "Meta", {})), "a modifier press", code);
	for (const held of SPEC_CHORD_MODIFIERS) assert.equal(words(keyFact("key-down", "KeyA", "a", { [held]: true })), "a modifier chord", `${held} held`);
	assert.equal(words(keyFact("key-down", "KeyA", "A", { shift: true })), "a first press", "Shift makes no chord");
});

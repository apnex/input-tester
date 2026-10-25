// run-gate - the gate shows why a test failed (tools/run-gate.mjs): every failing test's whole TAP block, its
// error, expected and actual values and stack, is found, nested subtests' among them, and nothing of a pass.
import assert from "node:assert/strict";
import { test } from "node:test";

import { failureBlocks, tapCounts } from "../../tools/run-gate.mjs";

const TAP = ["TAP version 13", "# Subtest: passes", "ok 1 - passes", "  ---", "  duration_ms: 1", "  ...", "# Subtest: fails", "not ok 2 - fails", "  ---", "  error: |-", "    the claim was false", "  expected: true", "  actual: false", "  stack: |-", "    at test.js:9:3", "  ...", "    not ok 1 - a nested failure", "      ---", "      error: 'nested'", "      ...", "1..2", "# tests 2", "# pass 1", "# fail 1"].join("\n");

test("the gate finds every failing test's whole block, its error, expected, actual and stack, and the run's counts", () => {
	const blocks = failureBlocks(TAP);
	assert.equal(blocks.length, 2);
	assert.match(blocks[0], /^not ok 2 - fails\n {2}---\n {2}error: \|-\n {4}the claim was false\n {2}expected: true\n {2}actual: false\n {2}stack: \|-\n {4}at test\.js:9:3\n {2}\.\.\.$/);
	assert.match(blocks[1], /a nested failure[\s\S]*error: 'nested'/);
	assert.deepEqual(tapCounts(TAP), { tests: 2, pass: 1, fail: 1 });
	assert.deepEqual(failureBlocks("ok 1 - passes\n# pass 1"), []);
});

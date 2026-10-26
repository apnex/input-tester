// workflows - what the workflows' comments claim of the token (.github/workflows/, IT-D10): every checkout persists
// no credential into a .git/config, `persist-credentials: false`, since `actions/checkout` persists the job's token by
// default; and in the release workflow, GH_TOKEN is handed only to steps whose commands run `gh`, never to the job or
// the workflow, so no other step -- the gate's among them -- holds it.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

import { repositoryRoot } from "../support/built-site.js";

const WORKFLOWS = ["gate.yml", "release.yml"];
const read = (name) => fs.readFileSync(path.join(repositoryRoot, ".github", "workflows", name), "utf8").split("\n");

/** Every step of a workflow's lines, as its own lines: from a line `- ` at the steps' indent to the next. */
function stepsOf(lines) {
	const steps = [];
	let current = null;
	let indent = null;
	for (const line of lines) {
		const m = /^(\s*)- /.exec(line);
		if (m && (indent === null || m[1].length === indent) && /^\s*- (name|uses|run):/.test(line)) {
			indent = m[1].length;
			current = [line];
			steps.push(current);
		} else if (current !== null && (line.trim() === "" || /^\s*#/.test(line) || line.search(/\S/) > indent)) current.push(line);
		else current = null;
	}
	return steps;
}

test("every actions/checkout step of every workflow persists no credential: persist-credentials: false", () => {
	let checkouts = 0;
	for (const name of WORKFLOWS) {
		for (const step of stepsOf(read(name))) {
			if (!step.some((l) => /uses:\s+actions\/checkout@/.test(l))) continue;
			checkouts++;
			assert.ok(step.some((l) => /^\s+persist-credentials:\s+false\s*$/.test(l)), `${name}: a checkout persisting its token:\n${step.join("\n")}`);
		}
	}
	assert.equal(checkouts, 4, "the repository's and mission-kit's checkouts, in each workflow");
});

test("the release workflow hands GH_TOKEN only to steps whose commands run gh, and to no job or workflow env", () => {
	const lines = read("release.yml");
	const steps = stepsOf(lines);
	const inSteps = new Set(steps.flat());
	const outside = lines.filter((l) => /GH_TOKEN:/.test(l) && !inSteps.has(l));
	assert.deepEqual(outside, [], "GH_TOKEN set outside any step");
	const holders = steps.filter((s) => s.some((l) => /^\s+GH_TOKEN:/.test(l)));
	assert.equal(holders.length, 4);
	for (const step of holders) assert.ok(step.some((l) => /(^|\s)gh (api|release)\b/.test(l)), `a step holding GH_TOKEN runs no gh:\n${step.join("\n")}`);
	for (const step of steps.filter((s) => !holders.includes(s))) assert.ok(!step.some((l) => /\bgh (api|release)\b/.test(l)), `a step running gh without GH_TOKEN:\n${step.join("\n")}`);
});

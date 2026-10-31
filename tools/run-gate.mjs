#!/usr/bin/env node
// run-gate - the gate (docs/ARCHITECTURE-TARGET.md section 8, IT-D1; `npm run gate`): every step in order, each
// able to fail -- the vendoring, the build, the tests in Node and in headless Chrome, the source, vocabulary,
// backlog, public-text and style checks -- its output shown as it ran, and its result written to
// .gate/results.json and its whole output to .gate/<step>.log, every failing test's block -- its error, expected
// and actual values and stack -- printed in full; last, the current architecture checked against what the code
// and those results derive. It fails when any step fails, having run every step, so one run names every failure.
// The two test steps run under test-harness's runner, in a run folder of its own, which fails the step on any file,
// folder or process the tests leave behind -- the gate's one check of leftovers -- and whose verdict is shown.
//
// Usage:  node tools/run-gate.mjs
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const node = process.execPath;
const runner = [node, path.join(root, "node_modules", ".bin", "test-harness"), "run"];

/** Every test file under a directory of `test/`, sorted. */
const testFiles = (dir) =>
	fs
		.readdirSync(path.join(root, "test", dir))
		.filter((f) => f.endsWith(".test.js"))
		.sort()
		.map((f) => path.join("test", dir, f));

/** The gate's steps, in order: each its name, what it holds, and its command. */
export const GATE_STEPS = [
	{ name: "vendoring", holds: "vendor/ is the pinned release files, byte for byte (GT3, P7)", command: [node, "tools/vendor-parts.mjs", "--check"] },
	{ name: "build", holds: "tsc builds src/ into the site, laid out as a release (IT-D1, section 9)", command: [node, "tools/build-site.mjs"] },
	{ name: "tests", holds: "the worked verdicts, the fixture rows, the overlap check, the plans, the picture state, the allowlist and writes in delivery, the release's layout, the guide's examples and every check able to fail (GT2, GT4, GT5, GT7, GT8)", command: [...runner, "--test-reporter=tap", "--test-concurrency=1", ...testFiles("."), ...testFiles("tools")], tests: true },
	{ name: "browser tests", holds: "trusted input over every browser-reachable row, containment with planted leaks, the browser rule, immediacy with a planted slow build, and the deploy's sequence (GT2, GT5, GT6, GT9, section 8)", command: [...runner, "--test-reporter=tap", "--test-concurrency=1", ...testFiles("browser")], tests: true },
	{ name: "source check", holds: "no network interface, navigation, storage, clock, timer or dynamic import, and no element made but through vector-scene (GT1)", command: [node, "tools/check-source.mjs"] },
	{ name: "vocabulary check", holds: "no word of another application in the tester's own words (GT7, P8)", command: [node, "tools/check-vocabulary.mjs"] },
	{ name: "backlog check", holds: "no workaround open while its retiring release is installed; every deferral with a revival trigger (GT4)", command: [node, "tools/check-backlog.mjs"] },
	{ name: "public-text check", holds: "no sixteen-hex-digit identifier in a file or a commit message", command: [node, "tools/check-public-text.mjs"] },
	{ name: "style check", holds: "mission-kit's S6, S8, S10, S12 and S13 over every document", command: [node, "tools/check-style.mjs"] },
];

/**
 * Every failing test's whole block in a TAP run: its `not ok` line and the YAML block beneath it -- the error,
 * expected and actual values, the location and the stack -- so the gate shows why a test failed.
 */
export function failureBlocks(output) {
	const lines = output.split("\n");
	const blocks = [];
	for (let i = 0; i < lines.length; i++) {
		if (!/^\s*not ok \d+/.test(lines[i])) continue;
		const block = [lines[i]];
		let j = i + 1;
		if (/^\s*---$/.test(lines[j] ?? "")) {
			for (; j < lines.length; j++) {
				block.push(lines[j]);
				if (/^\s*\.\.\.$/.test(lines[j])) break;
			}
		}
		blocks.push(block.join("\n"));
		i = j;
	}
	return blocks;
}

/** The counts a TAP run reports: tests, pass, fail. */
export function tapCounts(output) {
	const count = (name) => Number(new RegExp(`^# ${name} (\\d+)$`, "m").exec(output)?.[1] ?? NaN);
	return { tests: count("tests"), pass: count("pass"), fail: count("fail") };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const results = [];
	for (const step of GATE_STEPS) {
		console.log(`\n== ${step.name}: ${step.holds}`);
		const run = spawnSync(step.command[0], step.command.slice(1), { cwd: root, encoding: "utf8", maxBuffer: 256 * 1024 * 1024, env: process.env });
		const output = `${run.stdout ?? ""}${run.stderr ?? ""}`;
		fs.mkdirSync(path.join(root, ".gate"), { recursive: true });
		const logFile = path.join(".gate", `${step.name.replace(/\W+/g, "-")}.log`);
		fs.writeFileSync(path.join(root, logFile), output);
		if (step.tests) {
			console.log(output.split("\n").filter((l) => /^# (?!Subtest)\S/.test(l) || l.startsWith("test-harness: ")).join("\n"));
			const blocks = failureBlocks(output);
			if (blocks.length) console.log(`${blocks.length} failing test(s), each in full:\n${blocks.join("\n")}`);
			if (run.status !== 0 && blocks.length === 0) console.log(output.trim());
			console.log(`(the whole run: ${logFile})`);
		} else console.log(output.trim());
		const result = { name: step.name, holds: step.holds, passed: run.status === 0 };
		if (step.tests) Object.assign(result, tapCounts(output));
		if (step.tests && !(result.fail === 0 && result.pass === result.tests)) result.passed = false;
		results.push(result);
		console.log(`-- ${step.name}: ${result.passed ? "PASS" : "FAIL"}${step.tests ? ` (${result.pass} of ${result.tests} tests passed)` : ""}`);
	}
	fs.mkdirSync(path.join(root, ".gate"), { recursive: true });
	fs.writeFileSync(path.join(root, ".gate", "results.json"), `${JSON.stringify({ steps: results }, null, 2)}\n`);
	console.log("\n== architecture: docs/ARCHITECTURE.md is what the code and these results derive (section 10, row 1)");
	const architecture = spawnSync(node, ["tools/generate-architecture.mjs", "--check"], { cwd: root, encoding: "utf8" });
	console.log(`${architecture.stdout}${architecture.stderr}`.trim());
	const failed = results.filter((r) => !r.passed).map((r) => r.name);
	if (architecture.status !== 0) failed.push("architecture");
	const tests = results.filter((r) => r.tests !== undefined).reduce((n, r) => n + r.tests, 0);
	const passed = results.filter((r) => r.tests !== undefined).reduce((n, r) => n + r.pass, 0);
	console.log(`\ngate: ${failed.length ? `FAIL -- ${failed.join(", ")}` : "PASS"} -- ${results.length + 1} steps, ${passed} of ${tests} tests passed`);
	process.exit(failed.length ? 1 : 0);
}

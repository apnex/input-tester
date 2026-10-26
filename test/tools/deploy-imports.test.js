// deploy-imports - the operator's deploy runs from a checkout never built (README.md, Deploy): in a copy of the
// repository's tools and tests with its packages installed and no `site/`, every module tools/deploy imports loads,
// and tools/deploy itself reaches its own usage error -- while the browser tests' helper, which loads the built site
// at import time, does not load there, the control that the copy holds no built site.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";

import { repositoryRoot } from "../support/built-site.js";

/** A checkout of the repository's tools and tests, its packages installed, never built: no `site/`, no `build/`. */
function unbuiltCheckout() {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "input-tester-unbuilt-"));
	for (const name of ["tools", "test"]) fs.cpSync(path.join(repositoryRoot, name), path.join(dir, name), { recursive: true });
	for (const name of ["package.json", "package-lock.json"]) fs.copyFileSync(path.join(repositoryRoot, name), path.join(dir, name));
	fs.symlinkSync(path.join(repositoryRoot, "node_modules"), path.join(dir, "node_modules"));
	return dir;
}

/** Imports modules of the checkout in a fresh process; answers its exit status and output. */
function importIn(dir, modules) {
	const code = modules.map((m) => `await import(${JSON.stringify(pathToFileURL(path.join(dir, m)).href)});`).join(" ");
	const run = spawnSync(process.execPath, ["--input-type=module", "-e", code], { cwd: dir, encoding: "utf8" });
	return { status: run.status, output: `${run.stdout}${run.stderr}` };
}

test("every module the deploy imports loads in a checkout never built, and tools/deploy reaches its own usage error there; the built site's helper does not load, the control", () => {
	const dir = unbuiltCheckout();
	try {
		assert.equal(fs.existsSync(path.join(dir, "site")), false);
		const deploy = importIn(dir, ["tools/deploy-steps.mjs", "tools/content-types.mjs", "tools/smoke-run.mjs", "test/browser/request-monitor.js", "test/support/containment.js", "test/browser/chrome-driver.js", "tools/deploy"]);
		assert.equal(deploy.status, 0, deploy.output);
		const env = { ...process.env };
		for (const name of ["TAG", "REPO", "LAB_BUCKET", "LAB_HOST", "LAB_BACKEND", "PROD_BUCKET", "PROD_HOST", "PROD_BACKEND"]) delete env[name];
		const run = spawnSync(process.execPath, [path.join(dir, "tools", "deploy")], { cwd: dir, encoding: "utf8", env });
		assert.equal(run.status, 1);
		assert.match(run.stdout, /^deploy: missing /m, "its own refusal of missing options, not a crash");
		assert.doesNotMatch(`${run.stdout}${run.stderr}`, /not built|ERR_MODULE_NOT_FOUND|at async/);
		const control = importIn(dir, ["test/browser/tester-in-chrome.js"]);
		assert.notEqual(control.status, 0);
		assert.match(control.output, /is not built; run npm run build/);
	} finally {
		fs.rmSync(dir, { recursive: true, force: true });
	}
});

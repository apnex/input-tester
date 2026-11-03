// address-tuning - the view's values tuned live in the lab from the address's fragment (docs/DECISIONS.md 0022): each
// setting honoured on the lab's host and on a loopback host, each overriding its constant for that page alone and
// taking effect through the composed page; nothing honoured on the production host, nor on any other; a value
// malformed or out of range ignored and named, with why; and the GUIDE's examples read whole.
import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

import { importBuilt } from "./support/built-site.js";
import { fakePlatform } from "./support/fake-platform.js";

const { tuningFromAddress, tuningNotes, asksLargePane } = await importBuilt("address-tuning.js");
const { DEFAULT_TUNING } = await importBuilt("view-steps.js");
const { composeTesterPage } = await importBuilt("composition-root.js");

const LAB = "https://input-lab.apnex.io/?plan=chromebook";
const LOCAL = ["http://127.0.0.1:41234/?plan=ansi", "http://localhost:8080/"];
const PRODUCTION = "https://input.apnex.io/?plan=chromebook";

/** The GUIDE's examples, section 9's tuning, read from the GUIDE itself: each address in it on the lab's host. */
const guide = fs.readFileSync(new URL("../docs/GUIDE.md", import.meta.url), "utf8");
const tuningSection = guide.slice(guide.indexOf("### Tuning the pane in the address"), guide.indexOf("\n---\n", guide.indexOf("### Tuning the pane in the address")));
const GUIDE_EXAMPLES = [...tuningSection.matchAll(/^`(https:\/\/input-lab\.apnex\.io\/[^`\s]+)`$/gm)].map((m) => m[1]);

test("0022: every setting honoured on the lab's host and on a loopback host, each overriding its constant, the settings in force in canonical words", () => {
	const fragment = "#view&levels=0.5,1,2,3,4&tiers4=8:1,2:0.5,1:0.25&tiers3=9:1,3:0.5,1:0.25&floor=4&max=10000&step=150";
	for (const host of [LAB, ...LOCAL]) {
		const { tuning, active, ignored } = tuningFromAddress(host + fragment);
		assert.deepEqual(ignored, [], host);
		assert.deepEqual([...tuning.levels], [0.5, 1, 2, 3, 4], `${host}: the levels`);
		assert.deepEqual(JSON.parse(JSON.stringify(tuning.tiers[4])), [{ every: 8, opacity: 1 }, { every: 2, opacity: 0.5 }, { every: 1, opacity: 0.25 }], `${host}: tiers at 4x`);
		assert.deepEqual(JSON.parse(JSON.stringify(tuning.tiers[2])), JSON.parse(JSON.stringify(DEFAULT_TUNING.tiers[2])), `${host}: a level not tuned keeps its tiers`);
		assert.deepEqual([tuning.floor, tuning.max, tuning.step], [4, 10000, 150], host);
		assert.deepEqual(active, ["levels=0.5,1,2,3,4", "tiers4=8:1,2:0.5,1:0.25", "tiers3=9:1,3:0.5,1:0.25", "floor=4", "max=10000", "step=150"], host);
		assert.equal(asksLargePane(host + fragment), true, `${host}: view, the large pane, with settings after it`);
	}
});

test("0022: nothing honoured on the production host, nor on any other -- the values as held, no setting in force, nothing named -- though view still asks for the large pane", () => {
	for (const host of [PRODUCTION, "https://input.example/", "https://input-lab.apnex.io.example/"]) {
		const t = tuningFromAddress(`${host}#view&floor=4&max=10000&step=abc`);
		assert.equal(t.tuning, DEFAULT_TUNING, host);
		assert.deepEqual([t.active, t.ignored, tuningNotes(t)], [[], [], []], host);
		assert.equal(asksLargePane(`${host}#view&floor=4`), true, host);
	}
});

test("0022: a value malformed or out of range ignored and named with why, the rest honoured", () => {
	const cases = [
		["levels=0.5,2,3", /^levels=0\.5,2,3: not 2 to 8 levels, each from 0\.1 to 16, ascending, 1 among them$/],
		["levels=1,0.5", /^levels=1,0\.5: not 2 to 8 levels/],
		["levels=1,99", /^levels=1,99: not 2 to 8 levels/],
		["floor=-1", /^floor=-1: not a number of pixels from 0 to 50$/],
		["floor=", /^floor=: not a number of pixels from 0 to 50$/],
		["max=12.5", /^max=12\.5: not a whole number from 1 to 200000$/],
		["max=300000", /^max=300000: not a whole number from 1 to 200000$/],
		["step=abc", /^step=abc: not a number of pixels from 10 to 1000$/],
		["step=5", /^step=5: not a number of pixels from 10 to 1000$/],
		["tiers3=9:1,2:0.5,1:0.25", /^tiers3=9:1,2:0\.5,1:0\.25: not tiers coarsest first/],
		["tiers3=10:0.5,1:0.25", /^tiers3=10:0\.5,1:0\.25: not tiers coarsest first/],
		["tiers3=10:1,2:0.5", /^tiers3=10:1,2:0\.5: not tiers coarsest first/],
		["tiers3=10:1,2:0.5,1:0.75", /^tiers3=10:1,2:0\.5,1:0\.75: not tiers coarsest first/],
		["tiers5=5:1,1:0.5", /^tiers5=5:1,1:0\.5: no level 5 among the levels in force, 0\.5, 1, 2, 3$/],
		["zoom=2", /^zoom=2: no setting named zoom/],
		["floor", /^floor: not a setting, name=value$/],
		["%E0%A4%A", /^%E0%A4%A: not readable as written$/],
	];
	for (const [setting, why] of cases) {
		const other = setting.startsWith("step") ? "max=10000" : "step=150";
		const t = tuningFromAddress(`${LAB}#view&${setting}&${other}`);
		assert.equal(t.ignored.length, 1, `${setting}: ${JSON.stringify(t.ignored)}`);
		assert.match(t.ignored[0], why, setting);
		assert.deepEqual(t.active, [other], `${setting}: the rest honoured`);
		assert.equal(tuningNotes(t).join(" | ").startsWith(`tuned in the address: ${other} | ignored in the address: `), true, setting);
	}
	const twice = tuningFromAddress(`${LAB}#view&floor=4&floor=8`);
	assert.deepEqual([twice.tuning.floor, twice.ignored], [4, ["floor=8: floor given twice, the first kept"]]);
});

test("0022: GUIDE section 9's examples read whole on the lab's host -- the v0.4.0 look, every ninth dot full at 3x, a gentler pinch -- and ignored on the production host", () => {
	const active = GUIDE_EXAMPLES.map((address) => {
		const t = tuningFromAddress(address);
		assert.deepEqual(t.ignored, [], address);
		assert.equal(asksLargePane(address), true, address);
		assert.deepEqual(tuningFromAddress(address.replace("input-lab.apnex.io", "input.apnex.io")).active, [], `${address} on the production host`);
		return t.active;
	});
	assert.deepEqual(active, [["floor=4", "max=10000"], ["tiers3=9:1,3:0.5,1:0.25"], ["step=150"]]);
});

/** A page composed on the fake platform at an address. */
function pageAt(address) {
	const platform = fakePlatform({ address });
	return { platform, page: composeTesterPage(platform) };
}

/** Presses a key on the fake platform, down and up. */
function press(platform, key, code) {
	platform.key("key-down", { key, code });
	platform.key("key-up", { key, code });
}

test("0022: each setting takes effect in the composed page on the lab's host and a loopback host, and none on the production host", () => {
	for (const host of [LAB, LOCAL[0], PRODUCTION]) {
		const honoured = host !== PRODUCTION;
		// the floor: at 3x the fake pane's dots stand 6.25 pixels apart, under a floor of 7
		let { platform, page } = pageAt(`${host}#view&floor=7`);
		press(platform, "-", "Minus");
		press(platform, "-", "Minus");
		assert.deepEqual(page.paneDots.tiers.map((t) => t.dropped), honoured ? [null, null, "spacing"] : [null, null, null], `${host}: floor=7`);
		// the bound: 1,089 points in the fake pane at 1x, past a bound of 500
		({ platform, page } = pageAt(`${host}#view&max=500`));
		assert.equal(page.paneDots.inView, 1089);
		assert.ok(honoured ? page.paneDots.full <= 500 : page.paneDots.full >= 1089, `${host}: max=500, ${page.paneDots.full} drawn`);
		// the step: a pinch of 150 pixels steps a level at 100 and not at 200
		({ platform, page } = pageAt(`${host}#view&step=200`));
		platform.wheel({ ctrlKey: true, deltaY: -150, clientX: 300, clientY: 300 });
		assert.equal(page.picture.view.level, honoured ? 1 : 0.5, `${host}: step=200`);
		// the levels: three steps out reach 4x where 4 is a level, 3x where 3 is the last
		({ platform, page } = pageAt(`${host}#view&levels=0.5,1,2,4`));
		for (let i = 0; i < 3; i++) press(platform, "-", "Minus");
		assert.equal(page.picture.view.level, honoured ? 4 : 3, `${host}: levels`);
		// the tiers: at 3x every ninth full, every third half and the rest a quarter
		({ platform, page } = pageAt(`${host}#view&tiers3=9:1,3:0.5,1:0.25`));
		press(platform, "-", "Minus");
		press(platform, "-", "Minus");
		assert.deepEqual(page.paneDots.tiers.map((t) => t.every), honoured ? [9, 3, 1] : [10, 2, 1], `${host}: tiers3`);
		assert.deepEqual(page.tuning.active.length > 0, honoured, `${host}: the page's own record of the tuning`);
	}
});

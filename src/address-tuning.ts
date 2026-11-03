/**
 * Address tuning: the view's values tuned live in the lab, from the address's fragment (docs/DECISIONS.md 0022).
 *
 * The fragment is a list of items joined by `&`: `view`, the large pane, as before, and settings, each `name=value`,
 * so `#view&floor=4&max=10000`. The fragment never reaches the server, and it is read once, as the page opens, as
 * `#view` is. Settings are honoured on the lab's host and on a loopback host, where the gate serves the page, and
 * ignored everywhere else, `input.apnex.io` among them, without a word. Each overrides its constant in
 * `view-steps.ts` for that page alone:
 * - `levels=0.5,1,2,3` -- the zoom levels, 2 to 8 of them, each from 0.1 to 16, ascending, 1, the default, among them;
 * - `tiers3=10:1,2:0.5,1:0.25` -- a level's tiers, `tiers` and the level, each tier `every:opacity`, coarsest first,
 *   the first full, the last every 1, each finer `every` dividing the coarser and its opacity fainter;
 * - `floor=4` -- `GRID_FLOOR`, from 0 to 50 pixels;
 * - `max=10000` -- `GRID_MAX`, a whole number from 1 to 200,000;
 * - `step=100` -- the pinch's step in pixels, from 10 to 1,000.
 * A value malformed or out of range is ignored and named, with why, in a note the pane's readouts show beside the
 * settings in force.
 */
import { DEFAULT_TUNING } from "./view-steps.js";
import type { GridTier, GridTuning } from "./view-steps.js";

/** The hosts that honour the address's settings: the lab's, and loopback, where the gate serves the page. */
export const TUNING_HOSTS: readonly string[] = Object.freeze(["input-lab.apnex.io", "localhost", "127.0.0.1", "[::1]"]);

/** The address's tuning: the values in force, the settings honoured in their canonical words, and the ones ignored, each with why. */
export interface AddressTuning {
	readonly tuning: GridTuning;
	readonly active: readonly string[];
	readonly ignored: readonly string[];
}

/** The fragment's items as written, `view` among them, each setting still to be decoded. */
function fragmentItems(address: string): string[] {
	const hash = new URL(address).hash.slice(1);
	return hash === "" ? [] : hash.split("&").filter((item) => item !== "");
}

/** Whether the address asks for the large pane: its fragment's first item `view`. */
export const asksLargePane = (address: string): boolean => fragmentItems(address)[0] === "view";

/** A list of numbers written with commas, or null where any is not a finite number. */
function numbers(value: string): number[] | null {
	const out = value.split(",").map((v) => (v.trim() === "" ? Number.NaN : Number(v)));
	return out.every(Number.isFinite) ? out : null;
}

/** A level's tiers written `every:opacity,...`, or null where they are not tiers by the rule `GRID_TIERS` keeps. */
function tiersOfValue(value: string): GridTier[] | null {
	const tiers = value.split(",").map((t) => {
		const [every, opacity, ...rest] = t.split(":");
		return rest.length > 0 || every === undefined || opacity === undefined ? null : { every: Number(every), opacity: Number(opacity) };
	});
	if (tiers.some((t) => t === null)) return null;
	const list = tiers as GridTier[];
	if (list.length === 0 || list.length > 4) return null;
	if (!list.every((t) => Number.isInteger(t.every) && t.every >= 1 && t.every <= 100 && Number.isFinite(t.opacity) && t.opacity > 0 && t.opacity <= 1)) return null;
	if ((list[0] as GridTier).opacity !== 1 || (list.at(-1) as GridTier).every !== 1) return null;
	for (let i = 1; i < list.length; i++) {
		const coarser = list[i - 1] as GridTier;
		const finer = list[i] as GridTier;
		if (finer.every >= coarser.every || coarser.every % finer.every !== 0 || finer.opacity >= coarser.opacity) return null;
	}
	return list.map((t) => Object.freeze({ every: t.every, opacity: t.opacity }));
}

/** The address's tuning: on a host that honours it, every setting read, checked and either honoured or ignored with why; elsewhere the values as held. */
export function tuningFromAddress(address: string): AddressTuning {
	const none: AddressTuning = Object.freeze({ tuning: DEFAULT_TUNING, active: Object.freeze([]), ignored: Object.freeze([]) });
	if (!TUNING_HOSTS.includes(new URL(address).hostname)) return none;
	const settings = fragmentItems(address).filter((item) => item !== "view");
	if (settings.length === 0) return none;
	const active: string[] = [];
	const ignored: string[] = [];
	const given = new Map<string, string>();
	for (const raw of settings) {
		let item: string;
		try {
			item = decodeURIComponent(raw);
		} catch {
			ignored.push(`${raw}: not readable as written`);
			continue;
		}
		const at = item.indexOf("=");
		if (at <= 0) {
			ignored.push(`${item}: not a setting, name=value`);
			continue;
		}
		const name = item.slice(0, at);
		if (given.has(name)) {
			ignored.push(`${item}: ${name} given twice, the first kept`);
			continue;
		}
		given.set(name, item.slice(at + 1));
	}
	let levels = DEFAULT_TUNING.levels;
	const levelsValue = given.get("levels");
	if (levelsValue !== undefined) {
		const list = numbers(levelsValue);
		const ok = list !== null && list.length >= 2 && list.length <= 8 && list.every((l) => l >= 0.1 && l <= 16) && list.every((l, i) => i === 0 || l > (list[i - 1] as number)) && list.includes(1);
		if (ok) {
			levels = Object.freeze(list);
			active.push(`levels=${list.join(",")}`);
		} else ignored.push(`levels=${levelsValue}: not 2 to 8 levels, each from 0.1 to 16, ascending, 1 among them`);
	}
	const tiers: Record<number, readonly GridTier[]> = { ...DEFAULT_TUNING.tiers };
	let floor = DEFAULT_TUNING.floor;
	let max = DEFAULT_TUNING.max;
	let step = DEFAULT_TUNING.step;
	for (const [name, value] of given) {
		if (name === "levels") continue;
		const setting = `${name}=${value}`;
		if (name === "floor") {
			const n = Number(value);
			if (value.trim() !== "" && Number.isFinite(n) && n >= 0 && n <= 50) {
				floor = n;
				active.push(`floor=${n}`);
			} else ignored.push(`${setting}: not a number of pixels from 0 to 50`);
		} else if (name === "max") {
			const n = Number(value);
			if (Number.isInteger(n) && n >= 1 && n <= 200000) {
				max = n;
				active.push(`max=${n}`);
			} else ignored.push(`${setting}: not a whole number from 1 to 200000`);
		} else if (name === "step") {
			const n = Number(value);
			if (value.trim() !== "" && Number.isFinite(n) && n >= 10 && n <= 1000) {
				step = n;
				active.push(`step=${n}`);
			} else ignored.push(`${setting}: not a number of pixels from 10 to 1000`);
		} else if (name.startsWith("tiers")) {
			const level = Number(name.slice("tiers".length));
			const list = tiersOfValue(value);
			if (!levels.includes(level)) ignored.push(`${setting}: no level ${name.slice("tiers".length)} among the levels in force, ${levels.join(", ")}`);
			else if (list === null) ignored.push(`${setting}: not tiers coarsest first, each every:opacity, the first full, the last every 1, each finer every dividing the coarser and fainter`);
			else {
				tiers[level] = Object.freeze(list);
				active.push(`tiers${level}=${list.map((t) => `${t.every}:${t.opacity}`).join(",")}`);
			}
		} else ignored.push(`${setting}: no setting named ${name}; the settings are levels, tiers and a level, floor, max and step`);
	}
	return Object.freeze({ tuning: Object.freeze({ levels, tiers: Object.freeze(tiers), floor, max, step }), active: Object.freeze(active), ignored: Object.freeze(ignored) });
}

/** The readouts' lines for an address's tuning: the settings in force and the ones ignored, none when neither. */
export function tuningNotes(tuning: AddressTuning): string[] {
	return [...(tuning.active.length > 0 ? [`tuned in the address: ${tuning.active.join("; ")}`] : []), ...(tuning.ignored.length > 0 ? [`ignored in the address: ${tuning.ignored.join("; ")}`] : [])];
}

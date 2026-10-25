/**
 * Labels: names each drawn key as the person's own keyboard does (docs/ARCHITECTURE-TARGET.md section 5, IT-D2).
 *
 * The browser's Keyboard Map, where it offers one, says which character each writing-system key produces on
 * the person's keyboard; such a label is marked reported. Every other key -- every key, where the browser
 * offers no map -- keeps the label printed on the plan, marked assumed. The map is asked once, and may answer
 * after the first paint.
 */
import type { KeyboardPlan } from "./keyboard-plans.js";

/** Whether a label is what the browser reported for the person's keyboard, or the plan's printing, assumed. */
export type LabelSource = "reported" | "assumed";

/** One key's label, and where it came from. */
export interface KeyLabel {
	readonly text: string;
	readonly source: LabelSource;
}

/** Every drawn key's label, by its code. */
export type KeyLabels = ReadonlyMap<string, KeyLabel>;

/** The browser's Keyboard Map as the labels read it: the character a code produces, or nothing. */
export interface KeyboardMapAnswer {
	get(code: string): string | undefined;
}

/** What offers the Keyboard Map: the browser's `navigator`, whose `keyboard` some browsers lack. */
export interface KeyboardMapSource {
	readonly keyboard?: { getLayoutMap(): Promise<KeyboardMapAnswer> } | undefined;
}

/** Every key labelled as the plan prints it, each marked assumed: the labels before the map answers, or where there is none. */
export function labelsPrintedOnPlan(plan: KeyboardPlan): KeyLabels {
	return new Map(plan.keys.map((k) => [k.code, Object.freeze({ text: k.label, source: "assumed" as const })]));
}

/** Every key labelled from the Keyboard Map where it names the key's code, marked reported, and otherwise as the plan prints it, marked assumed. */
export function labelsFromKeyboardMap(plan: KeyboardPlan, map: KeyboardMapAnswer): KeyLabels {
	return new Map(
		plan.keys.map((k) => {
			const reported = map.get(k.code);
			return [k.code, Object.freeze(typeof reported === "string" && reported !== "" ? { text: reported, source: "reported" as const } : { text: k.label, source: "assumed" as const })];
		}),
	);
}

/** Asks the browser for its Keyboard Map once: the map, or null where the browser offers none or refuses. */
export async function askKeyboardMap(source: KeyboardMapSource): Promise<KeyboardMapAnswer | null> {
	const keyboard = source.keyboard;
	if (!keyboard || typeof keyboard.getLayoutMap !== "function") return null;
	try {
		return await keyboard.getLayoutMap();
	} catch {
		return null;
	}
}

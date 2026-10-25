/**
 * Picture state: keeps what the person is shown, as data (docs/ARCHITECTURE-TARGET.md sections 5 to 7, P1, P6).
 *
 * One frozen record, made only from verdicts, applying each verdict's steps in order, and readable whole at
 * any moment. Which keys are held is read from `input-binding`'s session -- the state the verdict's last
 * session step left -- never kept twice; the record keeps of each held key only what the facts showed of it:
 * its first observed time, whether it was first seen pressed or already repeating, its repeats observed and its
 * latest fact, exact. Times are the facts' own; a duration is shown as of the latest fact, and no clock is read.
 */
import type { CapturePoint, KeyFact, WheelFact } from "../vendor/input-capture/index.js";
import type { LiveGesture, Phase, Press, SessionState, TraceRecord, Trigger } from "../vendor/input-binding/index.js";
import type { DeliveredFact, ItemUnderPointer, TesterFact } from "./input-bindings.js";
import type { Verdict, VerdictStep } from "./input-router.js";

/** How many lines the log keeps, newest first. */
export const LOG_LINES = 14;

/** One held key as the facts showed it. */
export interface HeldKeyPicture {
	readonly code: string;
	/** The first observed fact's `time`: the press's, or, for a key first seen repeating, that repeat's. */
	readonly firstTime: number | null;
	/** Whether the first observed fact was a first press, or the key was first seen repeating -- pressed before it was seen. */
	readonly firstSeen: "press" | "repeat";
	/** How many repeats were observed. */
	readonly repeats: number;
	/** The latest fact of this key, exact. */
	readonly latest: KeyFact<null>;
	/** The last repeat interval: the difference of the two latest facts' times, or null when either is null or only one was seen. */
	readonly interval: number | null;
}

/** The latest wheel fact, exact, and how many like it came in a row: the same modifiers, unit and sign of each delta. */
export interface WheelPicture {
	readonly latest: WheelFact<ItemUnderPointer>;
	readonly count: number;
}

/** The gesture the latest phase concerned: its name, that phase, a commit's trigger, and whether it is still live. */
export interface GesturePicture {
	readonly name: string;
	readonly phase: Phase;
	readonly trigger: Trigger | null;
	readonly live: boolean;
}

/** One log line: the latest fact it shows, exact; the rows it hit; whether it was claimed; how many facts it stands for; and what the session said of it. */
export interface LogEntry {
	readonly fact: TesterFact;
	readonly hits: readonly string[];
	readonly claimed: boolean;
	readonly count: number;
	readonly notes: readonly string[];
}

/** The latest verdict's traces: the delivered fact's, marking the input, and its last derived fact's, marking the meaning. */
export interface LegendPicture {
	readonly input: readonly TraceRecord[];
	readonly meaning: readonly TraceRecord[] | null;
}

/** What the person is shown, as one frozen record. */
export interface Picture {
	readonly heldKeys: readonly HeldKeyPicture[];
	readonly unidentifiedKey: KeyFact<null> | null;
	readonly buttons: number | null;
	readonly wheel: WheelPicture | null;
	readonly gesture: GesturePicture | null;
	readonly press: Press | null;
	readonly pointerAt: CapturePoint | null;
	readonly log: readonly LogEntry[];
	readonly legend: LegendPicture | null;
	readonly under: ItemUnderPointer;
	readonly latestFact: DeliveredFact | null;
	readonly facts: number;
}

/** The names of the record's entries, which the painter puts again when they change. */
export type PictureEntry = keyof Picture;

/** The record before any fact. */
export const EMPTY_PICTURE: Picture = Object.freeze({ heldKeys: Object.freeze([]), unidentifiedKey: null, buttons: null, wheel: null, gesture: null, press: null, pointerAt: null, log: Object.freeze([]), legend: null, under: null, latestFact: null, facts: 0 });

/** The difference of two facts' times, or null when either is null: never a clock reading. */
export function timeBetween(earlier: number | null, later: number | null): number | null {
	return earlier === null || later === null ? null : later - earlier;
}

/** The sign of a delta, 0 for both zeros. */
const signOf = (delta: number): number => (delta > 0 ? 1 : delta < 0 ? -1 : 0);

/** Whether two wheel facts are alike: the same modifiers, unit and sign of each delta. */
export function wheelFactsAlike(a: WheelFact<ItemUnderPointer>, b: WheelFact<ItemUnderPointer>): boolean {
	return a.shiftKey === b.shiftKey && a.ctrlKey === b.ctrlKey && a.altKey === b.altKey && a.metaKey === b.metaKey && a.deltaMode === b.deltaMode && signOf(a.deltaX) === signOf(b.deltaX) && signOf(a.deltaY) === signOf(b.deltaY) && signOf(a.deltaZ) === signOf(b.deltaZ);
}

/** The ids of the rows a trace marks as hits, in table order. */
const hitsOf = (trace: readonly TraceRecord[]): readonly string[] => Object.freeze(trace.filter((r) => r.hit).map((r) => r.id));

/** Words for a duration between two facts' times, as of the latest. */
const heldWords = (duration: number | null, atLeast: boolean): string => (duration === null ? "held for a time not reported" : `held ${atLeast ? "at least " : ""}${duration} ms`);

/** Applies one session step to the held keys' details, answering the details and the notes the step makes on the fact's log line. */
function applyKeyStep(details: Map<string, HeldKeyPicture>, step: VerdictStep, fact: DeliveredFact, notes: string[]): void {
	if (step.operation === "keysLost") {
		const released = step.outcome.released;
		if (released.length > 0) notes.push(`released ${released.join(" ")}: their releases not reported`);
		details.clear();
		return;
	}
	if ((step.operation !== "keyDown" && step.operation !== "keyUp") || (fact.type !== "key-down" && fact.type !== "key-up")) return;
	const { tracked, held } = step.outcome;
	if (!tracked || fact.code === null) {
		notes.push("its physical key not reported: untracked, so no key lights");
		return;
	}
	const code = fact.code;
	const before = details.get(code);
	if (step.operation === "keyDown") {
		if (held === true && before !== undefined && fact.repeat) {
			details.set(code, Object.freeze({ ...before, repeats: before.repeats + 1, latest: fact, interval: timeBetween(before.latest.time, fact.time) }));
			return;
		}
		if (held === true && !fact.repeat) notes.push("pressed again while held: its release was not seen");
		if (fact.repeat) notes.push("pressed before it was seen");
		details.set(code, Object.freeze({ code, firstTime: fact.time, firstSeen: fact.repeat ? "repeat" : "press", repeats: fact.repeat ? 1 : 0, latest: fact, interval: null }));
		return;
	}
	if (held === true && before !== undefined) notes.push(heldWords(timeBetween(before.firstTime, fact.time), before.firstSeen === "repeat"));
	else notes.push("not held: its press was not seen");
	details.delete(code);
}

/** The words a session step adds to its fact's log line, for the gesture's phases and the press. */
function gestureNotes(step: VerdictStep, notes: string[]): void {
	if (step.operation === "resolvePress") {
		const { taken, cancelled, phase, gesture } = step.outcome;
		if (taken) notes.push("taken by the live gesture: nothing cancelled, nothing started");
		if (cancelled !== null && cancelled.gesture !== null) notes.push(`cancelled ${cancelled.gesture.name}`);
		if (phase === "start" && gesture !== null) notes.push(`started ${gesture.name}`);
	} else if (step.operation === "becomeGesture") {
		notes.push(`${step.outcome.was.name} became ${step.outcome.gesture?.name ?? ""}: beyond the threshold`);
	} else if (step.operation === "pointerUp") {
		if (step.outcome.otherPointer) notes.push("another pointer's release: nothing changed");
		else if (step.outcome.phase === "commit" && step.outcome.gesture !== null) notes.push(`committed ${step.outcome.gesture.name}, a ${step.outcome.trigger}`);
		else if (step.outcome.trigger !== null) notes.push(`a ${step.outcome.trigger}, no gesture committed`);
	} else if (step.operation === "pointerLost") {
		if (step.outcome.phase === "cancel" && step.outcome.gesture !== null) notes.push(`cancelled ${step.outcome.gesture.name}: its release not reported`);
	}
}

/** The gesture the latest phase of a step concerned, or the picture's as it was. */
function gestureAfterStep(previous: GesturePicture | null, step: VerdictStep): GesturePicture | null {
	const outcome = step.outcome;
	if (!("phase" in outcome) || outcome.phase === null || outcome.gesture === null) return previous;
	const trigger = step.operation === "pointerUp" ? step.outcome.trigger : null;
	return Object.freeze({ name: outcome.gesture.name, phase: outcome.phase, trigger, live: false });
}

/** The session state a step left, when the step reports one. */
const stateAfterStep = (step: VerdictStep): SessionState => step.outcome.state;

/** The same value when equal field by field, so an entry that did not change keeps its identity. */
function sameOrNew<T extends object>(previous: T | null, next: T | null): T | null {
	if (previous === null || next === null) return next;
	const keys = Object.keys(next) as (keyof T)[];
	return keys.length === Object.keys(previous).length && keys.every((k) => Object.is(previous[k], next[k])) ? previous : next;
}

/** Whether two answers of what lies under the pointer name the same item and path. */
function sameItem(a: ItemUnderPointer, b: ItemUnderPointer): boolean {
	if (a === null || b === null) return a === b;
	return a.layer === b.layer && a.key === b.key && a.path.length === b.path.length && a.path.every((n, i) => n === b.path[i]);
}

/**
 * Applies one verdict to the picture, its steps in order, answering the record it leaves and which entries
 * changed. An entry that did not change keeps its very value.
 */
export function applyVerdict(picture: Picture, verdict: Verdict): { picture: Picture; changed: ReadonlySet<PictureEntry> } {
	const fact = verdict.fact;
	const details = new Map(picture.heldKeys.map((k) => [k.code, k]));
	const notes: string[] = [];
	let gesture = picture.gesture;
	let state: SessionState | null = null;
	let meaning: readonly TraceRecord[] | null = null;
	const derivedLines: LogEntry[] = [];
	for (const step of verdict.steps) {
		applyKeyStep(details, step, fact, notes);
		gestureNotes(step, notes);
		gesture = gestureAfterStep(gesture, step);
		state = stateAfterStep(step);
		if (step.operation === "pointerUp" && step.derived !== null) {
			meaning = step.derived.trace;
			derivedLines.push(Object.freeze({ fact: step.derived.fact, hits: hitsOf(step.derived.trace), claimed: false, count: 1, notes: Object.freeze([`the meaning of the release: ${step.derived.fact.gesture} committed, a ${step.derived.fact.trigger}`]) }));
		}
	}

	const heldKeys = state === null ? picture.heldKeys : Object.freeze(state.keys.map((code) => details.get(code)).filter((k): k is HeldKeyPicture => k !== undefined));
	const press = state === null ? picture.press : state.press;
	if (state !== null && gesture !== null) gesture = sameOrNew(picture.gesture, Object.freeze({ ...gesture, live: state.gesture !== null && state.gesture.name === gesture.name }));

	const isMouse = "pointerType" in fact && fact.pointerType === "mouse";
	const buttons = (isMouse || fact.type === "wheel") && fact.buttons !== null ? fact.buttons : picture.buttons;
	const pointerAt = isMouse ? fact.at : picture.pointerAt;
	const under = fact.at !== null && !sameItem(picture.under, fact.hit) ? fact.hit : picture.under;
	const unidentifiedKey = (fact.type === "key-down" || fact.type === "key-up") && (fact.code === "" || fact.code === null) ? fact : picture.unidentifiedKey;

	let wheel = picture.wheel;
	let log = picture.log;
	const hits = hitsOf(verdict.trace);
	const newest = log[0];
	if (fact.type === "wheel") {
		const alike = wheel !== null && newest !== undefined && newest.fact.type === "wheel" && wheelFactsAlike(wheel.latest, fact);
		wheel = Object.freeze({ latest: fact, count: alike && wheel !== null ? wheel.count + 1 : 1 });
		const line: LogEntry = Object.freeze({ fact, hits, claimed: verdict.claimed, count: wheel.count, notes: Object.freeze(notes) });
		log = Object.freeze([line, ...(alike ? log.slice(1) : log)].slice(0, LOG_LINES));
	} else {
		const repeated = fact.type === "key-down" && fact.repeat && fact.code !== null ? details.get(fact.code) : undefined;
		const rewrite = repeated !== undefined && repeated.firstSeen === "press" ? newest !== undefined && newest.fact.type === "key-down" && newest.fact.code === repeated.code : repeated !== undefined && repeated.repeats > 1 && newest !== undefined && newest.fact.type === "key-down" && newest.fact.code === repeated.code;
		const lines: LogEntry[] = [...derivedLines.reverse()];
		if (hits.length > 0 || notes.length > 0) {
			const repeatNotes = repeated === undefined ? [] : [`${repeated.repeats} repeat${repeated.repeats === 1 ? "" : "s"} observed`, ...(repeated.interval === null ? [] : [`last interval ${repeated.interval} ms`]), ...(repeated.firstSeen === "repeat" ? ["pressed before it was seen"] : [])];
			lines.push(Object.freeze({ fact, hits, claimed: verdict.claimed, count: repeated === undefined ? 1 : repeated.repeats, notes: Object.freeze([...new Set([...repeatNotes, ...notes])]) }));
		}
		if (lines.length > 0) log = Object.freeze([...lines, ...(rewrite ? log.slice(1) : log)].slice(0, LOG_LINES));
	}

	const legend: LegendPicture = Object.freeze({ input: verdict.trace, meaning });
	const next: Picture = Object.freeze({
		heldKeys: heldKeys.length === picture.heldKeys.length && heldKeys.every((k, i) => k === picture.heldKeys[i]) ? picture.heldKeys : heldKeys,
		unidentifiedKey,
		buttons,
		wheel,
		gesture,
		press,
		pointerAt,
		log,
		legend,
		under,
		latestFact: fact,
		facts: picture.facts + 1,
	});
	const changed = new Set<PictureEntry>();
	for (const entry of Object.keys(next) as PictureEntry[]) if (!Object.is(next[entry], picture[entry])) changed.add(entry);
	return { picture: next, changed };
}

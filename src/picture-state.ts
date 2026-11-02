/**
 * Picture state: keeps what the person is shown, as data (docs/ARCHITECTURE-TARGET.md sections 5 to 7, P1, P6).
 *
 * One frozen record, made only from verdicts, applying each verdict's steps in order, and readable whole at
 * any moment. Which keys are held is read from `input-binding`'s session -- the state the verdict's last
 * session step left -- never kept twice; the record keeps of each held key only what the facts showed of it:
 * its first observed time, whether it was first seen pressed or already repeating, its repeats observed and its
 * latest fact, exact. Times are the facts' own; a duration is shown as of the latest fact, and no clock is read.
 *
 * It keeps the view the view's rows would set (section 6, the view's rows): the zoom level and the pinch's
 * accumulator, a live pan's travel on screen from where it engaged, and words for what the latest of those rows
 * did -- numbers, with no view drawn: the view pane is a move of its own.
 */
import type { CapturePoint, KeyFact, WheelFact } from "../vendor/input-capture/index.js";
import type { LiveGesture, Phase, Press, SessionState, TraceRecord, Trigger } from "../vendor/input-binding/index.js";
import { PAN_GESTURES } from "./input-bindings.js";
import type { DeliveredFact, ItemUnderPointer, TesterFact } from "./input-bindings.js";
import type { Verdict, VerdictStep } from "./input-router.js";
import { DEFAULT_ZOOM_LEVEL, ZOOM_STEP_PIXELS, levelWords, normalisedDelta, screenDistance, stepZoom } from "./view-steps.js";

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

/** A live pan: its gesture, the screen point it engaged at and the latest, and its travel on screen between them in pixels. */
export interface PanPicture {
	readonly gesture: string;
	readonly from: CapturePoint;
	readonly at: CapturePoint;
	readonly distance: number;
}

/** The view the view's rows would set: its zoom level, the pinch's accumulator in pixels, a live pan or null, and words for what the latest of those rows did, null before any. */
export interface ViewPicture {
	readonly level: number;
	readonly acc: number;
	readonly pan: PanPicture | null;
	readonly words: string | null;
}

/** What the person is shown, as one frozen record. */
export interface Picture {
	readonly heldKeys: readonly HeldKeyPicture[];
	readonly unidentifiedKey: KeyFact<null> | null;
	readonly buttons: number | null;
	readonly wheel: WheelPicture | null;
	readonly gesture: GesturePicture | null;
	readonly press: Press | null;
	readonly pressFrom: CapturePoint | null;
	readonly pointerAt: CapturePoint | null;
	readonly view: ViewPicture;
	readonly log: readonly LogEntry[];
	readonly legend: LegendPicture | null;
	readonly under: ItemUnderPointer;
	readonly latestFact: DeliveredFact | null;
	readonly facts: number;
}

/** The names of the record's entries, which the painter puts again when they change. */
export type PictureEntry = keyof Picture;

/**
 * The mouse facts whose `buttons` the buttons drawn follow, with every wheel fact's: not `over`, `out` and
 * `leave`, which the browser derives from a pointer crossing an element's edge or from a capture changing --
 * events section 2 does not draw again -- and which Chrome was measured to send with `buttons` 1 while only
 * button 1 was held (docs/DECISIONS.md, 0002).
 */
export const BUTTONS_REPORTED_BY: readonly string[] = Object.freeze(["down", "move", "up", "cancel", "context-menu"]);

/** The record before any fact. */
export const EMPTY_PICTURE: Picture = Object.freeze({ heldKeys: Object.freeze([]), unidentifiedKey: null, buttons: null, wheel: null, gesture: null, press: null, pressFrom: null, pointerAt: null, view: Object.freeze({ level: DEFAULT_ZOOM_LEVEL, acc: 0, pan: null, words: null }), log: Object.freeze([]), legend: null, under: null, latestFact: null, facts: 0 });

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

/** A screen point as the page writes it. */
const pointWords = (p: CapturePoint): string => `${p.x}, ${p.y}`;

/** A number of pixels as the page writes it, to a tenth. */
const pixelWords = (n: number): string => String(Math.round(n * 10) / 10);

/** A wheel's view row and its fact: the view after it and the words for what it did. */
function viewAfterWheel(view: ViewPicture, fact: TesterFact, hits: readonly string[], pagePixels: number): ViewPicture {
	if (fact.type !== "wheel") return view;
	if (hits.includes("scroll-pan")) {
		const dx = normalisedDelta(fact.deltaX, fact.deltaMode, pagePixels);
		const dy = normalisedDelta(fact.deltaY, fact.deltaMode, pagePixels);
		const words = dx === null || dy === null ? "scroll pan: its unit, or the page's height, not known, so the view kept" : `scroll pan: the centre moved ${pixelWords(dx)}, ${pixelWords(dy)} screen pixels, the drawing the other way`;
		return Object.freeze({ ...view, words });
	}
	if (!hits.includes("pinch-zoom")) return view;
	const dy = normalisedDelta(fact.deltaY, fact.deltaMode, pagePixels);
	if (dy === null) return Object.freeze({ ...view, words: "pinch zoom: its unit, or the page's height, not known, so the view kept" });
	const step = stepZoom(view.level, view.acc, dy);
	const about = `about screen ${pointWords(fact.screen)}`;
	const words =
		step.steps > 0
			? `pinch zoom: ${levelWords(step.from)} to ${levelWords(step.to)}, ${step.steps} level${step.steps === 1 ? "" : "s"}, the scale times ${Math.round((step.from / step.to) * 1000) / 1000}, ${about}${step.dropped ? ", the rest dropped at the last level" : `, ${pixelWords(step.acc)} pixels held`}`
			: step.dropped
				? `pinch zoom: at ${levelWords(step.to)}, no level lies that way, so dropped`
				: `pinch zoom: at ${levelWords(step.to)}, ${pixelWords(step.acc)} of ${ZOOM_STEP_PIXELS} pixels held toward the next level`;
	return Object.freeze({ ...view, level: step.to, acc: step.acc, words });
}

/** A session step and its fact: the view after it -- a pan engaged, moved, released or cancelled, the accumulator set to 0 by a pan's view and by focus lost. */
function viewAfterStep(view: ViewPicture, step: VerdictStep, fact: DeliveredFact): ViewPicture {
	const screen = "screen" in fact && fact.screen !== null ? fact.screen : null;
	if (step.operation === "becomeGesture" && step.outcome.gesture !== null && PAN_GESTURES.includes(step.outcome.gesture.name) && screen !== null) {
		const gesture = step.outcome.gesture.name;
		return Object.freeze({ ...view, acc: 0, pan: Object.freeze({ gesture, from: screen, at: screen, distance: 0 }), words: `${gesture} engaged at screen ${pointWords(screen)}: the pointer taken` });
	}
	const pan = view.pan;
	if (step.operation === "pointerMove" && pan !== null && !step.outcome.otherPointer && screen !== null && step.outcome.state.gesture?.name === pan.gesture) {
		const distance = screenDistance(screen.x - pan.from.x, screen.y - pan.from.y);
		return Object.freeze({ ...view, acc: 0, pan: Object.freeze({ ...pan, at: screen, distance }), words: `${pan.gesture}: the view follows ${pixelWords(screen.x - pan.from.x)}, ${pixelWords(screen.y - pan.from.y)} screen pixels, ${pixelWords(distance)} in all` });
	}
	if (step.operation === "pointerUp" && pan !== null && !step.outcome.otherPointer && step.outcome.gesture?.name === pan.gesture) {
		return Object.freeze({ ...view, pan: null, words: `${pan.gesture} released after ${pixelWords(pan.distance)} screen pixels: nothing committed, the view left where it is` });
	}
	if (step.operation === "pointerLost" && pan !== null && step.outcome.gesture?.name === pan.gesture) {
		return Object.freeze({ ...view, pan: null, words: `${pan.gesture} cancelled after ${pixelWords(pan.distance)} screen pixels: its release not reported` });
	}
	if (step.operation === "keysLost" && view.acc !== 0) return Object.freeze({ ...view, acc: 0, words: "focus lost: the pinch's held pixels set to 0" });
	return view;
}

/**
 * Applies one verdict to the picture, its steps in order, answering the record it leaves and which entries
 * changed. An entry that did not change keeps its very value. `pagePixels` is the surface's height, a wheel's
 * page in pixels (section 3.6's normalisation); without it a delta in pages moves no view.
 */
export function applyVerdict(picture: Picture, verdict: Verdict, pagePixels = Number.NaN): { picture: Picture; changed: ReadonlySet<PictureEntry> } {
	const fact = verdict.fact;
	const details = new Map(picture.heldKeys.map((k) => [k.code, k]));
	const notes: string[] = [];
	let gesture = picture.gesture;
	let view = picture.view;
	let state: SessionState | null = null;
	let meaning: readonly TraceRecord[] | null = null;
	const derivedLines: LogEntry[] = [];
	for (const step of verdict.steps) {
		applyKeyStep(details, step, fact, notes);
		gestureNotes(step, notes);
		gesture = gestureAfterStep(gesture, step);
		view = viewAfterStep(view, step, fact);
		state = stateAfterStep(step);
		if (step.operation === "pointerUp" && step.derived !== null) {
			meaning = step.derived.trace;
			derivedLines.push(Object.freeze({ fact: step.derived.fact, hits: hitsOf(step.derived.trace), claimed: false, count: 1, notes: Object.freeze([`the meaning of the release: ${step.derived.fact.gesture} committed, a ${step.derived.fact.trigger}`]) }));
		}
	}

	const heldKeys = state === null ? picture.heldKeys : Object.freeze(state.keys.map((code) => details.get(code)).filter((k): k is HeldKeyPicture => k !== undefined));
	const press = state === null ? picture.press : state.press;
	const pressStarted = verdict.steps.some((s) => s.operation === "resolvePress" && !s.outcome.taken);
	const pressFrom = press === null ? null : pressStarted && fact.at !== null ? fact.at : picture.pressFrom;
	if (state !== null && gesture !== null) gesture = sameOrNew(picture.gesture, Object.freeze({ ...gesture, live: state.gesture !== null && state.gesture.name === gesture.name }));

	const isMouse = "pointerType" in fact && fact.pointerType === "mouse";
	const buttons = ((isMouse && BUTTONS_REPORTED_BY.includes(fact.type)) || fact.type === "wheel") && fact.buttons !== null ? fact.buttons : picture.buttons;
	const pointerAt = isMouse ? fact.at : picture.pointerAt;
	const touchOrPen = "pointerType" in fact && (fact.pointerType === "touch" || fact.pointerType === "pen");
	const under = fact.at !== null && !touchOrPen && !sameItem(picture.under, fact.hit) ? fact.hit : picture.under;
	const unidentifiedKey = (fact.type === "key-down" || fact.type === "key-up") && (fact.code === "" || fact.code === null) ? fact : picture.unidentifiedKey;

	let wheel = picture.wheel;
	let log = picture.log;
	const hits = hitsOf(verdict.trace);
	view = viewAfterWheel(view, fact, hits, pagePixels);
	if (view !== picture.view && view.words !== null && view.words !== picture.view.words && (fact.type === "wheel" || verdict.steps.some((s) => s.operation !== "pointerMove"))) notes.push(view.words);
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
		pressFrom,
		pointerAt,
		view,
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

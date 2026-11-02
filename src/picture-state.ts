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
import { PAN_GESTURES, viewKeyVerb } from "./input-bindings.js";
import type { ViewVerb } from "./input-bindings.js";
import type { DeliveredFact, ItemUnderPointer, TesterFact } from "./input-bindings.js";
import type { Verdict, VerdictStep } from "./input-router.js";
import { DEFAULT_ZOOM_LEVEL, PRECISION_LINES, ZOOM_LEVELS, ZOOM_STEP_PIXELS, centreKeeping, levelWords, normalisedDelta, onPane, paneLaidOut, paneScale, screenDistance, stepZoom } from "./view-steps.js";
import type { PaneGeometry } from "./view-steps.js";

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

/** A live pan: its gesture, the screen point it engaged at and the latest, its travel on screen between them in pixels, and the view's centre when it engaged. */
export interface PanPicture {
	readonly gesture: string;
	readonly from: CapturePoint;
	readonly at: CapturePoint;
	readonly distance: number;
	readonly centreFrom: CapturePoint;
}

/**
 * The view the view's rows set, which the view pane shows: its centre, the drawing point at the pane's centre;
 * its zoom level; the pinch's accumulator in pixels; a live pan or null; and words for what the latest of those
 * rows did, null before any.
 */
export interface ViewPicture {
	readonly centre: CapturePoint;
	readonly level: number;
	readonly scale: number | null;
	readonly acc: number;
	readonly pan: PanPicture | null;
	readonly words: string | null;
}

/**
 * What a verdict's view rows need of the page beyond the verdict, read by the composition root at each delivery:
 * the surface's height, a wheel's page in pixels; the view pane's size and place, without which no centre moves;
 * and whether the fact came from the pane's own surface, whose points are the pane's and never the picture's.
 */
export interface ViewSurface {
	readonly pagePixels?: number;
	readonly pane?: PaneGeometry | null;
	readonly fromPane?: boolean;
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
export const EMPTY_PICTURE: Picture = Object.freeze({ heldKeys: Object.freeze([]), unidentifiedKey: null, buttons: null, wheel: null, gesture: null, press: null, pressFrom: null, pointerAt: null, view: Object.freeze({ centre: Object.freeze({ x: 0, y: 0 }), level: DEFAULT_ZOOM_LEVEL, scale: null, acc: 0, pan: null, words: null }), log: Object.freeze([]), legend: null, under: null, latestFact: null, facts: 0 });

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

/** A number of pixels as the page writes it, to a tenth. */
const pixelWords = (n: number): string => String(Math.round(n * 10) / 10);

/** A screen point as the page writes it, each coordinate to a tenth. */
const pointWords = (p: CapturePoint): string => `${pixelWords(p.x)}, ${pixelWords(p.y)}`;

/** A wheel's view row and its fact: the view after it and the words for what it did. */
function viewAfterWheel(view: ViewPicture, fact: TesterFact, hits: readonly string[], pagePixels: number, pane: PaneGeometry | null): ViewPicture {
	if (fact.type !== "wheel") return view;
	if (hits.includes("scroll-pan")) {
		const dx = normalisedDelta(fact.deltaX, fact.deltaMode, pagePixels);
		const dy = normalisedDelta(fact.deltaY, fact.deltaMode, pagePixels);
		if (dx === null || dy === null) return Object.freeze({ ...view, words: "scroll pan: its unit, or the page's height, not known, so the view kept" });
		const words = `scroll pan: the centre moved ${pixelWords(dx)}, ${pixelWords(dy)} screen pixels, the drawing the other way`;
		if (!paneLaidOut(pane)) return Object.freeze({ ...view, words });
		const scale = paneScale(pane, view.level);
		return Object.freeze({ ...view, centre: Object.freeze({ x: view.centre.x + dx / scale, y: view.centre.y + dy / scale }), words });
	}
	if (!hits.includes("pinch-zoom")) return view;
	const dy = normalisedDelta(fact.deltaY, fact.deltaMode, pagePixels);
	if (dy === null) return Object.freeze({ ...view, words: "pinch zoom: its unit, or the page's height, not known, so the view kept" });
	const step = stepZoom(view.level, view.acc, dy);
	const keepsPointer = !paneLaidOut(pane) || onPane(pane, fact.screen);
	const about = keepsPointer ? `about screen ${pointWords(fact.screen)}` : `about the pane's centre, the pointer off the pane at screen ${pointWords(fact.screen)}`;
	const centre = step.steps > 0 && paneLaidOut(pane) ? Object.freeze(centreKeeping(view.centre, pane, keepsPointer ? fact.screen : { x: pane.left + pane.width / 2, y: pane.top + pane.height / 2 }, paneScale(pane, step.from), paneScale(pane, step.to))) : view.centre;
	const words =
		step.steps > 0
			? `pinch zoom: ${levelWords(step.from)} to ${levelWords(step.to)}, ${step.steps} level${step.steps === 1 ? "" : "s"}, the scale times ${Math.round((step.from / step.to) * 1000) / 1000}, ${about}${step.dropped ? ", the rest dropped at the last level" : `, ${pixelWords(step.acc)} pixels held`}`
			: step.dropped
				? `pinch zoom: at ${levelWords(step.to)}, no level lies that way, so dropped`
				: `pinch zoom: at ${levelWords(step.to)}, ${pixelWords(step.acc)} of ${ZOOM_STEP_PIXELS} pixels held toward the next level`;
	return Object.freeze({ ...view, centre, level: step.to, acc: step.acc, words });
}

/**
 * A view verb, from a view key or the reticle (draw's PAN-ZOOM.md 3.7, PZ6, PZ28): a level nearer or farther, or
 * the default, about the pane's centre, so the centre holds; fit, which with nothing drawn here to fit is the first opening,
 * 0, 0 at the default level (PZ7); home, the centre to 0, 0, the level kept. A verb that changes nothing does
 * nothing; one that sets a view sets the pinch's held pixels to 0, the view not the wheel's.
 */
export function viewAfterVerb(view: ViewPicture, verb: ViewVerb, by: string): ViewPicture {
	const index = ZOOM_LEVELS.indexOf(view.level);
	const origin = view.centre.x === 0 && view.centre.y === 0;
	const set = (centre: CapturePoint, level: number, words: string): ViewPicture => Object.freeze({ ...view, centre: Object.freeze({ x: centre.x, y: centre.y }), level, acc: 0, words });
	const none = (words: string): ViewPicture => Object.freeze({ ...view, words });
	switch (verb) {
		case "zoom-in": {
			const to = ZOOM_LEVELS[index - 1];
			return to === undefined ? none(`${by}, zoom in: at ${levelWords(view.level)}, the nearest level, so nothing`) : set(view.centre, to, `${by}, zoom in: ${levelWords(view.level)} to ${levelWords(to)} about the pane's centre`);
		}
		case "zoom-out": {
			const to = ZOOM_LEVELS[index + 1];
			return to === undefined ? none(`${by}, zoom out: at ${levelWords(view.level)}, the farthest level, so nothing`) : set(view.centre, to, `${by}, zoom out: ${levelWords(view.level)} to ${levelWords(to)} about the pane's centre`);
		}
		case "default-level":
			return view.level === DEFAULT_ZOOM_LEVEL ? none(`${by}, the default level: at ${levelWords(view.level)} already, so nothing`) : set(view.centre, DEFAULT_ZOOM_LEVEL, `${by}, the default level: ${levelWords(view.level)} to ${levelWords(DEFAULT_ZOOM_LEVEL)} about the pane's centre`);
		case "fit":
			return origin && view.level === DEFAULT_ZOOM_LEVEL ? none(`${by}, fit: nothing drawn here to fit, and the first opening already shown, so nothing`) : set({ x: 0, y: 0 }, DEFAULT_ZOOM_LEVEL, `${by}, fit: nothing drawn here to fit, so the first opening, the centre 0, 0 at ${levelWords(DEFAULT_ZOOM_LEVEL)}`);
		case "home":
			return origin ? none(`${by}, home: the centre at 0, 0 already, so nothing`) : set({ x: 0, y: 0 }, view.level, `${by}, home: the centre to 0, 0, the level kept at ${levelWords(view.level)}`);
		case "go-million":
		case "go-two-to-21": {
			const distance = PRECISION_LINES[verb === "go-million" ? 0 : 1] as number;
			const nearest = ZOOM_LEVELS[0] as number;
			const name = verb === "go-million" ? "1,000,000" : "2^21";
			return view.centre.x === distance && view.centre.y === 0 && view.level === nearest ? none(`${by}, to the line at ${name}: there already, so nothing`) : set({ x: distance, y: 0 }, nearest, `${by}, to the line at ${name}: the centre to ${distance}, 0 at the nearest level, ${levelWords(nearest)}`);
		}
	}
}

/** A session step and its fact: the view after it -- a pan engaged, moved, released or cancelled, the accumulator set to 0 by a pan's view and by focus lost. */
function viewAfterStep(view: ViewPicture, step: VerdictStep, fact: DeliveredFact, pane: PaneGeometry | null): ViewPicture {
	const screen = "screen" in fact && fact.screen !== null ? fact.screen : null;
	if (step.operation === "becomeGesture" && step.outcome.gesture !== null && PAN_GESTURES.includes(step.outcome.gesture.name) && screen !== null) {
		const gesture = step.outcome.gesture.name;
		return Object.freeze({ ...view, acc: 0, pan: Object.freeze({ gesture, from: screen, at: screen, distance: 0, centreFrom: view.centre }), words: `${gesture} engaged at screen ${pointWords(screen)}: the pointer taken` });
	}
	const pan = view.pan;
	if (step.operation === "pointerMove" && pan !== null && !step.outcome.otherPointer && screen !== null && step.outcome.state.gesture?.name === pan.gesture) {
		const distance = screenDistance(screen.x - pan.from.x, screen.y - pan.from.y);
		const scale = paneLaidOut(pane) ? paneScale(pane, view.level) : null;
		const centre = scale === null ? view.centre : Object.freeze({ x: pan.centreFrom.x - (screen.x - pan.from.x) / scale, y: pan.centreFrom.y - (screen.y - pan.from.y) / scale });
		return Object.freeze({ ...view, centre, acc: 0, pan: Object.freeze({ ...pan, at: screen, distance }), words: `${pan.gesture}: the view follows ${pixelWords(screen.x - pan.from.x)}, ${pixelWords(screen.y - pan.from.y)} screen pixels, ${pixelWords(distance)} in all` });
	}
	if (step.operation === "pointerUp" && pan !== null && !step.outcome.otherPointer && step.outcome.gesture?.name === pan.gesture) {
		return Object.freeze({ ...view, pan: null, words: `${pan.gesture} released after ${pixelWords(pan.distance)} screen pixels: no edit, the view left where it is` });
	}
	if (step.operation === "pointerLost" && pan !== null && step.outcome.gesture?.name === pan.gesture) {
		return Object.freeze({ ...view, pan: null, words: `${pan.gesture} cancelled after ${pixelWords(pan.distance)} screen pixels: its release not reported` });
	}
	if (step.operation === "keysLost" && view.acc !== 0) return Object.freeze({ ...view, acc: 0, words: "focus lost: the pinch's held pixels set to 0" });
	return view;
}

/**
 * Applies one verdict to the picture, its steps in order, answering the record it leaves and which entries
 * changed. An entry that did not change keeps its very value. `surface` holds what the view's rows need of the page
 * (`ViewSurface`): without a page's height a delta in pages moves no view, and without a pane laid out no centre moves.
 */
export function applyVerdict(picture: Picture, verdict: Verdict, surface: ViewSurface = {}): { picture: Picture; changed: ReadonlySet<PictureEntry> } {
	const pagePixels = surface.pagePixels ?? Number.NaN;
	const pane = surface.pane ?? null;
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
		view = viewAfterStep(view, step, fact, pane);
		state = stateAfterStep(step);
		if (step.operation === "pointerUp" && step.derived !== null) {
			meaning = step.derived.trace;
			derivedLines.push(Object.freeze({ fact: step.derived.fact, hits: hitsOf(step.derived.trace), claimed: false, count: 1, notes: Object.freeze([`the meaning of the release: ${step.derived.fact.gesture} committed, a ${step.derived.fact.trigger}`]) }));
		}
	}

	const heldKeys = state === null ? picture.heldKeys : Object.freeze(state.keys.map((code) => details.get(code)).filter((k): k is HeldKeyPicture => k !== undefined));
	const press = state === null ? picture.press : state.press;
	const pressStarted = verdict.steps.some((s) => s.operation === "resolvePress" && !s.outcome.taken);
	const pressFrom = press === null ? null : pressStarted && fact.at !== null && surface.fromPane !== true ? fact.at : surface.fromPane === true && pressStarted ? null : picture.pressFrom;
	if (state !== null && gesture !== null) gesture = sameOrNew(picture.gesture, Object.freeze({ ...gesture, live: state.gesture !== null && state.gesture.name === gesture.name }));

	const isMouse = "pointerType" in fact && fact.pointerType === "mouse";
	const buttons = ((isMouse && BUTTONS_REPORTED_BY.includes(fact.type)) || fact.type === "wheel") && fact.buttons !== null ? fact.buttons : picture.buttons;
	const pointerAt = isMouse && surface.fromPane !== true ? fact.at : picture.pointerAt;
	const touchOrPen = "pointerType" in fact && (fact.pointerType === "touch" || fact.pointerType === "pen");
	const under = fact.at !== null && !touchOrPen && surface.fromPane !== true && !sameItem(picture.under, fact.hit) ? fact.hit : picture.under;
	const unidentifiedKey = (fact.type === "key-down" || fact.type === "key-up") && (fact.code === "" || fact.code === null) ? fact : picture.unidentifiedKey;

	let wheel = picture.wheel;
	let log = picture.log;
	const hits = hitsOf(verdict.trace);
	view = viewAfterWheel(view, fact, hits, pagePixels, pane);
	const verb = hits.includes("view-key") ? viewKeyVerb(fact) : null;
	if (verb !== null) view = viewAfterVerb(view, verb, "a view key");
	view = withScale(view, pane);
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

/**
 * Applies a press of one of the pane's buttons, outside any verdict -- the reticle, home (PZ6), or the way to a
 * precision line (PZ31) -- answering the record and which entries changed; the pane's geometry, when it is laid
 * out, gives the view's scale.
 */
export function applyPaneButton(picture: Picture, verb: "home" | "go-million" | "go-two-to-21", pane: PaneGeometry | null = null): { picture: Picture; changed: ReadonlySet<PictureEntry> } {
	const moved = viewAfterVerb(picture.view, verb, verb === "home" ? "the reticle" : "a precision button");
	const view = withScale(moved, pane);
	const next: Picture = Object.freeze({ ...picture, view });
	return { picture: next, changed: new Set<PictureEntry>(view === picture.view ? [] : ["view"]) };
}

/** Applies the pane's size, outside any verdict -- at the first paint, and when the header's buttons change its size -- answering the record, its view's scale the pane's at that size, and which entries changed. */
export function applyPaneGeometry(picture: Picture, pane: PaneGeometry | null): { picture: Picture; changed: ReadonlySet<PictureEntry> } {
	const view = withScale(picture.view, pane);
	return { picture: view === picture.view ? picture : Object.freeze({ ...picture, view }), changed: new Set<PictureEntry>(view === picture.view ? [] : ["view"]) };
}

/** The view with its scale for the pane's geometry, the very view when the scale is the same, or when no pane is laid out. */
function withScale(view: ViewPicture, pane: PaneGeometry | null): ViewPicture {
	const scale = paneLaidOut(pane) ? paneScale(pane, view.level) : view.scale;
	return scale === view.scale ? view : Object.freeze({ ...view, scale });
}


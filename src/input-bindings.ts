/**
 * Bindings: declares what every input is taken to mean, and the session's gestures
 * (docs/ARCHITECTURE-TARGET.md sections 5 and 6, P5).
 *
 * Every input and gesture the tester names is a row of one `input-binding` table: traced for the legend
 * (IB6), matched for the meaning (IB7) and proved free of overlaps (IB8). The rows are exclusive by
 * construction -- each fact and context hits at most one -- so no row wins by its place. A row claims an input
 * when its `claims` flag is true, and a press row names the gesture it opens in its `gesture` field.
 */
import type { BlurFact, ContextMenuFact, KeyFact, PointerFact, WheelFact } from "../vendor/input-capture/index.js";
import type { BindingRow, BindingTableDeclaration, GestureSessionDeclaration, Trigger } from "../vendor/input-binding/index.js";
import type { ShapeAtElement } from "../vendor/vector-scene/index.js";
import { bitOfButton } from "./keyboard-plans.js";

/** What lies under a pointer, as the tester's `hit` answers it: the scene's item and path, or nothing. */
export type ItemUnderPointer = ShapeAtElement | null;

/** A fact as `input-capture` delivers it to the tester, which listens for the wheel, the context menu and focus loss. */
export type DeliveredFact = PointerFact<ItemUnderPointer> | WheelFact<ItemUnderPointer> | ContextMenuFact<ItemUnderPointer> | KeyFact<null> | BlurFact;

/** The fact the router derives from a commit outcome: the gesture's name and the outcome's trigger (section 6, Fact). */
export interface CommitFact {
	readonly type: "commit";
	readonly gesture: string;
	readonly trigger: Trigger;
}

/** Every fact the table is asked about: a delivered fact, or a commit's derived fact. */
export type TesterFact = DeliveredFact | CommitFact;

/**
 * The context of a fact, from the session's state before it (section 6, Context): of a key fact, whether the keys
 * held hold its code, and a non-modifier code other than it; of a pointer fact, whether a gesture is live, whether
 * Space is held, and whether it lies on open ground -- its `hit` null, nothing of the picture under it, neither a
 * key nor the mouse's buttons, body or wheel; the panel's text, which the platform looks through, is open ground.
 * Each flag false for a fact of the other family.
 */
export interface TesterContext {
	readonly wasHeld: boolean;
	readonly otherHeld: boolean;
	readonly gestureLive: boolean;
	readonly spaceHeld: boolean;
	readonly openGround: boolean;
}

/** How the gate proves a row: by trusted input in headless Chrome, by a fixture handed to a capture over fakes, or both. */
export type RowProof = "trusted" | "fixture";

/** One of the tester's rows: the table's fields, its words for the legend, its claim flag, the gesture it opens if any, and how the gate proves it. */
export interface TesterRow extends BindingRow<TesterFact, TesterContext> {
	readonly id: string;
	readonly words: string;
	readonly on: (fact: TesterFact) => boolean;
	readonly when?: (context: TesterContext) => boolean;
	readonly claims: boolean;
	readonly gesture?: string;
	readonly pans?: string;
	readonly proof: readonly RowProof[];
}

/** The context of a fact of neither family -- a commit's derived fact, focus lost -- every flag false. */
export const NO_KEY_CONTEXT: TesterContext = Object.freeze({ wasHeld: false, otherHeld: false, gestureLive: false, spaceHeld: false, openGround: false });

/** The modifier codes: a modifier key's own press is a modifier press, and none of them makes another key's press a roll-over. */
export const MODIFIER_CODES: readonly string[] = Object.freeze(["ShiftLeft", "ShiftRight", "ControlLeft", "ControlRight", "AltLeft", "AltRight", "MetaLeft", "MetaRight"]);

/**
 * One of the browser's own keys that reaches a page (section 6): a code, and each modifier as it must be held --
 * `true` held, `false` not held, `null` either -- with the platform whose browser keeps it and what it does.
 * A key whose code is a letter's, `KeyR`, is the browser's whatever letters the keyboard prints, since Chrome matches
 * its shortcuts by the letter the key prints (docs/DECISIONS.md 0002): Dvorak's Ctrl+R is `code` KeyO, `key` "r".
 */
export interface BrowsersOwnKey {
	readonly code: string;
	readonly shift: boolean | null;
	readonly ctrl: boolean | null;
	readonly alt: boolean | null;
	readonly meta: boolean | null;
	readonly platform: string;
	readonly does: string;
}

/**
 * The browser's own keys -- reload, fullscreen, developer tools, view source among them -- on every platform at
 * once, so no platform is detected and a combination that is the browser's on one platform is left unclaimed on
 * all (section 6; view source by the recorder's ruling, docs/DECISIONS.md 0002).
 */
export const BROWSERS_OWN_KEYS: readonly BrowsersOwnKey[] = Object.freeze(
	[
		{ code: "F5", shift: null, ctrl: null, alt: false, meta: false, platform: "Windows, Linux, ChromeOS", does: "reload" },
		{ code: "KeyR", shift: null, ctrl: true, alt: false, meta: false, platform: "Windows, Linux, ChromeOS", does: "reload" },
		{ code: "F11", shift: false, ctrl: false, alt: false, meta: false, platform: "Windows, Linux, ChromeOS", does: "fullscreen" },
		{ code: "F12", shift: false, ctrl: false, alt: false, meta: false, platform: "Windows, Linux, ChromeOS", does: "developer tools" },
		{ code: "KeyI", shift: true, ctrl: true, alt: false, meta: false, platform: "Windows, Linux, ChromeOS", does: "developer tools" },
		{ code: "KeyJ", shift: true, ctrl: true, alt: false, meta: false, platform: "Windows, Linux, ChromeOS", does: "developer tools" },
		{ code: "KeyC", shift: true, ctrl: true, alt: false, meta: false, platform: "Windows, Linux, ChromeOS", does: "developer tools" },
		{ code: "KeyU", shift: false, ctrl: true, alt: false, meta: false, platform: "Windows, Linux, ChromeOS", does: "view source" },
		{ code: "BrowserRefresh", shift: null, ctrl: null, alt: null, meta: null, platform: "Linux, ChromeOS", does: "reload" },
		{ code: "ZoomToggle", shift: null, ctrl: null, alt: null, meta: null, platform: "ChromeOS", does: "fullscreen" },
		{ code: "KeyR", shift: null, ctrl: false, alt: false, meta: true, platform: "macOS", does: "reload" },
		{ code: "KeyF", shift: false, ctrl: true, alt: false, meta: true, platform: "macOS", does: "fullscreen" },
		{ code: "KeyI", shift: false, ctrl: false, alt: true, meta: true, platform: "macOS", does: "developer tools" },
		{ code: "KeyJ", shift: false, ctrl: false, alt: true, meta: true, platform: "macOS", does: "developer tools" },
		{ code: "KeyC", shift: false, ctrl: false, alt: true, meta: true, platform: "macOS", does: "developer tools" },
		{ code: "KeyC", shift: true, ctrl: false, alt: false, meta: true, platform: "macOS", does: "developer tools" },
		{ code: "KeyU", shift: false, ctrl: false, alt: true, meta: true, platform: "macOS", does: "view source" },
	].map((k) => Object.freeze(k)),
);

/** Whether a modifier is held as an entry asks: `null` asks nothing. */
const heldAsAsked = (asked: boolean | null, held: boolean): boolean => asked === null || asked === held;

/** Whether a fact is a key fact. */
export function isKeyFact(fact: TesterFact): fact is KeyFact<null> {
	return fact.type === "key-down" || fact.type === "key-up";
}

/** The letter a letter key's code names, lower-cased -- "r" for `KeyR` -- or null for any other code. */
export function letterOfCode(code: string): string | null {
	return /^Key[A-Z]$/.test(code) ? code.slice(3).toLowerCase() : null;
}

/** Whether a key fact is an entry's key: its `code` is the entry's, or the entry is a letter's and the fact's `key`, case-folded, is that letter. */
function isEntrysKey(entry: BrowsersOwnKey, fact: KeyFact<null>): boolean {
	if (fact.code === entry.code) return true;
	const letter = letterOfCode(entry.code);
	return letter !== null && typeof fact.key === "string" && fact.key.toLowerCase() === letter;
}

/**
 * Whether a fact is a key fact of one of the browser's own keys, on any platform and whatever letters the keyboard prints: a key whose
 * physical identity is reported -- a non-empty `code` -- matched by its code or by the letter it prints, with each
 * modifier held as the entry asks.
 */
export function isBrowsersOwnKey(fact: TesterFact): boolean {
	if (!isKeyFact(fact) || typeof fact.code !== "string" || fact.code === "") return false;
	return BROWSERS_OWN_KEYS.some((k) => isEntrysKey(k, fact) && heldAsAsked(k.shift, fact.shiftKey) && heldAsAsked(k.ctrl, fact.ctrlKey) && heldAsAsked(k.alt, fact.altKey) && heldAsAsked(k.meta, fact.metaKey));
}

/** A keyed fact: a key fact whose `code` is a non-empty string that is not one of the browser's own keys. */
export function isKeyedFact(fact: TesterFact): fact is KeyFact<null> {
	return isKeyFact(fact) && typeof fact.code === "string" && fact.code !== "" && !isBrowsersOwnKey(fact);
}

/** A fresh press: a keyed `key-down` whose `repeat` is false. */
function isFreshPress(fact: TesterFact): fact is KeyFact<null> {
	return isKeyedFact(fact) && fact.type === "key-down" && fact.repeat === false;
}

/** Whether a code is one of the modifier codes. */
export function isModifierCode(code: string | null): boolean {
	return code !== null && MODIFIER_CODES.includes(code);
}

/** Whether a chord modifier -- Ctrl, Alt or Meta -- is held; Shift makes no chord. */
const chordModifierHeld = (fact: KeyFact<null>): boolean => fact.ctrlKey || fact.altKey || fact.metaKey;

/** The view's keys (draw's PAN-ZOOM.md 3.6 and 3.7, PZ28), each a verb of the view: a level nearer, a level farther, the default level, fit, home. */
export type ViewKeyVerb = "zoom-in" | "zoom-out" | "default-level" | "fit" | "home";

/** The view's verbs: a view key's, and the pane's buttons' -- home, and the way to each precision line (PZ31). */
export type ViewVerb = ViewKeyVerb | "go-million" | "go-two-to-21";

/**
 * The view verb a key fact names, or null: a fresh press, no chord modifier held, of `=` or `+` (a level in), `-`
 * (a level out), `h` (home), each by the character it prints, or of the physical 0 or 1 with Shift held (the
 * default level, fit), by its code, since the character Shift gives them depends on the keyboard map.
 */
export function viewKeyVerb(fact: TesterFact): ViewKeyVerb | null {
	if (!isFreshPress(fact) || chordModifierHeld(fact) || isModifierCode(fact.code)) return null;
	if (fact.key === "=" || fact.key === "+") return "zoom-in";
	if (fact.key === "-") return "zoom-out";
	if (fact.key === "h") return "home";
	if (fact.shiftKey && fact.code === "Digit0") return "default-level";
	if (fact.shiftKey && fact.code === "Digit1") return "fit";
	return null;
}

/** Whether a fact is a mouse pointer fact of one of the types given. */
function isMouseFact(fact: TesterFact, ...types: string[]): fact is PointerFact<ItemUnderPointer> {
	return types.includes(fact.type) && "pointerType" in fact && fact.pointerType === "mouse";
}

/** A move of a mouse naming one of the five buttons: a chord's press or release, as the platform delivers it. */
function isChordMove(fact: TesterFact): fact is PointerFact<ItemUnderPointer> {
	return isMouseFact(fact, "move") && fact.button >= 0 && fact.button <= 4;
}

/** A wheel fact, with Ctrl held or not. */
function isWheel(fact: TesterFact, ctrl: boolean): fact is WheelFact<ItemUnderPointer> {
	return fact.type === "wheel" && fact.ctrlKey === ctrl;
}

/** A row pressing button `button` with the mouse, opening the press gesture `gesture`, where `when` holds: where no pan row of that button does. */
function pressRow(id: string, button: number, gesture: string, when?: (context: TesterContext) => boolean): TesterRow {
	const row: TesterRow = { id, words: `a press of button ${button}`, on: (f) => isMouseFact(f, "down") && f.button === button, claims: true, gesture, proof: ["trusted"] };
	return when === undefined ? row : { ...row, when };
}

/**
 * A pan row (section 3.6): a mouse's press of `button`, where `when` holds, opening that button's press gesture as a
 * press row does -- so a press that never travels the threshold is a click as today -- and becoming the pan gesture
 * `pans` once it travels the threshold, the pointer taken then.
 */
function panRow(id: string, words: string, button: number, when: (context: TesterContext) => boolean): TesterRow {
	return { id, words, on: (f) => isMouseFact(f, "down") && f.button === button, when, claims: true, gesture: `press-${button}`, pans: id, proof: ["trusted"] };
}

/** Where `pan-middle` takes a middle press: anywhere, no gesture live. */
const panMiddleWhen = (c: TesterContext): boolean => !c.gestureLive;
/** Where `pan-right` takes a right press: on open ground, no gesture live. */
const panRightWhen = (c: TesterContext): boolean => !c.gestureLive && c.openGround;
/** Where `pan-space` takes a left press: Space held, no gesture live. */
const panSpaceWhen = (c: TesterContext): boolean => !c.gestureLive && c.spaceHeld;

/** A row releasing button `button` of the mouse; claimed, so the back and forward buttons navigate nowhere. */
function releaseRow(id: string, button: number): TesterRow {
	return { id, words: `a release of button ${button}`, on: (f) => isMouseFact(f, "up") && f.button === button, claims: true, proof: ["trusted"] };
}

/** A row meaning the commit of gesture `gesture`: a click, or a drag, of that gesture's button. */
function commitRow(id: string, words: string, gesture: string): TesterRow {
	return { id, words, on: (f) => f.type === "commit" && f.gesture === gesture, claims: false, proof: ["trusted"] };
}

/** The tester's rows, in the legend's order: 43 rows, the view's six among them, exclusive over every fact and context (section 6). */
export const TESTER_ROWS: readonly TesterRow[] = Object.freeze([
	{ id: "key-modifier-press", words: "a modifier press", on: (f) => isFreshPress(f) && isModifierCode(f.code), claims: true, proof: ["trusted"] },
	{ id: "key-modifier-chord", words: "a modifier chord", on: (f) => isFreshPress(f) && !isModifierCode(f.code) && chordModifierHeld(f), claims: true, proof: ["trusted"] },
	{ id: "key-first-press", words: "a first press", on: (f) => isFreshPress(f) && !isModifierCode(f.code) && !chordModifierHeld(f) && viewKeyVerb(f) === null, when: (c) => !c.otherHeld, claims: true, proof: ["trusted"] },
	{ id: "key-roll-over-press", words: "a roll-over press", on: (f) => isFreshPress(f) && !isModifierCode(f.code) && !chordModifierHeld(f) && viewKeyVerb(f) === null, when: (c) => c.otherHeld, claims: true, proof: ["trusted"] },
	{ id: "view-key", words: "a view key: = or + in, - out, Shift+0 default, Shift+1 fit, h home", on: (f) => viewKeyVerb(f) !== null, claims: true, proof: ["trusted"] },
	{ id: "key-repeat", words: "a repeat", on: (f) => isKeyedFact(f) && f.type === "key-down" && f.repeat === true, claims: true, proof: ["trusted"] },
	{ id: "key-release", words: "a release", on: (f) => isKeyedFact(f) && f.type === "key-up", when: (c) => c.wasHeld, claims: true, proof: ["trusted"] },
	{ id: "key-release-press-unseen", words: "a release whose press was not seen", on: (f) => isKeyedFact(f) && f.type === "key-up", when: (c) => !c.wasHeld, claims: true, proof: ["trusted"] },
	{ id: "key-no-identity", words: "a key with no identity", on: (f) => isKeyFact(f) && (f.code === "" || f.code === null), claims: true, proof: ["trusted", "fixture"] },
	{ id: "key-left-to-browser", words: "left to the browser", on: (f) => isBrowsersOwnKey(f), claims: false, proof: ["trusted"] },
	pressRow("button-0-press", 0, "press-0", (c) => !panSpaceWhen(c)),
	pressRow("button-1-press", 1, "press-1", (c) => !panMiddleWhen(c)),
	pressRow("button-2-press", 2, "press-2", (c) => !panRightWhen(c)),
	pressRow("button-3-press", 3, "press-3"),
	pressRow("button-4-press", 4, "press-4"),
	releaseRow("button-0-release", 0),
	releaseRow("button-1-release", 1),
	releaseRow("button-2-release", 2),
	releaseRow("button-3-release", 3),
	releaseRow("button-4-release", 4),
	{ id: "chorded-press", words: "a chorded press", on: (f) => isChordMove(f) && Number.isSafeInteger(f.buttons) && ((f.buttons as number) & bitOfButton(f.button)) !== 0, claims: true, proof: ["trusted"] },
	{ id: "chorded-release", words: "a chorded release", on: (f) => isChordMove(f) && Number.isSafeInteger(f.buttons) && ((f.buttons as number) & bitOfButton(f.button)) === 0, claims: true, proof: ["trusted"] },
	{ id: "chorded-change-buttons-unreported", words: "a chorded change, buttons not reported", on: (f) => isChordMove(f) && f.buttons === null, claims: false, proof: ["fixture"] },
	{ id: "button-beyond-five", words: "a button beyond the five", on: (f) => isMouseFact(f, "down", "up", "move") && f.button > 4, claims: false, proof: ["fixture"] },
	{ id: "double-click", words: "a double click", on: (f) => f.type === "double", claims: true, proof: ["trusted"] },
	commitRow("button-0-click", "a click of button 0", "press-0"),
	commitRow("button-1-click", "a click of button 1", "press-1"),
	commitRow("button-2-click", "a click of button 2", "press-2"),
	commitRow("button-3-click", "a click of button 3", "press-3"),
	commitRow("button-4-click", "a click of button 4", "press-4"),
	commitRow("button-0-drag", "a drag of button 0", "drag-0"),
	commitRow("button-1-drag", "a drag of button 1", "drag-1"),
	commitRow("button-2-drag", "a drag of button 2", "drag-2"),
	commitRow("button-3-drag", "a drag of button 3", "drag-3"),
	commitRow("button-4-drag", "a drag of button 4", "drag-4"),
	{ id: "scroll-pan", words: "a scroll pan: the wheel or a two-finger scroll, without Ctrl", on: (f) => isWheel(f, false), claims: true, proof: ["trusted"] },
	{ id: "pinch-zoom", words: "a pinch zoom: Ctrl and wheel, or a touchpad pinch: the browser does not tell them apart", on: (f) => isWheel(f, true), claims: true, proof: ["trusted"] },
	panRow("pan-middle", "a pan with the middle button, no gesture live", 1, panMiddleWhen),
	panRow("pan-right", "a pan with the right button on open ground, no gesture live", 2, panRightWhen),
	panRow("pan-space", "a pan with Space held and the left button, no gesture live", 0, panSpaceWhen),
	{ id: "context-menu", words: "the context menu", on: (f) => f.type === "context-menu", claims: true, proof: ["trusted"] },
	{ id: "touch-or-pen-pointer", words: "a touch or a pen pointer", on: (f) => ["down", "up", "move", "over", "out", "leave", "cancel"].includes(f.type) && "pointerType" in f && (f.pointerType === "touch" || f.pointerType === "pen"), claims: false, proof: ["trusted"] },
	{ id: "focus-lost", words: "focus lost", on: (f) => f.type === "blur", claims: true, proof: ["trusted"] },
] satisfies TesterRow[]);

/** The table's declaration: one tenant, the claim flag `claims`, defaulting to false, and the `gesture` field naming what a press opens (IB3). */
export const TESTER_TABLE_DECLARATION: BindingTableDeclaration<TesterFact, TesterContext, TesterRow> = Object.freeze({
	claim: Object.freeze({ flag: "claims", default: false }),
	opens: Object.freeze({ field: "gesture" }),
	tenants: Object.freeze([Object.freeze({ owner: "input-tester", rows: TESTER_ROWS })]),
});

/**
 * The session's declaration (section 6): a threshold of 4 screen pixels, measured on each fact's `screen` point
 * (`measure: 'screen'`, `input-binding` 0.3.0's IB16), so a press is a drag once it travels more than 4 pixels on
 * screen at any scale; a press and a drag gesture for each button; and the view's three pan gestures, each under its
 * own name with its one button, engaged as a drag is (section 3.6).
 */
export const TESTER_SESSION_DECLARATION: GestureSessionDeclaration = Object.freeze({
	threshold: 4,
	measure: "screen",
	gestures: Object.freeze(
		[
			{ name: "press-0", engaged: false, button: 0 },
			{ name: "press-1", engaged: false, button: 1 },
			{ name: "press-2", engaged: false, button: 2 },
			{ name: "press-3", engaged: false, button: 3 },
			{ name: "press-4", engaged: false, button: 4 },
			{ name: "drag-0", engaged: true, button: 0 },
			{ name: "drag-1", engaged: true, button: 1 },
			{ name: "drag-2", engaged: true, button: 2 },
			{ name: "drag-3", engaged: true, button: 3 },
			{ name: "drag-4", engaged: true, button: 4 },
			{ name: "pan-middle", engaged: true, button: 1 },
			{ name: "pan-right", engaged: true, button: 2 },
			{ name: "pan-space", engaged: true, button: 0 },
		].map((g) => Object.freeze(g)),
	),
});

/** The drag gesture a press gesture becomes once its press travels beyond the threshold, where no pan row opened it. */
export const DRAG_OF_PRESS: Readonly<Record<string, string>> = Object.freeze({ "press-0": "drag-0", "press-1": "drag-1", "press-2": "drag-2", "press-3": "drag-3", "press-4": "drag-4" });

/** The pan gestures, by name: what a press a pan row opened becomes once it travels the threshold. */
export const PAN_GESTURES: readonly string[] = Object.freeze(["pan-middle", "pan-right", "pan-space"]);

/** Every context of the given flags' every combination, the rest false. */
function contextsOver(flags: readonly (keyof TesterContext)[]): TesterContext[] {
	return Array.from({ length: 2 ** flags.length }, (_, m) => Object.freeze({ ...NO_KEY_CONTEXT, ...Object.fromEntries(flags.map((f, i) => [f, (m & (1 << i)) !== 0])) }));
}

/**
 * The contexts the overlap proof runs each fact against, every one the router can make for it: a key fact's four,
 * its two held flags in each combination; every other fact's eight, its three pointer flags in each combination.
 */
export const OVERLAP_PROOF_CONTEXTS = Object.freeze({ key: Object.freeze(contextsOver(["wasHeld", "otherHeld"])), pointer: Object.freeze(contextsOver(["gestureLive", "spaceHeld", "openGround"])) });

/** The contexts the overlap proof runs a fact against: a key fact's, or every other fact's. */
export const overlapProofContextsOf = (fact: TesterFact): readonly TesterContext[] => (isKeyFact(fact) ? OVERLAP_PROOF_CONTEXTS.key : OVERLAP_PROOF_CONTEXTS.pointer);

/** A fact of capture's form (IC5): every one of its twenty-one properties, `null` where the family carries none. */
function factOfCaptureForm(fields: Record<string, unknown>): DeliveredFact {
	const base = { type: null, at: null, screen: null, hit: null, focus: null, button: null, buttons: null, pointerId: null, pointerType: null, key: null, code: null, repeat: null, shiftKey: false, ctrlKey: false, altKey: false, metaKey: false, deltaX: null, deltaY: null, deltaZ: null, deltaMode: null, time: null };
	return Object.freeze({ ...base, ...fields }) as unknown as DeliveredFact;
}

/**
 * The keys the overlap proof gives each code: a letter no entry names; every letter of the browser's own letter keys
 * -- r, i, j, c, f and u -- in lower or upper case by turns, so a key matched by the letter it prints, on any code and
 * case-folded, meets every row; the characters of the view's keys, `=`, `+`, `-` and `h`; and none. The test holds
 * this list to the specification's letters, so it cannot shrink unseen.
 */
export const OVERLAP_PROOF_KEYS: readonly (string | null)[] = Object.freeze(["x", "r", "I", "j", "C", "f", "U", "=", "+", "-", "h", null]);

/**
 * The overlap proof's facts (IB8, GT5): every key fact's type, repeat flag, `key` and sixteen modifier states over
 * the codes given -- every drawn code, the browser's own keys' codes, `''` and `null` among them -- and every
 * pointer, wheel, context-menu, `blur` and derived commit fact, the browser's and the fixtures' alike.
 */
export function overlapProofFacts(codes: readonly (string | null)[]): TesterFact[] {
	const facts: TesterFact[] = [];
	const at = Object.freeze({ x: 0, y: 0 });
	for (const type of ["key-down", "key-up"])
		for (const repeat of [false, true])
			for (const code of codes)
				for (const key of OVERLAP_PROOF_KEYS)
					for (let m = 0; m < 16; m++) facts.push(factOfCaptureForm({ type, key, code, repeat, shiftKey: (m & 1) !== 0, ctrlKey: (m & 2) !== 0, altKey: (m & 4) !== 0, metaKey: (m & 8) !== 0 }));
	for (const type of ["leave", "down", "move", "up", "cancel", "over", "out", "double", "context-menu"])
		for (const pointerType of ["mouse", "pen", "touch", null])
			for (const button of [-1, 0, 1, 2, 3, 4, 5, 6])
				for (const buttons of [null, ...Array.from({ length: 32 }, (_, i) => i)]) facts.push(factOfCaptureForm({ type, at, screen: at, button, buttons, pointerId: pointerType === null ? null : 1, pointerType }));
	const deltas = [-1, -0, 0, 0.5, 3];
	for (const ctrlKey of [false, true])
		for (const deltaX of deltas)
			for (const deltaY of deltas)
				for (const deltaMode of [0, 1, 2]) facts.push(factOfCaptureForm({ type: "wheel", at, screen: at, button: 0, buttons: 0, ctrlKey, deltaX, deltaY, deltaZ: 0, deltaMode }));
	facts.push(factOfCaptureForm({ type: "blur" }));
	for (const gesture of TESTER_SESSION_DECLARATION.gestures) for (const trigger of ["click", "drop"] as const) facts.push(Object.freeze({ type: "commit", gesture: gesture.name, trigger }));
	return facts;
}

// architecture-section-6 - what the tests hold the code to, copied as literals from the specification and never
// derived from the code under test: docs/ARCHITECTURE-TARGET.md revision 4, section 6 -- each row's words and its
// Claims column, the per-platform list of the browser's own keys, and the Mouse button entity's bits -- with the
// recorder's rulings in docs/DECISIONS.md 0002 beside them, each marked so.

/** Section 6's rows, in its order, each its words as the legend shows them and its Claims column. */
export const SPEC_ROW_CLAIMS = Object.freeze([
	["a modifier press", true],
	["a modifier chord", true],
	["a first press", true],
	["a roll-over press", true],
	["a repeat", true],
	["a release", true],
	["a release whose press was not seen", true],
	["a key with no identity", true],
	["left to the browser", false],
	["a press of button 0", true],
	["a press of button 1", true],
	["a press of button 2", true],
	["a press of button 3", true],
	["a press of button 4", true],
	["a release of button 0", true],
	["a release of button 1", true],
	["a release of button 2", true],
	["a release of button 3", true],
	["a release of button 4", true],
	["a chorded press", true],
	["a chorded release", true],
	["a chorded change, buttons not reported", false],
	["a button beyond the five", false],
	["a double click", true],
	["a click of button 0", false],
	["a click of button 1", false],
	["a click of button 2", false],
	["a click of button 3", false],
	["a click of button 4", false],
	["a drag of button 0", false],
	["a drag of button 1", false],
	["a drag of button 2", false],
	["a drag of button 3", false],
	["a drag of button 4", false],
	["the wheel up", true],
	["the wheel down", true],
	["the wheel sideways", true],
	["the wheel still", true],
	// the row's words, with IT-D8's sentence beside them, as section 6 has it
	["Ctrl and wheel, or a touchpad pinch: the browser does not tell them apart", true],
	["the context menu", true],
	["a touch or a pen pointer", false],
	["focus lost", true],
]);

/**
 * Section 6's browser's own keys, per platform, as its table lists them -- each modifier `true` held, `false` not
 * held, `null` either -- and the recorder's ruling in 0002 adding view source. The table names no modifier for
 * `BrowserRefresh` and `ZoomToggle`, read as any (0002).
 */
export const SPEC_BROWSERS_OWN_KEYS = Object.freeze([
	{ platform: "Windows, Linux, ChromeOS", code: "F5", shift: null, ctrl: null, alt: false, meta: false },
	{ platform: "Windows, Linux, ChromeOS", code: "KeyR", shift: null, ctrl: true, alt: false, meta: false },
	{ platform: "Windows, Linux, ChromeOS", code: "F11", shift: false, ctrl: false, alt: false, meta: false },
	{ platform: "Windows, Linux, ChromeOS", code: "F12", shift: false, ctrl: false, alt: false, meta: false },
	{ platform: "Windows, Linux, ChromeOS", code: "KeyI", shift: true, ctrl: true, alt: false, meta: false },
	{ platform: "Windows, Linux, ChromeOS", code: "KeyJ", shift: true, ctrl: true, alt: false, meta: false },
	{ platform: "Windows, Linux, ChromeOS", code: "KeyC", shift: true, ctrl: true, alt: false, meta: false },
	{ platform: "Linux", code: "BrowserRefresh", shift: null, ctrl: null, alt: null, meta: null },
	{ platform: "ChromeOS", code: "BrowserRefresh", shift: null, ctrl: null, alt: null, meta: null },
	{ platform: "ChromeOS", code: "ZoomToggle", shift: null, ctrl: null, alt: null, meta: null },
	{ platform: "macOS", code: "KeyR", shift: null, ctrl: false, alt: false, meta: true },
	{ platform: "macOS", code: "KeyF", shift: false, ctrl: true, alt: false, meta: true },
	{ platform: "macOS", code: "KeyI", shift: false, ctrl: false, alt: true, meta: true },
	{ platform: "macOS", code: "KeyJ", shift: false, ctrl: false, alt: true, meta: true },
	{ platform: "macOS", code: "KeyC", shift: false, ctrl: false, alt: true, meta: true },
	{ platform: "macOS", code: "KeyC", shift: true, ctrl: false, alt: false, meta: true },
	// the recorder's ruling, 0002: view source, in Chromium's developer-tools group
	{ platform: "Windows, Linux, ChromeOS", code: "KeyU", shift: false, ctrl: true, alt: false, meta: false },
	{ platform: "macOS", code: "KeyU", shift: false, ctrl: false, alt: true, meta: true },
]);

/** Section 6's modifier codes. */
export const SPEC_MODIFIER_CODES = Object.freeze(["ShiftLeft", "ShiftRight", "ControlLeft", "ControlRight", "AltLeft", "AltRight", "MetaLeft", "MetaRight"]);

/** Section 6's chord modifiers: Ctrl, Alt or Meta held; Shift makes no chord. */
export const SPEC_CHORD_MODIFIERS = Object.freeze(["ctrl", "alt", "meta"]);

/** The Mouse button entity's `buttons` bits, for buttons 0 to 4. */
export const SPEC_BUTTON_BITS = Object.freeze([1, 4, 2, 8, 16]);

/** One spec entry's signature, for comparing lists. */
export const signatureOf = (k) => `${k.code}|${k.shift}|${k.ctrl}|${k.alt}|${k.meta}`;

/**
 * Whether a fact is one of the browser's own keys by the specification, written apart from the code: a key fact
 * with a non-empty `code` that is an entry's, or whose `key`, case-folded, is the letter an entry's letter key
 * names -- since Chrome matches its shortcuts by the layout's letter (the recorder's ruling, 0002) -- with each
 * modifier held as that entry asks.
 */
export function ownBySpec(fact) {
	if ((fact.type !== "key-down" && fact.type !== "key-up") || typeof fact.code !== "string" || fact.code === "") return false;
	const asked = (want, held) => want === null || want === held;
	return SPEC_BROWSERS_OWN_KEYS.some((e) => {
		const letter = /^Key[A-Z]$/.test(e.code) ? e.code.slice(3).toLowerCase() : null;
		const same = fact.code === e.code || (letter !== null && typeof fact.key === "string" && fact.key.toLowerCase() === letter);
		return same && asked(e.shift, fact.shiftKey) && asked(e.ctrl, fact.ctrlKey) && asked(e.alt, fact.altKey) && asked(e.meta, fact.metaKey);
	});
}

/** A key fact of capture's form (IC5). */
export function keyFact(type, code, key, { shift = false, ctrl = false, alt = false, meta = false, repeat = false } = {}) {
	return { type, at: null, screen: null, hit: null, focus: null, button: null, buttons: null, pointerId: null, pointerType: null, key, code, repeat, shiftKey: shift, ctrlKey: ctrl, altKey: alt, metaKey: meta, deltaX: null, deltaY: null, deltaZ: null, deltaMode: null, time: 1 };
}

/**
 * The facts section 6 gives no row, as section 7 shows them as delivered: a mouse's plain move, which names no
 * button; a mouse's boundary facts, `over`, `out` and `leave`; a mouse's `cancel`, which the session's
 * `pointerLost` ends; and, in the proof's space only, pointer facts no platform makes -- one of no pointer type
 * but a double click or a context menu, and a mouse's press or release naming no button.
 */
export function hitsNoRowBySpec(fact) {
	if (!["leave", "down", "move", "up", "cancel", "over", "out"].includes(fact.type)) return false;
	if (fact.pointerType === "mouse" && fact.type === "move" && fact.button === -1) return true;
	if (fact.pointerType === "mouse" && ["over", "out", "leave", "cancel"].includes(fact.type)) return true;
	if (fact.pointerType === null) return true;
	if (fact.pointerType === "mouse" && (fact.type === "down" || fact.type === "up") && fact.button === -1) return true;
	return false;
}

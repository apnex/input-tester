/**
 * Keyboard plans: where each drawn key and mouse button lies, on the plan the person chose
 * (docs/ARCHITECTURE-TARGET.md section 5, IT-D2).
 *
 * Two plans, full-size ANSI and a Chromebook, each a reference drawing and never the detected keyboard.
 * Every key is named by its `code` -- a UI Events KeyboardEvent code value, or one of Chromium's own codes for
 * a Chromebook's action keys, marked so -- and placed by integer positions on one square grid of quarter-key
 * pitch, so a key one key wide spans four positions; `snap-grid`'s `span` (SG8) turns each block of positions
 * into the key's exact rect in drawing units.
 */
import type { Rect, SquareGrid, SquarePosition } from "../vendor/snap-grid/index.js";

/** The grid every plan lies on: square, a quarter key apart, ten drawing units to a quarter key. */
export const QUARTER_KEY_GRID = Object.freeze({ shape: "square", pitch: 10, origin: Object.freeze({ x: 0, y: 0 }) });

/** The plans a person may choose, by the name the address's `plan` parameter carries. */
export type PlanName = "ansi" | "chromebook";

/** Where a key's code is defined: the UI Events KeyboardEvent code values, or Chromium's own codes (its `dom_code_data.inc`). */
export type CodeSource = "ui-events" | "chromium";

/**
 * A note a drawn key carries (section 6, Key; IT-D8): often kept by the operating system; kept by the browser,
 * never reaching a page; seldom reported; or a code not measured on this keyboard.
 */
export type KeyNote = "kept-by-system" | "kept-by-browser" | "seldom-reported" | "unmeasured";

/** One drawn key: its code, the label printed on it, its top-left position and its size in quarter keys, where its code is defined, and its notes. */
export interface PlanKey {
	readonly code: string;
	readonly label: string;
	readonly col: number;
	readonly row: number;
	readonly width: number;
	readonly height: number;
	readonly codeSource: CodeSource;
	readonly notes: readonly KeyNote[];
}

/** One drawn mouse button: its name, its `button` number, its bit in `buttons`, and its block in quarter keys. */
export interface PlanMouseButton {
	readonly name: string;
	readonly button: number;
	readonly bit: number;
	readonly col: number;
	readonly row: number;
	readonly width: number;
	readonly height: number;
}

/** A keyboard plan: its name, the words it is shown by, what it is, its keys and the mouse drawn beside it. */
export interface KeyboardPlan {
	readonly name: PlanName;
	readonly title: string;
	readonly caveat: string;
	readonly keys: readonly PlanKey[];
	readonly mouseBody: { readonly col: number; readonly row: number; readonly width: number; readonly height: number };
	readonly mouseButtons: readonly PlanMouseButton[];
}

/** A key as placed on the grid: the plan's key, the block of positions it covers and its rect in drawing units. */
export interface PlacedKey extends PlanKey {
	readonly from: SquarePosition;
	readonly to: SquarePosition;
	readonly rect: Rect;
}

/** A mouse button as placed on the grid. */
export interface PlacedMouseButton extends PlanMouseButton {
	readonly rect: Rect;
}

/** A plan placed on the grid: every key by its code, in the plan's order, every mouse button, and the mouse's body. */
export interface PlacedPlan {
	readonly plan: KeyboardPlan;
	readonly keys: ReadonlyMap<string, PlacedKey>;
	readonly mouseButtons: readonly PlacedMouseButton[];
	readonly mouseBody: Rect;
}

/** A key of the UI Events code values, one key wide and high unless sized. */
function key(code: string, label: string, col: number, row: number, width = 4, height = 4, notes: readonly KeyNote[] = []): PlanKey {
	return Object.freeze({ code, label, col, row, width, height, codeSource: "ui-events", notes: Object.freeze([...notes]) });
}

/** A key whose code is Chromium's own, not a UI Events code value. */
function chromiumKey(code: string, label: string, col: number, row: number, width: number, height: number, notes: readonly KeyNote[]): PlanKey {
	return Object.freeze({ code, label, col, row, width, height, codeSource: "chromium", notes: Object.freeze([...notes]) });
}

/** The keys of one row, each one key wide, from `col` onward. */
function keysInRow(row: number, col: number, keys: readonly (readonly [string, string])[]): PlanKey[] {
	return keys.map(([code, label], i) => key(code, label, col + i * 4, row));
}

const DIGITS: readonly (readonly [string, string])[] = [["Digit1", "1"], ["Digit2", "2"], ["Digit3", "3"], ["Digit4", "4"], ["Digit5", "5"], ["Digit6", "6"], ["Digit7", "7"], ["Digit8", "8"], ["Digit9", "9"], ["Digit0", "0"], ["Minus", "-"], ["Equal", "="]];
const TOP_LETTERS: readonly (readonly [string, string])[] = [["KeyQ", "Q"], ["KeyW", "W"], ["KeyE", "E"], ["KeyR", "R"], ["KeyT", "T"], ["KeyY", "Y"], ["KeyU", "U"], ["KeyI", "I"], ["KeyO", "O"], ["KeyP", "P"], ["BracketLeft", "["], ["BracketRight", "]"]];
const HOME_LETTERS: readonly (readonly [string, string])[] = [["KeyA", "A"], ["KeyS", "S"], ["KeyD", "D"], ["KeyF", "F"], ["KeyG", "G"], ["KeyH", "H"], ["KeyJ", "J"], ["KeyK", "K"], ["KeyL", "L"], ["Semicolon", ";"], ["Quote", "'"]];
const BOTTOM_LETTERS: readonly (readonly [string, string])[] = [["KeyZ", "Z"], ["KeyX", "X"], ["KeyC", "C"], ["KeyV", "V"], ["KeyB", "B"], ["KeyN", "N"], ["KeyM", "M"], ["Comma", ","], ["Period", "."], ["Slash", "/"]];

/** The bit each mouse button holds in a pointer event's `buttons`, for buttons 0 to 4: 1, 4, 2, 8 and 16 (Pointer Events), the one definition every part reads. */
export const BUTTON_BITS: readonly number[] = Object.freeze([1, 4, 2, 8, 16]);

/** The mouse button whose bit `buttons` must hold for a button, or 0 for a button beyond the five. */
export const bitOfButton = (button: number): number => BUTTON_BITS[button] ?? 0;

/** The mouse, drawn right of every plan's keys: its body, its left, middle and right buttons on top, and its forward and back buttons on its side. */
const MOUSE_BODY = Object.freeze({ col: 94, row: 0, width: 20, height: 26 });
const MOUSE_BUTTONS: readonly PlanMouseButton[] = Object.freeze([
	Object.freeze({ name: "left", button: 0, bit: bitOfButton(0), col: 94, row: 0, width: 8, height: 10 }),
	Object.freeze({ name: "middle", button: 1, bit: bitOfButton(1), col: 102, row: 1, width: 4, height: 8 }),
	Object.freeze({ name: "right", button: 2, bit: bitOfButton(2), col: 106, row: 0, width: 8, height: 10 }),
	Object.freeze({ name: "back", button: 3, bit: bitOfButton(3), col: 91, row: 16, width: 3, height: 5 }),
	Object.freeze({ name: "forward", button: 4, bit: bitOfButton(4), col: 91, row: 10, width: 3, height: 5 }),
]);

/** Full-size ANSI: 104 keys, the function row half a key above the rest, the control and arrow pads and the numeric keypad beside them. */
export const FULL_SIZE_ANSI_PLAN: KeyboardPlan = Object.freeze({
	name: "ansi",
	title: "full-size ANSI",
	caveat: "a reference drawing of a 104-key US keyboard, never your detected keyboard",
	keys: Object.freeze([
		key("Escape", "Esc", 0, 0),
		...keysInRow(0, 8, [["F1", "F1"], ["F2", "F2"], ["F3", "F3"], ["F4", "F4"]]),
		...keysInRow(0, 26, [["F5", "F5"], ["F6", "F6"], ["F7", "F7"], ["F8", "F8"]]),
		...keysInRow(0, 44, [["F9", "F9"], ["F10", "F10"], ["F11", "F11"], ["F12", "F12"]]),
		key("PrintScreen", "PrtSc", 61, 0, 4, 4, ["kept-by-system"]),
		key("ScrollLock", "ScrLk", 65, 0),
		key("Pause", "Pause", 69, 0),
		key("Backquote", "`", 0, 6),
		...keysInRow(6, 4, DIGITS),
		key("Backspace", "Backspace", 52, 6, 8),
		...keysInRow(6, 61, [["Insert", "Ins"], ["Home", "Home"], ["PageUp", "PgUp"]]),
		...keysInRow(6, 74, [["NumLock", "Num"], ["NumpadDivide", "/"], ["NumpadMultiply", "*"], ["NumpadSubtract", "-"]]),
		key("Tab", "Tab", 0, 10, 6),
		...keysInRow(10, 6, TOP_LETTERS),
		key("Backslash", "\\", 54, 10, 6),
		...keysInRow(10, 61, [["Delete", "Del"], ["End", "End"], ["PageDown", "PgDn"]]),
		...keysInRow(10, 74, [["Numpad7", "7"], ["Numpad8", "8"], ["Numpad9", "9"]]),
		key("NumpadAdd", "+", 86, 10, 4, 8),
		key("CapsLock", "Caps", 0, 14, 7),
		...keysInRow(14, 7, HOME_LETTERS),
		key("Enter", "Enter", 51, 14, 9),
		...keysInRow(14, 74, [["Numpad4", "4"], ["Numpad5", "5"], ["Numpad6", "6"]]),
		key("ShiftLeft", "Shift", 0, 18, 9),
		...keysInRow(18, 9, BOTTOM_LETTERS),
		key("ShiftRight", "Shift", 49, 18, 11),
		key("ArrowUp", "Up", 65, 18),
		...keysInRow(18, 74, [["Numpad1", "1"], ["Numpad2", "2"], ["Numpad3", "3"]]),
		key("NumpadEnter", "Enter", 86, 18, 4, 8),
		key("ControlLeft", "Ctrl", 0, 22, 5),
		key("MetaLeft", "Meta", 5, 22, 5, 4, ["kept-by-system"]),
		key("AltLeft", "Alt", 10, 22, 5),
		key("Space", "", 15, 22, 25),
		key("AltRight", "Alt", 40, 22, 5),
		key("MetaRight", "Meta", 45, 22, 5, 4, ["kept-by-system"]),
		key("ContextMenu", "Menu", 50, 22, 5),
		key("ControlRight", "Ctrl", 55, 22, 5),
		...keysInRow(22, 61, [["ArrowLeft", "Left"], ["ArrowDown", "Down"], ["ArrowRight", "Right"]]),
		key("Numpad0", "0", 74, 22, 8),
		key("NumpadDecimal", ".", 82, 22),
	]),
	mouseBody: MOUSE_BODY,
	mouseButtons: MOUSE_BUTTONS,
});

/**
 * A Chromebook: no numeric keypad and no Insert, Home, End, Page or Delete keys; a Search key, `MetaLeft`, where
 * Caps Lock is; and a top row of action keys whose codes are Chromium's, none measured on a Chromebook, where
 * the code values' advice for a doubled function row would give `F1` to `F10` instead (IT-D2).
 */
export const CHROMEBOOK_PLAN: KeyboardPlan = Object.freeze({
	name: "chromebook",
	title: "Chromebook",
	caveat: "a reference drawing of a Chromebook keyboard, never your detected keyboard; its action keys' codes are Chromium's, not measured on a Chromebook",
	keys: Object.freeze([
		key("Escape", "esc", 0, 0),
		key("BrowserBack", "Back", 4, 0, 5, 4, ["kept-by-browser", "unmeasured"]),
		key("BrowserForward", "Forward", 9, 0, 5, 4, ["kept-by-browser", "unmeasured"]),
		key("BrowserRefresh", "Refresh", 14, 0, 5, 4, ["kept-by-browser", "unmeasured"]),
		chromiumKey("ZoomToggle", "Full", 19, 0, 5, 4, ["kept-by-system", "unmeasured"]),
		chromiumKey("ShowAllWindows", "Windows", 24, 0, 5, 4, ["kept-by-system", "unmeasured"]),
		chromiumKey("BrightnessDown", "Dim", 29, 0, 5, 4, ["kept-by-system", "unmeasured"]),
		chromiumKey("BrightnessUp", "Bright", 34, 0, 5, 4, ["kept-by-system", "unmeasured"]),
		key("AudioVolumeMute", "Mute", 39, 0, 5, 4, ["kept-by-system", "unmeasured"]),
		key("AudioVolumeDown", "Vol-", 44, 0, 5, 4, ["kept-by-system", "unmeasured"]),
		key("AudioVolumeUp", "Vol+", 49, 0, 5, 4, ["kept-by-system", "unmeasured"]),
		key("Backquote", "`", 0, 4),
		...keysInRow(4, 4, DIGITS),
		key("Backspace", "backspace", 52, 4, 8),
		key("Tab", "tab", 0, 8, 6),
		...keysInRow(8, 6, TOP_LETTERS),
		key("Backslash", "\\", 54, 8, 6),
		key("MetaLeft", "Search", 0, 12, 7, 4, ["kept-by-system", "unmeasured"]),
		...keysInRow(12, 7, HOME_LETTERS),
		key("Enter", "enter", 51, 12, 9),
		key("ShiftLeft", "shift", 0, 16, 9),
		...keysInRow(16, 9, BOTTOM_LETTERS),
		key("ShiftRight", "shift", 49, 16, 11),
		key("ControlLeft", "ctrl", 0, 20, 6),
		key("AltLeft", "alt", 6, 20, 5),
		key("Space", "", 11, 20, 26),
		key("AltRight", "alt", 37, 20, 5),
		key("ControlRight", "ctrl", 42, 20, 5),
		key("ArrowLeft", "Left", 47, 20),
		key("ArrowUp", "Up", 51, 20, 4, 2),
		key("ArrowDown", "Down", 51, 22, 4, 2),
		key("ArrowRight", "Right", 55, 20),
	]),
	mouseBody: MOUSE_BODY,
	mouseButtons: MOUSE_BUTTONS,
});

/** Both plans, by name. */
export const KEYBOARD_PLANS: Readonly<Record<PlanName, KeyboardPlan>> = Object.freeze({ ansi: FULL_SIZE_ANSI_PLAN, chromebook: CHROMEBOOK_PLAN });

/** The rect a block of quarter-key positions covers, from its top-left corner position to the one past its bottom-right: `span`'s `through` (SG8). */
function blockRect(grid: SquareGrid, col: number, row: number, width: number, height: number): { from: SquarePosition; to: SquarePosition; rect: Rect } {
	const from = Object.freeze({ col, row });
	const to = Object.freeze({ col: col + width, row: row + height });
	return { from, to, rect: grid.span(from, to).through };
}

/** Places a plan's keys and mouse on the quarter-key grid, each key's rect from `span` (SG8), never from arithmetic of its own. */
export function placePlanOnGrid(grid: SquareGrid, plan: KeyboardPlan): PlacedPlan {
	const keys = new Map<string, PlacedKey>();
	for (const k of plan.keys) {
		const { from, to, rect } = blockRect(grid, k.col, k.row, k.width, k.height);
		keys.set(k.code, Object.freeze({ ...k, from, to, rect }));
	}
	const mouseButtons = plan.mouseButtons.map((b) => Object.freeze({ ...b, rect: blockRect(grid, b.col, b.row, b.width, b.height).rect }));
	const body = plan.mouseBody;
	return Object.freeze({ plan, keys, mouseButtons: Object.freeze(mouseButtons), mouseBody: blockRect(grid, body.col, body.row, body.width, body.height).rect });
}

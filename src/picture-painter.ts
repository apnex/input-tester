/**
 * Painter: describes the picture as shapes, within an allowlist (docs/ARCHITECTURE-TARGET.md sections 5 and 6,
 * P3, P4, P6, GT8).
 *
 * Every look is stated by class, never by a `style` attribute, which the browser rule refuses when script
 * writes one; every shape is a `g`, `rect`, `line`, `path`, `text` or `tspan`, with attributes among the
 * painter's allowlist, none taking an address. The painter puts only the items whose entries of the record
 * changed, and `vector-scene` writes only what a description differs by (VS7).
 */
import type { BindingEntry, TraceRecord } from "../vendor/input-binding/index.js";
import type { Scene, Shape } from "../vendor/vector-scene/index.js";
import type { TesterFact, TesterRow } from "./input-bindings.js";
import type { KeyLabels } from "./key-labels.js";
import { BUTTON_BITS } from "./keyboard-plans.js";
import type { KeyNote, PlacedKey, PlacedPlan } from "./keyboard-plans.js";
import type { LogEntry, Picture, PictureEntry } from "./picture-state.js";
import { LOG_LINES } from "./picture-state.js";
import { levelWords } from "./view-steps.js";

/** The tags a painted shape may carry: never `script`, `foreignObject`, `use`, `image`, `a` or `style` (section 6, Shape). */
export const PAINTER_TAGS: readonly string[] = Object.freeze(["g", "rect", "line", "path", "text", "tspan"]);

/** The attributes a painted shape may carry: none that takes an address, none named `style` or `on`-anything. */
export const PAINTER_ATTRIBUTES: readonly string[] = Object.freeze(["x", "y", "width", "height", "rx", "ry", "x1", "y1", "x2", "y2", "d", "transform", "class"]);

/** The scene's four layers, back to front: the keyboard, the mouse, a drag's line, and the panel; the last two looked through by the platform's hit test. */
export const SCENE_LAYERS = Object.freeze([
	Object.freeze({ name: "keys", attrs: Object.freeze({ class: "keys" }) }),
	Object.freeze({ name: "mouse", attrs: Object.freeze({ class: "mouse" }) }),
	Object.freeze({ name: "trails", attrs: Object.freeze({ class: "trails", "pointer-events": "none" }) }),
	Object.freeze({ name: "panel", attrs: Object.freeze({ class: "panel", "pointer-events": "none" }) }),
]);

/** What the page says beside the picture: the plan chosen, whether the browser is one the tester covers, and any opening refused. */
export interface PageNotices {
	readonly planLine: string;
	readonly coveredBrowser: boolean;
	readonly problems: readonly string[];
}

/** What the painter writes to: the scene's put and remove (VS6), and nothing else of it. */
export interface PaintTarget {
	readonly put: Scene["put"];
	readonly remove: Scene["remove"];
}

/** Everything the painter describes besides the record: the plan as placed, the labels, the table's rows, the session's threshold and the notices. */
export interface PaintView {
	readonly placed: PlacedPlan;
	readonly labels: KeyLabels;
	readonly rows: readonly BindingEntry<TesterRow>[];
	readonly threshold: number;
	readonly notices: PageNotices;
}

/** The words each note is shown by. */
export const KEY_NOTE_WORDS: Readonly<Record<KeyNote, string>> = Object.freeze({
	"kept-by-system": "often kept by the operating system",
	"kept-by-browser": "kept by the browser, never reaching a page",
	"seldom-reported": "seldom reported",
	unmeasured: "code not measured on this keyboard",
});

/** What no page can know, shown always (IT-D8). */
export const NOT_REPORTED_LINES: readonly string[] = Object.freeze([
	"Shortcuts the operating system or the browser keeps -- a new or closed tab or window, switching tabs, and others -- never reach a page, and a page cannot know which it was not sent.",
	"Ctrl with a mouse wheel and a touchpad pinch arrive alike: the browser does not tell them apart.",
	"Which physical keyboard is in use is not reported: the drawn plan is a reference, never your detected keyboard.",
	"Where the browser names no code, a key's physical identity is not reported: it is shown as delivered, and no key lights.",
]);

/** What the tester claims, shown always (IT-D9). */
export const CLAIMS_LINE = "Every key, button, wheel, double click and context menu is claimed, so the browser does nothing with it -- but the browser's own keys (reload, fullscreen, developer tools, view source), left to it on any keyboard.";

/** The line shown outside a Chromium-based browser (IT-D12). */
export const UNCOVERED_BROWSER_LINE = "This browser names no Chromium: input-tester's coverage is proved in Chromium-based browsers, ChromeOS's among them, and is not proved here.";

const PANEL_X = 0;
const LEGEND_X = 1160;
const MOUSE_TEXT_X = 910;

/**
 * The picture's text is laid out in three columns, each block wrapped within its column's width, so no wording of
 * any length reaches a neighbour (docs/DECISIONS.md 0010): the left column under the keyboard, from the panel's
 * left edge to x 900; the mouse column, from x 910 to 1150; and the legend, from x 1160 to the picture's edge.
 * Every block that can hold an input's own words or numbers -- the plan line, the status lines, the held keys, the
 * log, the wheel's lines and the view's -- is drawn in the monospace face, whose advance at the panel's 11 pixels
 * is 6.62 units, so a budget in characters is a budget in units.
 */
/** How many monospace characters a line of the left column holds: 132, ending by x 874, short of its right edge. */
export const LEFT_COLUMN_CHARACTERS = 132;

/**
 * How many characters a line of the left column's fixed notices holds, in the proportional face: their words are
 * the page's own, never an input's, at most about 7 units a character at 11 pixels, bold, so 120 end short of x 900.
 */
export const NOTICE_CHARACTERS = 120;

/** How many monospace characters a line of the mouse column holds: 34, ending by x 1135, short of the legend at 1160. */
export const MOUSE_COLUMN_CHARACTERS = 34;

/** How far apart the mouse column's lines are, and the gap between the wheel's lines and the view's below them. */
const MOUSE_COLUMN_LEADING = 14;
const MOUSE_COLUMN_GAP = 6;

/** Where the wheel's lines start, under the mouse; the view's follow them. */
const WHEEL_LINES_Y = 284;

/** How many monospace characters a log line holds: the left column's 132. */
export const LOG_CHARACTERS = LEFT_COLUMN_CHARACTERS;

/** How far apart the lines of the left column's flow are -- the status lines, the held keys and the log -- and of its notices. */
const FLOW_LEADING = 16;
const NOTICE_LEADING = 14;

/** Where the left column's text starts, under the keyboard, and where its fixed notices must end, inside the picture's 900. */
const LEFT_COLUMN_TOP = 296;
const LEFT_COLUMN_BOTTOM = 890;

/**
 * How many characters a legend row's words hold on one line: they run from x 1214 to the picture's edge at 1640,
 * 426 units, and at the panel's 11 pixels, bold as the input is marked, a character's advance is about 6.25, so
 * 64 end by about 1614.
 */
export const LEGEND_CHARACTERS = 64;

/** How far apart the legend's rows are, and a row's own lines. */
const LEGEND_ROW_LEADING = 19;
const LEGEND_LINE_LEADING = 14;

/**
 * A legend row's words as lines: whole when they fit; else broken after the last colon that leaves both parts
 * within the width, so a sentence after it -- IT-D8's beside the pinch -- stands whole on its own line; else at spaces.
 */
export function legendLines(words: string, width: number): string[] {
	if (words.length <= width) return [words];
	for (let at = words.lastIndexOf(": "); at > 0; at = words.lastIndexOf(": ", at - 1)) {
		const head = words.slice(0, at + 1);
		const tail = words.slice(at + 2);
		if (head.length <= width && tail.length <= width) return [head, tail];
	}
	return wrapWords(words, width);
}

/** Words broken at spaces into lines of at most `width` characters; a word longer than that is broken into pieces of `width`, so no line is longer, and nothing is dropped. */
export function wrapWords(words: string, width: number): string[] {
	const lines: string[] = [];
	let line = "";
	const pieces = words.split(" ").flatMap((word) => (word.length <= width ? [word] : Array.from({ length: Math.ceil(word.length / width) }, (_, i) => word.slice(i * width, (i + 1) * width))));
	for (const word of pieces) {
		if (line === "") line = word;
		else if (line.length + 1 + word.length <= width) line = `${line} ${word}`;
		else {
			lines.push(line);
			line = word;
		}
	}
	return [...lines, line];
}

/** Lines of the mouse column as one text shape, a tspan each, the first at `y`. */
const columnText = (y: number, className: string, lines: readonly string[]): Shape => ({ tag: "text", attrs: { x: MOUSE_TEXT_X, y, class: className }, children: lines.map((line, i) => ({ tag: "tspan", attrs: { x: MOUSE_TEXT_X, y: y + i * MOUSE_COLUMN_LEADING }, text: line })) });

/** Lines of the left column as one text shape, a tspan each `leading` apart, the first at `y`. */
const leftText = (y: number, className: string, lines: readonly string[], leading: number): Shape => ({ tag: "text", attrs: { x: PANEL_X, y, class: className }, children: lines.map((line, i) => ({ tag: "tspan", attrs: { x: PANEL_X, y: y + i * leading }, text: line })) });

/** A number of screen pixels as the page writes it, to a tenth. */
const tenthWords = (n: number): string => String(Math.round(n * 10) / 10);

/** A text shape at a point, its look by class. */
const text = (x: number, y: number, className: string, content: string): Shape => ({ tag: "text", attrs: { x, y, class: className }, text: content });

/** The modifiers a fact carries, as words. */
function modifierWords(fact: { readonly shiftKey: boolean; readonly ctrlKey: boolean; readonly altKey: boolean; readonly metaKey: boolean }): string {
	const held = [fact.shiftKey ? "Shift" : "", fact.ctrlKey ? "Ctrl" : "", fact.altKey ? "Alt" : "", fact.metaKey ? "Meta" : ""].filter((w) => w !== "");
	return held.length === 0 ? "no modifier" : held.join("+");
}

/** A `time` as delivered, or said not reported. */
const timeWords = (time: number | null): string => (time === null ? "time not reported" : `t ${time}`);

/** A wheel's unit, as `deltaMode` names it. */
const unitWords = (mode: 0 | 1 | 2 | null): string => (mode === 0 ? "pixels" : mode === 1 ? "lines" : mode === 2 ? "pages" : "unit not reported");

/** The words a fact is logged by: everything it carried that the picture shows, exact. */
export function factWords(fact: TesterFact, placed: PlacedPlan): string {
	switch (fact.type) {
		case "commit":
			return `meaning: ${fact.gesture} committed, a ${fact.trigger}`;
		case "key-down":
		case "key-up": {
			const code = fact.code === null ? "code null" : fact.code === "" ? 'code ""' : `code ${fact.code}`;
			const drawn = fact.code !== null && fact.code !== "" && !placed.keys.has(fact.code) ? ", not on the drawn keyboard" : "";
			return `${fact.type} ${code}${drawn}, key ${fact.key === null ? "null" : JSON.stringify(fact.key)}, ${modifierWords(fact)}, repeat ${fact.repeat}, ${timeWords(fact.time)}`;
		}
		case "blur":
			return `blur: focus lost, ${timeWords(fact.time)}`;
		case "wheel":
			return `wheel deltaX ${fact.deltaX} deltaY ${fact.deltaY} deltaZ ${fact.deltaZ} in ${unitWords(fact.deltaMode)}, ${modifierWords(fact)}, ${timeWords(fact.time)}`;
		default:
			return `${fact.type} ${fact.pointerType ?? "no pointer type"} button ${fact.button} buttons ${fact.buttons ?? "not reported"} at ${fact.at.x}, ${fact.at.y}, ${timeWords(fact.time)}`;
	}
}

/** The words of a log line: its fact, the rows it hit, whether it was claimed, how many facts it stands for, and the session's notes. */
export function logLineWords(entry: LogEntry, view: PaintView): string {
	const words = entry.hits.map((id) => view.rows.find((r) => r.id === id)?.row.words ?? id);
	const meaning = words.length === 0 ? "no row" : words.length === 1 ? words[0] : `${words.join(" and ")} -- an overlap, no meaning`;
	const count = entry.count > 1 ? `, x${entry.count}` : "";
	const notes = entry.notes.length > 0 ? `; ${entry.notes.join("; ")}` : "";
	return `${factWords(entry.fact, view.placed)} -> ${meaning}${entry.claimed ? " (claimed)" : ""}${count}${notes}`;
}

/** The mouse buttons a `buttons` value holds, by number, or said not reported. */
export function buttonsHeldWords(buttons: number | null): string {
	if (buttons === null) return "not reported";
	const held = BUTTON_BITS.map((bit, button) => ((buttons & bit) !== 0 ? String(button) : "")).filter((b) => b !== "");
	return held.length === 0 ? "none" : held.join(" ");
}

/** The status lines: keys held, buttons held and the item under the pointer; the live gesture, its press's screen point, and the session's threshold in screen pixels (`measure: 'screen'`). */
export function statusWords(picture: Picture, threshold: number): [string, string] {
	const keys = picture.heldKeys.length === 0 ? "none" : picture.heldKeys.map((k) => k.code).join(" ");
	const g = picture.gesture;
	const gesture = g === null ? "none" : `${g.name} ${g.phase}${g.trigger === null ? "" : ` (${g.trigger})`}${g.live ? ", live" : ", ended"}`;
	const press = picture.press === null ? "no press" : `press from screen ${tenthWords(picture.press.at.x)}, ${tenthWords(picture.press.at.y)}${picture.press.beyond ? ", beyond the threshold" : ""}`;
	const under = picture.under === null ? "nothing" : `${picture.under.key} (${picture.under.layer})`;
	return [`keys held: ${keys} | buttons held: ${buttonsHeldWords(picture.buttons)} | under the pointer: ${under}`, `gesture: ${gesture} | ${press} | threshold: ${threshold} screen pixels`];
}

/** How many held keys the panel describes a line each; past them, one line says how many more are held, and names them. */
export const HELD_KEY_LINES = 3;

/**
 * The lines describing the held keys -- each one's repeats observed, its time held as of its latest fact and its
 * last repeat interval -- the first few a line each and the rest named on one line, never dropped; then the
 * latest key with no identity.
 */
export function heldKeyLines(picture: Picture): string[] {
	const lines = picture.heldKeys.map((k) => {
		const before = k.firstSeen === "repeat" ? "pressed before it was seen, " : "";
		const held = k.firstTime === null || k.latest.time === null ? "time held not reported" : `held ${k.firstSeen === "repeat" ? "at least " : ""}${k.latest.time - k.firstTime} ms as of its latest fact`;
		const interval = k.interval === null ? "" : `, last repeat interval ${k.interval} ms`;
		return `${k.code} ${k.latest.key === null ? "key null" : JSON.stringify(k.latest.key)}: ${before}${k.repeats} repeat${k.repeats === 1 ? "" : "s"} observed, ${held}${interval}`;
	});
	const more = picture.heldKeys.slice(HELD_KEY_LINES);
	if (more.length > 0) lines.splice(HELD_KEY_LINES, lines.length, `and ${more.length} more held: ${more.map((k) => k.code).join(" ")}`);
	const u = picture.unidentifiedKey;
	if (u !== null) lines.push(`latest key with no identity: ${u.type} key ${u.key === null ? "null" : JSON.stringify(u.key)}, ${timeWords(u.time)} -- its physical key not reported`);
	return lines;
}

/** One key's item: its rect, lit while held, its label marked reported or assumed, and a corner mark when it carries a note. */
export function keyShapes(key: PlacedKey, view: PaintView, lit: boolean): Shape[] {
	const label = view.labels.get(key.code) ?? { text: key.label, source: "assumed" as const };
	const { x, y, w, h } = key.rect;
	const children: Shape[] = [
		{ tag: "rect", attrs: { x: x + 1, y: y + 1, width: w - 2, height: h - 2, rx: 3, class: "key-cap" } },
		text(x + w / 2, y + h / 2 + 4, `key-label label-${label.source}`, label.text),
	];
	key.notes.forEach((note, i) => {
		const corner = i === 0 ? `M ${x + w - 9} ${y + 1} L ${x + w - 1} ${y + 1} L ${x + w - 1} ${y + 9} Z` : `M ${x + w - 9} ${y + h - 1} L ${x + w - 1} ${y + h - 1} L ${x + w - 1} ${y + h - 9} Z`;
		children.push({ tag: "path", attrs: { d: corner, class: `key-note note-${note}` } });
	});
	return [{ tag: "g", attrs: { class: lit ? "key lit" : "key" }, children }];
}

/** Puts one key's item again. */
function putKey(scene: PaintTarget, key: PlacedKey, view: PaintView, picture: Picture): void {
	scene.put("keys", `key ${key.code}`, keyShapes(key, view, picture.heldKeys.some((k) => k.code === key.code)));
}

/** The mouse's buttons, each lit while `buttons` holds its bit, and its body. */
function paintMouse(scene: PaintTarget, view: PaintView, picture: Picture): void {
	const body = view.placed.mouseBody;
	scene.put("mouse", "mouse body", [{ tag: "rect", attrs: { x: body.x, y: body.y, width: body.w, height: body.h, rx: 60, class: "mouse-body" } }]);
	for (const b of view.placed.mouseButtons) {
		const lit = picture.buttons !== null && (picture.buttons & b.bit) !== 0;
		const { x, y, w, h } = b.rect;
		scene.put("mouse", `mouse button ${b.button}`, [{ tag: "g", attrs: { class: lit ? "mouse-button lit" : "mouse-button" }, children: [{ tag: "rect", attrs: { x: x + 1, y: y + 1, width: w - 2, height: h - 2, rx: 6, class: "button-cap" } }, text(x + w / 2, y + h / 2 + 4, "button-label", String(b.button))] }]);
	}
}

/** The wheel: lit while the latest fact is a wheel fact, pointing the way its latest fact turned, and its latest deltas and unit beneath the mouse. */
function paintWheel(scene: PaintTarget, view: PaintView, picture: Picture): void {
	const middle = view.placed.mouseButtons.find((b) => b.button === 1);
	const wheel = picture.wheel;
	if (middle === undefined) return;
	const lit = wheel !== null && picture.latestFact?.type === "wheel";
	const cx = middle.rect.x + middle.rect.w / 2;
	const top = middle.rect.y + 12;
	const bottom = middle.rect.y + middle.rect.h - 12;
	const up = wheel !== null && wheel.latest.deltaY < 0;
	const d = up ? `M ${cx - 8} ${top + 14} L ${cx} ${top} L ${cx + 8} ${top + 14} Z` : `M ${cx - 8} ${bottom - 14} L ${cx} ${bottom} L ${cx + 8} ${bottom - 14} Z`;
	scene.put("mouse", "mouse wheel", [{ tag: "path", attrs: { d, class: lit ? "wheel lit" : "wheel" } }]);
	scene.put("panel", "wheel line", [columnText(WHEEL_LINES_Y, "wheel-line", wheelLines(picture))]);
}

/** The wheel's lines under the mouse: its latest deltas, exact, their unit, its modifiers and how many alike came in a row, wrapped to the mouse column. */
export function wheelLines(picture: Picture): string[] {
	const wheel = picture.wheel;
	const words = wheel === null ? "wheel: nothing yet" : `wheel deltaX ${wheel.latest.deltaX} deltaY ${wheel.latest.deltaY} deltaZ ${wheel.latest.deltaZ} in ${unitWords(wheel.latest.deltaMode)}, ${modifierWords(wheel.latest)}${wheel.count > 1 ? `, ${wheel.count} alike in a row` : ""}`;
	return wrapWords(words, MOUSE_COLUMN_CHARACTERS);
}

/** How many of the wheel's lines the view's always leave room for, so the view's lines hold still for any ordinary wheel; a longer wheel moves them down. */
const WHEEL_ROOM_LINES = 4;

/** Where the view's lines start: below the wheel's room, or below its last line when it has more, by the column's gap. */
const viewLinesY = (picture: Picture): number => WHEEL_LINES_Y + Math.max(WHEEL_ROOM_LINES, wheelLines(picture).length) * MOUSE_COLUMN_LEADING + MOUSE_COLUMN_GAP;

/** The view's lines, the view pane's readouts: the zoom level and its scale, and the centre; the pinch's held pixels; a live pan's travel; and what the latest view row did, wrapped to the mouse column. */
export function viewLines(picture: Picture): string[] {
	const { centre, level, scale, acc, pan, words } = picture.view;
	const panWords = pan === null ? "no pan" : `${pan.gesture} live, ${Math.round(pan.distance * 10) / 10} screen pixels`;
	return [`view: ${levelWords(level)}, scale ${scale === null ? "not yet known" : Math.round(scale * 10000) / 10000}`, `centre ${tenthWords(centre.x)}, ${tenthWords(centre.y)}`, `pinch held ${Math.round(acc * 10) / 10} px`, panWords, words ?? "no view row yet"].flatMap((line) => wrapWords(line, MOUSE_COLUMN_CHARACTERS));
}

/** The view's lines, in the mouse column below the wheel's, clear of the legend: the view the view's rows would set, as numbers (the view pane is a move of its own). */
function paintViewLine(scene: PaintTarget, picture: Picture): void {
	scene.put("panel", "view line", [columnText(viewLinesY(picture), "view-line", viewLines(picture))]);
}

/** A drag's line, from its press to the pointer in drawing units, while a drag gesture is live. */
function paintTrail(scene: PaintTarget, picture: Picture): void {
	const g = picture.gesture;
	if (g === null || !g.live || !g.name.startsWith("drag") || picture.pressFrom === null || picture.pointerAt === null) {
		scene.remove("trails", "drag line");
		return;
	}
	scene.put("trails", "drag line", [{ tag: "line", attrs: { x1: picture.pressFrom.x, y1: picture.pressFrom.y, x2: picture.pointerAt.x, y2: picture.pointerAt.y, class: "drag-line" } }]);
}

/** The standing of one row for the latest fact: refused, unbound, unmet, or a hit. */
const standingOf = (record: TraceRecord | undefined): string => (record === undefined ? "" : record.refusedBy !== null ? "refused" : record.on !== true ? "unbound" : record.when !== true ? "unmet" : "hit");

/** One row of the legend at `y`: its standing for the latest fact, the input and the meaning marked, and its words, on as many lines as `legendLines` gives. */
function legendShapes(entry: BindingEntry<TesterRow>, y: number, picture: Picture): Shape[] {
	const input = picture.legend?.input.find((r) => r.id === entry.id);
	const meaning = picture.legend?.meaning?.find((r) => r.id === entry.id);
	const mark = input?.hit ? "input" : meaning?.hit ? "meaning" : standingOf(input);
	const lines = legendLines(entry.row.words, LEGEND_CHARACTERS);
	const words: Shape = { tag: "text", attrs: { x: LEGEND_X + 54, y, class: "legend-words" }, children: lines.map((line, i) => ({ tag: "tspan", attrs: { x: LEGEND_X + 54, y: y + i * LEGEND_LINE_LEADING }, text: line })) };
	return [{ tag: "g", attrs: { class: `legend-row legend-${mark || "none"}` }, children: [text(LEGEND_X, y, "legend-standing", mark), words] }];
}

/** Where each legend row's first line stands: one row's leading below the last, and each extra line of the row above below that. */
function legendRowsY(rows: readonly BindingEntry<TesterRow>[]): number[] {
	let y = 46;
	return rows.map((entry) => {
		const at = y;
		y += LEGEND_ROW_LEADING + (legendLines(entry.row.words, LEGEND_CHARACTERS).length - 1) * LEGEND_LINE_LEADING;
		return at;
	});
}

/** The labels line's words: the keyboard map's labels reported, or every label the plan's printing. */
function labelsLineWords(view: PaintView): string {
	const reported = [...view.labels.values()].some((l) => l.source === "reported");
	return reported ? LABELS_REPORTED_LINE : LABELS_ASSUMED_LINE;
}
const LABELS_REPORTED_LINE = "Labels: a plain label is the one your keyboard map reported; a slanted label is the plan's printing, assumed.";
const LABELS_ASSUMED_LINE = "Labels: every label is the plan's printing, assumed -- the browser reported no keyboard map.";

/** The left column's head, fixed for the page: the plan line, the labels line and, outside Chromium, the browser line, each wrapped, and where the flow starts below them. */
function leftHead(view: PaintView): { plan: string[]; planY: number; labelsY: number; browser: string[]; browserY: number; problems: string[]; problemsY: number; flowTop: number } {
	const plan = view.notices.planLine.split("\n").flatMap((line) => wrapWords(line, LEFT_COLUMN_CHARACTERS));
	const labelsRoom = Math.max(wrapWords(LABELS_REPORTED_LINE, NOTICE_CHARACTERS).length, wrapWords(LABELS_ASSUMED_LINE, NOTICE_CHARACTERS).length);
	const browser = view.notices.coveredBrowser ? [] : wrapWords(UNCOVERED_BROWSER_LINE, NOTICE_CHARACTERS);
	const problems = problemLines(view.notices.problems);
	const planY = LEFT_COLUMN_TOP;
	const labelsY = planY + plan.length * NOTICE_LEADING + 2;
	const browserY = labelsY + labelsRoom * NOTICE_LEADING;
	const problemsY = browserY + browser.length * NOTICE_LEADING;
	return { plan, planY, labelsY, browser, browserY, problems, problemsY, flowTop: problemsY + problems.length * NOTICE_LEADING + 12 };
}

/** The problems of a refused opening, each wrapped at the left column's monospace width, so a problem of any length stays inside the column. */
const problemLines = (problems: readonly string[]): string[] => problems.flatMap((p) => wrapWords(p, LEFT_COLUMN_CHARACTERS));

/**
 * Paints the page of an opening refused before anything else could be drawn -- the grid, the table or the session --
 * its problems alone, at the left column's top, wrapped as every block is.
 */
export function paintRefusedOpening(scene: PaintTarget, problems: readonly string[]): void {
	scene.put("panel", "problems", [leftText(LEFT_COLUMN_TOP, "problems", problemLines(problems), NOTICE_LEADING)]);
}

/** The left column's foot, fixed for the page: what no page can know, what is claimed and the notes' key, each wrapped, laid upward from the column's bottom. */
function leftFoot(view: PaintView): { y: number; notReported: string[]; claimsY: number; claims: string[]; notesY: number; notes: KeyNote[] } {
	const notReported = NOT_REPORTED_LINES.flatMap((line) => wrapWords(line, NOTICE_CHARACTERS));
	const claims = CLAIMS_LINE.split(" -- ").flatMap((part, i) => wrapWords(i === 0 ? `${part} --` : part, NOTICE_CHARACTERS));
	const notes = [...new Set([...view.placed.keys.values()].flatMap((k) => k.notes))];
	const height = 18 + (notReported.length - 1) * FLOW_LEADING + 24 + (claims.length - 1) * NOTICE_LEADING + 20 + Math.max(0, notes.length - 1) * NOTICE_LEADING;
	const y = LEFT_COLUMN_BOTTOM - height;
	const claimsY = y + 18 + (notReported.length - 1) * FLOW_LEADING + 24;
	return { y, notReported, claimsY, claims, notesY: claimsY + (claims.length - 1) * NOTICE_LEADING + 20, notes };
}

/** The left column's flow between its head and its foot: the status lines, the held keys, the log's heading and its entries, each placed below the last. */
export interface FlowPlacement {
	readonly statusY: number;
	readonly status: readonly string[];
	readonly heldY: number;
	readonly held: readonly string[];
	readonly headingY: number;
	readonly log: readonly { readonly y: number; readonly lines: readonly string[] }[];
}

/**
 * Lays out the flow: the status lines, then the held keys, then the log's heading and its entries, each block
 * wrapped at the column's width and placed below the last -- at the places they hold for ordinary input, or lower
 * when a block above runs longer -- down to the foot. The log shows its newest entries whole, as many as fit, an
 * entry never cut; the held keys, whose lines can only grow with keys held at once, leave room for the log's
 * heading, their last line saying how many lines found no room when they are more than fit.
 */
export function flowPlacement(view: PaintView, picture: Picture): FlowPlacement {
	const bottom = leftFoot(view).y - 16;
	const statusY = leftHead(view).flowTop;
	const status = statusWords(picture, view.threshold).flatMap((line) => wrapWords(line, LEFT_COLUMN_CHARACTERS));
	const heldY = Math.max(statusY + 36, statusY + (status.length - 1) * FLOW_LEADING + 20);
	let held = heldKeyLines(picture).flatMap((line) => wrapWords(line, LEFT_COLUMN_CHARACTERS));
	const heldRoom = Math.max(1, Math.floor((bottom - 20 - heldY) / FLOW_LEADING) + 1);
	if (held.length > heldRoom) held = [...held.slice(0, heldRoom - 1), `and ${held.length - heldRoom + 1} more lines of held keys than the panel has room for`];
	const headingY = Math.max(heldY + 84, heldY + (held.length - 1) * FLOW_LEADING + 20);
	const log: { y: number; lines: string[] }[] = [];
	let y = headingY + FLOW_LEADING;
	let full = false;
	for (let i = 0; i < LOG_LINES; i++) {
		const entry = picture.log[i];
		const lines = entry === undefined ? [] : wrapWords(logLineWords(entry, view), LOG_CHARACTERS);
		full = full || y + (lines.length - 1) * FLOW_LEADING > bottom;
		log.push({ y, lines: full ? [] : lines });
		if (!full) y += lines.length * FLOW_LEADING;
	}
	return { statusY, status, heldY, held, headingY, log };
}

/** Paints the status lines and the held keys' lines where the flow puts them. */
function paintStatus(scene: PaintTarget, flow: FlowPlacement): void {
	scene.put("panel", "status line", [leftText(flow.statusY, "status-line", flow.status, FLOW_LEADING)]);
	scene.put("panel", "held keys", [leftText(flow.heldY, "held-keys", flow.held, FLOW_LEADING)]);
}

/** Paints the log's heading and its entries, newest first, where the flow puts them: each entry whole, as many as fit; an entry with no room, and every older one, put empty. */
function paintLog(scene: PaintTarget, flow: FlowPlacement): void {
	scene.put("panel", "log heading", [text(PANEL_X, flow.headingY, "heading", "Log, newest first")]);
	flow.log.forEach((entry, i) => scene.put("panel", `log line ${i}`, [leftText(entry.y, i === 0 ? "log-line newest" : "log-line", entry.lines, FLOW_LEADING)]));
}

/** Paints the legend: every row of the table with its standing for the latest fact, a row of long words on lines of its own. */
function paintLegend(scene: PaintTarget, view: PaintView, picture: Picture): void {
	const ys = legendRowsY(view.rows);
	view.rows.forEach((entry, i) => scene.put("panel", `legend ${entry.id}`, legendShapes(entry, ys[i] as number, picture)));
}

/** Paints every key, as the labels name them now: at the first paint, and again when the Keyboard Map answers. */
export function paintEveryKey(scene: PaintTarget, view: PaintView, picture: Picture): void {
	for (const key of view.placed.keys.values()) putKey(scene, key, view, picture);
	scene.put("panel", "labels line", [leftText(leftHead(view).labelsY, "notice", wrapWords(labelsLineWords(view), NOTICE_CHARACTERS), NOTICE_LEADING)]);
}

/** Paints the whole page from the record: every key, the mouse, the panel's fixed lines, and every entry of the record. */
export function paintWholePage(scene: PaintTarget, view: PaintView, picture: Picture): void {
	paintEveryKey(scene, view, picture);
	paintMouse(scene, view, picture);
	paintWheel(scene, view, picture);
	paintViewLine(scene, picture);
	paintTrail(scene, picture);
	const head = leftHead(view);
	scene.put("panel", "plan line", [leftText(head.planY, "notice plan-line", head.plan, NOTICE_LEADING)]);
	if (head.browser.length > 0) scene.put("panel", "browser line", [leftText(head.browserY, "notice uncovered", head.browser, NOTICE_LEADING)]);
	if (head.problems.length > 0) scene.put("panel", "problems", [leftText(head.problemsY, "problems", head.problems, NOTICE_LEADING)]);
	const foot = leftFoot(view);
	scene.put("panel", "not reported", [{ tag: "text", attrs: { x: PANEL_X, y: foot.y, class: "not-reported" }, children: [{ tag: "tspan", attrs: { x: PANEL_X, y: foot.y, class: "heading" }, text: "What no page can know" }, ...foot.notReported.map((line, i) => ({ tag: "tspan", attrs: { x: PANEL_X, y: foot.y + 18 + i * FLOW_LEADING }, text: line }))] }]);
	scene.put("panel", "claims line", [leftText(foot.claimsY, "notice", foot.claims, NOTICE_LEADING)]);
	scene.put("panel", "notes key", [{ tag: "text", attrs: { x: PANEL_X, y: foot.notesY, class: "notes-key" }, children: foot.notes.map((n, i) => ({ tag: "tspan", attrs: { x: PANEL_X, y: foot.notesY + i * NOTICE_LEADING, class: `note-${n}` }, text: `a key's corner marked so: ${KEY_NOTE_WORDS[n]}` })) }]);
	scene.put("panel", "legend heading", [text(LEGEND_X, 22, "heading", "Every rule, and its standing for the latest fact")]);
	const flow = flowPlacement(view, picture);
	paintStatus(scene, flow);
	paintLog(scene, flow);
	paintLegend(scene, view, picture);
}

/** The keys whose lit state differs between two records. */
function keysLitChanged(previous: Picture, picture: Picture): string[] {
	const before = new Set(previous.heldKeys.map((k) => k.code));
	const after = new Set(picture.heldKeys.map((k) => k.code));
	return [...new Set([...before, ...after])].filter((code) => before.has(code) !== after.has(code));
}

/** Puts only the items whose entries of the record changed, inside the delivery that changed them (P3, GT2). */
export function paintPictureChanges(scene: PaintTarget, view: PaintView, previous: Picture, picture: Picture, changed: ReadonlySet<PictureEntry>): void {
	if (changed.has("heldKeys")) {
		for (const code of keysLitChanged(previous, picture)) {
			const key = view.placed.keys.get(code);
			if (key !== undefined) putKey(scene, key, view, picture);
		}
	}
	if (changed.has("buttons")) paintMouse(scene, view, picture);
	if (changed.has("wheel") || (changed.has("latestFact") && (previous.latestFact?.type === "wheel") !== (picture.latestFact?.type === "wheel"))) paintWheel(scene, view, picture);
	if (changed.has("view") || changed.has("wheel")) paintViewLine(scene, picture);
	if (changed.has("gesture") || changed.has("pressFrom") || changed.has("pointerAt")) paintTrail(scene, picture);
	const statusChanged = ["heldKeys", "unidentifiedKey", "buttons", "gesture", "press", "under"].some((e) => changed.has(e as PictureEntry));
	if (statusChanged || changed.has("log")) {
		const flow = flowPlacement(view, picture);
		if (statusChanged) paintStatus(scene, flow);
		if (changed.has("log") || (statusChanged && flow.headingY !== flowPlacement(view, previous).headingY)) paintLog(scene, flow);
	}
	if (changed.has("legend")) paintLegend(scene, view, picture);
}


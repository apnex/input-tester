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
export const CLAIMS_LINE = "Every key, button, wheel, double click and context menu is claimed, so the browser does nothing with it -- but the browser's own keys (reload, fullscreen, developer tools), left to the browser.";

/** The line shown outside a Chromium-based browser (IT-D12). */
export const UNCOVERED_BROWSER_LINE = "This browser names no Chromium: input-tester's coverage is proved in Chromium-based browsers, ChromeOS's among them, and is not proved here.";

const PANEL_X = 0;
const LEGEND_X = 1160;
const MOUSE_TEXT_X = 910;

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

/** The status lines: keys held, buttons held and the item under the pointer; the live gesture, its press, and the session's threshold in drawing units and in keys, a key being 40 of them. */
export function statusWords(picture: Picture, threshold: number): [string, string] {
	const keys = picture.heldKeys.length === 0 ? "none" : picture.heldKeys.map((k) => k.code).join(" ");
	const g = picture.gesture;
	const gesture = g === null ? "none" : `${g.name} ${g.phase}${g.trigger === null ? "" : ` (${g.trigger})`}${g.live ? ", live" : ", ended"}`;
	const press = picture.press === null ? "no press" : `press from ${picture.press.at.x}, ${picture.press.at.y}${picture.press.beyond ? ", beyond the threshold" : ""}`;
	const under = picture.under === null ? "nothing" : `${picture.under.key} (${picture.under.layer})`;
	return [`keys held: ${keys} | buttons held: ${buttonsHeldWords(picture.buttons)} | under the pointer: ${under}`, `gesture: ${gesture} | ${press} | threshold: ${threshold} drawing units, ${threshold / 40} of a key's width`];
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
	const words = wheel === null ? "wheel: nothing yet" : `wheel deltaX ${wheel.latest.deltaX} deltaY ${wheel.latest.deltaY} deltaZ ${wheel.latest.deltaZ} in ${unitWords(wheel.latest.deltaMode)}, ${modifierWords(wheel.latest)}${wheel.count > 1 ? `, ${wheel.count} alike in a row` : ""}`;
	scene.put("panel", "wheel line", [text(MOUSE_TEXT_X, 284, "wheel-line", words)]);
}

/** A drag's line, from its press to the pointer, while a drag gesture is live. */
function paintTrail(scene: PaintTarget, picture: Picture): void {
	const g = picture.gesture;
	if (g === null || !g.live || !g.name.startsWith("drag") || picture.press === null || picture.pointerAt === null) {
		scene.remove("trails", "drag line");
		return;
	}
	scene.put("trails", "drag line", [{ tag: "line", attrs: { x1: picture.press.at.x, y1: picture.press.at.y, x2: picture.pointerAt.x, y2: picture.pointerAt.y, class: "drag-line" } }]);
}

/** The standing of one row for the latest fact: refused, unbound, unmet, or a hit. */
const standingOf = (record: TraceRecord | undefined): string => (record === undefined ? "" : record.refusedBy !== null ? "refused" : record.on !== true ? "unbound" : record.when !== true ? "unmet" : "hit");

/** One row of the legend: its standing for the latest fact, the input and the meaning marked, and its words. */
function legendShapes(entry: BindingEntry<TesterRow>, index: number, picture: Picture): Shape[] {
	const input = picture.legend?.input.find((r) => r.id === entry.id);
	const meaning = picture.legend?.meaning?.find((r) => r.id === entry.id);
	const mark = input?.hit ? "input" : meaning?.hit ? "meaning" : standingOf(input);
	const y = 46 + index * 19;
	return [{ tag: "g", attrs: { class: `legend-row legend-${mark || "none"}` }, children: [text(LEGEND_X, y, "legend-standing", mark), text(LEGEND_X + 54, y, "legend-words", entry.row.words)] }];
}

/** Paints the status line and the held keys' lines. */
function paintStatus(scene: PaintTarget, view: PaintView, picture: Picture): void {
	const [first, second] = statusWords(picture, view.threshold);
	scene.put("panel", "status line", [{ tag: "text", attrs: { x: PANEL_X, y: 352, class: "status-line" }, children: [{ tag: "tspan", attrs: { x: PANEL_X, y: 352 }, text: first }, { tag: "tspan", attrs: { x: PANEL_X, y: 368 }, text: second }] }]);
	const lines = heldKeyLines(picture);
	scene.put("panel", "held keys", [{ tag: "text", attrs: { x: PANEL_X, y: 388, class: "held-keys" }, children: lines.map((line, i) => ({ tag: "tspan", attrs: { x: PANEL_X, y: 388 + i * 16 }, text: line })) }]);
}

/** Paints the log, newest first, a fixed number of lines. */
function paintLog(scene: PaintTarget, view: PaintView, picture: Picture): void {
	for (let i = 0; i < LOG_LINES; i++) {
		const entry = picture.log[i];
		scene.put("panel", `log line ${i}`, [text(PANEL_X, 488 + i * 16, i === 0 ? "log-line newest" : "log-line", entry === undefined ? "" : logLineWords(entry, view))]);
	}
}

/** Paints the legend: every row of the table with its standing for the latest fact. */
function paintLegend(scene: PaintTarget, view: PaintView, picture: Picture): void {
	view.rows.forEach((entry, i) => scene.put("panel", `legend ${entry.id}`, legendShapes(entry, i, picture)));
}

/** Paints every key, as the labels name them now: at the first paint, and again when the Keyboard Map answers. */
export function paintEveryKey(scene: PaintTarget, view: PaintView, picture: Picture): void {
	for (const key of view.placed.keys.values()) putKey(scene, key, view, picture);
	const sources = new Set([...view.labels.values()].map((l) => l.source));
	const labelsLine = sources.has("reported") ? "Labels: a plain label is the one your keyboard map reported; a slanted label is the plan's printing, assumed." : "Labels: every label is the plan's printing, assumed -- the browser reported no keyboard map.";
	scene.put("panel", "labels line", [text(PANEL_X, 326, "notice", labelsLine)]);
}

/** Paints the whole page from the record: every key, the mouse, the panel's fixed lines, and every entry of the record. */
export function paintWholePage(scene: PaintTarget, view: PaintView, picture: Picture): void {
	paintEveryKey(scene, view, picture);
	paintMouse(scene, view, picture);
	paintWheel(scene, view, picture);
	paintTrail(scene, picture);
	scene.put("panel", "plan line", [{ tag: "text", attrs: { x: PANEL_X, y: 296, class: "notice plan-line" }, children: view.notices.planLine.split("\n").map((line, i) => ({ tag: "tspan", attrs: { x: PANEL_X, y: 296 + i * 14 }, text: line })) }]);
	if (!view.notices.coveredBrowser) scene.put("panel", "browser line", [text(PANEL_X, 340, "notice uncovered", UNCOVERED_BROWSER_LINE)]);
	if (view.notices.problems.length > 0) scene.put("panel", "problems", [{ tag: "text", attrs: { x: PANEL_X, y: 892, class: "problems" }, children: view.notices.problems.map((p, i) => ({ tag: "tspan", attrs: { x: PANEL_X, y: 892 + i * 14 }, text: p })) }]);
	scene.put("panel", "log heading", [text(PANEL_X, 472, "heading", "Log, newest first")]);
	scene.put("panel", "not reported", [{ tag: "text", attrs: { x: PANEL_X, y: 724, class: "not-reported" }, children: [{ tag: "tspan", attrs: { x: PANEL_X, y: 724, class: "heading" }, text: "What no page can know" }, ...NOT_REPORTED_LINES.map((line, i) => ({ tag: "tspan", attrs: { x: PANEL_X, y: 742 + i * 16 }, text: line }))] }]);
	scene.put("panel", "claims line", [text(PANEL_X, 818, "notice", CLAIMS_LINE)]);
	const notes = [...new Set([...view.placed.keys.values()].flatMap((k) => k.notes))];
	scene.put("panel", "notes key", [{ tag: "text", attrs: { x: PANEL_X, y: 838, class: "notes-key" }, children: notes.map((n, i) => ({ tag: "tspan", attrs: { x: PANEL_X, y: 838 + i * 14, class: `note-${n}` }, text: `a key's corner marked so: ${KEY_NOTE_WORDS[n]}` })) }]);
	scene.put("panel", "legend heading", [text(LEGEND_X, 22, "heading", "Every rule, and its standing for the latest fact")]);
	paintStatus(scene, view, picture);
	paintLog(scene, view, picture);
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
	if (changed.has("gesture") || changed.has("press") || changed.has("pointerAt")) paintTrail(scene, picture);
	if (["heldKeys", "unidentifiedKey", "buttons", "gesture", "press", "under"].some((e) => changed.has(e as PictureEntry))) paintStatus(scene, view, picture);
	if (changed.has("log")) paintLog(scene, view, picture);
	if (changed.has("legend")) paintLegend(scene, view, picture);
}


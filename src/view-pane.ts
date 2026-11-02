/**
 * View pane: the view the view's rows set, shown (docs/ARCHITECTURE-TARGET.md sections 5 to 7; draw's PAN-ZOOM.md
 * 3.3, PZ24, PZ30): a second scene, on an `<svg>` of its own beside the picture, declared with a view
 * (`vector-scene` 0.3.0, VS14 to VS16), so the picture of the keyboard and mouse never moves.
 *
 * It holds an unbounded square grid of 60, every point in view drawn from the scene's `visible()` by `snap-grid`'s
 * `inView` at stride 1, so the dots close up as the view zooms out, each level's emphasised points full and the rest
 * faded (`GRID_EMPHASIS` in view-steps.ts, docs/DECISIONS.md 0016), and a cross at the origin. Asked to show a view -- a centre and a level, the
 * picture state's -- it turns it into the scene's form, the drawing point at its top-left corner at the level's
 * scale, writes it with `setView` when it differs from the view written, and draws the grid again for what is now
 * visible: inside the delivery that moved the view, never later, as GT2 asks, so at most once a delivery. The grid is
 * drawn after `setView` returns rather than from an `onView` listener, inside which the scene refuses `put` (VS17).
 *
 * It draws the precision lines (PZ31), a bar at 1,000,000 and one at 2^21 from the origin, and, whenever one stands
 * in the pane, measures it as the probe did: where its left edge should be on screen by the view's arithmetic, where
 * the platform hits it, stepping an eighth of a pixel across that edge through the scene's `itemAt`, and, where the
 * page offers its geometry, where the browser reports it. Its readouts -- the level and scale, the centre, the
 * latest view row's words and each line's measure -- are drawn on a scene of their own without a view, laid over
 * the pane's top-left corner in pixels, so they stay legible whatever the picture's size, each line wrapped within
 * the pane's width, which the readouts span. Its size is read once a delivery, before anything is written, and
 * handed to it, so no write forces the page to lay itself out again before it is read.
 */
import { openGrid } from "../vendor/snap-grid/index.js";
import type { SquareGrid } from "../vendor/snap-grid/index.js";
import { openScene } from "../vendor/vector-scene/index.js";
import { wrapWords } from "./picture-painter.js";
import type { ElementSlice, Scene, SceneRoot, SceneView } from "../vendor/vector-scene/index.js";
import type { ViewPicture } from "./picture-state.js";
import { FADED_DOT_MIN_SPACING, FADED_DOT_OPACITY, PRECISION_LINES, PRECISION_LINE_WIDTH, emphasisOf, isEmphasised, levelWords, paneLaidOut, paneScale } from "./view-steps.js";
import type { PaneGeometry } from "./view-steps.js";

/** The pane's grid: square, 60 units apart, its origin at 0, 0 -- draw's default grid. */
export const PANE_GRID = Object.freeze({ shape: "square", pitch: 60, origin: Object.freeze({ x: 0, y: 0 }) });

/** The most grid points listed at once: `inView`'s bound, past which it doubles its stride and the faded points are not drawn. */
export const PANE_MAX_DOTS = 10000;

/**
 * How many cells beyond the view the grid is drawn on each side, at most: so a pan redraws it only when the view
 * leaves what was drawn, the listing kept within `PANE_MAX_DOTS` by a smaller margin, or none, when the view needs it.
 */
export const PANE_MARGIN_CELLS = 3;

/** How many points of the grid a closed rect holds, the grid's origin at 0, 0: what `inView` lists at stride 1. */
const pointsIn = (r: { readonly x: number; readonly y: number; readonly w: number; readonly h: number }, pitch: number): number => Math.max(0, Math.floor((r.x + r.w) / pitch) - Math.ceil(r.x / pitch) + 1) * Math.max(0, Math.floor((r.y + r.h) / pitch) - Math.ceil(r.y / pitch) + 1);

/** What the pane drew of its grid at its latest view: the level and its interval, the spacing on screen, the full and faded points' counts, and why the faded were left out, if they were. */
export interface PaneDots {
	readonly level: number;
	readonly interval: number;
	readonly spacing: number;
	readonly inView: number;
	readonly margin: number;
	readonly full: number;
	readonly faded: number;
	readonly floor: "spacing" | "count" | "spacing and count" | null;
	readonly draws: number;
}

/** The pane's layers, back to front, each looked through, so every press on the pane lies on open ground. */
export const PANE_LAYERS = Object.freeze([
	Object.freeze({ name: "grid", attrs: Object.freeze({ class: "pane-grid", "pointer-events": "none" }) }),
	Object.freeze({ name: "origin", attrs: Object.freeze({ class: "pane-origin", "pointer-events": "none" }) }),
	Object.freeze({ name: "precision", attrs: Object.freeze({ class: "pane-precision" }) }),
]);

/** The readouts' one layer, on their own scene without a view. */
export const READOUT_LAYERS = Object.freeze([Object.freeze({ name: "readouts", attrs: Object.freeze({ class: "pane-readouts" }) })]);

/** The readouts' monospace face at 13 pixels advances 7.83 a character, so a line holds the readouts' width less 16, over 8. */
export const READOUT_ADVANCE = 8;
const READOUT_LEADING = 17;

/** A precision line's measure: where its left edge should be on screen, where the platform hits it and where the browser reports it, each as an offset in pixels. */
export interface PrecisionMeasure {
	readonly distance: number;
	readonly expected: number;
	readonly hit: number | null;
	readonly reported: number | null;
}

/** The words of a distance as the readouts name it. */
const distanceWords = (d: number): string => (d === 2 ** 21 ? "2^21 (2,097,152)" : d === 1_000_000 ? "1,000,000" : String(d));

/** A number of pixels to a thousandth, signed. */
const signed = (n: number): string => `${n >= 0 ? "+" : ""}${Math.round(n * 1000) / 1000}`;

/** The readouts' lines for a view and the precision lines' measures, before wrapping. */
export function readoutWords(view: ViewPicture, scale: number, measures: readonly PrecisionMeasure[]): string[] {
	const tenth = (n: number): string => String(Math.round(n * 10) / 10);
	const lines = [`level ${levelWords(view.level)}, scale ${Math.round(scale * 10000) / 10000} pixels a unit`, `centre ${tenth(view.centre.x)}, ${tenth(view.centre.y)}`, view.words ?? "no view row yet"];
	for (const m of measures) lines.push(`the line at ${distanceWords(m.distance)}: should be at screen x ${Math.round(m.expected * 1000) / 1000}; hit ${m.hit === null ? "nowhere within 12 pixels" : `${signed(m.hit)} px`}; reported ${m.reported === null ? "not measured here" : `${signed(m.reported)} px`}`);
	return lines;
}

/** What the pane reads of its root beyond what the scene does: its size before any transform. */
type PaneRoot<E extends ElementSlice<E>> = SceneRoot<E>;

/** The page's means, where it offers them, to read the left edge on screen the browser reports for a precision line's element, by the line's distance. */
export type PrecisionBounds = (distance: number) => number | null;

/** An open view pane: its scene, its size and place on screen now, and the means to show a view and to close. */
export interface ViewPane<E extends ElementSlice<E> = never> {
	readonly scene: Scene<E>;
	readonly geometry: () => PaneGeometry | null;
	readonly show: (view: ViewPicture, geometry?: PaneGeometry | null) => void;
	readonly measures: () => readonly PrecisionMeasure[];
	readonly dots: () => PaneDots | null;
	readonly close: () => void;
}

/** The scene's view for a picture's view: its centre at the pane's centre, at its level's scale. */
export function sceneViewOf(view: ViewPicture, pane: PaneGeometry): SceneView {
	const scale = paneScale(pane, view.level);
	return { x: view.centre.x - pane.width / (2 * scale), y: view.centre.y - pane.height / (2 * scale), scale };
}

/** Opens the pane on its root: its scene declared with a view, its grid, and the cross at the origin; or every problem, the scene or the grid refusing. */
export function openViewPane<E extends ElementSlice<E>>(root: PaneRoot<E>, readoutsRoot?: PaneRoot<E>, boundsOf?: PrecisionBounds): { readonly ok: true; readonly pane: ViewPane<E> } | { readonly ok: false; readonly problems: readonly string[] } {
	const openedScene = openScene({ root, layers: PANE_LAYERS, view: true });
	if (!openedScene.ok) return { ok: false, problems: [`the view pane's scene refused its declaration: ${JSON.stringify(openedScene.problems)}`] };
	const openedGrid = openGrid(PANE_GRID);
	if (!openedGrid.ok) {
		openedScene.scene.close();
		return { ok: false, problems: [`the view pane's grid refused its declaration: ${JSON.stringify(openedGrid.problems)}`] };
	}
	const scene = openedScene.scene;
	const grid = openedGrid.grid as SquareGrid;
	const openedReadouts = readoutsRoot === undefined ? null : openScene({ root: readoutsRoot, layers: READOUT_LAYERS });
	if (openedReadouts !== null && !openedReadouts.ok) {
		scene.close();
		return { ok: false, problems: [`the view pane's readouts refused their declaration: ${JSON.stringify(openedReadouts.problems)}`] };
	}
	const readouts = openedReadouts === null ? null : openedReadouts.scene;
	for (const distance of PRECISION_LINES) scene.put("precision", `line ${distance}`, [{ tag: "rect", attrs: { x: distance, y: -1_000_000, width: PRECISION_LINE_WIDTH, height: 2_000_000, class: `precision-line precision-${distance}` } }]);
	let measured: readonly PrecisionMeasure[] = [];
	scene.put("origin", "cross", [
		{ tag: "line", attrs: { x1: -30, y1: 0, x2: 30, y2: 0, class: "pane-cross" } },
		{ tag: "line", attrs: { x1: 0, y1: -30, x2: 0, y2: 30, class: "pane-cross" } },
	]);
	const geometry = (): PaneGeometry | null => {
		const m = root.getScreenCTM();
		const g = { width: root.clientWidth ?? 0, height: root.clientHeight ?? 0, left: m?.e ?? 0, top: m?.f ?? 0 };
		return paneLaidOut(g) ? g : null;
	};
	/** The grids of the emphasised points alone, one per interval, opened as an interval is first asked: a grid of 60 times the interval, its origin the origin's. */
	const emphasisGrids = new Map<number, SquareGrid>([[1, grid]]);
	const emphasisGrid = (interval: number): SquareGrid => {
		const known = emphasisGrids.get(interval);
		if (known !== undefined) return known;
		const opened = openGrid({ ...PANE_GRID, pitch: PANE_GRID.pitch * interval });
		const g = (opened.ok ? opened.grid : grid) as SquareGrid;
		emphasisGrids.set(interval, g);
		return g;
	};
	let drawnDots: PaneDots | null = null;
	let drawnRegion: { x: number; y: number; w: number; h: number } | null = null;
	let draws = 0;
	/** Whether the grid must be drawn again for a level: never drawn, another level or scale, or the view not within what was drawn. */
	const gridStale = (level: number): boolean => {
		if (drawnDots === null || drawnRegion === null || drawnDots.level !== level) return true;
		const { region, scale } = scene.visible();
		if (PANE_GRID.pitch * scale !== drawnDots.spacing) return true;
		return region.x < drawnRegion.x || region.y < drawnRegion.y || region.x + region.w > drawnRegion.x + drawnRegion.w || region.y + region.h > drawnRegion.y + drawnRegion.h;
	};
	/** One path of a zero-length stroke at each point, drawn round at a fixed size on screen by its class. */
	const dotsPath = (points: readonly { readonly x: number; readonly y: number }[]): string => points.map((p) => `M${p.x} ${p.y}h0`).join("");
	/**
	 * Draws the grid for what the pane shows now, at a level: every point in view, listed at stride 1, the emphasised
	 * ones full and the rest at the faded opacity -- unless the points would stand closer than the faded points' least
	 * spacing on screen, or listing them would pass `inView`'s bound, when the emphasised points alone are drawn.
	 */
	const drawGrid = (level: number): void => {
		const visible = scene.visible();
		const interval = emphasisOf(level);
		const spacing = PANE_GRID.pitch * visible.scale;
		const v = visible.region;
		const grown = (m: number) => ({ kind: "rect" as const, x: v.x - m * PANE_GRID.pitch, y: v.y - m * PANE_GRID.pitch, w: v.w + 2 * m * PANE_GRID.pitch, h: v.h + 2 * m * PANE_GRID.pitch });
		let margin = PANE_MARGIN_CELLS;
		while (margin > 0 && pointsIn(grown(margin), PANE_GRID.pitch) > PANE_MAX_DOTS) margin--;
		const region = grown(margin);
		const listing = grid.inView({ region, scale: visible.scale }, { minSpacing: 0, max: PANE_MAX_DOTS });
		const tooMany = listing.stride !== 1;
		const tooClose = spacing < FADED_DOT_MIN_SPACING;
		let full: { x: number; y: number }[];
		let faded: { x: number; y: number }[] = [];
		if (!tooMany && !tooClose) {
			full = [];
			for (const p of listing.positions) (isEmphasised(p.position.col, p.position.row, interval) ? full : faded).push(p.point);
		} else full = emphasisGrid(interval).inView({ region, scale: visible.scale }, { minSpacing: 0, max: PANE_MAX_DOTS }).positions.map((p) => p.point);
		scene.put("grid", "dots", [{ tag: "path", attrs: { d: dotsPath(full), class: "pane-dots" } }]);
		scene.put("grid", "faded dots", [{ tag: "path", attrs: { d: dotsPath(faded), class: "pane-dots pane-dots-faded", opacity: FADED_DOT_OPACITY } }]);
		drawnRegion = region;
		draws++;
		drawnDots = Object.freeze({ level, interval, spacing, inView: pointsIn(v, PANE_GRID.pitch), margin, full: full.length, faded: faded.length, floor: tooMany && tooClose ? "spacing and count" : tooMany ? "count" : tooClose ? "spacing" : null, draws });
	};
	/** Measures each precision line whose left edge stands in the pane, as the probe did: expected by the view's arithmetic, hit by `itemAt` an eighth of a pixel at a time, reported by the page's geometry where it offers it. */
	const measure = (g: PaneGeometry): PrecisionMeasure[] => {
		const out: PrecisionMeasure[] = [];
		const y = g.top + g.height / 2;
		for (const distance of PRECISION_LINES) {
			const expected = scene.toScreen({ x: distance, y: 0 }).x;
			if (expected < g.left || expected > g.left + g.width) continue;
			let hit: number | null = null;
			for (let k = -96; k <= 96 && hit === null; k++) if (scene.itemAt({ x: expected + k / 8, y })?.key === `line ${distance}`) hit = k / 8;
			const reported = boundsOf?.(distance) ?? null;
			out.push({ distance, expected, hit, reported: reported === null ? null : reported - expected });
		}
		return out;
	};
	/** Draws the readouts, each line wrapped within the readouts' width in the monospace face. */
	const drawReadouts = (view: ViewPicture, g: PaneGeometry): void => {
		if (readouts === null || readoutsRoot === undefined) return;
		const width = Math.max(20, Math.floor((g.width - 16) / READOUT_ADVANCE));
		const lines = readoutWords(view, scene.view().scale, measured).flatMap((line) => wrapWords(line, width));
		readouts.put("readouts", "lines", [{ tag: "text", attrs: { x: 8, y: 20, class: "readout" }, children: lines.map((line, i) => ({ tag: "tspan", attrs: { x: 8, y: 20 + i * READOUT_LEADING }, text: line })) }]);
	};
	let shownWords: string | null | undefined;
	const pane: ViewPane<E> = {
		scene,
		geometry,
		show: (view, given) => {
			const g = given === undefined ? geometry() : given;
			if (g === null) return;
			const next = sceneViewOf(view, g);
			const now = scene.view();
			const moved = next.x !== now.x || next.y !== now.y || next.scale !== now.scale;
			if (moved) {
				scene.setView(next);
				if (gridStale(view.level)) drawGrid(view.level);
				measured = measure(g);
			}
			if (moved || view.words !== shownWords) {
				shownWords = view.words;
				drawReadouts(view, g);
			}
		},
		measures: () => measured,
		dots: () => drawnDots,
		close: () => {
			readouts?.close();
			scene.close();
		},
	};
	return { ok: true, pane };
}

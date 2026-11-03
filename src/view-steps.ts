/**
 * View steps: what each of the view's rows does to the view, as numbers (docs/ARCHITECTURE-TARGET.md section 6,
 * the view's rows; draw's PAN-ZOOM.md section 3.6, PZ12, PZ17).
 *
 * A wheel's deltas normalised by their unit -- pixels as given, a line 40 pixels, a page the surface's height --
 * so three lines and 120 pixels mean alike; a pinch's normalised `deltaY` accumulated and the view stepping one
 * zoom level per 100 pixels crossed, out for a positive delta and in for a negative, never between levels; and a
 * pan by its travel on screen. The levels are the one place they are held here, so a change is one edit.
 */

/** The zoom levels, nearest first: 0.5x twice as close as the default, 1x the default, 2x and 3x farther out (PZ12). */
export const ZOOM_LEVELS: readonly number[] = Object.freeze([0.5, 1, 2, 3]);

/** One tier of the grid at a level: the points whose cell indices are both multiples of `every`, drawn at `opacity`. */
export interface GridTier {
	readonly every: number;
	readonly opacity: number;
}

const tier = (every: number, opacity: number): GridTier => Object.freeze({ every, opacity });

/**
 * The grid's tiers at each level, coarsest first (the director's rulings, docs/DECISIONS.md 0016 and 0018; draw's PZ24
 * as restated, which names it so): every grid point is drawn at every level, so the dots close up as the view zooms
 * out, and a point takes the first tier whose `every` divides both its cell indices -- a grid within a grid, the
 * origin always in the first, full tier. Up close every point is full; at 2x every fourth full and the three between
 * at half opacity; at 3x every tenth full, every second at half and the rest at a quarter, so a row through a full dot
 * runs full, 25, 50, 25, ... 25, full and the rows between are all at a quarter. Held here beside the levels, to be
 * tuned by one edit; a level the table does not name draws every point full.
 */
export const GRID_TIERS: Readonly<Record<number, readonly GridTier[]>> = Object.freeze({
	0.5: Object.freeze([tier(1, 1)]),
	1: Object.freeze([tier(1, 1)]),
	2: Object.freeze([tier(4, 1), tier(1, 0.5)]),
	3: Object.freeze([tier(10, 1), tier(2, 0.5), tier(1, 0.25)]),
});

/**
 * The least spacing on screen, in pixels, at which a faded tier's points are drawn -- its spacing `every` times the
 * pitch times the scale; closer, the tier is left out; named as draw's design names it. 0 for the lab's try of every
 * dot drawn at every level (docs/DECISIONS.md 0019, the director's "showing all dots at 3x zoom (not dropping out?)"),
 * so it never applies; 4, `0018`'s, is one edit away.
 */
export const GRID_FLOOR = 0;

/**
 * The most grid points the pane lists at once, a tier's or the margin's: past it a faded tier is left out, the finest
 * first, and the full tier's lattice thinned from the origin by `inView`'s own stride doubling (`0017`, `0018`). 25,000
 * lists every point in view and 3 cells beyond at stride 1 at the Chromebook's three windows in both sizes of the pane,
 * the most 22,557 (the small pane at 3x on 1536 by 750, measured), with room for a taller window (`0019`).
 */
export const GRID_MAX = 25000;

/** A level's tiers: the table's, or every point full. */
export const tiersOf = (level: number): readonly GridTier[] => GRID_TIERS[level] ?? [tier(1, 1)];

/** Whether a grid point, by its cell indices, lies on a tier's lattice: both indices multiples of its `every`, so 0, 0 always does. */
export const onTier = (col: number, row: number, every: number): boolean => col % every === 0 && row % every === 0;

/** The tier a grid point takes among the first `count` of a level's tiers: the first, coarsest first, whose lattice it lies on. */
export function tierOf(col: number, row: number, tiers: readonly GridTier[], count = tiers.length): number {
	for (let i = 0; i < count; i++) if (onTier(col, row, (tiers[i] as GridTier).every)) return i;
	return count - 1;
}

/** The level the view opens at: the default, 1x. */
export const DEFAULT_ZOOM_LEVEL = 1;

/** How many normalised pixels of a pinch make one level's step: 100, to be calibrated on the director's Chromebook. */
export const ZOOM_STEP_PIXELS = 100;

/** How many pixels a line of a wheel's delta is: 40. */
export const LINE_PIXELS = 40;

/**
 * A wheel's delta in pixels by its unit, `deltaMode` 0 pixels as given, 1 lines of 40 pixels, 2 pages of
 * `pagePixels`; null where the unit is not reported or the page's height is not a finite number above 0.
 */
export function normalisedDelta(delta: number, deltaMode: 0 | 1 | 2 | null, pagePixels: number): number | null {
	if (deltaMode === 0) return delta;
	if (deltaMode === 1) return delta * LINE_PIXELS;
	if (deltaMode === 2 && Number.isFinite(pagePixels) && pagePixels > 0) return delta * pagePixels;
	return null;
}

/** A pinch's step: the level before and after, how many levels it stepped, the accumulator after, and whether what remained past an end level was dropped. */
export interface ZoomStep {
	readonly from: number;
	readonly to: number;
	readonly steps: number;
	readonly acc: number;
	readonly dropped: boolean;
}

/**
 * Steps the zoom by one pinch's normalised `deltaY` (section 3.6's accumulator): a delta of the other sign from the
 * accumulator first sets it to 0; the accumulator gains the delta; while it holds at least one step's pixels and a
 * level lies that way, the level steps once and the accumulator loses one step, keeping the remainder; and where
 * no level lies the way the accumulator points, what remains is dropped and it is set to 0.
 */
export function stepZoom(level: number, acc: number, delta: number): ZoomStep {
	const from = level;
	let index = ZOOM_LEVELS.indexOf(level);
	if (index === -1) throw new Error(`stepZoom: ${level} is no zoom level`);
	let held = delta !== 0 && acc !== 0 && Math.sign(delta) !== Math.sign(acc) ? 0 : acc;
	held += delta;
	let steps = 0;
	while (Math.abs(held) >= ZOOM_STEP_PIXELS) {
		const next = index + Math.sign(held);
		if (next < 0 || next >= ZOOM_LEVELS.length) break;
		index = next;
		held -= Math.sign(held) * ZOOM_STEP_PIXELS;
		steps++;
	}
	const way = Math.sign(held);
	const dropped = way !== 0 && (index + way < 0 || index + way >= ZOOM_LEVELS.length);
	return Object.freeze({ from, to: ZOOM_LEVELS[index] as number, steps, acc: dropped ? 0 : held + 0, dropped });
}

/** A level as the page writes it: `0.5x`, `1x`, `2x`, `3x`. */
export const levelWords = (level: number): string => `${level}x`;

/** A screen distance's length, its travel on screen in pixels. */
export const screenDistance = (dx: number, dy: number): number => Math.hypot(dx, dy);

/**
 * The view pane's size and place on screen, as the composition root reads them at each delivery: its root's
 * `clientWidth` and `clientHeight`, in CSS pixels -- its root carries no `viewBox`, so a root unit is a pixel --
 * and the screen point of its top-left corner.
 */
export interface PaneGeometry {
	readonly width: number;
	readonly height: number;
	readonly left: number;
	readonly top: number;
}

/** The frame whose fit is the default level's scale: draw's old 1920 by 1080 canvas (PZ7), so a level shows the same proportion as draw's canvas of the pane's size would. */
export const DEFAULT_FRAME = Object.freeze({ w: 1920, h: 1080 });

/** Whether a pane is laid out: a width and a height, each a finite number above 0. */
export const paneLaidOut = (pane: PaneGeometry | null): pane is PaneGeometry => pane !== null && Number.isFinite(pane.width) && Number.isFinite(pane.height) && pane.width > 0 && pane.height > 0;

/** The pane's scale at a level, its screen pixels per drawing unit: the default frame's fit in the pane, over the level. */
export function paneScale(pane: PaneGeometry, level: number): number {
	return Math.min(pane.width / DEFAULT_FRAME.w, pane.height / DEFAULT_FRAME.h) / level;
}

/** Whether a screen point lies on the pane, its edges included. */
export const onPane = (pane: PaneGeometry, p: { readonly x: number; readonly y: number }): boolean => p.x >= pane.left && p.x <= pane.left + pane.width && p.y >= pane.top && p.y <= pane.top + pane.height;

/**
 * The pane's centre after a change of scale that keeps the drawing point under the screen point `pivot` where it is
 * -- `vector-scene`'s `zoomAbout` (VS16) restated for a centre: `r` the pivot's offset from the pane's centre on
 * screen, `p = centre + r / from` the drawing point under it, and the centre `p - r / to`.
 */
export function centreKeeping(centre: { readonly x: number; readonly y: number }, pane: PaneGeometry, pivot: { readonly x: number; readonly y: number }, from: number, to: number): { x: number; y: number } {
	const rx = pivot.x - (pane.left + pane.width / 2);
	const ry = pivot.y - (pane.top + pane.height / 2);
	return { x: centre.x + rx / from - rx / to, y: centre.y + ry / from - ry / to };
}

/**
 * The precision lines (PZ31): the distances from the origin at which the pane draws a line, so the director can see
 * on the Chromebook where each is drawn and hit against where it should be -- 1,000,000, the bound draw's
 * coordinates keep, and 2^21, 2,097,152, past the budget `coordinate-precision.mjs` measured in headless Chrome.
 */
export const PRECISION_LINES: readonly number[] = Object.freeze([1_000_000, 2 ** 21]);

/** A precision line's width in drawing units: four cells of the grid, so it stands clear at every level. */
export const PRECISION_LINE_WIDTH = 240;


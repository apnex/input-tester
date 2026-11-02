/**
 * View pane: the view the view's rows set, shown (docs/ARCHITECTURE-TARGET.md sections 5 to 7; draw's PAN-ZOOM.md
 * 3.3, PZ24, PZ30): a second scene, on an `<svg>` of its own beside the picture, declared with a view
 * (`vector-scene` 0.3.0, VS14 to VS16), so the picture of the keyboard and mouse never moves.
 *
 * It holds an unbounded square grid of 60, drawn from the scene's `visible()` by `snap-grid`'s `inView`, thinned to
 * a least spacing of 24 screen pixels, and a cross at the origin. Asked to show a view -- a centre and a level, the
 * picture state's -- it turns it into the scene's form, the drawing point at its top-left corner at the level's
 * scale, writes it with `setView` when it differs from the view written, and draws the grid again for what is now
 * visible: inside the delivery that moved the view, never later, as GT2 asks, so at most once a delivery. The grid is
 * drawn after `setView` returns rather than from an `onView` listener, inside which the scene refuses `put` (VS17).
 */
import { openGrid } from "../vendor/snap-grid/index.js";
import type { SquareGrid } from "../vendor/snap-grid/index.js";
import { openScene } from "../vendor/vector-scene/index.js";
import type { ElementSlice, Scene, SceneRoot, SceneView } from "../vendor/vector-scene/index.js";
import type { ViewPicture } from "./picture-state.js";
import { paneLaidOut, paneScale } from "./view-steps.js";
import type { PaneGeometry } from "./view-steps.js";

/** The pane's grid: square, 60 units apart, its origin at 0, 0 -- draw's default grid. */
export const PANE_GRID = Object.freeze({ shape: "square", pitch: 60, origin: Object.freeze({ x: 0, y: 0 }) });

/** The least spacing of the grid's dots on screen, in pixels (PZ24), and the most dots drawn at once. */
export const PANE_MIN_SPACING = 24;
export const PANE_MAX_DOTS = 10000;

/** The pane's layers, back to front, each looked through, so every press on the pane lies on open ground. */
export const PANE_LAYERS = Object.freeze([
	Object.freeze({ name: "grid", attrs: Object.freeze({ class: "pane-grid", "pointer-events": "none" }) }),
	Object.freeze({ name: "origin", attrs: Object.freeze({ class: "pane-origin", "pointer-events": "none" }) }),
]);

/** What the pane reads of its root beyond what the scene does: its size before any transform. */
type PaneRoot<E extends ElementSlice<E>> = SceneRoot<E>;

/** An open view pane: its scene, its size and place on screen now, and the means to show a view and to close. */
export interface ViewPane<E extends ElementSlice<E> = never> {
	readonly scene: Scene<E>;
	readonly geometry: () => PaneGeometry | null;
	readonly show: (view: ViewPicture) => void;
	readonly close: () => void;
}

/** The scene's view for a picture's view: its centre at the pane's centre, at its level's scale. */
export function sceneViewOf(view: ViewPicture, pane: PaneGeometry): SceneView {
	const scale = paneScale(pane, view.level);
	return { x: view.centre.x - pane.width / (2 * scale), y: view.centre.y - pane.height / (2 * scale), scale };
}

/** Opens the pane on its root: its scene declared with a view, its grid, and the cross at the origin; or every problem, the scene or the grid refusing. */
export function openViewPane<E extends ElementSlice<E>>(root: PaneRoot<E>): { readonly ok: true; readonly pane: ViewPane<E> } | { readonly ok: false; readonly problems: readonly string[] } {
	const openedScene = openScene({ root, layers: PANE_LAYERS, view: true });
	if (!openedScene.ok) return { ok: false, problems: [`the view pane's scene refused its declaration: ${JSON.stringify(openedScene.problems)}`] };
	const openedGrid = openGrid(PANE_GRID);
	if (!openedGrid.ok) {
		openedScene.scene.close();
		return { ok: false, problems: [`the view pane's grid refused its declaration: ${JSON.stringify(openedGrid.problems)}`] };
	}
	const scene = openedScene.scene;
	const grid = openedGrid.grid as SquareGrid;
	scene.put("origin", "cross", [
		{ tag: "line", attrs: { x1: -30, y1: 0, x2: 30, y2: 0, class: "pane-cross" } },
		{ tag: "line", attrs: { x1: 0, y1: -30, x2: 0, y2: 30, class: "pane-cross" } },
	]);
	const geometry = (): PaneGeometry | null => {
		const m = root.getScreenCTM();
		const g = { width: root.clientWidth ?? 0, height: root.clientHeight ?? 0, left: m?.e ?? 0, top: m?.f ?? 0 };
		return paneLaidOut(g) ? g : null;
	};
	/** Draws the grid's dots for what the pane shows now: one path of a zero-length stroke at each position in view, drawn round at a fixed size on screen by its class. */
	const drawGrid = (): void => {
		const { positions } = grid.inView(scene.visible(), { minSpacing: PANE_MIN_SPACING, max: PANE_MAX_DOTS });
		scene.put("grid", "dots", [{ tag: "path", attrs: { d: positions.map((p) => `M${p.point.x} ${p.point.y}h0`).join(""), class: "pane-dots" } }]);
	};
	const pane: ViewPane<E> = {
		scene,
		geometry,
		show: (view) => {
			const g = geometry();
			if (g === null) return;
			const next = sceneViewOf(view, g);
			const now = scene.view();
			if (next.x === now.x && next.y === now.y && next.scale === now.scale) return;
			scene.setView(next);
			drawGrid();
		},
		close: () => scene.close(),
	};
	return { ok: true, pane };
}

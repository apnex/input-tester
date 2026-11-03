/**
 * Composition root: composes the page from its parts, and switches each fact to the router by its family
 * (docs/ARCHITECTURE-TARGET.md sections 5 and 7, P8).
 *
 * It opens the grid, the table and the session, the scene on the page's `<svg>` -- which appends its four
 * layers -- and the capture, each from its part's opening function imported by relative path from the
 * release's `vendor` folder (IT-D1); a refused opening shows its problems on the page. It hands the capture a
 * delivery that switches on the fact's family and calls the router, gives the router's verdict to the picture
 * state, and has the painter put what changed, all inside that one delivery (P3). The plan is the address's
 * `plan` parameter, so a bookmark keeps it and nothing is stored; the Keyboard Map is asked once, and every key
 * is painted again when it answers.
 */
import { openCapture } from "../vendor/input-capture/index.js";
import type { CaptureKeySource, CaptureReply, CaptureSurface } from "../vendor/input-capture/index.js";
import { composeBindingTable, openGestureSession } from "../vendor/input-binding/index.js";
import { openScene } from "../vendor/vector-scene/index.js";
import type { ElementSlice, SceneRoot } from "../vendor/vector-scene/index.js";
import { openGrid } from "../vendor/snap-grid/index.js";
import type { SquareGrid } from "../vendor/snap-grid/index.js";
import { TESTER_SESSION_DECLARATION, TESTER_TABLE_DECLARATION } from "./input-bindings.js";
import type { DeliveredFact } from "./input-bindings.js";
import { openInputRouter } from "./input-router.js";
import type { InputRouter, Verdict } from "./input-router.js";
import { askKeyboardMap, labelsFromKeyboardMap, labelsPrintedOnPlan } from "./key-labels.js";
import type { KeyboardMapSource } from "./key-labels.js";
import { FULL_SIZE_ANSI_PLAN, KEYBOARD_PLANS, QUARTER_KEY_GRID, placePlanOnGrid } from "./keyboard-plans.js";
import type { KeyboardPlan, PlanName } from "./keyboard-plans.js";
import { SCENE_LAYERS, paintEveryKey, paintPictureChanges, paintRefusedOpening, paintWholePage } from "./picture-painter.js";
import type { PaintView } from "./picture-painter.js";
import { tuningFromAddress, tuningNotes } from "./address-tuning.js";
import type { AddressTuning } from "./address-tuning.js";
import { EMPTY_PICTURE, applyPaneButton, applyPaneGeometry, applyVerdict } from "./picture-state.js";
import type { Picture, PictureEntry } from "./picture-state.js";
import { openViewPane } from "./view-pane.js";
import type { PaneDots, PrecisionBounds, ViewPane } from "./view-pane.js";
import type { PaneGeometry } from "./view-steps.js";

/** What the browser says of itself, as the covered-browsers notice reads it: the brands of `navigator.userAgentData`, where it has one. */
export interface BrowserBrands {
	readonly userAgentData?: { readonly brands?: readonly { readonly brand: string }[] } | undefined;
}

/**
 * The platform the page is composed on: the `<svg>` it draws on and listens to, the key source, its address, and
 * the browser's `navigator`; and, when the page holds them, the view pane's `<svg>`, which it shows the view on and
 * listens to as well, the `<svg>` its readouts are drawn on, the page's means to read where the browser reports a
 * precision line, and the pane's buttons: the reticle, whose press brings the view home, and one to each precision line.
 */
export interface TesterPlatform<E extends ElementSlice<E>> {
	readonly surface: SceneRoot<E> & CaptureSurface;
	readonly keySource: CaptureKeySource;
	readonly address: string;
	readonly browser: KeyboardMapSource & BrowserBrands;
	readonly pane?: SceneRoot<E> & CaptureSurface;
	readonly paneReadouts?: SceneRoot<E>;
	readonly precisionBounds?: PrecisionBounds;
	readonly reticle?: PaneButton;
	readonly goMillion?: PaneButton;
	readonly goTwoTo21?: PaneButton;
	readonly paneSize?: { readonly large: (on: boolean) => void };
	readonly paneLarge?: PaneButton;
	readonly paneSmall?: PaneButton;
}

/** A button of the page's, whose press the composition root listens for. */
export interface PaneButton {
	readonly addEventListener: (type: "click", listener: () => void) => void;
}

/** The composed page, as the proof reads it: the record of what is shown, the latest verdict, the plan, any problems, the view pane's scene view written, and close. */
export interface TesterPage {
	readonly picture: Picture;
	readonly paneView: { readonly x: number; readonly y: number; readonly scale: number } | null;
	readonly precision: readonly { readonly distance: number; readonly expected: number; readonly hit: number | null; readonly reported: number | null }[];
	readonly paneDots: PaneDots | null;
	readonly tuning: AddressTuning;
	readonly latestVerdict: Verdict | null;
	readonly plan: PlanName;
	readonly problems: readonly string[];
	readonly close: () => void;
}

/** The plan the address's `plan` parameter names, full-size ANSI when it names none, and what it asked for. */
export function planFromAddress(address: string): { readonly plan: KeyboardPlan; readonly asked: string | null } {
	const asked = new URL(address).searchParams.get("plan");
	const plan = asked === "ansi" || asked === "chromebook" ? KEYBOARD_PLANS[asked] : FULL_SIZE_ANSI_PLAN;
	return { plan, asked };
}

/** The line naming the plan drawn, what it is, and how to choose the other. */
export function planLineWords(plan: KeyboardPlan, asked: string | null): string {
	const refused = asked !== null && asked !== plan.name ? `The address's plan "${asked}" names no plan, so ` : "";
	return `${refused}Plan: ${plan.title}, ${plan.caveat}.\nChoose a plan above, or with ?plan=ansi or ?plan=chromebook in the address: a bookmark keeps it, and nothing is stored.`;
}

/** Whether the browser is one input-tester covers: `navigator.userAgentData` naming Chromium (IT-D12). */
export function isChromiumBrowser(browser: BrowserBrands): boolean {
	return browser.userAgentData?.brands?.some((b) => b.brand === "Chromium") === true;
}

/** Each fact to the router's route for its family: keys, focus lost, and a mouse's press, move, release and cancel; every other fact alone. */
export function routeByFamily(router: InputRouter, fact: DeliveredFact, reply: CaptureReply): Verdict {
	switch (fact.type) {
		case "key-down":
		case "key-up":
			return router.routeKeyFact(fact, reply);
		case "blur":
			return router.routeFocusLost(fact, reply);
		case "down":
			return fact.pointerType === "mouse" ? router.routeMousePress(fact, reply) : router.routeFactAlone(fact, reply);
		case "move":
			return fact.pointerType === "mouse" ? router.routeMouseMove(fact, reply) : router.routeFactAlone(fact, reply);
		case "up":
			return fact.pointerType === "mouse" ? router.routeMouseRelease(fact, reply) : router.routeFactAlone(fact, reply);
		case "cancel":
			return fact.pointerType === "mouse" ? router.routeMouseCancel(fact, reply) : router.routeFactAlone(fact, reply);
		default:
			return router.routeFactAlone(fact, reply);
	}
}

/** Composes the page on its platform: every part opened, the first paint made, the capture listening. */
export function composeTesterPage<E extends ElementSlice<E>>(platform: TesterPlatform<E>): TesterPage {
	const { plan, asked } = planFromAddress(platform.address);
	// the view's values, tuned by the lab's address where its host honours it, read once as the page opens (0022)
	const addressTuning = tuningFromAddress(platform.address);
	const tuning = addressTuning.tuning;
	const openedScene = openScene({ root: platform.surface, layers: SCENE_LAYERS });
	if (!openedScene.ok) throw new Error(`composeTesterPage: the scene refused the page's svg, so nothing can be shown: ${JSON.stringify(openedScene.problems)}`);
	const scene = openedScene.scene;
	const problems: string[] = [];
	const openedGrid = openGrid(QUARTER_KEY_GRID);
	if (!openedGrid.ok) problems.push(`the grid refused its declaration: ${JSON.stringify(openedGrid.problems)}`);
	const openedTable = composeBindingTable(TESTER_TABLE_DECLARATION);
	if (!openedTable.ok) problems.push(`the table refused its declaration: ${JSON.stringify(openedTable.problems)}`);
	const openedSession = openGestureSession(TESTER_SESSION_DECLARATION);
	if (!openedSession.ok) problems.push(`the session refused its declaration: ${JSON.stringify(openedSession.problems)}`);
	const notices = { planLine: planLineWords(plan, asked), coveredBrowser: isChromiumBrowser(platform.browser), problems };
	if (!openedGrid.ok || !openedTable.ok || !openedSession.ok) {
		paintRefusedOpening(scene, problems);
		return Object.freeze({ picture: EMPTY_PICTURE, latestVerdict: null, paneView: null, precision: [], paneDots: null, tuning: addressTuning, plan: plan.name, problems: Object.freeze(problems), close: () => scene.close() });
	}
	const table = openedTable.table;
	const router = openInputRouter(table, openedSession.session);
	let view: PaintView = { placed: placePlanOnGrid(openedGrid.grid as SquareGrid, plan), labels: labelsPrintedOnPlan(plan), rows: table.rows, threshold: openedSession.session.declaration.threshold, notices };
	let picture: Picture = EMPTY_PICTURE;
	let latestVerdict: Verdict | null = null;
	let pane: ViewPane<E> | null = null;
	if (platform.pane !== undefined) {
		const openedPane = openViewPane(platform.pane, platform.paneReadouts, platform.precisionBounds, tuning, tuningNotes(addressTuning));
		if (openedPane.ok) pane = openedPane.pane;
		else problems.push(...openedPane.problems);
	}
	if (pane !== null) picture = applyPaneGeometry(picture, pane.geometry()).picture;
	paintWholePage(scene, view, picture);
	pane?.show(picture.view);

	/**
	 * Puts what a change of the record changed in the picture, and shows the view on the pane at every delivery: the
	 * pane writes only when its scene view, at its size now, differs from the one written, so a pane resized since
	 * the last input is drawn again at the next, inside its delivery (GT2).
	 */
	function paintChanges(previous: Picture, changed: ReadonlySet<PictureEntry>, paneGeometry: PaneGeometry | null): void {
		paintPictureChanges(scene, view, previous, picture, changed);
		pane?.show(picture.view, paneGeometry);
	}

	/** A capture's delivery: the fact routed by its family, the verdict applied to the record with what the view's rows need of the page, and what changed put, before it returns. */
	function deliverFrom(fromPane: boolean) {
		return (fact: DeliveredFact, reply: CaptureReply): void => {
			const paneGeometry = pane?.geometry() ?? null;
			const pageHeight = fromPane ? platform.pane?.clientHeight : platform.surface.clientHeight;
			const verdict = routeByFamily(router, fact, reply);
			const previous = picture;
			const applied = applyVerdict(previous, verdict, { pagePixels: fact.type === "wheel" ? (pageHeight ?? Number.NaN) : Number.NaN, pane: paneGeometry, fromPane, tuning });
			picture = applied.picture;
			latestVerdict = verdict;
			paintChanges(previous, applied.changed, paneGeometry);
		};
	}
	const deliverFact = deliverFrom(false);

	const openedCapture = openCapture({
		surface: platform.surface,
		keys: platform.keySource,
		listen: ["wheel", "context-menu", "blur"],
		toDrawing: scene.toDrawing,
		hit: (target, fact) => scene.itemOf(target) ?? scene.itemAt(fact.screen),
		deliver: deliverFact,
	});
	const openedPaneCapture =
		pane === null || platform.pane === undefined
			? null
			: openCapture({
					surface: platform.pane,
					listen: ["wheel", "context-menu"],
					toDrawing: pane.scene.toDrawing,
					hit: (target, fact) => (pane as ViewPane<E>).scene.itemOf(target) ?? (pane as ViewPane<E>).scene.itemAt(fact.screen),
					deliver: deliverFrom(true),
				});
	if (!openedCapture.ok) problems.push(`the capture refused its declaration: ${JSON.stringify(openedCapture.problems)}`);
	if (openedPaneCapture !== null && !openedPaneCapture.ok) problems.push(`the view pane's capture refused its declaration: ${JSON.stringify(openedPaneCapture.problems)}`);
	if (problems.length > 0) paintWholePage(scene, view, picture);
	/**
	 * The header's two buttons, large and small: each sets the pane's size and, inside its own delivery, draws the
	 * pane again at its new size, its centre and level held, so no stale view is left for the next input to mend.
	 */
	for (const [button, large] of [[platform.paneLarge, true], [platform.paneSmall, false]] as const) {
		button?.addEventListener("click", () => {
			platform.paneSize?.large(large);
			const paneGeometry = pane?.geometry() ?? null;
			const previous = picture;
			const applied = applyPaneGeometry(previous, paneGeometry);
			picture = applied.picture;
			paintChanges(previous, applied.changed, paneGeometry);
		});
	}
	for (const [button, verb] of [[platform.reticle, "home"], [platform.goMillion, "go-million"], [platform.goTwoTo21, "go-two-to-21"]] as const) {
		button?.addEventListener("click", () => {
			const paneGeometry = pane?.geometry() ?? null;
			const previous = picture;
			const applied = applyPaneButton(previous, verb, paneGeometry, tuning);
			picture = applied.picture;
			paintChanges(previous, applied.changed, paneGeometry);
		});
	}
	let closed = false;
	void askKeyboardMap(platform.browser).then((map) => {
		if (map === null || closed) return;
		view = { ...view, labels: labelsFromKeyboardMap(plan, map) };
		paintEveryKey(scene, view, picture);
	});
	return Object.freeze({
		get picture() {
			return picture;
		},
		get latestVerdict() {
			return latestVerdict;
		},
		get paneView() {
			return pane === null ? null : pane.scene.view();
		},
		get precision() {
			return pane === null ? [] : pane.measures();
		},
		tuning: addressTuning,
		get paneDots() {
			return pane === null ? null : pane.dots();
		},
		plan: plan.name,
		problems: Object.freeze(problems),
		close: () => {
			closed = true;
			if (openedCapture.ok) openedCapture.capture.close();
			if (openedPaneCapture?.ok === true) openedPaneCapture.capture.close();
			pane?.close();
			scene.close();
		},
	});
}

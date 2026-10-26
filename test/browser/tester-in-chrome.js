// tester-in-chrome - the tester's built site opened in headless Chrome for the gate's browser tests
// (docs/ARCHITECTURE-TARGET.md section 8): served by the gate's own server, which sends the browser rule; every
// request the browser makes watched from before navigation through teardown; trusted input dispatched over the
// DevTools protocol's Input domain, the held buttons named on every move; and the page's record read whole from
// `globalThis.inputTester`, where the page leaves it for the proof.
//
// The page is laid out so a screen pixel is one drawing unit: the viewport is 1656 CSS pixels wide, so the
// `<svg>`, between the page's 8-pixel margins, is 1640 pixels wide, its viewBox's width -- and a press
// travelling 4 pixels travels exactly the session's threshold of 4 drawing units.
import { importBuilt, importVendored } from "../support/built-site.js";
import { launchChrome, sleep } from "./chrome-driver.js";
import { watchRequests } from "./request-monitor.js";
import { serveSite } from "./site-server.js";

const { QUARTER_KEY_GRID, KEYBOARD_PLANS, placePlanOnGrid } = await importBuilt("keyboard-plans.js");
const { openGrid } = await importVendored("snap-grid");

export const VIEWPORT = Object.freeze({ width: 1656, height: 1000 });
const grid = openGrid(QUARTER_KEY_GRID).grid;

/** The protocol's modifiers bitmask: Alt 1, Ctrl 2, Meta 4, Shift 8. */
export const MODIFIERS = Object.freeze({ alt: 1, ctrl: 2, meta: 4, shift: 8 });

/** The protocol's names for the five mouse buttons, by number, and each one's bit in `buttons`. */
export const BUTTON_NAMES = Object.freeze(["left", "middle", "right", "back", "forward"]);
import { SPEC_BUTTON_BITS } from "../support/architecture-section-6.js";

export const BUTTON_BITS = SPEC_BUTTON_BITS;

/**
 * The protocol's name for the lowest-numbered button a `buttons` value holds, or "none". Chrome keeps a taken
 * pointer only while the protocol's move names a held button in `button` as well as in `buttons`: a move naming
 * none, its bits held, loses the capture at once (measured; docs/DECISIONS.md 0002, the driver's correction).
 */
export function heldButtonName(buttons) {
	const i = BUTTON_BITS.findIndex((bit) => (buttons & bit) !== 0);
	return i === -1 ? "none" : BUTTON_NAMES[i];
}


/**
 * Opens the tester: a server for `siteDir` -- sending `headers`, a response-headers.json of a test's own, when given
 * -- Chrome, the request monitor, scripts evaluated before the page's own, and the page loaded at `query`. Answers the session and helpers; `close()` tears every part down.
 */
export async function openTesterInChrome({ siteDir, query = "", beforeLoad = [], metadata, headers, navigate = true } = {}) {
	const server = await serveSite(siteDir, { ...(metadata ? { metadata } : {}), ...(headers ? { headers } : {}) });
	let chrome;
	try {
		chrome = await launchChrome({ width: VIEWPORT.width, height: VIEWPORT.height });
		const requests = watchRequests(chrome);
		await chrome.send("Network.enable");
		await chrome.send("Page.enable");
		await chrome.send("Emulation.setDeviceMetricsOverride", { width: VIEWPORT.width, height: VIEWPORT.height, deviceScaleFactor: 1, mobile: false });
		for (const source of beforeLoad) await chrome.send("Page.addScriptToEvaluateOnNewDocument", { source });
		const tester = makeHelpers(chrome, server, requests);
		if (navigate) await tester.load(query);
		return tester;
	} catch (error) {
		await chrome?.close();
		await server.close();
		throw error;
	}
}

function makeHelpers(chrome, server, requests) {
	let screenMatrix = null;
	let plan = null;
	const page = async (expression) => JSON.parse(await chrome.evaluate(`JSON.stringify(${expression})`));
	const tester = {
		chrome,
		server,
		requests,
		page,
		/** Navigates to the entry at `query`, answering when the protocol has started the navigation. */
		navigate: (query = "") => chrome.send("Page.navigate", { url: `${server.origin}/${query}` }),
		/** Loads the entry at `query` and waits for the tester to compose. */
		async load(query = "") {
			await tester.navigate(query);
			await tester.ready();
		},
		/** Waits for the page now loading to compose the tester; reads the root's screen transform and the plan. */
		async ready() {
			for (let i = 0; i < 200 && !(await chrome.evaluate("globalThis.inputTester !== undefined").catch(() => false)); i++) await sleep(25);
			if (!(await chrome.evaluate("globalThis.inputTester !== undefined"))) throw new Error("the tester did not compose");
			await chrome.evaluate("new Promise((resolve) => requestAnimationFrame(() => resolve(true)))");
			screenMatrix = await page("(() => { const m = document.getElementById('input-surface').getScreenCTM(); return [m.a, m.b, m.c, m.d, m.e, m.f]; })()");
			plan = placePlanOnGrid(grid, KEYBOARD_PLANS[await page("inputTester.plan")]);
		},
		/** The root's screen transform, as read at the last load: [a, b, c, d, e, f]. */
		matrix: () => screenMatrix,
		/** Where a point in drawing units lies on the screen. */
		screenOf: ({ x, y }) => {
			const [a, b, c, d, e, f] = screenMatrix;
			return { x: a * x + c * y + e, y: b * x + d * y + f };
		},
		/** The screen point at a drawn key's centre, rounded to a pixel. */
		keyCentre(code) {
			const k = plan.keys.get(code);
			const s = tester.screenOf({ x: k.rect.x + k.rect.w / 2, y: k.rect.y + k.rect.h / 2 });
			return { x: Math.round(s.x), y: Math.round(s.y) };
		},
		/** The screen point at a mouse button's centre, rounded to a pixel. */
		buttonCentre(button) {
			const b = plan.mouseButtons.find((m) => m.button === button);
			const s = tester.screenOf({ x: b.rect.x + b.rect.w / 2, y: b.rect.y + b.rect.h / 2 });
			return { x: Math.round(s.x), y: Math.round(s.y) };
		},
		/**
		 * A trusted mouse event; `buttons` names every button held after it. A move names a held button in `button` too,
		 * the lowest-numbered held unless `button` is given, as a real mouse's move does and as Chrome needs to keep a
		 * taken pointer.
		 */
		mouse: (type, { x, y }, { button, buttons = 0, clickCount, modifiers = 0, pointerType = "mouse" } = {}) => chrome.send("Input.dispatchMouseEvent", { type, x, y, button: button ?? (type === "mouseMoved" ? heldButtonName(buttons) : "none"), buttons, clickCount: clickCount ?? (type === "mouseMoved" ? 0 : 1), modifiers, pointerType }),
		/** Whether the page's `<svg>` holds the capture of the mouse's pointer, 1. */
		taken: () => chrome.evaluate("document.getElementById('input-surface').hasPointerCapture(1)"),
		/** Starts recording the target of every mouse move the `<svg>` sees, forgetting those recorded before; on a page loaded since, it listens anew. */
		trackMoves: () => chrome.evaluate("if (!window.moveTargetLog) { window.moveTargetLog = []; document.getElementById('input-surface').addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') moveTargetLog.push(e.target.localName); }, true); } moveTargetLog.length = 0"),
		/** The targets of the mouse moves recorded since `trackMoves`, which it then forgets. */
		movesTracked: () => chrome.evaluate("JSON.stringify(moveTargetLog.splice(0))").then(JSON.parse),
		/**
		 * Holds the pointer taken: the `<svg>` still holds its capture, and every mouse move since `trackMoves` -- at
		 * least `atLeast` of them -- targeted the `<svg>`, for which itemOf answers nothing.
		 */
		async assertTaken(where, atLeast = 1) {
			const targets = await tester.movesTracked();
			if (!(await tester.taken())) throw new Error(`${where}: the pointer is no longer taken`);
			if (targets.length < atLeast || targets.some((t) => t !== "svg")) throw new Error(`${where}: the mouse's moves targeted ${JSON.stringify(targets)}, not the svg alone`);
		},
		/** A trusted key event. */
		key: (type, key, code, { modifiers = 0, autoRepeat = false, text, windowsVirtualKeyCode } = {}) => chrome.send("Input.dispatchKeyEvent", { type, key, code, modifiers, autoRepeat, ...(text === undefined ? {} : { text }), ...(windowsVirtualKeyCode === undefined ? {} : { windowsVirtualKeyCode }) }),
		/** A trusted wheel turn at a screen point. */
		wheel: ({ x, y }, deltaX, deltaY, modifiers = 0) => chrome.send("Input.dispatchMouseEvent", { type: "mouseWheel", x, y, deltaX, deltaY, modifiers }),
		/** How many facts the page has been delivered. */
		facts: () => chrome.evaluate("inputTester.picture.facts"),
		/** Waits until the page's count of facts holds still for 100 milliseconds, or 3 seconds pass; answers the count. */
		async settle() {
			let count = -1;
			for (let waited = 0; waited < 3000; waited += 50) {
				await sleep(50);
				const now = await tester.facts();
				if (now === count && waited >= 100) return now;
				count = now;
			}
			return count;
		},
		/** The latest verdict, summarised: the rows the delivered fact hit, its claim, and each session step, as the worked verdicts name them. */
		verdict: () =>
			page(`(() => {
				const v = inputTester.latestVerdict;
				if (v === null) return null;
				const hits = (trace) => trace.filter((r) => r.hit).map((r) => r.id);
				return {
					type: v.fact.type, button: v.fact.button, buttons: v.fact.buttons, code: v.fact.code, pointerType: v.fact.pointerType, claimed: v.claimed, hits: hits(v.trace),
					steps: v.steps.map((s) => ({ operation: s.operation, phase: s.outcome.phase ?? null, gesture: s.outcome.gesture ? s.outcome.gesture.name : null, crossed: s.outcome.crossed, taken: s.outcome.taken, trigger: s.outcome.trigger, cancelled: s.outcome.cancelled ? s.outcome.cancelled.gesture.name : undefined, tracked: s.outcome.tracked, held: s.outcome.held, meaning: s.derived ? hits(s.derived.trace) : undefined })),
				};
			})()`),
		/** The page's newest log line, as drawn. */
		newestLogLine: () => chrome.evaluate("document.querySelector('#input-surface .log-line.newest')?.textContent ?? null"),
		/** Whether the key drawn at a screen point is lit. */
		litAt: ({ x, y }) => chrome.evaluate(`(() => { const g = document.elementFromPoint(${x}, ${y})?.closest('g.key, g.mouse-button'); return g ? g.classList.contains('lit') : null; })()`),
		/** Tears down Chrome and the server; never throws. */
		async close() {
			try {
				await chrome.close();
			} finally {
				await server.close();
			}
		},
	};
	return tester;
}

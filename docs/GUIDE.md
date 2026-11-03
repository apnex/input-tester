# Using the four parts together

How `input-capture`, `input-binding`, `vector-scene` and `snap-grid` compose into one application, with input-tester's own code as the worked example.\
Each part's `README.md` is its consumer reference and its `CONTRACT.md` every rule; this guide is about what none of them can say alone: how the four fit, and the traps that bite only when they meet.

Every code example here is run by the gate, `test/browser/guide-examples.test.js`.\
A `js` example runs as a module beside the tester's own modules in a copy of the release's `app` folder, loaded by a page in headless Chrome under the very browser rule the tester is served with, so it imports the parts as the tester does, `../vendor/<part>/index.js`, and the tester's own modules as `./<module>.js`.\
An `mjs` example runs in the gate's own JavaScript runtime; a `json` example is held equal to this repository's `package.json`.

---

## 1. Who owns what

One stream runs through single-duty parts: a platform event becomes one fact, the fact is traced and matched against one table and passed through one session, the verdict becomes one record of what is shown, and the record is described to the scene, which brings the page to it.

| Concern | Owned by | In the tester |
|---|---|---|
| A platform event turned into one frozen fact, and the application's answer carried back -- claim, take the pointer | `input-capture` | one capture on the page's `<svg>`, the window as key source (`src/composition-root.ts`) |
| What a fact means: the one row it matches, whether it is claimed, and the phase it makes due for the gesture in progress | `input-binding` | one table of 43 rows and one session (`src/input-bindings.ts`), driven by the router (`src/input-router.ts`) |
| Shapes held as data under keys and shown exactly; which item a target or a screen point is over; screen and drawing coordinates | `vector-scene` | four layers on the `<svg>` (`src/picture-painter.ts`), and a second scene declared with a view on the view pane's own `<svg>`, written by `setView` (`src/view-pane.ts`) |
| Where positions lie on a grid, and the rect a block of them covers | `snap-grid` | one grid a quarter key apart, every key's rect from `span` (`src/keyboard-plans.ts`), and a grid of 60 in the view pane, every position in view listed by `inView` (`src/view-pane.ts`) |
| Which route a fact takes, what is shown, what it looks like | the application | the composition root's switch, the picture state, the painter and the stylesheet |

No part imports another.\
The application is the only place that knows all four, and the switch over fact families is its wiring, never a part's.

---

## 2. Installing and importing

Each part is released only as a tarball attached to its GitHub release, so the application names the release files and its lockfile pins their hashes.

The tester's dependencies:
```json
"dependencies": {
  "@apnex/input-binding": "https://github.com/apnex/input-binding/releases/download/v0.3.0/apnex-input-binding-0.3.0.tgz",
  "@apnex/input-capture": "https://github.com/apnex/input-capture/releases/download/v0.2.0/apnex-input-capture-0.2.0.tgz",
  "@apnex/snap-grid": "https://github.com/apnex/snap-grid/releases/download/v0.1.2/apnex-snap-grid-0.1.2.tgz",
  "@apnex/vector-scene": "https://github.com/apnex/vector-scene/releases/download/v0.3.0/apnex-vector-scene-0.3.0.tgz"
}
```

A browser loads each part as ES2022 modules, and there are two ways to name them.\
Under a strict browser rule -- scripts from the page's own origin and nothing else -- an import map is an inline script, which the rule refuses unless it carries the map's hash, a hash that changes with every release.\
So the tester takes the second way: `tools/vendor-parts.mjs` copies each installed package's `dist` folder, declarations and licence among them, into `vendor/<part>/` unchanged, the build copies `vendor/` into the release's folder, and every module imports `../vendor/<part>/index.js` by relative path, as every `js` example below does.\
TypeScript finds each part's declarations beside its files, so the compiler checks every fact and outcome the same either way.

The other way, by bare name, is what a bundler, a test runner or a page with an import map resolves:
```mjs
import { openCapture } from "@apnex/input-capture";
import { composeBindingTable, openGestureSession } from "@apnex/input-binding";
import { openScene } from "@apnex/vector-scene";
import { openGrid } from "@apnex/snap-grid";

const scene = openScene({ layers: [{ name: "things" }] });
const grid = openGrid({ shape: "square", pitch: 10, origin: { x: 0, y: 0 } });
const session = openGestureSession({ threshold: 4, gestures: [] });
const table = composeBindingTable({ tenants: [{ owner: "app", rows: [] }] });
if (!scene.ok || !grid.ok || !session.ok || !table.ok || typeof openCapture !== "function") throw new Error("a part refused its declaration");
```

---

## 3. Placing things on a grid

The tester draws every key and mouse button on one square grid of quarter-key pitch, ten drawing units to a quarter key, so a key one key wide spans four positions.\
A key's rect is `span(from, to).through` of its block, the rect through its top-left position and the one past its bottom-right (SG8), never arithmetic of the application's own.

The tester's plan placed on its grid:
```js
import { openGrid } from "../vendor/snap-grid/index.js";
import { FULL_SIZE_ANSI_PLAN, QUARTER_KEY_GRID, placePlanOnGrid } from "./keyboard-plans.js";

const opened = openGrid(QUARTER_KEY_GRID);
if (!opened.ok) throw new Error(JSON.stringify(opened.problems));
const grid = opened.grid;
const placed = placePlanOnGrid(grid, FULL_SIZE_ANSI_PLAN);
const space = placed.keys.get("Space");
const { through } = grid.span({ col: 15, row: 22 }, { col: 40, row: 26 });
if (space.rect.x !== through.x || space.rect.w !== 250 || space.rect.h !== 40) throw new Error("the space bar is not the span of its block");
```

`grid.inView(view, options)` thins positions to a spacing on screen, and its `scale` is one number: screen units per plane unit.\
The tester draws no grid, but an application that does, under a root scaled differently on each axis or sheared, must pass the smallest stretch of the root's transform -- the smaller singular value of its 2-by-2 part -- or positions crowd closer on screen than the spacing asked for.\
The obvious readings of the transform each crowd somewhere: its `a` alone, the square root of its determinant, and the shorter of its columns.

The conservative scale, and its counterexamples:
```js
import { openGrid } from "../vendor/snap-grid/index.js";

function conservativeScale({ a, b, c, d }) {
  const sum = a * a + b * b + c * c + d * d;
  const det = a * d - b * c;
  return Math.sqrt((2 * det * det) / (sum + Math.sqrt(Math.max(0, sum * sum - 4 * det * det))));
}

function closestOnScreen(entries, { a, b, c, d }) {
  let closest = Infinity;
  const points = entries.map(({ point }) => ({ x: a * point.x + c * point.y, y: b * point.x + d * point.y }));
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) closest = Math.min(closest, Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y));
  }
  return closest;
}

const { grid } = openGrid({ shape: "square", pitch: 10, origin: { x: 0, y: 0 } });
const region = { kind: "rect", x: 0, y: 0, w: 200, h: 200 };
const minSpacing = 20;
const spacingAt = (m, scale) => closestOnScreen(grid.inView({ region, scale }, { minSpacing }).positions, m);

const stretched = { a: 2, b: 0, c: 0, d: 0.5 };
const sheared = { a: 1, b: 0, c: -0.9, d: 0.3 };
const naive = [
  [stretched, stretched.a],
  [stretched, Math.sqrt(Math.abs(stretched.a * stretched.d))],
  [sheared, Math.min(Math.hypot(sheared.a, sheared.b), Math.hypot(sheared.c, sheared.d))],
];
for (const [m, scale] of naive) if (spacingAt(m, scale) >= minSpacing) throw new Error("a naive scale did not crowd");
for (const m of [stretched, sheared]) if (spacingAt(m, conservativeScale(m)) < minSpacing) throw new Error("the conservative scale crowded");
```

---

## 4. Drawing with the scene

The scene opens on the page's `<svg>` with layers back to front, each a `<g>` appended after whatever the root already holds; items are put under keys, and putting an item again writes only what its description differs by.\
The tester's four layers are `keys`, `mouse`, `trails` and `panel`, the last two declared with `pointer-events` `none` so the platform's hit test looks through them (`SCENE_LAYERS` in `src/picture-painter.ts`).

Under a strict browser rule every look is a class.\
The scene writes every attribute with `setAttribute`, and the rule's `style-src 'self'` refuses a `style` attribute written by script, so a shape described with one is drawn without its look, and silently.\
The tester's painter states every look by class, in its stylesheet, and its shapes carry only `class` and geometry.

A lit key by class, and a look by `style` refused, under the tester's own rule:
```js
import { openScene } from "../vendor/vector-scene/index.js";

const svg = document.getElementById("example-surface");
const opened = openScene({ root: svg, layers: [{ name: "keys", attrs: { class: "keys" } }, { name: "panel", attrs: { class: "panel", "pointer-events": "none" } }] });
if (!opened.ok) throw new Error(JSON.stringify(opened.problems));
const scene = opened.scene;
scene.put("keys", "key KeyA", [{ tag: "g", attrs: { class: "key lit" }, children: [{ tag: "rect", attrs: { x: 10, y: 10, width: 38, height: 38, rx: 3, class: "key-cap" } }] }]);
scene.put("keys", "a refused look", [{ tag: "rect", attrs: { x: 60, y: 10, width: 38, height: 38, class: "plain", style: "fill: rgb(1, 2, 3)" } }]);
const [lit, refused] = svg.querySelectorAll("rect");
if (getComputedStyle(lit).fill !== "rgb(242, 178, 51)") throw new Error("the stylesheet's look for a lit key did not apply");
if (getComputedStyle(refused).fill === "rgb(1, 2, 3)") throw new Error("a style attribute written by script took effect");
```

The scene also converts coordinates: `toDrawing(screen)` answers where a screen point lies in the root's own coordinates through its screen transform as it stands, which is exactly the conversion `input-capture` asks for.

---

## 5. Capturing input

One capture listens on the `<svg>`, with the window as its key source so keys arrive wherever the page's focus is, and listens also for the wheel, the context menu and focus loss.\
Hand it the scene's `toDrawing` as its conversion, so every fact's `at` is in drawing units.\
The session measures each fact's `screen` instead, declared with `measure: 'screen'`, so its threshold of 4 is 4 screen pixels whatever the scale.\
Hand it `hit` as `scene.itemOf(target) ?? scene.itemAt(fact.screen)`: once the pointer is taken every event targets the `<svg>`, for which `itemOf` answers `null`, and `itemAt` answers by the screen point instead.

Claim what the browser must not act on.\
A mouse's back and forward buttons, 3 and 4, navigate the page's history on their release, and claiming their press alone does not stop it: claim their `up` facts.\
The tester claims every button's release by its rows' `claims` flag, and its gate proves with trusted input that the back button's release navigates nowhere.

A capture composed as the tester composes it, a back button's release claimed:
```js
import { openCapture } from "../vendor/input-capture/index.js";
import { openScene } from "../vendor/vector-scene/index.js";

const svg = document.getElementById("example-surface");
const { scene } = openScene({ root: svg, layers: [{ name: "mouse" }] });
scene.put("mouse", "mouse button 3", [{ tag: "rect", attrs: { x: 100, y: 100, width: 40, height: 40 } }]);
const delivered = [];
const opened = openCapture({
  surface: svg,
  keys: window,
  listen: ["wheel", "context-menu", "blur"],
  toDrawing: scene.toDrawing,
  hit: (target, fact) => scene.itemOf(target) ?? scene.itemAt(fact.screen),
  deliver: (fact, reply) => {
    if (fact.type === "down" && fact.pointerType === "mouse") delivered.push(["pointer taken", reply.takePointer()]);
    if (fact.type === "up" && (fact.button === 3 || fact.button === 4)) reply.claim();
    delivered.push([fact.type, fact.button, fact.hit?.key ?? null, fact.at.x, fact.at.y]);
  },
});
if (!opened.ok) throw new Error(JSON.stringify(opened.problems));
const box = svg.getBoundingClientRect();
const at = { clientX: box.left + 120, clientY: box.top + 120, pointerId: 9, pointerType: "mouse", bubbles: true, cancelable: true };
svg.dispatchEvent(new PointerEvent("pointerdown", { ...at, button: 3, buttons: 8 }));
const release = new PointerEvent("pointerup", { ...at, button: 3, buttons: 0 });
svg.dispatchEvent(release);
if (!release.defaultPrevented) throw new Error("the back button's release was not claimed");
if (JSON.stringify(delivered) !== JSON.stringify([["pointer taken", false], ["down", 3, "mouse button 3", 120, 120], ["up", 3, "mouse button 3", 120, 120]])) throw new Error(JSON.stringify(delivered));
opened.capture.close();
```

That example's events are synthetic and name pointer 9, which the platform does not hold, so `takePointer` answers `false`.\
A synthetic event naming the mouse's own pointer, 1, was taken in Chrome though no button of it was down, so do not read `takePointer`'s answer as telling synthetic input from trusted.\
Trusted input -- a person's, or the DevTools protocol's -- is taken, and its later events all target the `<svg>`.

---

## 6. Deciding what each input means

One table holds every meaning, its rows exclusive by construction, so no row wins by its place: two rows that hit together mean nothing.\
Run `findOverlaps` over every fact your rows can meet, in your own gate; the tester's runs over 101,073 facts, a key fact with four contexts and every other with eight, and holds every fact but those it gives no row to exactly one row (`test/table-overlaps.test.js`).\
A row's `when` reads a context the application makes from the session's state before the fact.\
The tester's says of a key fact whether the held keys hold its own code and any other key that is no modifier, so its roll-over row needs no state of its own.\
Of a pointer fact it says whether a gesture is live, whether Space is held, and whether the fact lies on open ground, so each pan row and the press row of its button split every press between them.

The overlap check, and what an overlap does to a match:
```js
import { composeBindingTable } from "../vendor/input-binding/index.js";
import { OVERLAP_PROOF_CONTEXTS, TESTER_TABLE_DECLARATION, overlapProofFacts } from "./input-bindings.js";

const { table } = composeBindingTable(TESTER_TABLE_DECLARATION);
const facts = overlapProofFacts(["KeyA", "ShiftLeft", "Space", "F5", "BrowserRefresh", "", null]);
const isKey = (fact) => fact.type === "key-down" || fact.type === "key-up";
const overlaps = [
  ...table.findOverlaps(facts.filter(isKey), OVERLAP_PROOF_CONTEXTS.key, [{}]),
  ...table.findOverlaps(facts.filter((fact) => !isKey(fact)), OVERLAP_PROOF_CONTEXTS.pointer, [{}]),
];
if (overlaps.length !== 0) throw new Error(`${overlaps.length} overlaps`);

const careless = composeBindingTable({ tenants: [{ owner: "app", rows: [
  { id: "any key", on: (fact) => fact.type === "key-down" },
  { id: "the a key", on: (fact) => fact.type === "key-down" && fact.code === "KeyA" },
] }] }).table;
const keyA = { type: "key-down", code: "KeyA" };
if (careless.matchInput(keyA).match !== null) throw new Error("two hits chose a winner");
if (careless.findOverlaps([keyA], [undefined], [{}])[0].ids.join() !== "any key,the a key") throw new Error("the overlap was not listed");
```

The press is one call.\
`resolvePress` makes the press, asks your `match` -- unless the live gesture takes the press, when it asks nothing -- cancels a live gesture the match ends, and starts the gesture the match opens, all in order; doing it by hand has two traps, `pressMatched` throwing on a taken press and a cancel losing the start unless it is called a second time.\
The tester's router passes the match it has already found, so it keeps no policy between the press and the match.\
When a press travels beyond the threshold, the router asks `becomeGesture` without a `from`, so the press keeps its origin and its release stays a drop.\
It asks for the drag of the press's button, or, for a press a pan row opened, that row's pan gesture, and only then takes the pointer, so a pan's press that never travels is a click as any other.

The tester's table and session through a press, a second press of the same button, a press of another, a drag and its release:
```js
import { composeBindingTable, openGestureSession } from "../vendor/input-binding/index.js";
import { NO_KEY_CONTEXT, TESTER_SESSION_DECLARATION, TESTER_TABLE_DECLARATION } from "./input-bindings.js";

const { table } = composeBindingTable(TESTER_TABLE_DECLARATION);
const { session } = openGestureSession(TESTER_SESSION_DECLARATION);
const press = (button) => ({ type: "down", at: { x: 0, y: 0 }, screen: { x: 0, y: 0 }, button, buttons: 1, pointerId: 1, pointerType: "mouse" });

const first = session.resolvePress(press(0), { match: () => table.matchInput(press(0), NO_KEY_CONTEXT).match });
if (first.phase !== "start" || first.gesture.name !== "press-0") throw new Error("the press started no press-0");

const again = session.resolvePress(press(0), { match: () => { throw new Error("asked, though the live gesture takes its own button's press"); } });
if (!again.taken || again.phase !== null || session.state.gesture.name !== "press-0") throw new Error("the second press was not taken");

const ended = [];
const other = session.resolvePress(press(2), { match: () => table.matchInput(press(2), NO_KEY_CONTEXT).match, cancelled: (cancel) => ended.push(cancel.gesture.name) });
if (ended.join() !== "press-0" || other.gesture.name !== "press-2") throw new Error("another button's press did not end press-0 and start press-2");

const moved = session.pointerMove({ screen: { x: 5, y: 0 }, pointerId: 1 });
if (!moved.crossed) throw new Error("five screen pixels is beyond the threshold of four");
session.becomeGesture({ gesture: "drag-2" });
const released = session.pointerUp({ button: 2, pointerId: 1 });
if (released.phase !== "commit" || released.trigger !== "drop") throw new Error("the release was no drop");
const meaning = table.matchInput({ type: "commit", gesture: released.gesture.name, trigger: released.trigger }, NO_KEY_CONTEXT).match;
if (meaning.id !== "button-2-drag") throw new Error("the commit's derived fact meant no drag of button 2");
```

The platform delivers a chord's later presses and releases as moves, so the release that ends a press may name another button than the one that began it; the session commits the gesture the press's button began on that last release.\
A fact is any value: the tester derives `{ type: "commit", gesture, trigger }` from each commit outcome and matches it like any other, so the legend can mark a click or a drag as a row.

---

## 7. Composing the page

The composition root opens all four, hands the capture a delivery that switches on the fact's family -- keys, focus lost, and a mouse's press, move, release and cancel each to their route, every other fact traced and matched alone -- applies the verdict to one frozen record, and has the painter put what changed, all before the delivery returns (`composeTesterPage` and `routeByFamily` in `src/composition-root.ts`).\
Nothing waits for a timer or a frame, so a person sees each input while it happens; the gate finds every delivery done within 10 ms (`test/browser/immediacy.test.js`).\
Which keys are held is read from the session's state, never kept a second time; the record keeps of each only what its facts showed.

The tester itself, composed on an `<svg>` and delivered a key:
```js
import { composeTesterPage } from "./composition-root.js";

const surface = document.getElementById("example-surface");
const page = composeTesterPage({ surface, keySource: window, address: "https://input.apnex.io/?plan=chromebook", browser: navigator });
const press = new KeyboardEvent("keydown", { key: "a", code: "KeyA", bubbles: true, cancelable: true });
window.dispatchEvent(press);
if (page.plan !== "chromebook" || page.problems.length !== 0) throw new Error("the page did not compose its Chromebook plan");
if (page.picture.heldKeys[0]?.code !== "KeyA" || !press.defaultPrevented) throw new Error("the key was not held and claimed");
if (page.latestVerdict.trace.find((record) => record.hit).id !== "key-first-press") throw new Error("the key meant no first press");
page.close();
```

---

## 8. Proving it in a real browser

A synthetic event is not a person's: its defaults are not the browser's own, and its pointer is taken only when the platform happens to hold one of that number (section 5).\
The tester's gate drives headless Chrome with trusted input over the DevTools protocol's `Input` domain, and the trap is the held button: a real mouse's move carries the buttons held, and the protocol's move must say so twice, in `buttons` and in `button`.\
A move that sets the held bits in `buttons` but names `button` `"none"` still reports the buttons held, but Chrome takes the pointer to have no button down and drops the capture at once, so the move targets whatever lies under it, not the `<svg>` -- and every test of a taken pointer then tests something else.\
Name the held button on every move: `button: "left"` and `buttons: 1` while the left is held, `buttons: 3` once the right joins it.

A drag over the tester's page, each move naming the held button, the pointer still taken; then a move naming none, the pointer lost:
```mjs
async function evaluate(send, expression) {
  const { result } = await send("Runtime.evaluate", { expression, returnByValue: true });
  return result.value;
}

export async function inChrome(send, at) {
  const mouse = (type, x, buttons, button) => send("Input.dispatchMouseEvent", { type, x, y: at.y, button, buttons, clickCount: type === "mouseMoved" ? 0 : 1 });
  const taken = () => evaluate(send, "document.getElementById('input-surface').hasPointerCapture(1)");
  await mouse("mouseMoved", at.x, 0, "none");
  await mouse("mousePressed", at.x, 1, "left");
  await mouse("mouseMoved", at.x + 20, 1, "left");
  if (!(await taken())) throw new Error("a move naming its held button lost the pointer");
  if ((await evaluate(send, "inputTester.picture.buttons")) !== 1) throw new Error("the held button was not drawn held");
  if ((await evaluate(send, "inputTester.picture.gesture.name")) !== "drag-0") throw new Error("the press became no drag");
  await mouse("mouseMoved", at.x + 30, 1, "none");
  if (await taken()) throw new Error("expected Chrome to drop the pointer of a move naming no held button");
  await mouse("mouseReleased", at.x + 30, 0, "left");
}
```

Two more things Chrome does that a test, and a picture, must not mistake.\
A press whose pointer is taken is followed by boundary facts, `out`, `leave` and `over`, as the pointer's target becomes the `<svg>`; with trusted input they carried `buttons` 1 while only button 1 was held, and `buttons` 0 while only button 2 was, so the tester's buttons drawn follow a mouse's press, move, release, cancel and context menu, never its boundary facts (`BUTTONS_REPORTED_BY` in `src/picture-state.ts`).\
A captured pointer's release is followed by boundary facts too, so the latest fact after a release is seldom the release itself: the tester's gate reads a release's verdict from the log, where boundary facts, which hit no row, leave no line.

The gate's other proofs are each one file in `test/browser/`: every row the browser can produce matched by trusted input, `rows.test.js`; every request watched from before navigation through teardown, with planted leaks failing it, `containment.test.js`; and the deploy loading the page between every pair of its steps, `deploy-sequence.test.js`.

---

## 9. The view pane, on the Chromebook

The view pane is the second scene, on its own `<svg>` beside the picture, declared with a view, so the picture never moves (`src/view-pane.ts`).\
It shows an unbounded grid of 60, every point drawn at every level, a red cross at 0, 0, and two green precision lines, at 1,000,000 and at 2^21, 2,097,152, from the origin.\
Its readouts, at its top left in 13-pixel text, give the level and the scale in pixels a unit, the centre, what the latest view row did, and, while a precision line stands in the pane, where it should be on screen and how far from there the platform hits it and the browser reports it.\
The same numbers stand in the picture's view lines, under the mouse.

Open the page with `#view` at the end of its address, or press "large, to judge each gesture" beside the plans, and the pane takes 48% of the window's width, drawn at once for that size; "small" gives the picture its room back, the pane drawn again at once.\
The address is read once, as the page opens: adding `#view` to a page already open changes nothing until it is reloaded, or "large" is pressed.\
The page is the window's height and never scrolls, the header taking its own height however its line wraps.\
A resize of the window is no input, and the page writes nothing but in answer to one, so after a resize the pane keeps the view it had -- its grid may stop short of its new edges, its origin off its new centre -- until the pointer next moves over it or any key or gesture comes: move the pointer over the pane once after resizing.

Each step, on the pane, then what to report back:
1. Two-finger scroll on the touchpad, every direction: the grid moves the way the fingers do, as a page scrolls; the centre in the readouts changes by the scroll's pixels over the scale.
2. Pinch apart and together on the touchpad: the level steps 0.5x, 1x, 2x and 3x, never between, and the point under the fingers stays under them; report whether one step takes a comfortable pinch -- the step is 100 pixels of the pinch, which headless Chrome sends as a pinch to about 2.7 times. Watch the dots: every one is a grid point, a place a drawing's things may be put, so they close up as the view zooms out, 60 units apart at every level; up close, at 0.5x and 1x, every dot is full; at 2x a dot is full where every fourth row meets every fourth column, and every other dot is at half opacity, so three half dots lie between two full ones; at 3x a grid within a grid: full where every tenth row meets every tenth column, half where every second meets every second, and a quarter elsewhere, so a row through a full dot runs full, quarter, half, quarter, half, ... quarter, full and the odd rows between are all at a quarter, and every second row runs half, quarter, half; the cross at 0, 0 always sits on a full dot. No dot drops out now, at any level, in either size of the pane, as the lab's try asks: with the pane small at 3x the dots stand 2.3 to 3.2 pixels apart, close to 21,000 of them, so the pane reads as a fine, dense texture, its full dots every tenth row and column standing out from it; at 2x on a 1093-pixel window the half dots stand 3.4 pixels apart. Report whether the runs, 4 at 2x and 10 at 3x, and the opacities, half and a quarter, read well, and whether the dense texture should stay or the faint dots drop out again where they crowd: each is one edit beside `ZOOM_LEVELS` in `src/view-steps.ts` -- `GRID_TIERS` the runs and opacities, `GRID_FLOOR` the least spacing at which faint dots are drawn, 0 now and 4 before, and `GRID_MAX` the most dots listed at once, 25,000 now and 10,000 before -- the names draw's design gives them.
3. Ctrl and the mouse wheel, if a mouse is at hand: the same levels, one notch or a few a step, about the pointer.
4. Space held with a left drag; a middle drag; a right drag, which pans on the precision lines too, since they mark ground: each pans once the pointer has travelled 4 pixels, the grid following the pointer, and a release changes nothing more; report a middle press that starts the browser's own scrolling arrows instead.
5. The keys, with the page focused: `=` or `+` a level in and `-` a level out, about the pane's centre; Shift and 0 the default level, 1x; Shift and 1 fit, which here is the first opening, 0, 0 at 1x; `h` home.
6. The reticle, "home 0, 0": the cross comes back to the pane's centre at the level it was.
7. "line at 1,000,000", then `-` three times: the button brings the pane to its nearest level, 0.5x -- on a 1366 by 657 window about 0.68 pixels a unit with the pane large and 0.28 with it small -- and at each level the green line's left edge stands at the pane's centre, and the readouts say how far it is hit and reported from where it should be; write down the four pairs, and the same for "line at 2^21".
8. Pan for a while with the pane small at 3x, where the most dots are drawn now, about 22,000: say whether the grid keeps up with the fingers or stutters -- in headless Chrome such a pan loses about half its frames on the 1366 and 1093 windows and runs at about 30 frames a second on the 1536, where `v0.4.0` held a steady 60 -- and whether single dots, places a drawing's things may be put, can still be told apart there, or merge into a grey wash; then the same with the pane large at 3x for comparison; the gate times the page's handling of each input only at the first level, 1x, so how the pans feel and look at the farther levels rests on this step (`B20`, `B21`).
9. Throughout, the picture of the keyboard and mouse stays where it is, and the page itself neither scrolls nor zooms.

Report each step as accepted or returned, with what was seen when it is returned; the eight pairs of precision figures; and any level that should be nearer or farther, since the levels are held in one place, `ZOOM_LEVELS` in `src/view-steps.ts`, to be tuned by one edit, and can be tried first in the address, as below.

The steps' own check, run in the gate, on the tester's page with the pane small: a line, home and the levels by Ctrl and the wheel, each read back from the page:
```mjs
async function evaluate(send, expression) {
  const { result } = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  return result.value;
}

async function centreOf(send, id) {
  return evaluate(send, `(() => { const r = document.getElementById("${id}").getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; })()`);
}

async function press(send, id) {
  const { x, y } = await centreOf(send, id);
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y, button: "none", buttons: 0 });
  await send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1 });
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount: 1 });
}

export async function inChrome(send) {
  await press(send, "go-million");
  const line = await evaluate(send, "inputTester.precision.find((m) => m.distance === 1000000) ?? null");
  if (line === null || line.hit === null || Math.abs(line.hit) > 0.25) throw new Error(`the line at 1,000,000 is not hit within a quarter of a pixel: ${JSON.stringify(line)}`);
  await press(send, "view-home");
  const home = await evaluate(send, "inputTester.picture.view");
  if (home.centre.x !== 0 || home.centre.y !== 0 || home.level !== 0.5) throw new Error(`home did not bring 0, 0 back at 0.5x: ${JSON.stringify(home)}`);
  const { x, y } = await centreOf(send, "view-pane");
  const levels = [];
  for (let i = 0; i < 3; i++) {
    await send("Input.dispatchMouseEvent", { type: "mouseWheel", x, y, deltaX: 0, deltaY: 100, modifiers: 2 });
    levels.push(await evaluate(send, "new Promise((r) => setTimeout(() => r(inputTester.picture.view.level), 50))"));
  }
  if (levels.join() !== "1,2,3") throw new Error(`Ctrl and the wheel stepped ${levels}, not 1x, 2x and 3x`);
}
```

### Tuning the pane in the address, in the lab

In the lab the pane's values can be tried without a release: write them after `#view` in the address, each `name=value`, joined by `&` (`src/address-tuning.ts`).\
They are honoured on `input-lab.apnex.io` and on the gate's own host; on `input.apnex.io` they are ignored and the page draws as released.\
Each holds for that page only, and while any is in force the readouts show it, after the rest, with any setting ignored and why.

| Setting | What it tunes | As released | Allowed |
|---|---|---|---|
| `levels` | the zoom levels, `ZOOM_LEVELS` | `0.5,1,2,3` | 2 to 8, each 0.1 to 16, ascending, 1 among them |
| `tiers` and a level, as `tiers3` | that level's tiers, each `every:opacity`, coarsest first; a level with none draws every point full | 2x `4:1,1:0.5`; 3x `10:1,2:0.5,1:0.25` | up to 4; the first full, the last every point; each finer `every` divides the coarser's and is fainter |
| `floor` | `GRID_FLOOR`: a faded tier whose dots stand closer than this many pixels is left out | `0`, never | 0 to 50 |
| `max` | `GRID_MAX`: the most points listed before a faded tier is left out | `25000` | 1 to 200,000 |
| `step` | the pixels of pinch, or of Ctrl and the wheel, for one level, `ZOOM_STEP_PIXELS` | `100` | 10 to 1,000 |

Paste one into the address bar, press Enter, then reload with Ctrl and R: the address is read once as the page opens, and a change after `#` alone does not reload it.

The `v0.4.0` look, a faded tier left out where its dots stand under 4 pixels apart and the listing bound back at 10,000:

`https://input-lab.apnex.io/?plan=chromebook#view&floor=4&max=10000`

Every ninth dot full at 3x, not every tenth, every third at half and the rest at a quarter; the middle tier must divide 9, so 3, not 2:

`https://input-lab.apnex.io/?plan=chromebook#view&tiers3=9:1,3:0.5,1:0.25`

A gentler pinch, half as much again for each level:

`https://input-lab.apnex.io/?plan=chromebook#view&step=150`

Report the address that looks right: each setting in it becomes a one-line change to its constant, on the light path (`docs/DECISIONS.md` 0021).

---

## 10. The traps, collected

- An import map is an inline script: under a strict browser rule, vendor the parts and import them by relative path (section 2).
- A root scaled differently on each axis, or sheared, needs the smallest stretch of its transform as `inView`'s scale; its `a`, the root of its determinant and its shorter column each crowd (section 3).
- A `style` attribute written by script is refused under `style-src 'self'`: give every look a class (section 4).
- `hit` is `itemOf(target) ?? itemAt(screen)`, since a taken pointer's events all target the `<svg>` (section 5).
- Claim the back and forward buttons' releases, not only their presses (section 5).
- `takePointer` refuses a synthetic event's pointer only when the platform holds no such pointer; the mouse's own pointer was taken for a synthetic event (section 5).
- Two rows that hit together mean nothing: prove none do with `findOverlaps` in your gate (section 6).
- The press is one call, `resolvePress`; become the drag without a `from`, or its release turns into a click (section 6).
- Name the held button on every move of trusted input, in `button` as well as in `buttons`, or Chrome drops the taken pointer; and do not read a captured pointer's boundary facts as its presses or releases (section 8).

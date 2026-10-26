---
instant: current
---

# input-tester - system architecture, current

**Instant: current.** input-tester as its code and its gate's last run show it, derived by `tools/generate-architecture.mjs` and never written by hand.\
Its reasoning -- identity, justification, alignment and decisions -- is the target's, `docs/ARCHITECTURE-TARGET.md` revision 4, which this document cites and never restates.\
Every section is derived; each changes when the code, the gate's results or the records it is read from change, and `npm run gate` fails while this file differs from what the generator derives.

---

## 1. Status

| Field | Value |
|---|---|
| Version | `0.1.0`, its release folder `v0.1.0` |
| Target it builds | `docs/ARCHITECTURE-TARGET.md`, revision 4 |
| Rulings recorded | `0001`, `0002`, in `docs/DECISIONS.md` |
| The gate's last run | every one of its 9 steps passed |

---

## 2. The shared parts composed

Each pinned by its release file and hash in `package-lock.json`, vendored unchanged into `vendor/`, and imported by relative path from the release's `vendor` folder (IT-D1).

| Part | Version pinned | Release file | Files vendored |
|---|---|---|---|
| `input-capture` | `0.2.0` | `apnex-input-capture-0.2.0.tgz` | 25 |
| `input-binding` | `0.2.0` | `apnex-input-binding-0.2.0.tgz` | 31 |
| `vector-scene` | `0.2.0` | `apnex-vector-scene-0.2.0.tgz` | 34 |
| `snap-grid` | `0.1.1` | `apnex-snap-grid-0.1.1.tgz` | 34 |

---

## 3. The anchored core, as built

Each part's duty is the first sentence of its module's leading comment; its exports and imports are read from its source.

| Module | Duty | Exports | Imports |
|---|---|---|---|
| `src/composition-root.ts` | Composition root: composes the page from its parts, and switches each fact to the router by its family (docs/ARCHITECTURE-TARGET.md sections 5 and 7, P8) | `BrowserBrands`, `TesterPlatform`, `TesterPage`, `planFromAddress`, `planLineWords`, `isChromiumBrowser`, `routeByFamily`, `composeTesterPage` | `../vendor/input-capture/index.js`, `../vendor/input-binding/index.js`, `../vendor/vector-scene/index.js`, `../vendor/snap-grid/index.js`, `./input-bindings.js`, `./input-router.js`, `./key-labels.js`, `./keyboard-plans.js`, `./picture-painter.js`, `./picture-state.js` |
| `src/input-bindings.ts` | Bindings: declares what every input is taken to mean, and the session's gestures (docs/ARCHITECTURE-TARGET.md sections 5 and 6, P5) | `ItemUnderPointer`, `DeliveredFact`, `CommitFact`, `TesterFact`, `TesterContext`, `RowProof`, `TesterRow`, `NO_KEY_CONTEXT`, `MODIFIER_CODES`, `BrowsersOwnKey`, `BROWSERS_OWN_KEYS`, `isKeyFact`, `letterOfCode`, `isBrowsersOwnKey`, `isKeyedFact`, `isModifierCode`, `TESTER_ROWS`, `TESTER_TABLE_DECLARATION`, `TESTER_SESSION_DECLARATION`, `DRAG_OF_PRESS`, `OVERLAP_PROOF_CONTEXTS`, `OVERLAP_PROOF_KEYS`, `overlapProofFacts` | `../vendor/input-capture/index.js`, `../vendor/input-binding/index.js`, `../vendor/vector-scene/index.js`, `./keyboard-plans.js` |
| `src/input-router.ts` | Router: takes each delivered fact through the table and the session (docs/ARCHITECTURE-TARGET.md sections 5, 6 and 7), and answers one verdict holding every step in order | `FactReply`, `DerivedVerdict`, `VerdictStep`, `Verdict`, `MouseFact`, `InputRouter`, `contextOfFact`, `openInputRouter` | `../vendor/input-binding/index.js`, `../vendor/input-capture/index.js`, `./input-bindings.js` |
| `src/key-labels.ts` | Labels: names each drawn key as the person's own keyboard does (docs/ARCHITECTURE-TARGET.md section 5, IT-D2) | `LabelSource`, `KeyLabel`, `KeyLabels`, `KeyboardMapAnswer`, `KeyboardMapSource`, `labelsPrintedOnPlan`, `labelsFromKeyboardMap`, `askKeyboardMap` | `./keyboard-plans.js` |
| `src/keyboard-plans.ts` | Keyboard plans: where each drawn key and mouse button lies, on the plan the person chose (docs/ARCHITECTURE-TARGET.md section 5, IT-D2) | `QUARTER_KEY_GRID`, `PlanName`, `CodeSource`, `KeyNote`, `PlanKey`, `PlanMouseButton`, `KeyboardPlan`, `PlacedKey`, `PlacedMouseButton`, `PlacedPlan`, `BUTTON_BITS`, `bitOfButton`, `FULL_SIZE_ANSI_PLAN`, `CHROMEBOOK_PLAN`, `KEYBOARD_PLANS`, `placePlanOnGrid` | `../vendor/snap-grid/index.js` |
| `src/page-entry.ts` | The page's one module script (docs/ARCHITECTURE-TARGET.md section 7, Page load): composes the tester on the entry document's `<svg>`, with the window as key source, the page's address and the browser's `navigator`, and leaves the composed page readable whole at `globalThis.inputTester`, which the gate's proof reads | none | `./composition-root.js`, `./key-labels.js` |
| `src/picture-painter.ts` | Painter: describes the picture as shapes, within an allowlist (docs/ARCHITECTURE-TARGET.md sections 5 and 6, P3, P4, P6, GT8) | `PAINTER_TAGS`, `PAINTER_ATTRIBUTES`, `SCENE_LAYERS`, `PageNotices`, `PaintTarget`, `PaintView`, `KEY_NOTE_WORDS`, `NOT_REPORTED_LINES`, `CLAIMS_LINE`, `UNCOVERED_BROWSER_LINE`, `factWords`, `logLineWords`, `buttonsHeldWords`, `statusWords`, `HELD_KEY_LINES`, `heldKeyLines`, `keyShapes`, `paintEveryKey`, `paintWholePage`, `paintPictureChanges` | `../vendor/input-binding/index.js`, `../vendor/vector-scene/index.js`, `./input-bindings.js`, `./key-labels.js`, `./keyboard-plans.js`, `./picture-state.js` |
| `src/picture-state.ts` | Picture state: keeps what the person is shown, as data (docs/ARCHITECTURE-TARGET.md sections 5 to 7, P1, P6) | `LOG_LINES`, `HeldKeyPicture`, `WheelPicture`, `GesturePicture`, `LogEntry`, `LegendPicture`, `Picture`, `PictureEntry`, `BUTTONS_REPORTED_BY`, `EMPTY_PICTURE`, `timeBetween`, `wheelFactsAlike`, `applyVerdict` | `../vendor/input-capture/index.js`, `../vendor/input-binding/index.js`, `./input-bindings.js`, `./input-router.js` |
| `page/index.html` | The entry document: its stylesheet and its one module script, both in the release's folder, and the plans to choose | none | `v0.1.0/input-tester.css`, `v0.1.0/app/page-entry.js` |

---

## 4. The binding table, as composed

42 rows, in the legend's order, composed by `input-binding` from `src/input-bindings.ts`; a row claims when its `claims` flag is true, and a press row opens the gesture its `gesture` field names.

| Row | Words in the legend | Claims | Opens | Proved by |
|---|---|---|---|---|
| `key-modifier-press` | a modifier press | yes | -- | trusted |
| `key-modifier-chord` | a modifier chord | yes | -- | trusted |
| `key-first-press` | a first press | yes | -- | trusted |
| `key-roll-over-press` | a roll-over press | yes | -- | trusted |
| `key-repeat` | a repeat | yes | -- | trusted |
| `key-release` | a release | yes | -- | trusted |
| `key-release-press-unseen` | a release whose press was not seen | yes | -- | trusted |
| `key-no-identity` | a key with no identity | yes | -- | trusted and fixture |
| `key-left-to-browser` | left to the browser | no | -- | trusted |
| `button-0-press` | a press of button 0 | yes | `press-0` | trusted |
| `button-1-press` | a press of button 1 | yes | `press-1` | trusted |
| `button-2-press` | a press of button 2 | yes | `press-2` | trusted |
| `button-3-press` | a press of button 3 | yes | `press-3` | trusted |
| `button-4-press` | a press of button 4 | yes | `press-4` | trusted |
| `button-0-release` | a release of button 0 | yes | -- | trusted |
| `button-1-release` | a release of button 1 | yes | -- | trusted |
| `button-2-release` | a release of button 2 | yes | -- | trusted |
| `button-3-release` | a release of button 3 | yes | -- | trusted |
| `button-4-release` | a release of button 4 | yes | -- | trusted |
| `chorded-press` | a chorded press | yes | -- | trusted |
| `chorded-release` | a chorded release | yes | -- | trusted |
| `chorded-change-buttons-unreported` | a chorded change, buttons not reported | no | -- | fixture |
| `button-beyond-five` | a button beyond the five | no | -- | fixture |
| `double-click` | a double click | yes | -- | trusted |
| `button-0-click` | a click of button 0 | no | -- | trusted |
| `button-1-click` | a click of button 1 | no | -- | trusted |
| `button-2-click` | a click of button 2 | no | -- | trusted |
| `button-3-click` | a click of button 3 | no | -- | trusted |
| `button-4-click` | a click of button 4 | no | -- | trusted |
| `button-0-drag` | a drag of button 0 | no | -- | trusted |
| `button-1-drag` | a drag of button 1 | no | -- | trusted |
| `button-2-drag` | a drag of button 2 | no | -- | trusted |
| `button-3-drag` | a drag of button 3 | no | -- | trusted |
| `button-4-drag` | a drag of button 4 | no | -- | trusted |
| `wheel-up` | the wheel up | yes | -- | trusted |
| `wheel-down` | the wheel down | yes | -- | trusted |
| `wheel-sideways` | the wheel sideways | yes | -- | trusted |
| `wheel-still` | the wheel still | yes | -- | trusted |
| `ctrl-wheel-or-pinch` | Ctrl and wheel, or a touchpad pinch: the browser does not tell them apart | yes | -- | trusted |
| `context-menu` | the context menu | yes | -- | trusted |
| `touch-or-pen-pointer` | a touch or a pen pointer | no | -- | trusted |
| `focus-lost` | focus lost | yes | -- | trusted |

The browser's own keys, left unclaimed on every platform at once:

| Code | Shift | Ctrl | Alt | Meta | Platform | Does |
|---|---|---|---|---|---|---|
| `F5` | either | either | not held | not held | Windows, Linux, ChromeOS | reload |
| `KeyR` | either | held | not held | not held | Windows, Linux, ChromeOS | reload |
| `F11` | not held | not held | not held | not held | Windows, Linux, ChromeOS | fullscreen |
| `F12` | not held | not held | not held | not held | Windows, Linux, ChromeOS | developer tools |
| `KeyI` | held | held | not held | not held | Windows, Linux, ChromeOS | developer tools |
| `KeyJ` | held | held | not held | not held | Windows, Linux, ChromeOS | developer tools |
| `KeyC` | held | held | not held | not held | Windows, Linux, ChromeOS | developer tools |
| `KeyU` | not held | held | not held | not held | Windows, Linux, ChromeOS | view source |
| `BrowserRefresh` | either | either | either | either | Linux, ChromeOS | reload |
| `ZoomToggle` | either | either | either | either | ChromeOS | fullscreen |
| `KeyR` | either | not held | not held | held | macOS | reload |
| `KeyF` | not held | held | not held | held | macOS | fullscreen |
| `KeyI` | not held | not held | held | held | macOS | developer tools |
| `KeyJ` | not held | not held | held | held | macOS | developer tools |
| `KeyC` | not held | not held | held | held | macOS | developer tools |
| `KeyC` | held | not held | not held | held | macOS | developer tools |
| `KeyU` | not held | not held | held | held | macOS | view source |

The session's threshold is 4 drawing units; its gestures are `press-0` (button 0), `press-1` (button 1), `press-2` (button 2), `press-3` (button 3), `press-4` (button 4), `drag-0` (button 0, engaged), `drag-1` (button 1, engaged), `drag-2` (button 2, engaged), `drag-3` (button 3, engaged), `drag-4` (button 4, engaged).

---

## 5. The picture and the page

The scene's layers, back to front: `keys`, `mouse`, `trails` (looked through), `panel` (looked through).\
The painter's shapes are of the tags `g`, `rect`, `line`, `path`, `text`, `tspan`, with the attributes `x`, `y`, `width`, `height`, `rx`, `ry`, `x1`, `y1`, `x2`, `y2`, `d`, `transform`, `class`.\
The log keeps 14 lines; the buttons drawn follow the `buttons` of a mouse's `down`, `move`, `up`, `cancel`, `context-menu` and of a `wheel`.

| Plan | Keys drawn | Codes of Chromium's own | Keys carrying a note |
|---|---|---|---|
| `ansi`, full-size ANSI | 104 | none | 3 |
| `chromebook`, Chromebook | 73 | `ZoomToggle`, `ShowAllWindows`, `BrightnessDown`, `BrightnessUp` | 11 |

What no page can know, shown always:

- Shortcuts the operating system or the browser keeps -- a new or closed tab or window, switching tabs, and others -- never reach a page, and a page cannot know which it was not sent.
- Ctrl with a mouse wheel and a touchpad pinch arrive alike: the browser does not tell them apart.
- Which physical keyboard is in use is not reported: the drawn plan is a reference, never your detected keyboard.
- Where the browser names no code, a key's physical identity is not reported: it is shown as delivered, and no key lights.

---

## 6. Verification, as the gate's last run found it

| Step | Holds | Result | Tests |
|---|---|---|---|
| vendoring | vendor/ is the pinned release files, byte for byte (GT3, P7) | pass | -- |
| build | tsc builds src/ into the site, laid out as a release (IT-D1, section 9) | pass | -- |
| tests | the worked verdicts, the fixture rows, the overlap check, the plans, the picture state, the allowlist and writes in delivery, the release's layout, the guide's examples and every check able to fail (GT2, GT4, GT5, GT7, GT8) | pass | 67 of 67 passed |
| browser tests | trusted input over every browser-reachable row, containment with planted leaks, the browser rule, immediacy with a planted slow build, and the deploy's sequence (GT2, GT5, GT6, GT9, section 8) | pass | 65 of 65 passed |
| source check | no network interface, navigation, storage, clock, timer or dynamic import, and no element made but through vector-scene (GT1) | pass | -- |
| vocabulary check | no word of another application in the tester's own words (GT7, P8) | pass | -- |
| backlog check | no workaround open while its retiring release is installed; every deferral with a revival trigger (GT4) | pass | -- |
| public-text check | no sixteen-hex-digit identifier in a file or a commit message | pass | -- |
| style check | mission-kit's S6, S8, S10, S12 and S13 over every document | pass | -- |

---

## 7. Delivery and hosting

Every response carries the rule, `default-src 'none'; script-src 'self'; style-src 'self'; worker-src 'none'; form-action 'none'; base-uri 'none'; frame-ancestors 'none'`, with `Referrer-Policy: no-referrer` and `X-Content-Type-Options: nosniff` (`tools/response-headers.json`).\
A release's folder is copied with `Cache-Control: public, max-age=31536000, immutable` and its entry with `no-store`.

A deploy of this release is 274 steps (`tools/deploy-steps.mjs`): for the lab and then production, 134 folder objects copied where none is, the folder checked through the host, the entry copied -- the one object a deploy replaces -- and the entry, a missing object's 404, the edge cache and the smoke run checked; no step deletes.\
The release workflow is `.github/workflows/release.yml`; the gate's is `.github/workflows/gate.yml`.

---

## 8. Owed and open

The open rows of `docs/BACKLOG.md`, each with its revival trigger there.

Workarounds open: 0.

| Row | Finding |
|---|---|
| D1 | `snap-grid`'s `README.md` says "the guide below gives the conservative scale to pass", but no part's document holds the recipe or its counterexamples: the guide is this repository's, written with this build, and the smaller singular value and the three naive scales that crowd were derived here |
| D2 | `input-capture`'s `README.md` says `takePointer` answers `false` for a synthetic event; in headless Chrome it answered `true` for a synthetic `pointerdown` naming pointer 1, the mouse's own, with no button down, and `false` for pointer 9 |
| D3 | No part's documents say that a taken pointer's press and release are followed by boundary facts, `out`, `leave` and `over`, nor that Chrome sends them with `buttons` 1 while only button 1 is held; the tester met both at its gate, its picture and its tests each reading past them |
| D4 | The vocabulary list the parts refuse on behalf of their first consumer, which GT7 runs here, is held only in each part's repository, `tools/consumer-vocabulary.json`, in no published document or release file; the tester copied it from there |
| D6 | No part's `README.md` or `CONTRACT.md` says that a protocol move of trusted input must name its held button in `button`, not only in `buttons`, or Chrome drops the taken pointer; only `input-capture`'s own test code shows it, by example, and this build's driver, missing it, tested no taken pointer until a review's mutant exposed it |
| D5 | `vector-scene`'s scene is generic in the root's kind of element, so a painter written for any scene types its target as `Scene["put"]` and `Scene["remove"]`, which hold for every kind; no document says those two do not depend on it, and it was found by compiling |
| B1 | The Chromebook plan's action-key codes are Chromium's, and the Search key's `MetaLeft` is the architecture's; none is measured on a Chromebook, so each is marked unmeasured on the page |
| B2 | Typing through a native input method is not covered: injected composition reached no listener, which says nothing of a native one's key events (IT-D12) |
| B3 | A real touchpad's scroll and pinch, and a mouse wheel's page zoom with Ctrl, are proved only as Chrome delivers synthesized input; headless Chrome makes no page zoom for Ctrl and the wheel, claimed or not |
| B4 | Immediacy on real hardware rests on an acceptance, not the gate: the gate measured every delivery within 3.5 ms in headless Chrome |
| B5 | Old release folders accumulate in both buckets, since no deploy step deletes |
| B6 | The trusted-input driver is the fifth copy of one harness; each shared part keeps its own |
| B7 | The guide's cold reading is owed: a newcomer, given the guide and this repository alone, builds a small application from the four parts |
| B8 | Keyboards other than the two plans are not drawn |
| B9 | Caps Lock's and Num Lock's state is not shown: no shared part carries it |
| B10 | Browsers that are not Chromium-based are not covered; the page says so (IT-D12) |
| B11 | The Keyboard Map is asked once, at load: a keyboard's language switched while the page is open leaves the labels the page loaded with |
| B12 | Headless Chrome requests no favicon, so whether a headful browser asks for one beside the entry's empty icon is not measured; the browser rule refuses an image either way |
| B13 | Chrome sends a captured pointer's boundary facts, `over`, `out` and `leave`, with `buttons` 1 while only button 1 is held, and with `buttons` 0 while only button 2 is, measured again with the held button named on every move; the buttons drawn do not follow boundary facts, and whether real hardware does the same is not measured |
| B14 | `tools/deploy` has never run against the buckets: it is the operator's, run with their own credentials, and the lab's measurement of the backends' headers (IT-D5), a missing object's 404 among them, is owed with it; the recorder reports, 2026-10-26, both buckets made -- `gs://input-lab-apnex-io` and `gs://input-apnex-io`, public read, main page `index.html` -- served at `input-lab.apnex.io` and `input.apnex.io` through backend buckets with their edge cache off, and both hosts answering with the rule, `Referrer-Policy` and `X-Content-Type-Options`, a 404 among them, which this build has not measured, having touched no cloud resource; its `gcloud` forms -- `storage objects describe --format=value(generation)`, `storage cp --if-generation-match`, 0 meaning no object, and the missing object's `not found: 404.` -- are taken from the Cloud SDK's documentation and messages and proved only against a stand-in |
| B15 | In Chrome a pen's first press on the page is followed by a mouse `move` at the pen's position, which moves a live mouse drag's line there; the tester shows the mouse fact as delivered, and whether a real pen, or a finger on a touch screen, makes the browser send it is not measured |

---

## 9. Decisions

| Ruling | Title |
|---|---|
| `0001` | The architecture ratified as recommended |
| `0002` | The first build: what it settled, and its errata against the architecture |

---
instant: target
---

# input-tester - system architecture, target

**Instant: target.** input-tester described as the system it is when the ratified decisions about it are built.\
Its current architecture is empty: no code exists yet, and `docs/ARCHITECTURE.md` is derived from the code once it does (section 10, row 1).

Written in the present tense of a system that exists.\
It contains no plan, order or estimate; those belong to a board and to deltas.\
Every section is approved; each reopens on the trigger section 1 names for it.

---

## 1. Status and authority

Authored by the architect, ratified by the director per section; approval is aggregate-only.\
Revision 4, 2026-10-24, folding in the first three readings (section 12).\
Ratified as recommended by the director, 2026-10-24 (the programme's ruling `H26-14`), every decision of section 11 at its recommendation, on top of what `H26-12` and `H26-13`, each as amended, had settled; recorded as this repository's own ruling `0001` in `docs/DECISIONS.md`.

| Section | Maturity | Reopens on |
|---|---|---|
| 2 Identity, scope, non-goals | approved: the repository, the name, the address, the touchpad in scope and the non-goals by `H26-12` and `H26-13`; the rest, the covered browsers among it (IT-D12), by `H26-14` | A ruling that changes scope, or an input a person can make that the scope leaves out |
| 3 Justification chain | approved (`H26-14`) | A ruling recorded in `docs/DECISIONS.md`, or an amendment of `VISION.md` |
| 4 Axiom alignment | approved (`H26-14`) | A change to the tester's traits, or a tension discharged or found |
| 5 Anchored core | approved (`H26-14`) | A duty with no owner, owned twice, or held here that a shared part should hold |
| 6 Entities, data, interfaces | approved (`H26-14`) | A shown thing with no entity behind it |
| 7 Run time | approved (`H26-14`) | A sequence of inputs whose picture is not listed |
| 8 Verification | approved (`H26-14`) | A success dimension, or a claim, with no check |
| 9 Delivery and hosting | approved: the buckets, the two hosts, IAP left out, a deploy that copies one release to the lab first, and a browser rule in the response headers by `H26-13` as amended; the rest by `H26-14` | A change of host, or a deploy that is not a copy of one release |
| 10 Owed and open | approved (`H26-14`) | Any row closed or added |
| 11 Decisions | approved, each at its recommendation (`H26-14`) | A ruling that changes one |
| 12 Readings | a record | A reading |

| Field | Value |
|---|---|
| Purpose | [`VISION.md`](../VISION.md) -- cited, never restated |
| The tester's own rulings | `docs/DECISIONS.md` (IT-D7) |
| Provenance | The programme's rulings that made this tester, `H26-12` and `H26-13` among them, the design of the shared parts' releases it composes, and every reading's full record, are kept in the programme's records, `apnex/drawv2` (`dev/DECISIONS.md`, `dev/design/components/`); this line is the only place this document names them. |

---

## 2. Identity, scope and non-goals

**Identity.**\
input-tester is a static web page at `input.apnex.io` that shows a person, as it happens, what their keyboard, mouse and touchpad deliver to the browser and what each input is taken to mean.\
It is composed from four shared parts, published on their own -- `snap-grid`, `input-capture`, `input-binding` and `vector-scene` -- and adds only what is its own: a drawn keyboard and mouse, the bindings it names, and the picture of what happened.\
Its repository is `apnex/input-tester`, public.

**Scope.**
- The browsers it covers, proposed (IT-D12): Chromium-based browsers, ChromeOS's among them; in any other the page says plainly that its coverage is not proved there.
- Every key event the browser delivers -- press, repeat, release, with its `code`, `key`, modifiers and time; a key whose physical identity the browser does not report shown as delivered, its identity said to be unreported.
- Every mouse button from 0 to 4, alone or chorded, as press, click, drag and release, and the platform's double click, which is the primary button's.
- The wheel and the touchpad's scroll and pinch, as the browser delivers them, with their units.
- The context menu, and the page losing focus.
- What each input is taken to mean: every binding row's standing for it, the matched one marked, and each gesture's phase as it falls due.
- What the browser cannot report, said to be unreported.

**Non-goals.**
- Recording, storing, counting or sending any input, anywhere: it is not a keylogger.
- Accounts, server logic, or data of its own beyond the page's files.
- Changing what any key or button does.
- Seeing what the operating system or the browser keeps from a page.
- A touch screen's or a pen's gestures: their pointers are shown as delivered, never drawn or named.
- Events the browser derives from inputs already shown -- its own click events, pointer capture changes -- drawn again.
- Pan and zoom of the picture.
- Holding a capability any application would want: that belongs in the shared part that owns it.

---

## 3. Justification chain

**Domain.**\
A browser reports a keyboard through the UI Events `KeyboardEvent`: `code` names the physical key whatever characters the keyboard prints (the UI Events KeyboardEvent code values), `key` the character or action it produced, `repeat` an automatic repeat, and modifiers as booleans.\
Composition injected over the DevTools protocol reached no listener while the body or a focusable `<svg>` held focus, and reached a focused text field (measured in Chrome); what a native input method delivers to a page with nothing editable is not measured.\
It reports a mouse through Pointer Events: one pointer per mouse, a press of any button while another is held arriving as a `pointermove`, so a chord's presses and releases after the first are moves, and `pointerup` comes only when the last button is released (measured in Chrome: left pressed, right pressed, left released, right released gives `pointerdown` 0, `pointermove` 2, `pointermove` 0, `pointerup` 2).\
A move with no change of button carries `button` -1, so a chord's moves are told from a drag's by `button` alone (measured in Chrome, under a trusted-input driver that names the held button on every move); a double click is a `MouseEvent`, carrying no pointer type.\
It reports a wheel and a touchpad's two-finger scroll as `wheel` events with a delta and its unit, pixels, lines or pages, and a touchpad's pinch as a `wheel` with `ctrlKey` set (measured in Chrome with a pinch synthesized as a touchpad sends it; real hardware not measured).\
A mouse wheel turned with Ctrl held and a touchpad pinch arrive alike, so the browser does not tell them apart.\
A laptop's top row is given the codes `F1` to `F12` by the code values when its keys double as function keys, while Chromium also defines codes for a Chromebook's action keys; which a Chromebook sends is not measured here.\
The browser keeps some keys from every page -- shortcuts the operating system or the browser claims -- and a page cannot know which it was not sent.

**Axioms.**\
In force by the tester's traits (section 4): `A1`, `A3`, `A4`, `A8`, `A9`, `A14`.\
Not in force: `A2`, `A5`, `A6`, `A7`, `A10`, `A11`, `A12`, `A13`.

**North star of this system.**\
Every mark on the screen traces to one fact the browser delivered or one outcome the bindings gave, inside the task that delivered it.

**Principles.**

| | Principle | From |
|---|---|---|
| P1 | **Delivered, never inferred.** The picture shows only what a fact carried or an outcome decided; what the browser does not report is said to be unreported | vision "exactly"; `A8` |
| P2 | **Fix the part.** A need any application has is met in the shared part that owns it, never worked around here; every workaround ever needed is recorded with the release that retires it | vision, why it exists; `A3`, `A14` |
| P3 | **Shown in the same task.** Each input's picture is put inside its delivery; no timer, no frame batching and no clock, so a duration is shown as of the latest fact | vision, immediacy |
| P4 | **Sends nothing.** No network interface, navigation, storage or clock in the code; one rule in every response, the same for every release, allows scripts and the stylesheet from the page's own origin and nothing else; every request is watched from navigation to teardown | vision, not a keylogger, containment |
| P5 | **One table of meanings.** Every input and gesture the tester names is a row of one `input-binding` table, traced for the legend (IB6), matched for the meaning (IB7) and proved free of overlaps (IB8) | vision, what it is; `A3` |
| P6 | **The picture is data.** What is shown is a description put into `vector-scene`, made from one record of state | `A1` |
| P7 | **Release files as published.** Each shared part is loaded byte for byte as its release published it | vision, proof of reuse; `A8` |
| P8 | **Code a newcomer reads.** The code reads in the order the guide teaches, and holds no word of any other application | vision, teachability; what it is not |

**Decisions.**\
Ruled by the programme: `H26-1`, the tester at `input.apnex.io`, a keyboard and a mouse drawn and every gesture highlighted live, built from the four parts alone; `H26-12` as amended, a sovereign application in `apnex/input-tester` with its own vision and architecture, composing the four through their releases, the parts' gaps fixed in the parts before it is built, and a guide to using the four together with the tester as its worked example; `H26-13` as amended, the vision ratified, the touchpad's scroll and pinch in scope, the page served from a public bucket behind the existing load balancer, its lab at `input-lab.apnex.io`, both outside IAP, a deploy that copies one release to the lab, checks it, then production, and a browser rule in the response headers that the page sends nothing.\
Answered by the shared parts' releases: IT-D3, the routing between capture and binding, now `input-binding`'s `resolvePress`.\
Taken: IT-D1, IT-D2 and IT-D4 to IT-D12, each at its recommendation (section 11, `H26-14`).

**Model.**\
One stream through single-duty parts: a platform event becomes one fact (`input-capture`); the router traces it against the table, matches it and passes it through the session (`input-binding`), giving one verdict that holds every step in order; the picture state takes the verdict; and the painter describes the picture to the scene (`vector-scene`), which brings the page to it; the keyboard and the mouse are placed on a grid (`snap-grid`).

---

## 4. Axiom alignment

The M7 audit of this design.

**Identity.**\
This document's third revision, read against the four parts' published contracts at `v0.1.0` and the design of their next releases at its third revision, mission-kit at `e33c850`, the cold-agent experiment that first built a tester from the four, and the first two readings of both.

**Traits.**\
Stateful, narrowly -- the page writes what is held and what is live, and reads it back at the next event; were that record wrong, a key would stay lit, so T1's test holds, for one page's life, with nothing persisted.\
Not declarative -- nothing reconciles a running state to a declaration.\
Not multi-agent -- one person, one page; no work crosses from one actor to another inside the system.\
Not autonomous -- the person watching the page sees every response, and the page acts on no failure; served unattended from a bucket, it has no operation that runs on its own.\
Not llm-in-the-loop.

**Verdict.**\
Revision 3 is `pass, with guardrails`, by its author; its standing is to be confirmed by a confirming reading.

| Axiom | Weight | How the design stands | Tension |
|---|---|---|---|
| `A3` | load-bearing | Parts of one duty each (section 5); the four shared parts reached only through their contracts; the press's routing held by `input-binding` (`resolvePress`), the tester's router keeping no protocol of its own; a gap in a part is fixed in the part (P2) | Open: the two keyboard plans are held here, one application's data, until a second application draws a keyboard |
| `A1` | supporting | One record of picture state, made only from verdicts, frozen, readable whole at any moment (the proof reads it); held keys read from `input-binding`'s session, never kept twice | Transient by design: a reload ends it, and nothing should survive one |
| `A4` | supporting | The tester's rulings in `docs/DECISIONS.md`, every workaround in `docs/BACKLOG.md` with the release that retires it (IT-D7); each reading's findings on this document and their dispositions in section 12 | Open: the experiment and each reading's full record are kept outside this repository, with the programme |
| `A8` | load-bearing | The gate drives trusted input in headless Chrome over every binding row, proves no input matches two rows over the rows' whole cross-product, proves every request belongs to the release, fails planted leaks and a planted slow delivery, and runs a positive control for the claimed pinch (section 8) | Open: a real touchpad, the Chromebook plan's codes, a real input method, other browsers and a mouse wheel's page zoom are not in the gate; each rests on a recorded acceptance or on IT-D12's scope |
| `A9` | supporting | A deploy copies a release's versioned folder to the lab, measures its bytes and headers and runs a smoke run there, switches the entry last, and only then production; old folders stay, so a rollback is an entry copied back | Deliberate: no telemetry, by containment, so a failure in production has no witness but its visitor |
| `A14` | supporting | Every gap the first build and the readings met is a part's release, the guide, or a row here with its trigger | Open: what the tester meets outside the covered browsers is unmeasured, and said so on the page |

**Layered application.**\
State and truth: the picture is derived from verdicts alone, each holding its steps in order, and the session holds input state once.\
Composition: four parts through their contracts, each imported by relative path from its release's files; the switch over fact families is the composition root's wiring, the protocol behind it the session's.\
Integrity: the gate proves fidelity, immediacy's bound and containment in a real browser before a release exists, with controls that show each check can fail; the deploy proves the release, its headers among it, where it is served.\
Director attention: section 11 asks one decision at a time, each with a recommendation.

**Deltas.**\
From the empty current instant to this target: the shared parts' releases -- `input-capture`, `input-binding` and `vector-scene` at `0.2.0`, `snap-grid` at `0.1.1`; the guide; this repository's first code, gate and release; two buckets, each a backend of the load balancer with the rule in its response headers and the edge cache off; the first deploy; and the generator of the current architecture.

**Guardrails for the build.**
- GT1: the source names no network interface, no navigation, no storage, no clock or timer and no dynamic import, and makes no element but through `vector-scene`, held by a source check in the gate.
- GT2: every put for an input happens inside that input's delivery, held by a test.
- GT3: each shared part's files are served byte-identical to its release, held by the deploy check.
- GT4: no workaround row is open while the release named to retire it is installed, held by the gate.
- GT5: every row the browser can produce is matched by the gate's trusted input and every other row by a synthetic fixture, as section 6 names each; no two rows hit together over the rows' whole cross-product; and a plain drag of every button matches no chord row.
- GT6: the browser rule is one text, in every response's header, the same for every release, sent by the backends and by the gate's own server, with no report endpoint.
- GT7: the source holds none of the words the shared parts' vocabulary check refuses on behalf of their first consumer, held by running that check here.
- GT8: every shape the painter puts is within its allowlist (section 6, Shape), and the stylesheet holds no `url(` and no `@import`, held by a test.
- GT9: every delivery completes within the gate's bound, held by a timed run that a planted slow build fails.

**Closeout hooks.**\
The tester's first release is checked against GT1 to GT9 and section 8's table by a verifier who did not build it.

---

## 5. The anchored core

Each part has one duty and serves at least one principle.

| Part | Duty | Consumes | Exposes | Serves |
|---|---|---|---|---|
| **Keyboard plans** | Say where each drawn key or mouse button lies, on the plan the person chose | UI Events codes, and Chromium's codes for a Chromebook's action keys; `snap-grid`'s `span` (SG8) on a grid of quarter-key pitch | Two plans, full-size ANSI and a Chromebook, each marked a reference drawing, never the detected keyboard: each key's `code`, its printed label, its block of grid positions and its rect; each mouse button's number, `buttons` bit and rect | Coverage |
| **Labels** | Names each drawn key as the person's own keyboard does | The plan; the browser's Keyboard Map, where it offers one (IT-D2) | A label per `code`, each marked as reported by the browser or assumed from the plan's printing | P1 |
| **Bindings** | Declares what every input is taken to mean, and the session's gestures | `input-binding`'s table form (IB3) and session declaration (IB9); facts as `input-capture` makes them (IC5) | The composed table (IB4) and the session (section 6); each row's words for the legend; the overlap proof (IB8) | P5 |
| **Router** | Takes each delivered fact through the table and the session | `input-capture`'s facts and replies (IC5, IC8); the table's `traceInput` and `matchInput` (IB6, IB7); the session's `resolvePress`, moves, releases, losses and keys (IB10 to IB15) | One verdict per fact (section 6) | P1, P8 |
| **Picture state** | Keeps what the person is shown, as data | Verdicts; the session's state | One frozen record (section 6) | P1, P6 |
| **Painter** | Describes the picture as shapes, within an allowlist | The picture state; the plan; the labels | Puts and removes in `vector-scene`'s layers (VS6); the fixed lines of what is not reported (IT-D8) | P3, P4, P6 |
| **Composition root** | Composes the page from its parts, and switches each fact to the router by its family | Every part; the four shared parts' opening functions, each imported by relative path from the release's `vendor` folder (IT-D1) | Nothing; a refused opening shows its problems on the page | P8 |
| **Page shell** | Serves the page's entry | The release's files | The entry document: its stylesheet and its one module script, both in the release's versioned folder; no inline script | P4, P7 |

**The shared parts it consumes.**\
The tester composes `input-capture`, `input-binding` and `vector-scene` at their next minor releases, `0.2.0`, which carry what the first build and the readings found missing, and `snap-grid` at `0.1.1`, whose change is its documents alone.

| Part | What the tester uses | What it never asks of it |
|---|---|---|
| `snap-grid` | One square grid (SG1) of quarter-key pitch; `span` (SG8) gives each key and mouse button its exact rect from integer positions | Drawing a grid, which the tester does not show; hit-testing |
| `input-capture` | One capture (IC3) on the page's `<svg>`, the window as key source, listening also for the wheel, the context menu and focus loss; facts (IC4, IC5) with `time` and wheel deltas; the reply's `claim` and `takePointer` (IC8); `hit` answered as `itemOf(target) ?? itemAt(screen)` | What an input means |
| `input-binding` | One table (IB3, IB4) traced (IB6) and matched (IB7) for every fact; one session (IB9) whose `resolvePress` (IB15) takes every mouse press, whose release rule commits a chorded gesture on its last release and tells another pointer's moves and release apart (IB11), and which holds the keys held, answering a key with no identity untracked (IB14) | A picture, an action, a clock |
| `vector-scene` | One scene (VS3) on the page's `<svg>`, four layers, items put by key (VS6); `itemOf` (VS9) for a target the scene made and `itemAt` for a point, the first item it still holds anywhere under it (VS12); `toDrawing` (VS10) as capture's conversion | A view: the picture never pans or zooms |

**Layers.**\
`keys` and `mouse` hold the keyboard and the mouse; `trails` holds a drag's line, and `panel` the log, the legend, the status line and the fixed lines; the last two are declared with `pointer-events` `none`, so the platform looks through them.

---

## 6. Entities, data and interfaces

| Entity | Holds |
|---|---|
| Key | Its plan, `code`, the printed label, a position `{ col, row }` and a width and height in quarter keys, and an optional note -- "often kept by the operating system", "seldom reported", "code not measured on this keyboard" |
| Mouse button | A name, its `button` number (0 to 4), its `buttons` bit (1, 4, 2, 8, 16 for 0 to 4), its block of positions |
| Row | `id`, the words shown in the legend, `on` over facts, an optional `when` over the context, its claim flag, and the gesture it opens if any |
| Fact | As `input-capture` makes it (IC5), handed on unchanged; or a fact the router derives from a commit outcome, `{ type: 'commit', gesture, trigger }`, the gesture's name and the outcome's trigger |
| Context | Made by the router for each fact from the session's keys before it: `wasHeld`, whether they hold the fact's `code`, and `otherHeld`, whether they hold a non-modifier code other than it; both `false` for a fact that is not a key's; the same value handed to `traceInput` and `matchInput` |
| Verdict | `{ fact, claimed, trace, steps }`: `trace` the array `traceInput` answered for the delivered fact; `steps` in the order made, each `{ operation, outcome, derived }`, `derived` `{ fact, trace, match }` for a commit's derived fact, else `null` |
| Picture | Held keys, each with its first observed fact's `time`, whether that fact was a first press or the key was first seen repeating, its repeats observed, and its latest fact, exact; keys whose identity was not reported, as delivered; the mouse buttons held; the latest wheel fact, exact, and how many like it came in a row; the live gesture, its phase and its trigger; the press's start and whether it is beyond the threshold; the log, a fixed number of lines, newest first; the latest verdict's traces; the item under the pointer |
| Shape | As `vector-scene` takes it (VS5), within the painter's allowlist: a tag among `g`, `rect`, `line`, `path`, `text` and `tspan`, so never `script`, `foreignObject`, `use`, `image`, `a` or `style`; attributes among `x`, `y`, `width`, `height`, `rx`, `ry`, `x1`, `y1`, `x2`, `y2`, `d`, `transform` and `class`, so none that takes an address and none named `style` or `on`-anything, and no value holding `url(`; text as text |

**The session's declaration.**\
`threshold` 4 and the gestures `press-0` to `press-4`, `engaged` false, and `drag-0` to `drag-4`, `engaged` true, each declaring its button; the threshold is in drawing units, the units of capture's `at`, which the scene's `toDrawing` gives, a quarter key being 10 of them, so a press is a drag once it travels more than a tenth of a key, as the status line says.

**The table's rows.**\
Terms: a *keyed* fact is a key fact whose `code` is a non-empty string that is not one of the browser's own keys, the union of the table below, so no platform is detected and a combination that is the browser's on one platform is left unclaimed on all; a *fresh press* is a keyed `key-down` whose `repeat` is false; the *modifier codes* are `ShiftLeft`, `ShiftRight`, `ControlLeft`, `ControlRight`, `AltLeft`, `AltRight`, `MetaLeft` and `MetaRight`; a *chord modifier* is Ctrl, Alt or Meta held.\
Shift makes no chord: Shift's own press is a modifier press, and a key pressed with Shift held is that key's first press or roll-over, its `key` the shifted character.\
Since a row's claim does not depend on its `when` (IB7), every claiming row's `on` refuses the browser's own keys.

| Platform | The browser's own keys -- reload, fullscreen, developer tools -- that reach a page | Source, not measured on the platform |
|---|---|---|
| Windows, Linux, ChromeOS | `F5`, with or without Ctrl or Shift; `KeyR` with Ctrl, with or without Shift; `F11`; `F12`; `KeyI`, `KeyJ` and `KeyC` with Ctrl and Shift; on Linux `BrowserRefresh` too | Chromium's accelerator table (`accelerator_table.cc`); Chrome's keyboard-shortcut help |
| ChromeOS, beside those | `BrowserRefresh` and `ZoomToggle`, should the Chromebook acceptance find them reaching a page: Chromium reserves the Refresh, Back and Forward keys, which never reach one, and leaves the keys from Fullscreen up to the system | Chromium's `browser_command_controller.cc` |
| macOS | `KeyR` with Meta, with or without Shift; `KeyF` with Control and Meta, the fullscreen shortcut, which Chromium also marks with the Fn key no fact carries; `KeyI`, `KeyJ` and `KeyC` with Meta and Alt; `KeyC` with Meta and Shift | Chromium's `accelerators_cocoa.mm` and `global_keyboard_shortcuts_mac.mm`; Chrome's help naming Fn and F the fullscreen key |

Headless Chrome delivers each of these over the protocol to the page without acting on it (measured), so the gate proves they match the unclaimed row, not what each browser then does; the browser's reserved shortcuts -- a new or closed tab or window, switching tabs -- never reach a page, and are among what no page can know (IT-D8).

| Row | `on` | `when` | Claims | Proved by |
|---|---|---|---|---|
| a modifier press | a fresh press of a modifier code | -- | yes | trusted |
| a modifier chord | a fresh press of another code, a chord modifier held | -- | yes | trusted |
| a first press | a fresh press of another code, no chord modifier held | not `otherHeld` | yes | trusted |
| a roll-over press | likewise | `otherHeld` | yes | trusted |
| a repeat | a keyed `key-down` whose `repeat` is true | -- | yes | trusted |
| a release | a keyed `key-up` | `wasHeld` | yes | trusted |
| a release whose press was not seen | a keyed `key-up` | not `wasHeld` | yes | trusted |
| a key with no identity | a key fact whose `code` is `''` or `null` | -- | yes | trusted for `''`, fixture for `null` |
| left to the browser | a key fact of one of the browser's own keys | -- | no | trusted |
| a press of button b, for b from 0 to 4 | a `down` whose `pointerType` is `mouse` and `button` b; opens `press-b` | -- | yes | trusted |
| a release of button b | an `up` whose `pointerType` is `mouse` and `button` b | -- | yes | trusted |
| a chorded press, a chorded release | a `move` whose `pointerType` is `mouse`, `button` 0 to 4 and `buttons` an integer, that button's bit set, or clear | -- | yes | trusted |
| a chorded change, buttons not reported | the same with `buttons` `null` | -- | no | fixture |
| a button beyond the five | a `down`, `up` or `move` whose `pointerType` is `mouse` and `button` above 4 | -- | no | fixture |
| a double click | a `double`, whatever its pointer type -- the platform's carries none | -- | yes | trusted |
| a click of button b, a drag of button b | a derived `commit` of `press-b`, or of `drag-b` | -- | no | trusted |
| the wheel up, down, sideways, still | a `wheel` with `ctrlKey` false and `deltaY` below 0; above 0; 0 with `deltaX` not 0; both 0 | -- | yes | trusted |
| Ctrl and wheel, or a touchpad pinch | a `wheel` with `ctrlKey` true, IT-D8's sentence beside it: the browser does not tell them apart | -- | yes | trusted |
| the context menu | a `context-menu`, whatever its pointer type | -- | yes | trusted |
| a touch or a pen pointer | a `down`, `up`, `move`, `over`, `out`, `leave` or `cancel` whose `pointerType` is `touch` or `pen` | -- | no | trusted |
| focus lost | a `blur` | -- | yes | trusted |

*Trusted* rows are driven by the gate's trusted input in `test/browser/rows.test.js` -- a wheel of no distance, a pen's and a touch's pointers and the browser's own keys among them, each measured reaching a page over the protocol; *fixture* rows, which Chromium never produces -- a `move` whose `buttons` is `null`, a button above 4, a `code` of `null` -- are driven in `test/rows-fixtures.test.js` by events handed to a capture opened over fakes, so each fact is the one capture makes; `test/table-overlaps.test.js` runs the overlap check over both.\
Composed by the released `input-binding` and run through that check over every key fact's type, repeat flag, code class and sixteen modifier states with the four contexts, and every pointer, wheel, `blur` and derived fact -- 46,661 facts -- these 42 rows hit no two together, and no fact of a browser's own key is claimed; revision 2's rows, run the same way, hit Ctrl and A twice (measured).

**Which facts change what.**
- The mouse buttons drawn follow `buttons`, when not `null`, of a fact whose `pointerType` is `mouse` -- a mouse's `context-menu` among them -- and of a `wheel`; a `double`, which carries no pointer type, a `context-menu` invoked from the keyboard, whose pointer type is not `mouse`, and key, `blur`, touch and pen facts never change them.
- Only mouse facts reach the session's pointer operations: `down` through `resolvePress`, `move` through `pointerMove`, `up` through `pointerUp`, `cancel` through `pointerLost`; key facts reach `keyDown` and `keyUp`; a `blur` reaches `keysLost` and then `pointerLost`; every other fact is traced and matched alone.

**Worked verdicts.**\
The legend marks the delivered fact's hit row as the input and a derived fact's hit row as its meaning, painting the steps in order.

| Input | Rows hit | Steps, in order |
|---|---|---|
| `A` pressed, nothing held | a first press | `keyDown`: tracked, not held before |
| A left click | at the `down`, a press of button 0; at the `up`, a release of button 0 | `resolvePress`: `start` of `press-0`; then `pointerUp`: `commit` of `press-0`, `click`, its derived fact hitting a click of button 0 |
| A left drag | at the `move` that crosses the threshold, none | `pointerMove`: `update`, `crossed`; `becomeGesture`: `become` `drag-0`; at the `up`, `pointerUp`: `commit` of `drag-0`, `drop`, meaning a drag of button 0 |
| The right button pressed mid-drag, the left released, then the right | a chorded press; a chorded release; a release of button 2 | `pointerMove`: `update`, twice; `pointerUp`: `commit` of `drag-0`, meaning a drag of button 0 |
| Ctrl and the wheel | Ctrl and wheel, or a touchpad pinch | none: claimed and drawn |
| A press of another button while a gesture is still live, its release unseen | a press of button b | `resolvePress`: `cancelled` the live gesture's `cancel`, then `start` of `press-b` |
| A press of the live gesture's own button, its release unseen | a press of button b | `resolvePress`: `taken`, so `match` is never asked, nothing cancelled and nothing started; the gesture stays live |
| Focus lost mid-drag | focus lost | `keysLost`; `pointerLost`: `cancel` of the drag, its release said not reported |

**What is shown.**\
Each key lit while held, with its repeats observed, its time held as of its latest fact and its last repeat interval from the facts' times, a key first seen repeating marked "pressed before it was seen"; each mouse button lit while held; a wheel turn flashed on the wheel with its deltas and unit; a drag's line from its press to the pointer; the status line -- keys held, buttons held, the live gesture, the threshold and the item under the pointer; the log; every row of the table with its standing for the latest fact -- refused, unbound, unmet or a hit -- the input and the meaning marked; and the fixed lines of what the browser does not report (IT-D8).

**Interfaces between parts.**\
The composition root hands `input-capture` a `deliver` that switches on the fact's family and calls the router with the fact and its reply.\
The router makes the fact's context, traces and matches the fact, asks the reply to claim when the match says so and to take the pointer on a mouse press, makes the session calls the fact's family names, derives and traces each commit's fact, and answers the verdict.\
The picture state takes each verdict and answers the record it leaves and which entries changed, applying the steps in order.\
The painter takes the record and the changes and puts only the items that changed.\
The labels answer once, possibly later than the first paint, and the painter puts every key again when they do.

---

## 7. Run time

**Page load.**\
The entry document names its stylesheet and one module script, both in the release's versioned folder; that module imports the four parts' files from the folder's `vendor` folder by relative path; the rule arrives with every response.\
The composition root opens the grid, the table and the session, the scene on the page's `<svg>` -- which appends its four layers -- and the capture; any refusal is shown as its problems.\
Outside a Chromium-based browser -- no `navigator.userAgentData` naming Chromium -- a line says that coverage is not proved here.\
The plan is chosen on the page, or by the address's `plan` parameter, so a bookmark keeps it and nothing is stored; the keys are painted with their printed labels, the Keyboard Map is asked once, and when it answers each key is painted again with the person's label.\
Every request the page makes is one of the release's files, and after the last of them it makes none.

**A key held, repeated and released.**\
A `key-down` fact is traced and matched and, when its row claims, claimed (IC8), so the browser does nothing with it; `keyDown` records the key held, and the picture records its first observed `time`.\
A repeat is a `key-down` with `repeat` true: the observed count grows, the interval is the difference of two facts' times, unreported when either is `null`, and one log line is rewritten, showing the count and the exact latest fact, never a sum.\
A repeat for a key the session did not hold -- pressed while the page lacked focus -- is shown as "pressed before it was seen": its press time is unknown and its count is of repeats observed.\
A held key's time is shown as of its latest fact, labelled so: no clock ticks between facts.\
A `key-up` releases the key and shows how long it was held -- "at least" that long when its press was not seen; a `key-up` for a key not held is shown as such.

**A key with no identity.**\
A key fact whose `code` is `''` or `null` is traced, matched, claimed, and logged with its `key`, its physical key said to be unreported; `keyDown` and `keyUp` answer it untracked, and no key lights.

**A press, a click and a drag.**\
A mouse `down` fact takes the pointer, is traced and matched, and is handed to `resolvePress`, whose `match` answers the match already found -- the tester keeping no policy between the press and the match -- so its steps are the cancel of a gesture already live, if any, and the start the match opens.\
Each `move` is handed to `pointerMove`; when it answers `crossed` and the live gesture is a press gesture, the router asks `becomeGesture` for that button's drag gesture without a `from`, so the press keeps its origin and its release stays a drop (IB10).\
The `up` is handed to `pointerUp`; on a commit the router derives its fact and traces and matches it, so the log names a click or a drag of that button.\
The item under the pointer is `hit`'s answer: `itemOf` of the target, and, when that is `null` -- as it is while the pointer is taken and every event targets the `<svg>` -- `itemAt` of the fact's `screen`.

**A chorded press.**\
A second button pressed while one is held arrives as a `move` naming that button, and its release likewise; the buttons drawn follow each mouse fact's `buttons`, and the chorded rows name each.\
The last release commits the gesture whichever button it names, since the press the gesture's own button began has ended (IB11).

**The back and forward buttons.**\
Their `up` facts are claimed, so the browser navigates nowhere; a back button's release over a page that does not claim its `pointerup` navigates history, and claiming the `pointerdown` alone does not stop it (measured in Chrome for the back button; the forward button not measured).

**Scroll and pinch.**\
A `wheel` fact is claimed, so the page neither scrolls nor zooms, and is shown with its deltas in the unit the browser gave -- pixels, lines or pages -- unconverted.\
Wheel facts in a row with the same modifiers, unit and sign of each delta make one log line, showing their count and the latest fact's exact values; any difference starts a new line.

**The context menu.**\
Its fact is claimed, so no menu opens, and its row lights (measured in headless Chrome on Linux, where the menu's event comes between the press and the release).

**Focus lost.**\
A `blur` fact from the key source is handed to `keysLost` and then to `pointerLost`: every held key is unlit, the press and any live gesture end, and each release is said not reported, since no release of a key or a button is promised to reach a page that has lost focus.

**Resize.**\
Nothing is repainted: the picture lies in drawing coordinates under a fixed `viewBox`, and each conversion follows the root's screen transform at the moment asked (VS10).

**A touch or a pen.**\
Its pointer facts arrive with their `pointerType`, match their one row and are logged as delivered; nothing is drawn for them and the session never sees them.

---

## 8. Verification

| Success dimension | How it is proved |
|---|---|
| Fidelity | The gate opens the page in headless Chrome and drives trusted input over the DevTools protocol -- keys held and repeated, every button, chords in both release orders, plain drags of every button, presses travelling exactly the threshold and just beyond it, double clicks, wheels, a synthesized touchpad pinch, the context menu, a media key with no `code`, and focus lost by opening a second tab, once during a captured drag released in the other tab and returned to with no `up` or `cancel` -- and checks after each input that the picture record, the page and the verdict show exactly what section 6's worked verdicts give; a claimed pinch leaves `visualViewport.scale` 1, and with claiming disabled in a test build makes it 2, the positive control (measured) |
| Immediacy | A test spies on the scene and finds every put for an input made inside that input's delivery (GT2); a harness around the composition root's `deliver` finds every delivery done within 10 ms in the gate's Chrome, a bound generous against one frame of 16.7 ms, and a planted build that waits 50 ms in its delivery fails it (GT9); the time from each fact's `time` to the end of its put is reported; on the director's Chromebook, typing fast, chords and a drag are watched for any lag a person sees, and the result recorded in `docs/DECISIONS.md`, not gated |
| Coverage | Every row the browser can produce is matched by trusted input and every other by its fixture, and the overlap check over the rows' whole cross-product finds none (GT5); a native input method used on the director's Chromebook, the keys it delivers and any committed text the page did not receive recorded (IT-D12); every `code` in each plan is a UI Events code value or one of Chromium's, marked so; every input family in section 2's scope has a row; the fixed lines of what no page can know are shown, the Ctrl row's sentence among them (IT-D8); a page without `navigator.userAgentData` naming Chromium, simulated, shows its line; a `code` not drawn is logged as "not on the drawn keyboard" |
| Containment | The gate watches every request from before navigation through teardown, input dispatched from the navigation's commit, before the load event, and finds the entry first, then each of the release's files once, and none after; planted leaks, each carrying a key in its address, each fail -- a same-origin script element, a dynamic import, a stylesheet and a prefetch, which the rule lets through, an image and a shape's `href`, which it refuses, and a navigation to the page's own origin, which no rule stops (each measured); the painter's shapes held to its allowlist (GT8); the source check (GT1); the gate's server and the deploy check find the rule in every response (GT6) |
| Proof of reuse | The lockfile pins each part's release file by its hash; the deploy check finds each part's files byte-identical to its release (GT3); the gate holds GT4 against `docs/BACKLOG.md` |
| Teachability | Every code example in the guide is run in the gate; a cold reader, given the guide and this repository alone, builds a small application from the four, and what they could not do is recorded (section 10, row 14) |

**The deploy's checks.**\
After each copy into a bucket: every object's bytes, read through the public host, equal the release's, by its SHA-256; every response carries the rule, `Referrer-Policy`, `X-Content-Type-Options` and the `Cache-Control` set on each object, measured at the host, a header missing at the lab stopping the deploy before production; the backend's edge cache is off; and the gate's smoke run passes against the host.\
A test serves a local copy of a bucket as each deploy step leaves it and loads the page between every pair of steps, finding each load whole: one release's files only.

---

## 9. Delivery and hosting

**The repository.**\
`VISION.md` at the root; `docs/` for this document, `docs/DECISIONS.md`, `docs/BACKLOG.md` and the guide (IT-D6); `src/` for the parts; `vendor/` for each shared part's release files, copied from its pinned package with their declarations; `test/` for the gate's tests, its trusted-input driver and its local server, which sends the rule; `tools/` for the source check, the vocabulary check, the vendoring, the release and the deploy.

**The build and the gate.**\
As IT-D1 decides; the gate builds, runs the tests -- the Chrome run among them -- and the source and vocabulary checks, on every push.

**A release.**\
Made only by the repository's own CI from a tag: the entry document `index.html`, and one folder named by the tag holding everything else -- the stylesheet, the built modules, and the four parts' files in its `vendor` folder, copied unchanged from their pinned release files -- with a manifest of every file's SHA-256, attached to a GitHub release (IT-D10).\
The entry names only its own folder and every module imports by relative path within it, so two releases never share a file's address.

**A deploy.**
1. Copies the release's folder into the lab bucket, each object's `Cache-Control` set as metadata to `public, max-age=31536000, immutable`, refusing to replace an object whose bytes differ.
2. Checks every object's bytes and headers through `input-lab.apnex.io`.
3. Copies the entry document, its `Cache-Control` set to `no-store`, and runs the deploy's checks there.
4. Does the same into the production bucket, served at `input.apnex.io`, the entry last, only once the lab's checks passed.

No step deletes a folder, so a page loaded from an earlier entry finds every file it names, and a rollback is the deploy of an earlier release, which finds its folder present and copies its entry.\
The entry is never kept, since a browser's Back button and restored tabs reuse a kept copy without asking even under `no-cache` (measured in the programme); a tab still running an earlier entry stays whole.

**Hosting.**\
Two public storage buckets, each a backend of the existing load balancer, a global external Application Load Balancer that already holds a certificate for every `apnex.io` name; each backend made with its edge cache off, as the load balancer's existing public bucket backend is; neither host is behind IAP.\
Each backend's custom response headers carry the rule, `Referrer-Policy: no-referrer` and `X-Content-Type-Options: nosniff`, which the provider's documentation states for a backend bucket with no edge cache required; the URL map's header action for the host is the alternative, should the lab's measurement find them missing (IT-D5).\
There is no server logic.

---

## 10. Owed and open

| # | Owed or open | Why it matters |
|---|---|---|
| 1 | The current architecture, `docs/ARCHITECTURE.md`, is derived by a generator from the code and the gate's results, never written by hand; the generator is owed with the first code | AR1 forbids a hand-written current instant |
| 2 | The Keyboard Map is offered by Chromium browsers (measured present in headless Chrome) | Where it is absent every label is the plan's printing, marked as assumed |
| 3 | A real touchpad, keyboards other than the two plans, and Chromium browsers other than Chrome are not proved by the gate | Fidelity is proved for what Chrome delivers to synthesized input |
| 4 | The Chromebook plan's action-key codes are Chromium's, not measured on a Chromebook | The director's keyboard, run on the page with what each key sends recorded, is the plan's acceptance; a code it sends that is not drawn is logged meanwhile |
| 5 | What a native input method delivers to a page with nothing editable is not measured: injected composition reached no listener there, which says nothing of a native one's key events | Coverage of typing through one is not established until IT-D12's acceptance has been run on the director's Chromebook |
| 6 | Caps Lock's and Num Lock's state is not shown: no shared part carries it | Lock state is not an input, so coverage holds |
| 7 | The rule cannot stop a same-origin script, stylesheet or prefetch, or a navigation carrying data in its address (each measured in Chrome) | Those rest on GT1, the allowlist and the request monitor |
| 8 | No telemetry, by containment | A failure in production is seen only by its visitor |
| 9 | Ctrl and a mouse wheel make no page zoom in headless Chrome, claimed or not (measured) | Their claim is proved only by the Chromebook acceptance |
| 10 | Old release folders accumulate in both buckets | Pruning is held, the trigger "a bucket's size or listing becomes a cost" |
| 11 | The trusted-input driver is the fifth copy of one harness -- each shared part keeps its own | A shared test driver, once a change must be made in more than one copy |
| 12 | Immediacy on real hardware rests on a recorded acceptance, not on the gate | Headless timing is no person's screen |
| 13 | Should `input-binding` not hold the keys held, the picture state holds them itself | One record of held keys either way, never two |
| 14 | The guide's cold reading is owed | Teachability is claimed until a newcomer has built from it |

---

## 11. Decisions

Each with its options and their costs, and a recommendation given apart; the director ratified every one at its recommendation, 2026-10-24 (`H26-14`, this repository's `0001`).

**IT-D1 -- Language, build and how the parts are imported.**

| Option | Cost |
|---|---|
| TypeScript compiled by `tsc` to ES2022 modules, unminified, each shared part's release files vendored into the release's `vendor` folder and imported by relative path, no import map, no bundler | The source names `../vendor/input-capture/index.js` where a newcomer may expect `@apnex/input-capture`, so the guide shows both forms; a vendoring step in the build; the parts' declarations still check every fact and outcome; the rule needs no hash (IT-D5); the four parts import nothing but their own files (checked in every `dist`), so they vendor unchanged |
| The same, through an import map and bare names | An inline script: a per-release hash, a rule split in two, and a header that restricts no script, as the second reading found |
| Plain JavaScript served as written, checked by `tsc --checkJs` | No build; types as comments, harder to read |
| Bundled into one file | The parts no longer arrive as their release files, so P7 and the deploy's byte check are lost |

**Recommended:** the first: one rule for every release, and each part served byte for byte as released.

**IT-D2 -- Keyboard plans and labels.**

| Option | Cost |
|---|---|
| Full-size ANSI and a Chromebook keyboard, the person choosing which is drawn, each drawn as a reference and never presented as the detected keyboard | Two plans to keep exact; the Chromebook has no numeric keypad and no Insert, Home, End, Page or Delete keys, a Search key, `MetaLeft`, where Caps Lock is, and a top row of action keys whose codes -- `BrowserBack`, `BrowserForward`, `BrowserRefresh`, `ZoomToggle`, `ShowAllWindows`, `BrightnessDown`, `BrightnessUp`, `AudioVolumeMute`, `AudioVolumeDown`, `AudioVolumeUp` -- are Chromium's (its `dom_code_data.inc`), six of them UI Events code values too, none measured on a Chromebook, where the code values' advice for a doubled function row would give `F1` to `F10` instead |
| Full-size ANSI (104 keys) alone, others held | The director's own keyboard not drawn; the Keyboard Map changes labels, never where keys lie |
| ANSI tenkeyless (87 keys), others held | As the first build drew; a numeric keypad's keys are logged only, and the director's keyboard still not drawn |
| Several physical keyboards now, chosen by the person or guessed from the Keyboard Map | Three or four plans to keep exact; a guess is not "exactly" |
| No drawn keyboard, a list of keys pressed | Fails the vision's "a picture of the keyboard" |

**Recommended:** both plans, chosen on the page or by the address's `plan` parameter, nothing stored, labels from the Keyboard Map marked as reported or assumed; the Chromebook plan's codes marked unmeasured until the director's keyboard has been run on the page and what each key sends recorded, its acceptance; other keyboards held with the trigger "a person on another physical keyboard reports a key drawn wrong or missing".

**IT-D3 -- Where the routing between capture and binding lives.**\
Answered by the shared parts' releases: the mechanism every consumer wrote out -- the press, its match, a cancel and a second start -- is `input-binding`'s `resolvePress` (IB15); the router passes the match it found and keeps no protocol of its own, and the switch over fact families is the composition root's wiring, since no shared part imports another.

**IT-D4 -- What lies under a captured pointer.**

| Option | Cost |
|---|---|
| `vector-scene`'s `itemAt(screen)`, answered by the platform's own hit test at a point, asked when `itemOf` of the target answers `null` | A change to `vector-scene` in its next release; exact as the browser hit-tests, `pointer-events` honoured (measured in Chrome under capture); it answers the first item the scene still holds under the point, looking through anything else |
| The tester's own map of blocks, asked by `snap-grid` geometry, as the first build did | About twelve lines here, a second hit test that disagrees with the browser's at every edge, and general capability held in an application |
| Not taking the pointer | A drag leaving the `<svg>` loses its events |

**Recommended:** `vector-scene`'s `itemAt`, in `hit` as `itemOf(target) ?? itemAt(screen)`, so no state of the capture is kept.

**IT-D5 -- The browser rule's text, and where it is set.**\
Proposed: one rule, in every response's header, the same for every release, with `Referrer-Policy: no-referrer` and `X-Content-Type-Options: nosniff` beside it and no `report-uri` or `report-to`, since a report is itself a request: `default-src 'none'; script-src 'self'; style-src 'self'; worker-src 'none'; form-action 'none'; base-uri 'none'; frame-ancestors 'none'`.\
Under it, with no import map, the four parts' release files load by relative path, while an inline script, an image, a `fetch` and a worker are each refused -- the worker only because `worker-src` is named, `script-src` otherwise standing in for it -- and a same-origin script, dynamic import, stylesheet, prefetch and navigation are not, so GT1, the allowlist and the request monitor hold those; a `style` attribute written by script is refused, so the painter states every look by class (each measured in Chrome).

| Option | Cost |
|---|---|
| One rule, whole, in the header of every response, with no inline script (IT-D1) | Relative imports; the residual same-origin channels held by the source check, the allowlist and the monitor |
| Two policies, a header without `script-src` and a per-release `meta` rule carrying the import map's hash | The header restricts no script load, and a file opened at its own address carries no `meta` rule; the hash changes with every release |
| One text carrying the hash, in the header | The header changes with every release, and changes in a step apart from the entry |
| A `meta` element alone | Outside `H26-13`'s ruling that the response headers carry the rule; no `frame-ancestors` |

**Recommended:** the first, set as each backend bucket's custom response headers, the URL map's header action for the host the alternative, and measured at the lab before every production copy.

**IT-D6 -- Where the guide to using the four parts together lives.**

| Option | Cost |
|---|---|
| `docs/GUIDE.md` in this repository, each part's `README.md` pointing to it | Beside its worked example, the one public place that composes all four; a part's release does not carry it |
| A repository of its own | A fifth home to keep in step, with no code to test its examples against |
| Split across the four parts' `README.md` files | No part may name another's internals; the composition is nobody's |
| In mission-kit | Far from both the parts and the example |

**Recommended:** `docs/GUIDE.md` here, each part's `README.md` pointing to it.

**IT-D7 -- Where the tester's own records live.**

| Option | Cost |
|---|---|
| `docs/DECISIONS.md` for the tester's own rulings, `docs/BACKLOG.md` for its deferrals and every workaround with the release that retires it; the programme's rulings stay with the programme | Two records, each with one scope |
| Every ruling kept with the programme | The tester's repository cannot be read alone |
| Both, mirrored | Two copies drift |

**Recommended:** the first.

**IT-D8 -- How what the browser does not report is marked.**

| Option | Cost |
|---|---|
| One fixed list on the page of what no page can know -- shortcuts the operating system or the browser keeps, a pinch told from Ctrl and the wheel, which physical keyboard is in use, a key's identity where the browser names none -- and a note on each key the code values call seldom reported | Notes are general, never per person; a key kept on one machine and not another is not known |
| A second list of what the tester does not show, as revision 2 proposed | A delivered input left unshown does not meet the vision's coverage, as the second reading found |
| Nothing marked | Fails coverage's "plainly marked" |
| Asking the person to press every key, and marking those never seen | A game, which the vision rules out |

**Recommended:** the first.

**IT-D9 -- What the tester claims.**

| Option | Cost |
|---|---|
| Every key, every button's press and release, every wheel, double click and context menu, except the browser's own keys -- reload, fullscreen, the developer tools, per platform as section 6 lists them -- which match their own row, claim off, and no claiming row | The page keeps Tab, so focus never wanders, and a person can still reload; the browser still keeps what it never lets a page claim |
| Everything claimable | A person cannot reload by keyboard |
| Nothing | Wheels scroll, pinches zoom, the back button leaves the page, Tab moves focus |

**Recommended:** the first.

**IT-D10 -- What a release is, and who deploys it.**

| Option | Cost |
|---|---|
| CI builds a release from a tag -- the entry and a folder named by the tag, the vendored parts inside it -- as the shared parts are built; an operator runs the deploy script with their own cloud credentials | No cloud credential in CI; a deploy is a person's or an agent's deliberate act, checked |
| CI deploys on each tag | A credential able to write the production bucket lives in CI |
| A deploy from a working copy | Not a release; the byte check has nothing to compare against |

**Recommended:** the first.

**IT-D11 -- Caching.**

| Option | Cost |
|---|---|
| Each release's folder `public, max-age=31536000, immutable` and the entry `no-store`, both as object metadata set at the copy, the backends' edge cache off | A release's files fetched once; a tab on an earlier entry stays whole; the entry never kept, so Back and restored tabs fetch it |
| Every object `no-cache` | Revalidating each file does not stop one load mixing two releases' files when they share addresses, and a kept entry is reused by Back and restored tabs without asking |
| `Cache-Control` set by the backends' custom response headers alone | The objects carry the storage service's default |
| Nothing set | The storage service's default, which may cache a public object for an hour (from its documentation, not tried) |

**Recommended:** the first.

**IT-D12 -- The browsers covered, and composition.**\
The vision's coverage asks that every input a person can make with a keyboard, a mouse or a touchpad show, or be plainly marked as one the browser does not report; "not shown" meets neither.

| Option | Cost |
|---|---|
| Chromium-based browsers covered, ChromeOS's among them, named in section 2; elsewhere the page says plainly that its coverage is not proved there; no composition facts; and coverage of typing through an input method claimed only once a native one has been used on the director's Chromebook, the keys delivered recorded and any committed text the page did not receive named | Safari's trackpad gesture events and other browsers' differences fall outside the scope; that injected composition reaches no non-editable page (measured) says nothing of what a native input method delivers, so until the acceptance that part of coverage is owed, not met |
| The same, and composition as an `input-capture` family, the tester's key source an editable element | A hidden field kept focused, text inserted unless cancelled, an on-screen keyboard opening on a touch screen, the input method's window over the picture; feasible -- injected composition reached a focused text field with its `data` (measured) |
| Every browser covered, Safari's gesture events a family of their own | A family no browser in the gate delivers, unmeasured |
| The vision amended to admit a delivered input left unshown | A ratified success dimension weakened |

**Recommended:** the first; the director's to rule, since it sets the scope section 2 states.

---

## 12. Readings

Every finding's full record and reason is kept with the programme's records (section 1, Provenance); those on this document are listed here by where it changed.

**Reading 1 -- 2026-10-24, of revision 1 at `5094216`.**\
Read cold with the design of the shared parts' releases, by three readers of three model families; 47 findings across both documents.

| Where revision 2 changed | Findings |
|---|---|
| Section 3, principles P1, P3, P4 and P5 | a:F11, o:F5, o:F8, o:F15 |
| Section 4: Deltas; GT5, GT6, GT8 and GT9 | a:F18; a:F10, a:F15, o:F5, o:F7 |
| Section 5: the router's protocol held by `input-binding`, the legend from the trace, `hit` | o:F3, x:F4, a:F11, a:F13, a:F14 |
| Section 6: the ordered verdict, the rows written exactly, which facts change what, honest times, no merged values | o:F1, a:F13, a:F10, a:F12, o:F9, o:F15, o:F16, x:F2, o:F2 |
| Section 7: the press through `resolvePress`, a key with no identity, timing, coalescing | a:F13, a:F14, o:F2, o:F15, o:F16 |
| Section 8: the delivery bound, the positive pinch control, the request monitor and planted leaks | o:F7, o:F19, o:F8, x:F2, x:F3, o:F5 |
| Section 9, IT-D10 and IT-D11: versioned folders, the entry last, object metadata, the edge cache off | o:F6, a:F19 |
| IT-D2: both plans, the person choosing; in part for x:F1, which asked for the Chromebook alone with measured codes | a:F16, o:F21, x:F1 |
| IT-D3: answered by the shared part | o:F3, x:F4 |
| IT-D5 and IT-D8 | a:F15, x:F6, o:F5, o:F6; o:F8, x:F2, x:F3 |
| Not changed here: the legend is the tester's own, painted from the trace | a:F17 |

**Reading 2 -- 2026-10-24, of revision 2 at `71b0842`.**\
Read by the same three; 32 findings across both documents, one reader's twelve recovered by hand from a malformed reply and carrying no verdict from another family.

| Where revision 3 changed | Findings |
|---|---|
| Section 2 and IT-D12: the covered browsers proposed; the double click the platform's | o:F13; o:F3 |
| Section 3, IT-D1 and IT-D5: no import map, one whole rule in every response, the allowlist written out | o:F12, a:F12, x:F3 |
| Section 6: the rows exclusive with their context, buttons beyond five and `buttons` unreported, which facts change what, the session's declaration, the derived fact, worked verdicts | o:F1, o:F2, x:F5, a:F8, o:F3, a:F9, a:F10, o:F10, o:F9, x:F6 |
| Section 7: focus lost ends the press and any gesture again, revision 2's change reverted | o:F8 |
| Section 8: the cross-product, the threshold's boundary, the drag left by focus loss, planted leaks, a load between deploy steps | o:F1, o:F10, o:F8, o:F12, x:F3 |
| Section 9: headers measured at the lab before production, the URL map's header action the alternative; partial for o:F11, whose claim that backend-bucket headers need an edge cache the provider's documentation does not bear out | o:F11 |
| IT-D8: one list, "not shown" withdrawn | o:F13 |

**Reading 3 -- 2026-10-24, of revision 3 at `1a537cc`, confirming.**\
Read by two of the three; one found nothing to raise, the other six findings, each supported by the first.

| Where revision 4 changed | Findings |
|---|---|
| Section 4, GT5, and section 6: rows the browser produces proved by trusted input, the rest by named fixtures, the overlap check over both | o:F1 |
| Section 6: the second press over a live gesture, of its own button, taken with nothing cancelled or started | o:F4 |
| Section 3, section 10 and IT-D12: the composition measurement stated as only that, a native input method's acceptance a condition of the coverage claim | o:F5 |
| Section 6 and IT-D9: the browser's own keys per platform, with their sources, macOS's fullscreen shortcut among them | o:F6 |

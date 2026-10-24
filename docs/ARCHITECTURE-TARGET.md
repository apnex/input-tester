---
instant: target
---

# input-tester - system architecture, target

**Instant: target.** input-tester described as the system it is when the ratified decisions about it are built.\
Its current architecture is empty: no code exists yet, and `docs/ARCHITECTURE.md` is derived from the code once it does (section 10, row 1).

Written in the present tense of a system that exists.\
It contains no plan, order or estimate; those belong to a board and to deltas.\
A section marked provisional describes the system as this draft proposes it, resting on the decisions owed in section 11, each at its recommendation; it changes with the ruling.

---

## 1. Status and authority

Authored by the architect, ratified by the director per section; approval is aggregate-only.\
Revision 2, 2026-10-24, folding in the first reading (section 12).\
Nothing here is ratified yet, except what the programme's rulings `H26-12` and `H26-13`, each as amended, already settled; the table says where.

| Section | Maturity | Reopens on |
|---|---|---|
| 2 Identity, scope, non-goals | approved in part: the repository, the name, the address, the touchpad in scope and the non-goals are `H26-12`'s and `H26-13`'s; the rest provisional | A ruling that changes scope, or an input a person can make that the scope leaves out |
| 3 Justification chain | provisional | A ruling recorded in `docs/DECISIONS.md`, or an amendment of `VISION.md` |
| 4 Axiom alignment | provisional | A change to the tester's traits, or a tension discharged or found |
| 5 Anchored core | provisional | A duty with no owner, owned twice, or held here that a shared part should hold |
| 6 Entities, data, interfaces | provisional | A shown thing with no entity behind it |
| 7 Run time | provisional | A sequence of inputs whose picture is not listed |
| 8 Verification | provisional | A success dimension, or a claim, with no check |
| 9 Delivery and hosting | approved in part: the buckets, the two hosts, IAP left out, a deploy that copies one release to the lab first, and a browser rule in the response headers are `H26-13`'s as amended; the rule's split, the versioned folders and the rest provisional | A change of host, or a deploy that is not a copy of one release |
| 10 Owed and open | provisional | Any row closed or added |
| 11 Decisions owed | provisional | Any decision taken |
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
- Every key event the browser delivers -- press, repeat, release, with its `code`, `key`, modifiers and time; a key whose physical identity the browser does not report shown as delivered, its identity said to be unreported.
- Every mouse button from 0 to 4, alone or chorded, as press, click, drag, double click and release.
- The wheel and the touchpad's scroll and pinch, as the browser delivers them, with their units.
- The context menu, and the page losing focus.
- What each input is taken to mean: every binding row's standing for it, the matched one marked, and each gesture's phase as it falls due.
- What the browser cannot report, and what the tester does not show, each said plainly.

**Non-goals.**
- Recording, storing, counting or sending any input, anywhere: it is not a keylogger.
- Accounts, server logic, or data of its own beyond the page's files.
- Changing what any key or button does.
- Seeing what the operating system or the browser keeps from a page.
- A touch screen's or a pen's gestures: their pointers are shown as delivered, never drawn or named.
- Pan and zoom of the picture.
- Holding a capability any application would want: that belongs in the shared part that owns it.

---

## 3. Justification chain

**Domain.**\
A browser reports a keyboard through the UI Events `KeyboardEvent`: `code` names the physical key whatever characters the keyboard prints (the UI Events KeyboardEvent code values), `key` the character or action it produced, `repeat` an automatic repeat, and modifiers as booleans.\
It reports a mouse through Pointer Events: one pointer per mouse, a press of any button while another is held arriving as a `pointermove`, so a chord's presses and releases after the first are moves, and `pointerup` comes only when the last button is released (measured in Chrome: left pressed, right pressed, left released, right released gives `pointerdown` 0, `pointermove` 2, `pointermove` 0, `pointerup` 2).\
A move with no change of button carries `button` -1, so a chord's moves are told from a drag's by `button` alone (measured in Chrome, under a trusted-input driver that names the held button on every move).\
It reports a wheel and a touchpad's two-finger scroll as `wheel` events with a delta and its unit, pixels, lines or pages, and a touchpad's pinch as a `wheel` with `ctrlKey` set (measured in Chrome with a pinch synthesized as a touchpad sends it; real hardware and other browsers not measured).\
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
| P1 | **Delivered, never inferred.** The picture shows only what a fact carried or an outcome decided; what the browser does not report is said to be unreported, and what the tester does not show is said not shown | vision "exactly"; `A8` |
| P2 | **Fix the part.** A need any application has is met in the shared part that owns it, never worked around here; every workaround ever needed is recorded with the release that retires it | vision, why it exists; `A3`, `A14` |
| P3 | **Shown in the same task.** Each input's picture is put inside its delivery; no timer, no frame batching and no clock, so a duration is shown as of the latest fact | vision, immediacy |
| P4 | **Sends nothing.** No network interface, navigation, storage or clock in the code; a release-independent rule in every response refuses every channel the page does not use, the page's own rule allows only its release's files, and every request is watched from navigation to teardown | vision, not a keylogger, containment |
| P5 | **One table of meanings.** Every input and gesture the tester names is a row of one `input-binding` table, traced for the legend (IB6), matched for the meaning (IB7) and proved free of overlaps (IB8) | vision, what it is; `A3` |
| P6 | **The picture is data.** What is shown is a description put into `vector-scene`, made from one record of state | `A1` |
| P7 | **Release files as published.** Each shared part is loaded byte for byte as its release published it | vision, proof of reuse; `A8` |
| P8 | **Code a newcomer reads.** The code reads in the order the guide teaches, and holds no word of any other application | vision, teachability; what it is not |

**Decisions.**\
Ruled by the programme: `H26-1`, the tester at `input.apnex.io`, a keyboard and a mouse drawn and every gesture highlighted live, built from the four parts alone; `H26-12` as amended, a sovereign application in `apnex/input-tester` with its own vision and architecture, composing the four through their releases, the parts' gaps fixed in the parts before it is built, and a guide to using the four together with the tester as its worked example; `H26-13` as amended, the vision ratified, the touchpad's scroll and pinch in scope, the page served from a public bucket behind the existing load balancer, its lab at `input-lab.apnex.io`, both outside IAP, a deploy that copies one release to the lab, checks it, then production, and a browser rule in the response headers that the page sends nothing.\
Answered by the shared parts' releases: IT-D3, the routing between capture and binding, now `input-binding`'s `resolvePress`.\
Owed: IT-D1, IT-D2 and IT-D4 to IT-D11 (section 11).

**Model.**\
One stream through single-duty parts: a platform event becomes one fact (`input-capture`); the router traces it against the table, matches it and passes it through the session (`input-binding`), giving one verdict that holds every step in order; the picture state takes the verdict; and the painter describes the picture to the scene (`vector-scene`), which brings the page to it; the keyboard and the mouse are placed on a grid (`snap-grid`).

---

## 4. Axiom alignment

The M7 audit of this design.

**Identity.**\
This document's second revision, read against the four parts' published contracts at `v0.1.0` and the design of their next releases at its second revision, mission-kit at `e33c850`, the cold-agent experiment that first built a tester from the four, and the first reading of both.

**Traits.**\
Stateful, narrowly -- the page writes what is held and what is live, and reads it back at the next event; were that record wrong, a key would stay lit, so T1's test holds, for one page's life, with nothing persisted.\
Not declarative -- nothing reconciles a running state to a declaration.\
Not multi-agent -- one person, one page; no work crosses from one actor to another inside the system.\
Not autonomous -- the person watching the page sees every response, and the page acts on no failure; served unattended from a bucket, it has no operation that runs on its own.\
Not llm-in-the-loop.

**Verdict.**\
Revision 2 is `pass, with guardrails`, by its author; its standing is to be confirmed by a second reading.

| Axiom | Weight | How the design stands | Tension |
|---|---|---|---|
| `A3` | load-bearing | Parts of one duty each (section 5); the four shared parts reached only through their contracts; the press's routing held by `input-binding` (`resolvePress`), the tester's router keeping no protocol of its own; a gap in a part is fixed in the part (P2) | Open: the two keyboard plans are held here, one application's data, until a second application draws a keyboard |
| `A1` | supporting | One record of picture state, made only from verdicts, frozen, readable whole at any moment (the proof reads it); held keys read from `input-binding`'s session, never kept twice | Transient by design: a reload ends it, and nothing should survive one |
| `A4` | supporting | The tester's rulings in `docs/DECISIONS.md`, every workaround in `docs/BACKLOG.md` with the release that retires it (IT-D7); each reading's findings on this document and their dispositions in section 12 | Open: the experiment and each reading's full record are kept outside this repository, with the programme |
| `A8` | load-bearing | The gate drives trusted input in headless Chrome over every binding row, proves no input matches two rows, proves every request belongs to the release, fails planted leaks and a planted slow delivery, and runs a positive control for the claimed pinch (section 8) | Open: a real touchpad, the Chromebook plan's codes, other browsers and a mouse wheel's page zoom are not in the gate; each rests on a recorded acceptance |
| `A9` | supporting | A deploy copies a release's versioned folder to the lab, checks its bytes, headers and a smoke run there, switches the entry last, and only then production; old folders stay, so a rollback is an entry copied back | Deliberate: no telemetry, by containment, so a failure in production has no witness but its visitor |
| `A14` | supporting | Every gap the first build and the first reading met is a part's release, the guide, or a row here with its trigger | Open: what the tester meets in browsers other than Chrome is unmeasured |

**Layered application.**\
State and truth: the picture is derived from verdicts alone, each holding its steps in order, and the session holds input state once.\
Composition: four parts through their contracts, the tester's parts one duty each; the switch over fact families is the composition root's wiring, the protocol behind it the session's.\
Integrity: the gate proves fidelity, immediacy's bound and containment in a real browser before a release exists, with controls that show each check can fail; the deploy proves the release where it is served.\
Director attention: section 11 asks one decision at a time, each with a recommendation.

**Deltas.**\
From the empty current instant to this target: the shared parts' releases -- `input-capture`, `input-binding` and `vector-scene` at `0.2.0`, `snap-grid` at `0.1.1`; the guide; this repository's first code, gate and release; two buckets, each a backend of the load balancer with the header rule and the edge cache off; the first deploy; and the generator of the current architecture.

**Guardrails for the build.**
- GT1: the source names no network interface, no navigation, no storage, no clock or timer and no dynamic import, held by a source check in the gate.
- GT2: every put for an input happens inside that input's delivery, held by a test.
- GT3: each shared part's files are served byte-identical to its release, held by the deploy check.
- GT4: no workaround row is open while the release named to retire it is installed, held by the gate.
- GT5: every row of the table is matched at least once by the gate's trusted input, and a plain drag of every button matches no chord row.
- GT6: the browser rule is two texts from one declaration -- the release-independent header, sent by the backends and by the gate's own server, and the entry's `meta` rule, the whole rule but `frame-ancestors`, carrying the import map's hash -- with no report endpoint.
- GT7: the source holds none of the words the shared parts' vocabulary check refuses on behalf of their first consumer, held by running that check here.
- GT8: every shape the painter puts is within its allowlist, and the stylesheet holds no `url(` and no `@import`, held by a test.
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
| **Bindings** | Declares what every input is taken to mean | `input-binding`'s table form (IB3); facts as `input-capture` makes them (IC5) | The composed table (IB4); each row's words for the legend; the overlap proof (IB8) | P5 |
| **Router** | Takes each delivered fact through the table and the session | `input-capture`'s facts and replies (IC5, IC8); the table's `traceInput` and `matchInput` (IB6, IB7); the session's `resolvePress`, moves, releases, losses and keys (IB10 to IB15) | One verdict per fact (section 6) | P1, P8 |
| **Picture state** | Keeps what the person is shown, as data | Verdicts; the session's state | One frozen record (section 6) | P1, P6 |
| **Painter** | Describes the picture as shapes, within an allowlist | The picture state; the plan; the labels | Puts and removes in `vector-scene`'s layers (VS6); the fixed lines of what is not reported and not shown (IT-D8) | P3, P4, P6 |
| **Composition root** | Composes the page from its parts, and switches each fact to the router by its family | Every part; the four shared parts' opening functions | Nothing; a refused opening shows its problems on the page | P8 |
| **Page shell** | Serves the page's entry under its browser rule | The release's files | The entry document: its `meta` rule, its import map naming the release's versioned folder, its stylesheet | P4, P7 |

**The shared parts it consumes.**\
The tester composes `input-capture`, `input-binding` and `vector-scene` at their next minor releases, `0.2.0`, which carry what the first build and the first reading found missing, and `snap-grid` at `0.1.1`, whose change is its documents alone.

| Part | What the tester uses | What it never asks of it |
|---|---|---|
| `snap-grid` | One square grid (SG1) of quarter-key pitch; `span` (SG8) gives each key and mouse button its exact rect from integer positions | Drawing a grid, which the tester does not show; hit-testing |
| `input-capture` | One capture (IC3) on the page's `<svg>`, the window as key source, listening also for the wheel, the context menu and focus loss; facts (IC4, IC5) with `time` and wheel deltas; the reply's `claim` and `takePointer` (IC8); `hit` answered as `itemOf(target) ?? itemAt(screen)` | What an input means |
| `input-binding` | One table (IB3, IB4) traced (IB6) and matched (IB7) for every fact; one session whose `resolvePress` (IB15) takes every mouse press, whose release rule commits a chorded gesture on its last release and tells another pointer's moves and release apart (IB11), and which holds the keys held, answering a key with no identity untracked (IB14) | A picture, an action, a clock |
| `vector-scene` | One scene (VS3) on the page's `<svg>`, four layers, items put by key (VS6); `itemOf` (VS9) for a target the scene made and `itemAt` for a point, the first item the scene made anywhere under it (VS12); `toDrawing` (VS10) as capture's conversion | A view: the picture never pans or zooms |

**Layers.**\
`keys` and `mouse` hold the keyboard and the mouse; `trails` holds a drag's line, and `panel` the log, the legend, the status line and the fixed lines; the last two are declared with `pointer-events` `none`, so the platform looks through them.

---

## 6. Entities, data and interfaces

| Entity | Holds |
|---|---|
| Key | Its plan, `code`, the printed label, a position `{ col, row }` and a width and height in quarter keys, and an optional note -- "often kept by the operating system", "seldom reported", "code not measured on this keyboard" |
| Mouse button | A name, its `button` number (0 to 4), its `buttons` bit (1, 4, 2, 8, 16 for 0 to 4), its block of positions |
| Row | `id`, the words shown in the legend, `on` over facts, an optional `when` over the context, its claim flag, and the gesture it opens if any |
| Fact | As `input-capture` makes it (IC5), handed on unchanged |
| Verdict | `{ fact, claimed, trace, steps }`: `trace` the array `traceInput` answered, every row's standing; `steps` in the order made, each `{ operation, outcome, match }`, `match` the match of a fact the router derives from a commit outcome, else `null` |
| Picture | Held keys, each with its first observed fact's `time`, whether that fact was a first press or the key was first seen repeating, its repeats observed, and its latest fact, exact; keys whose identity was not reported, as delivered; the mouse buttons held; the latest wheel fact, exact, and how many like it came in a row; the live gesture, its phase and its trigger; the press's start and whether it is beyond the threshold; the log, a fixed number of lines, newest first; the latest trace; the item under the pointer |
| Shape | As `vector-scene` takes it (VS5): a tag from the painter's allowlist, attributes, and text or children |

**The table's rows, by family.**\
The context a row's `when` reads is the session's keys held before the fact.
- Keys, each of `key-down` with `repeat` false and a non-empty `code` unless it says otherwise: a modifier press; a modifier chord, a non-modifier key with Ctrl, Alt or Meta held; a first press, no other non-modifier key held; a roll-over press, another held; a repeat, `repeat` true; a release, `key-up`, its key held; a release whose press was not seen, its key not held; a key whose `code` is empty or `null`, pressed or released.
- Buttons, each of a fact whose `pointerType` is `mouse`: a press of each of the five buttons, `down` naming it, each opening that button's press gesture; a chorded press and a chorded release, a `move` whose `button` is 0 or more, the press when that button's bit is set in `buttons` and the release when it is clear; a double click, `double`; a release of each button, `up`, claimed for 3 and 4.
- Gesture outcomes: a click and a drag of each button, matched from a fact the router makes of each commit outcome, so the legend names them too (the guide shows this use of the table's opaque facts, IB1).
- Wheel, each with `ctrlKey` false: up, `deltaY` below 0; down, above 0; sideways, `deltaY` 0 and `deltaX` not; a turn of no distance, both 0, `deltaZ` shown as delivered; and, with `ctrlKey` true and any deltas, "Ctrl and wheel, or a touchpad pinch", IT-D8's sentence beside it: the browser does not tell them apart.
- The context menu, claimed; focus lost.
- A touch or a pen pointer: any pointer fact but `context-menu` whose `pointerType` is `touch` or `pen`.

**Which facts change what.**
- The mouse buttons drawn change only on a fact whose `pointerType` is `mouse`, or a `wheel` fact, whose `buttons` is not `null`; a key, `blur`, touch or pen fact never changes them.
- Only facts whose `pointerType` is `mouse` reach the session: `down` through `resolvePress`, `move` through `pointerMove`, `up` through `pointerUp`, `cancel` through `pointerLost`; `double`, `wheel`, `context-menu`, `over`, `out` and `leave` are traced and matched alone.
- Touch and pen facts are traced, matched against their one row and logged, never drawn and never handed to the session.
- Key facts reach `keyDown` and `keyUp`, and `blur` reaches `keysLost`; none changes the press, the gesture or the buttons.

**What is shown.**\
Each key lit while held, with its repeats observed, its time held as of its latest fact and its last repeat interval from the facts' times, a key first seen repeating marked "pressed before it was seen"; each mouse button lit while held; a wheel turn flashed on the wheel with its deltas and unit; a drag's line from its press to the pointer; the status line -- keys held, buttons held, the live gesture and the item under the pointer; the log; every row of the table with its standing for the latest fact -- refused, unbound, unmet or a hit -- the hit marked; and the fixed lines of what the browser does not report and what the tester does not show (IT-D8).

**Interfaces between parts.**\
The composition root hands `input-capture` a `deliver` that switches on the fact's family and calls the router with the fact and its reply.\
The router traces and matches the fact, asks the reply to claim when the match says so and to take the pointer on a mouse press, makes the session calls the fact's family names, and answers the verdict.\
The picture state takes each verdict and answers the record it leaves and which entries changed, applying the steps in order.\
The painter takes the record and the changes and puts only the items that changed.\
The labels answer once, possibly later than the first paint, and the painter puts every key again when they do.

---

## 7. Run time

**Page load.**\
The entry document's `meta` rule comes before its import map, which maps the four bare package names to the parts' files in the release's versioned folder; the header rule arrives with every response.\
The composition root opens the grid, the table and the session, the scene on the page's `<svg>` -- which appends its four layers -- and the capture; any refusal is shown as its problems.\
The plan is chosen on the page, or by the address's `plan` parameter, so a bookmark keeps it and nothing is stored; the keys are painted with their printed labels, the Keyboard Map is asked once, and when it answers each key is painted again with the person's label.\
Every request the page makes is one of the release's files, and after the last of them it makes none.

**A key held, repeated and released.**\
A `key-down` fact is traced and matched and, when its row claims, claimed (IC8), so the browser does nothing with it; `keyDown` records the key held, and the picture records its first observed `time`.\
A repeat is a `key-down` with `repeat` true: the observed count grows, the interval is the difference of two facts' times, unreported when either is `null`, and one log line is rewritten, showing the count and the exact latest fact, never a sum.\
A repeat for a key the session did not hold -- pressed while the page lacked focus -- is shown as "pressed before it was seen": its press time is unknown and its count is of repeats observed.\
A held key's time is shown as of its latest fact, labelled so: no clock ticks between facts.\
A `key-up` releases the key and shows how long it was held -- "at least" that long when its press was not seen; a `key-up` for a key not held is shown as such.

**A key with no identity.**\
A key fact whose `code` is `''` or `null` is traced, matched, claimed if its row says so, and logged with its `key`, its physical key said to be unreported; `keyDown` and `keyUp` answer it untracked, and no key lights.

**A press, a click and a drag.**\
A mouse `down` fact takes the pointer, is traced and matched, and is handed to `resolvePress`, whose `match` answers the match already found -- the tester keeping no policy between the press and the match -- so its steps are the cancel of a gesture already live, if any, and the start the match opens.\
Each `move` is handed to `pointerMove`; when it answers `crossed` and the live gesture is a press gesture, the router asks `becomeGesture` for that button's drag gesture without a `from`, so the press keeps its origin and its release stays a drop (IB10), and the steps are the update and the become.\
The `up` is handed to `pointerUp`; on a commit the router makes a fact of the outcome and matches it, so the steps are the commit and its match, and the log names a click or a drag of that button.\
The item under the pointer is `hit`'s answer: `itemOf` of the target, and, when that is `null` -- as it is while the pointer is taken and every event targets the `<svg>` -- `itemAt` of the fact's `screen`.

**A chorded press.**\
A second button pressed while one is held arrives as a `move` naming that button, and its release likewise; the buttons drawn follow each mouse fact's `buttons`, and the chorded rows name each.\
The last release commits the gesture whichever button it names, since the press the gesture's own button began has ended (IB11).

**The back and forward buttons.**\
Their `up` facts are claimed, so the browser navigates nowhere; a back button's release over a page that does not claim its `pointerup` navigates history, and claiming the `pointerdown` alone does not stop it (measured in Chrome for the back button; the forward button not measured).

**Scroll and pinch.**\
A `wheel` fact is claimed, so the page neither scrolls nor zooms, and is shown with its deltas in the unit the browser gave -- pixels, lines or pages -- unconverted.\
Wheel facts in a row with the same modifiers, unit and sign of each delta make one log line, showing their count and the latest fact's exact values; any difference starts a new line.\
A wheel with `ctrlKey` is shown as Ctrl and the wheel, or a touchpad pinch, with the sentence that the browser does not tell them apart.

**The context menu.**\
Its fact is claimed, so no menu opens, and its row lights (measured in headless Chrome on Linux, where the menu's event comes between the press and the release).

**Focus lost.**\
A `blur` fact from the key source is handed to `keysLost`, every held key unlit and its release said not reported.\
The press and a live gesture continue, since the browser still delivers the pointer's own events, and a `cancel` ends them when the browser sends one.

**Resize.**\
Nothing is repainted: the picture lies in drawing coordinates under a fixed `viewBox`, and each conversion follows the root's screen transform at the moment asked (VS10).

**A touch or a pen.**\
Its pointer facts arrive with their `pointerType`, match their one row and are logged as delivered; nothing is drawn for them and the session never sees them.

---

## 8. Verification

| Success dimension | How it is proved |
|---|---|
| Fidelity | The gate opens the page in headless Chrome and drives trusted input over the DevTools protocol -- keys held and repeated, every button, chords in both release orders, plain drags of every button, clicks, double clicks, wheels, a synthesized touchpad pinch, the context menu, a media key with no `code`, and focus lost by opening a second tab -- and checks after each input that the picture record and the page show exactly that input, and that the verdict holds every step in order: a cancel then a start for a press over a live gesture, an update then a become for the move that crosses, a commit then its match for the release; every row is matched at least once and no plain drag matches a chord row (GT5); the table's overlap check (IB8) over a generated set of facts finds none; a claimed pinch leaves `visualViewport.scale` 1, and with claiming disabled in a test build makes it 2, the positive control (measured) |
| Immediacy | A test spies on the scene and finds every put for an input made inside that input's delivery (GT2); a harness around the composition root's `deliver` finds every delivery done within 10 ms in the gate's Chrome, a bound generous against one frame of 16.7 ms, and a planted build that waits 50 ms in its delivery fails it (GT9); the time from each fact's `time` to the end of its put is reported; on the director's Chromebook, typing fast, chords and a drag are watched for any lag a person sees, and the result recorded in `docs/DECISIONS.md`, not gated |
| Coverage | Every `code` in each plan is a UI Events code value or one of Chromium's, marked so; every input family in section 2's scope has a row; each event family the browser delivers and no part listens for is named in the "not shown" lines, and each thing no page can know in the "not reported" lines (IT-D8), both shown on the page and checked against a fixed list of the event families of UI Events, Pointer Events and the wheel; the Ctrl row's sentence is shown; a `code` not drawn is logged as "not on the drawn keyboard"; a key with no `code` is logged as delivered |
| Containment | The gate watches every request from before navigation through teardown, input dispatched from the navigation's commit, before the load event, and finds each one of the release's files, once, and none after the last -- a request the rule refused counted too (measured: such a request is seen, blocked by the rule); planted leaks each fail -- a shape whose `href` carries a key, a same-origin stylesheet whose address carries a key, which the rule allows (measured), and a navigation to the page's own origin carrying a key, which no rule stops (measured); the painter's shapes are held to its allowlist (GT8); the source check holds GT1; the deploy check reads both hosts' headers and finds the header rule exactly, with no report endpoint, and the entry's `meta` rule with the import map's hash (GT6) |
| Proof of reuse | The lockfile pins each part's release file by its hash; the deploy check finds each part's files byte-identical to its release (GT3); the gate holds GT4 against `docs/BACKLOG.md` |
| Teachability | Every code example in the guide is run in the gate; a cold reader, given the guide and this repository alone, builds a small application from the four, and what they could not do is recorded (section 10, row 14) |

**The deploy's checks.**\
After each copy into a bucket: every object's bytes, read through the public host, equal the release's, by its SHA-256; the response headers carry the header rule and the `Cache-Control` set on each object; the backend's edge cache is off; and the gate's smoke run passes against the bucket's host.

---

## 9. Delivery and hosting

**The repository.**\
`VISION.md` at the root; `docs/` for this document, `docs/DECISIONS.md`, `docs/BACKLOG.md` and the guide (IT-D6); `src/` for the parts; `test/` for the gate's tests, its trusted-input driver and its local server, which sends the header rule; `tools/` for the source check, the vocabulary check, the release and the deploy.

**The build and the gate.**\
As IT-D1 decides; the gate builds, runs the tests -- the Chrome run among them -- and the source and vocabulary checks, on every push.

**A release.**\
Made only by the repository's own CI from a tag: the entry document `index.html`, and one folder named by the tag holding everything else -- the stylesheet, the built modules and the four parts' files copied unchanged from their pinned release files -- with a manifest of every file's SHA-256, attached to a GitHub release (IT-D10).\
The entry names only its own folder, so two releases never share a file's address.

**A deploy.**
1. Copies the release's folder into the lab bucket, each object's `Cache-Control` set as metadata to `public, max-age=31536000, immutable`, refusing to replace an object whose bytes differ.
2. Checks every object's bytes through `input-lab.apnex.io`.
3. Copies the entry document, its `Cache-Control` set to `no-store`, and runs the deploy's checks there.
4. Does the same into the production bucket, served at `input.apnex.io`, the entry last.

No step deletes a folder, so a page loaded from an earlier entry finds every file it names, and a rollback is the deploy of an earlier release, which finds its folder present and copies its entry.\
The header rule never changes with a release and the hash travels in the entry, so no deploy has an interval in which rule and import map disagree.\
The entry is never kept, since a browser's Back button and restored tabs reuse a kept copy without asking even under `no-cache` (measured in the programme); a tab still running an earlier entry stays whole.

**Hosting.**\
Two public storage buckets, each a backend of the existing load balancer, which already holds a certificate for every `apnex.io` name; each backend made with its edge cache off, as the load balancer's existing public bucket backend is; neither host is behind IAP; each backend's custom response headers carry the header rule, `Referrer-Policy: no-referrer` and `X-Content-Type-Options: nosniff` (IT-D5); there is no server logic.

---

## 10. Owed and open

| # | Owed or open | Why it matters |
|---|---|---|
| 1 | The current architecture, `docs/ARCHITECTURE.md`, is derived by a generator from the code and the gate's results, never written by hand; the generator is owed with the first code | AR1 forbids a hand-written current instant |
| 2 | The Keyboard Map is offered by Chromium browsers alone (measured present in headless Chrome; other browsers not measured) | Elsewhere every label is the plan's printing, marked as assumed |
| 3 | A real touchpad, keyboards other than the two plans, and browsers other than Chrome are not proved by the gate | Fidelity is proved for what Chrome delivers to synthesized input |
| 4 | The Chromebook plan's action-key codes are Chromium's, not measured on a Chromebook | The director's keyboard, run on the page with what each key sends recorded, is the plan's acceptance; a code it sends that is not drawn is logged meanwhile |
| 5 | Safari's trackpad pinch arrives as its own gesture events, which no part listens for (not measured here) | Said not shown (IT-D8); a part listens once a person on Safari reports a pinch shown as nothing |
| 6 | Input through an input method arrives as key events with `key` `Process` and as composition events, which no part listens for (not measured here) | Its key events are shown and its composition said not shown |
| 7 | Caps Lock's and Num Lock's state is not shown: no shared part carries it | Lock state is not an input, so coverage holds; said not shown |
| 8 | A browser rule cannot stop a page navigating away, carrying data in the address (measured in Chrome) | Containment of navigation rests on GT1 and the request monitor, not on the rule |
| 9 | No telemetry, by containment | A failure in production is seen only by its visitor |
| 10 | Ctrl and a mouse wheel make no page zoom in headless Chrome, claimed or not (measured) | Their claim is proved only by the Chromebook acceptance |
| 11 | Old release folders accumulate in both buckets | Pruning is held, the trigger "a bucket's size or listing becomes a cost" |
| 12 | The trusted-input driver is the fifth copy of one harness -- each shared part keeps its own | A shared test driver, once a change must be made in more than one copy |
| 13 | Immediacy on real hardware rests on a recorded acceptance, not on the gate | Headless timing is no person's screen |
| 14 | The guide's cold reading is owed | Teachability is claimed until a newcomer has built from it |
| 15 | Should `input-binding` not hold the keys held, the picture state holds them itself | One record of held keys either way, never two |

---

## 11. Decisions owed

Each is asked of the director one at a time, its options and their costs stated, and a recommendation given apart.

**IT-D1 -- Language and build.**

| Option | Cost |
|---|---|
| TypeScript compiled by `tsc` to ES2022 modules, unminified, loaded through an import map, no bundler -- as the shared parts are built | A build in the gate and the release; the code a newcomer reads is TypeScript, the code served its plain output; the shapes the parts' declarations state are checked at build |
| Plain JavaScript served as written, checked by `tsc --checkJs` against the parts' declarations | No build; types as comments, harder to read; the served code is the source |
| Bundled into one file | One request and no import map, so the browser rule needs no hash; but the parts no longer arrive as their release files, so P7 and the deploy's byte check are lost |
| Doing nothing | No decision; nothing can be built |

**Recommended:** TypeScript, `tsc`, an import map, no bundler: the parts' published types check every fact and outcome the tester touches, and each part is served byte for byte as released.

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
Answered by the shared parts' releases: compared against a second application's routing, the mechanism every consumer wrote out -- the press, its match, a cancel and a second start -- is `input-binding`'s `resolvePress` (IB15), which holds the two traps the order hides; the router here passes the match it found and keeps no protocol of its own, and the switch over fact families is the composition root's wiring, since no shared part imports another.

**IT-D4 -- What lies under a captured pointer.**

| Option | Cost |
|---|---|
| `vector-scene`'s `itemAt(screen)`, answered by the platform's own hit test at a point, asked when `itemOf` of the target answers `null` | A change to `vector-scene` in its next release; exact as the browser hit-tests, `pointer-events` honoured (measured in Chrome under capture); it answers the first item the scene made under the point, looking through anything else |
| The tester's own map of blocks, asked by `snap-grid` geometry, as the first build did | About twelve lines here, a second hit test that disagrees with the browser's at every edge, and general capability held in an application |
| Not taking the pointer | A drag leaving the `<svg>` loses its events |

**Recommended:** `vector-scene`'s `itemAt`, in `hit` as `itemOf(target) ?? itemAt(screen)`, so no state of the capture is kept.

**IT-D5 -- The browser rule's text, and where it is set.**\
Proposed: two policies, both enforced by the browser, so a load must pass each (measured in Chrome: a same-origin image the `meta` rule allowed was still refused by the header's, and an import map the header allowed was refused by a `meta` rule lacking its hash).
- The header, release-independent: `connect-src 'none'; img-src 'none'; font-src 'none'; media-src 'none'; object-src 'none'; frame-src 'none'; worker-src 'none'; manifest-src 'none'; style-src 'self'; form-action 'none'; base-uri 'none'; frame-ancestors 'none'`.
- The entry's `meta` element, per release: `default-src 'none'; script-src 'self' 'sha256-<the import map's hash>'; style-src 'self'; img-src 'none'; font-src 'none'; connect-src 'none'; form-action 'none'; base-uri 'none'` -- the whole rule but `frame-ancestors`, which a `meta` element cannot carry (Chrome ignores it there, with a console message, measured).

No `report-uri` or `report-to`, since a report is itself a request.\
Under them the import map loads its modules, while `fetch`, a same-origin image, a shape's image and an inline script without the hash are each refused; a same-origin stylesheet and a navigation are not, so the allowlist, the source check and the request monitor hold those; a `style` attribute written by script is refused, so the painter states every look by class or presentation attribute (each measured in Chrome).

| Option | Cost |
|---|---|
| The split: the header from the backend buckets' custom response headers and the gate's own server, the per-release rule in the entry's `meta`, both generated from one declaration | Two texts, held by the deploy check; the header never changes with a release, so no deploy has an interval in which rule and import map disagree |
| One text in both, carrying the hash | The header and the entry change in separate steps at each deploy, the import map refused between them; `frame-ancestors` invalid in the `meta` |
| The response headers alone, carrying the hash | The same interval; and the gate cannot prove the rule without the load balancer |
| The `meta` element alone | Outside `H26-13`'s ruling that the response headers carry the rule; no `frame-ancestors` |

**Recommended:** the split, from one declaration.

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

**IT-D8 -- How what the browser does not report, and what the tester does not show, are marked.**

| Option | Cost |
|---|---|
| Two fixed lists, both on the page: what no page can know -- shortcuts the operating system or the browser keeps, a pinch told from Ctrl and the wheel, which physical keyboard is in use, a key's identity where the browser names none; and what this tester does not show though the browser delivers it -- composition, Safari's trackpad gesture events, lock state, pointer capture changes, and the browser's own click events, a click being shown as the bindings decide it; with a note on each key the code values call seldom reported | Notes are general, never per person; a key kept on one machine and not another is not known |
| One list for both | A thing the tester could show would read as one no page can know |
| Nothing marked | Fails coverage's "plainly marked" |
| Asking the person to press every key, and marking those never seen | A game, which the vision rules out |

**Recommended:** the first.

**IT-D9 -- What the tester claims.**

| Option | Cost |
|---|---|
| Every key, every button's press and release, every wheel and the context menu, except a few keys left to the browser -- reload, fullscreen, the developer tools -- each a row with its claim off, so the legend shows them | The page keeps Tab, so focus never wanders, and a person can still reload; the browser still keeps what it never lets a page claim |
| Everything claimable | A person cannot reload by keyboard |
| Nothing | Wheels scroll, pinches zoom, the back button leaves the page, Tab moves focus |

**Recommended:** the first.

**IT-D10 -- What a release is, and who deploys it.**

| Option | Cost |
|---|---|
| CI builds a release from a tag -- the entry and a folder named by the tag -- as the shared parts are built; an operator runs the deploy script with their own cloud credentials | No cloud credential in CI; a deploy is a person's or an agent's deliberate act, checked |
| CI deploys on each tag | A credential able to write the production bucket lives in CI |
| A deploy from a working copy | Not a release; the byte check has nothing to compare against |

**Recommended:** the first.

**IT-D11 -- Caching.**

| Option | Cost |
|---|---|
| Each release's folder `public, max-age=31536000, immutable` and the entry `no-store`, both as object metadata set at the copy, the backends' edge cache off | A release's files fetched once; a tab on an earlier entry stays whole; the entry never kept, so Back and restored tabs fetch it |
| Every object `no-cache` | Revalidating each file does not stop one load mixing two releases' files when they share addresses, and a kept entry is reused by Back and restored tabs without asking |
| `Cache-Control` set by the backends' custom response headers alone | An edge cache, were one on, decides what it keeps before those headers are added (from the first reading, not tried); the objects carry the storage service's default |
| Nothing set | The storage service's default, which may cache a public object for an hour (from its documentation, not tried) |

**Recommended:** the first.

---

## 12. Readings

**Reading 1 -- 2026-10-24, of revision 1 at `5094216`.**\
Read cold with the design of the shared parts' releases, by three readers of three model families; 47 findings across both documents.\
Those on this document are dispositioned here, by where revision 2 changed; every finding's full record and reason are kept with the programme's records (section 1, Provenance).

| Where revision 2 changed | Findings |
|---|---|
| Section 3, principles P1, P3, P4 and P5 | a:F11, o:F5, o:F8, o:F15 |
| Section 4: Deltas; GT5, GT6, GT8 and GT9 | a:F18; a:F10, a:F15, o:F5, o:F7 |
| Section 5: the router's protocol held by `input-binding`, the legend from the trace, `hit` | o:F3, x:F4, a:F11, a:F13, a:F14 |
| Section 6: the ordered verdict, the rows written exactly, which facts change what, honest times, no merged values | o:F1, a:F13, a:F10, a:F12, o:F9, o:F15, o:F16, x:F2, o:F2 |
| Section 7: the press through `resolvePress`, a key with no identity, timing, coalescing | a:F13, a:F14, o:F2, o:F15, o:F16 |
| Section 8: the delivery bound, the positive pinch control, the two lists, the request monitor and planted leaks | o:F7, o:F19, o:F8, x:F2, x:F3, o:F5 |
| Section 9, IT-D10 and IT-D11: versioned folders, the entry last, object metadata, the edge cache off | o:F6, a:F19 |
| IT-D2: both plans, the person choosing; in part for x:F1, which asked for the Chromebook alone with measured codes | a:F16, o:F21, x:F1 |
| IT-D3: answered by the shared part | o:F3, x:F4 |
| IT-D5: the rule split, `frame-ancestors` in the header alone | a:F15, x:F6, o:F5, o:F6 |
| IT-D8: two lists; in part for x:F3, composition and Safari's gestures said not shown rather than listened for | o:F8, x:F2, x:F3 |
| Not changed here: the legend is the tester's own, painted from the trace, so nothing is extracted to share | a:F17 |

One change beyond the findings: focus lost no longer ends the press or the gesture, since the browser still delivers the pointer's own events (P1).

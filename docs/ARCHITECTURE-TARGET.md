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
| 9 Delivery and hosting | approved in part: the buckets, the two hosts, IAP left out, a deploy that copies one release to the lab first, and the browser rule in the response headers are `H26-13`'s as amended; the rest provisional | A change of host, or a deploy that is not a copy of one release |
| 10 Owed and open | provisional | Any row closed or added |
| 11 Decisions owed | provisional | Any decision taken |

| Field | Value |
|---|---|
| Purpose | [`VISION.md`](../VISION.md) -- cited, never restated |
| The tester's own rulings | `docs/DECISIONS.md` (IT-D7) |
| Provenance | The programme's rulings that made this tester, `H26-12` and `H26-13` among them, and the design of the shared parts' releases it composes, are kept in the programme's records, `apnex/drawv2` (`dev/DECISIONS.md`, `dev/design/components/`); this line is the only place this document names them. |

---

## 2. Identity, scope and non-goals

**Identity.**\
input-tester is a static web page at `input.apnex.io` that shows a person, as it happens, what their keyboard, mouse and touchpad deliver to the browser and what each input is taken to mean.\
It is composed from four shared parts, published on their own -- `snap-grid`, `input-capture`, `input-binding` and `vector-scene` -- and adds only what is its own: a drawn keyboard and mouse, the bindings it names, and the picture of what happened.\
Its repository is `apnex/input-tester`, public.

**Scope.**
- Every key event the browser delivers -- press, repeat, release, with its `code`, `key`, modifiers and time.
- Every mouse button from 0 to 4, alone or chorded, as press, click, drag, double click and release.
- The wheel and the touchpad's scroll and pinch, as the browser delivers them, with their units.
- The context menu, and the page losing focus.
- What each input is taken to mean: the binding row it matched, every row listed, the matched one marked, and each gesture's phase as it falls due.
- What the browser cannot report, said to be unreported.

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
A browser reports a keyboard through the UI Events `KeyboardEvent`: `code` names the physical key whatever the keyboard layout (the UI Events KeyboardEvent code values), `key` the character or action it produced, `repeat` an automatic repeat, and modifiers as booleans.\
It reports a mouse through Pointer Events: one pointer per mouse, a press of any button while another is held arriving as a `pointermove`, so a chord's presses and releases after the first are moves, and `pointerup` comes only when the last button is released (measured in Chrome: left pressed, right pressed, left released, right released gives `pointerdown` 0, `pointermove` 2, `pointermove` 0, `pointerup` 2).\
It reports a wheel and a touchpad's two-finger scroll as `wheel` events with a delta and its unit, pixels, lines or pages, and a touchpad's pinch as a `wheel` with `ctrlKey` set (measured in Chrome with a pinch synthesized as a touchpad sends it; real hardware and other browsers not measured).\
A mouse wheel turned with Ctrl held and a touchpad pinch arrive alike, so the browser does not tell them apart.\
The browser keeps some keys from every page -- shortcuts the operating system or the browser claims -- and a page cannot know which it was not sent.

**Axioms.**\
In force by the tester's traits (section 4): `A1`, `A3`, `A4`, `A8`, `A9`, `A14`.\
Not in force: `A2`, `A5`, `A6`, `A7`, `A10`, `A11`, `A12`, `A13`.

**North star of this system.**\
Every mark on the screen traces to one fact the browser delivered or one verdict the bindings gave, inside the task that delivered it.

**Principles.**

| | Principle | From |
|---|---|---|
| P1 | **Delivered, never inferred.** The picture shows only what a fact carried or an outcome decided; what the browser does not report is said to be unreported | vision "exactly"; `A8` |
| P2 | **Fix the part.** A need any application has is met in the shared part that owns it, never worked around here; every workaround ever needed is recorded with the release that retires it | vision, why it exists; `A3`, `A14` |
| P3 | **Shown in the same task.** Each input's picture is put inside its delivery; no timer, no frame batching | vision, immediacy |
| P4 | **Sends nothing.** No network interface, no navigation, no storage in the code; a browser rule in every response forbids every request; nothing loads but the page's own files | vision, not a keylogger, containment |
| P5 | **One table of meanings.** Every input and gesture the tester names is a row of one `input-binding` table, which is also the legend, the log's source and the overlap proof | vision, what it is; `A3` |
| P6 | **The picture is data.** What is shown is a description put into `vector-scene`, made from one record of state | `A1` |
| P7 | **Release files as published.** Each shared part is loaded byte for byte as its release published it | vision, proof of reuse; `A8` |
| P8 | **Code a newcomer reads.** The code reads in the order the guide teaches, and holds no word of any other application | vision, teachability; what it is not |

**Decisions.**\
Ruled by the programme: `H26-1`, the tester at `input.apnex.io`, a keyboard and a mouse drawn and every gesture highlighted live, built from the four parts alone; `H26-12` as amended, a sovereign application in `apnex/input-tester` with its own vision and architecture, composing the four through their releases, the parts' gaps fixed in the parts before it is built, and a guide to using the four together with the tester as its worked example; `H26-13` as amended, the vision ratified, the touchpad's scroll and pinch in scope, the page served from a public bucket behind the existing load balancer, its lab at `input-lab.apnex.io`, both outside IAP, a deploy that copies one release to the lab, checks it, then production, and a browser rule in the response headers that the page sends nothing.\
Owed: IT-D1 to IT-D11 (section 11).

**Model.**\
One stream through single-duty parts: a platform event becomes one fact (`input-capture`), the router turns it into one verdict (`input-binding`), the picture state takes the verdict, and the painter describes the picture to the scene (`vector-scene`), which brings the page to it; the keyboard and the mouse are placed on a grid (`snap-grid`).

---

## 4. Axiom alignment

The M7 audit of this design.

**Identity.**\
This document's first revision, read against the four parts' published contracts at `v0.1.0` and the design of their next releases, mission-kit at `e33c850`, and the cold-agent experiment that first built a tester from the four.

**Traits.**\
Stateful, narrowly -- the page writes what is held and what is live, and reads it back at the next event; were that record wrong, a key would stay lit, so T1's test holds, for one page's life, with nothing persisted.\
Not declarative -- nothing reconciles a running state to a declaration.\
Not multi-agent -- one person, one page; no work crosses from one actor to another inside the system.\
Not autonomous -- the person watching the page sees every response, and the page acts on no failure; served unattended from a bucket, it has no operation that runs on its own.\
Not llm-in-the-loop.

**Verdict.**\
Revision 1 is `pass, with guardrails`, by its author; its standing is to be confirmed by a reading.

| Axiom | Weight | How the design stands | Tension |
|---|---|---|---|
| `A3` | load-bearing | Parts of one duty each (section 5); the four shared parts reached only through their contracts; a gap in a part is fixed in the part (P2) | Open: the capture-to-binding routing is general to any application on both parts, yet held here as a declared part (IT-D3) until a second application's routing is shown alike; the keyboard plan is held here likewise |
| `A1` | supporting | One record of picture state, made only from verdicts, frozen, readable whole at any moment (the proof reads it); held keys read from `input-binding`'s session, never kept twice | Transient by design: a reload ends it, and nothing should survive one |
| `A4` | supporting | The tester's rulings in `docs/DECISIONS.md`, every workaround in `docs/BACKLOG.md` with the release that retires it (IT-D7) | Open: the experiment that found the first gaps is recorded outside this repository, with the programme |
| `A8` | load-bearing | The gate drives trusted input in headless Chrome over every binding row, proves no input matches two rows, proves no request after load, and holds the source to sending nothing (section 8) | Open: a real touchpad, other physical keyboards and other browsers are not in the gate; a synthesized pinch stands in for a touchpad's |
| `A9` | supporting | A deploy copies one release to the lab, checks its headers, bytes and a smoke run there, and only then production; focus loss, chords and interrupted gestures are driven in the gate | Deliberate: no telemetry, by containment, so a failure in production has no witness but its visitor |
| `A14` | supporting | Every gap the first build met is a part's release, the guide, or a row here with its trigger | Open: what the tester meets in browsers other than Chrome is unmeasured |

**Layered application.**\
State and truth: the picture is derived from verdicts alone, and the session holds input state once.\
Composition: four parts through their contracts, the tester's parts one duty each, the routing a declared boundary.\
Integrity: the gate proves fidelity and containment in a real browser before a release exists, and the deploy proves the release where it is served.\
Director attention: section 11 asks one decision at a time, each with a recommendation.

**Guardrails for the build.**
- GT1: the source names no network interface, no navigation, no storage and no dynamic import, held by a source check in the gate.
- GT2: every put for an input happens inside that input's delivery, held by a test.
- GT3: each shared part's files are served byte-identical to its release, held by the deploy check.
- GT4: no workaround row is open while the release named to retire it is installed, held by the gate.
- GT5: every row of the table is matched at least once by the gate's trusted input.
- GT6: the browser rule is one text, in the response header and the page's own `meta` element, with no report endpoint.
- GT7: the source holds none of the words the shared parts' vocabulary check refuses on behalf of their first consumer, held by running that check here.

**Closeout hooks.**\
The tester's first release is checked against GT1 to GT7 and section 8's table by a verifier who did not build it.

---

## 5. The anchored core

Each part has one duty and serves at least one principle.

| Part | Duty | Consumes | Exposes | Serves |
|---|---|---|---|---|
| **Keyboard plan** | Says where each drawn key or mouse button lies | UI Events codes; `snap-grid`'s `span` (SG8) on a grid of quarter-key pitch | Each key's `code`, its printed US label, its block of grid positions and its rect; each mouse button's number, `buttons` bit and rect | Coverage |
| **Labels** | Names each drawn key as the person's own keyboard does | The plan; the browser's Keyboard Map, where it offers one (IT-D2) | A label per `code`, each marked as reported by the browser or assumed from the US printing | P1 |
| **Bindings** | Declares what every input is taken to mean | `input-binding`'s table form (IB3); facts as `input-capture` makes them (IC5) | The composed table (IB4); each row's words for the legend; the overlap proof (IB8) | P5 |
| **Router** | Routes each delivered fact through its binding operations | `input-capture`'s facts and replies (IC5, IC8); the table (IB7); the session (IB10 to IB12, held keys) | One verdict per fact: the fact, its match, whether it is claimed, and the session's outcome | P1, P8 |
| **Picture state** | Keeps what the person is shown, as data | Verdicts; the session's state | One frozen record (section 6) | P1, P6 |
| **Painter** | Describes the picture as shapes | The picture state; the plan; the labels | Puts and removes in `vector-scene`'s layers (VS6) | P3, P6 |
| **Composition root** | Composes the page from its parts | Every part; the four shared parts' opening functions | Nothing; a refused opening shows its problems on the page | P8 |
| **Page shell** | Serves the page's entry under its browser rule | The release's files | The page, its stylesheet, its import map and its rule in a `meta` element | P4, P7 |

**The shared parts it consumes.**\
The tester composes `input-capture`, `input-binding` and `vector-scene` at their next minor releases, `0.2.0`, which carry what the first build found missing, and `snap-grid` at `0.1.0`, whose next change is to its documents alone.

| Part | What the tester uses | What it never asks of it |
|---|---|---|
| `snap-grid` | One square grid (SG1) of quarter-key pitch; `span` (SG8) gives each key and mouse button its exact rect from integer positions | Drawing a grid, which the tester does not show; hit-testing |
| `input-capture` | One capture (IC3) on the page's `<svg>`, the window as key source, listening also for the wheel, the context menu and focus loss; facts (IC4, IC5) with `time` and wheel deltas; the reply's `claim` and `takePointer` (IC8); `hit` answered by the scene | What an input means |
| `input-binding` | One table (IB3, IB4) matched for every fact (IB7); one session for presses and gestures (IB10 to IB12), whose release rule commits a chorded gesture on its last release, and which holds the keys held | A picture, an action, a clock |
| `vector-scene` | One scene (VS3) on the page's `<svg>`, four layers, items put by key (VS6); `itemOf` (VS9) for an uncaptured pointer's target and `itemAt` for a point under a captured pointer; `toDrawing` (VS10) as capture's conversion | A view: the picture never pans or zooms |

**Layers.**\
`keys` and `mouse` hold the keyboard and the mouse; `trails` holds a drag's line, and `panel` the log, the legend and the status line; the last two are declared with `pointer-events` `none`, so the platform looks through them.

---

## 6. Entities, data and interfaces

| Entity | Holds |
|---|---|
| Key | `code`, the US printed label, a position `{ col, row }` and a width and height in quarter keys, and an optional note -- "often kept by the operating system", "seldom reported" |
| Mouse button | A name, its `button` number (0 to 4), its `buttons` bit (1, 4, 2, 8, 16 for 0 to 4), its block of positions |
| Row | `id`, the words shown in the legend, `on` over facts, an optional `when` over the context, its claim flag, and the gesture it opens if any |
| Fact | As `input-capture` makes it (IC5), handed on unchanged |
| Verdict | The fact, the match or `null`, `claimed`, and the session's outcome or `null` |
| Picture | Held keys -- each with the `time` it was first pressed and its repeat count and last repeat `time`; the buttons held, from the latest fact's `buttons`; the last wheel -- deltas, unit and modifiers; the live gesture, its phase and its trigger; the press's start and whether it is beyond the threshold; the log, newest first, a line keyed so repeats and wheel turns coalesce; the row last matched; the item under the pointer |
| Shape | As `vector-scene` takes it (VS5): a tag, attributes, and text or children |

**The table's rows, by family.**
- Keys: a first press, a roll-over press with another non-modifier key held, a modifier chord, a modifier press, a repeat, a release, and a release whose press was not seen.
- Buttons: a press of each of the five buttons, each opening a `press` gesture; a chorded press and a chorded release, each a `move` fact naming a button; a double click; a release of each button, claimed.
- Gesture outcomes: a click and a drag of each button, matched from a fact the router makes of each commit outcome, so the legend names them too (the guide shows this use of the table's opaque facts, IB1).
- Wheel: up, down and sideways, and Ctrl with the wheel, named "Ctrl and wheel, or a touchpad pinch".
- The context menu, claimed; focus lost.

**What is shown.**\
Each key lit while held, its repeat count, how long it has been held and its last repeat interval from the facts' times; each mouse button lit while in `buttons`; a wheel turn flashed on the wheel with its deltas and unit; a drag's line from its press to the pointer; the status line -- keys held, buttons held, the live gesture and the item under the pointer; the log; every row of the table, the one matched marked; and "not reported" beside anything the browser does not report (IT-D8).

**Interfaces between parts.**\
The composition root hands `input-capture` a `deliver` that calls the router with the fact and its reply.\
The router answers one verdict and asks the reply to claim when the table says so, and to take the pointer on a press.\
The picture state takes each verdict and answers the record it leaves and which entries changed.\
The painter takes the record and the changes and puts only the items that changed.\
The labels answer once, possibly later than the first paint, and the painter puts every key again when they do.

---

## 7. Run time

**Page load.**\
The page's `meta` rule comes before its import map, which maps the four bare package names to the four release files served beside the page.\
The composition root opens the grid, the table and the session, the scene on the page's `<svg>` -- which appends its four layers -- and the capture; any refusal is shown as its problems.\
The keys are painted with their printed labels, the Keyboard Map is asked once, and when it answers each key is painted again with the person's label.\
After the load event the page makes no request.

**A key held, repeated and released.**\
A `key-down` fact is matched and, when its row claims, claimed (IC8), so the browser does nothing with it; the session records the key held, and the picture records its `time`.\
A repeat is a `key-down` with `repeat` true for a key already held: the count grows, the interval is the difference of two facts' times, and one log line is rewritten.\
A `key-up` releases the key and shows how long it was held; a `key-up` for a key whose press was not seen -- held while the page lacked focus -- is shown as such.

**A press, a click and a drag.**\
A `down` fact takes the pointer, is handed to the session, matched, and handed to `pressMatched`, which answers `start`, or `cancel` for a gesture already live and then `start` on a second call (IB11).\
Each `move` updates the live gesture; the move on which the press travels beyond the threshold makes the router ask `becomeGesture` without a `from`, so the press keeps its origin and its release stays a drop (IB10).\
The `up` commits the gesture with its trigger, `click` or `drop` (IB10), and the router matches the outcome, so the log names a click or a drag of that button.\
While the pointer is taken every event targets the `<svg>`, so the item under the pointer is asked of the scene by point, `itemAt` with the fact's `screen`, and of the target, `itemOf`, otherwise.

**A chorded press.**\
A second button pressed while one is held arrives as a `move` naming that button, and its release likewise; the buttons drawn follow each fact's `buttons`, and the chorded rows name each.\
The last release commits the gesture whichever button it names, since the press the gesture's own button began has ended.

**The back and forward buttons.**\
Their `up` facts are claimed, so the browser navigates nowhere; a back button's release over a page that does not claim its `pointerup` navigates history, and claiming the `pointerdown` alone does not stop it (measured in Chrome for the back button; the forward button not measured).

**Scroll and pinch.**\
A `wheel` fact is claimed, so the page neither scrolls nor zooms, and is shown with its deltas in the unit the browser gave -- pixels, lines or pages -- unconverted.\
A wheel with `ctrlKey` is shown as Ctrl and the wheel, or a touchpad pinch, since the browser delivers both alike.

**The context menu.**\
Its fact is claimed, so no menu opens, and its row lights (measured in headless Chrome on Linux, where the menu's event comes between the press and the release).

**Focus lost.**\
A `blur` fact from the key source releases every held key in the session and ends the press and any live gesture (`pointerLost`, IB11); the picture unlights them and the log says their releases were not reported.

**Resize.**\
Nothing is repainted: the picture lies in drawing coordinates under a fixed `viewBox`, and each conversion follows the root's screen transform at the moment asked (VS10).

**A touch or a pen.**\
Its pointer facts arrive with their `pointerType` and are logged as delivered; nothing is drawn for them.

---

## 8. Verification

| Success dimension | How it is proved |
|---|---|
| Fidelity | The gate opens the page in headless Chrome and drives trusted input over the DevTools protocol -- keys held and repeated, every button, chords in both release orders, clicks, drags, double clicks, wheels, a synthesized touchpad pinch, the context menu, and focus lost by opening a second tab -- and checks after each input that the picture record and the page show exactly that input; every row of the table is matched at least once (GT5); the table's overlap check (IB8) over a generated set of facts finds none |
| Immediacy | A test spies on the scene and finds every put for an input made inside that input's delivery (GT2); the time from each fact's `time` to the end of its put is measured in the gate and reported, not gated, headless timing being no person's screen |
| Coverage | Every `code` in the plan is a valid UI Events code; every input family in section 2's scope has a row; a `code` not drawn is logged as "not on the drawn keyboard"; each key the browser seldom reports carries its note |
| Containment | The gate records every request the page makes over the whole scripted session and finds none after load; the source check holds GT1; the deploy check reads the response headers of `input-lab.apnex.io` and `input.apnex.io` and finds the browser rule exactly, with no report endpoint (GT6) |
| Proof of reuse | The lockfile pins each part's release file by its hash; the deploy check finds each part's files byte-identical to its release (GT3); the gate holds GT4 against `docs/BACKLOG.md` |
| Teachability | Every code example in the guide is run in the gate; a cold reader, given the guide and this repository alone, builds a small application from the four, and what they could not do is recorded (section 10, row 13) |

**The deploy's checks.**\
After a copy into a bucket: every object's bytes equal the release's, by its SHA-256; the response headers carry the browser rule and the caching IT-D11 sets; and the gate's smoke run passes against the bucket's host.

---

## 9. Delivery and hosting

**The repository.**\
`VISION.md` at the root; `docs/` for this document, `docs/DECISIONS.md`, `docs/BACKLOG.md` and the guide (IT-D6); `src/` for the parts; `test/` for the gate's tests and its trusted-input driver; `tools/` for the source check, the vocabulary check, the release and the deploy.

**The build and the gate.**\
As IT-D1 decides; the gate builds, runs the tests -- the Chrome run among them -- and the source and vocabulary checks, on every push.

**A release.**\
Made only by the repository's own CI from a tag: the site's files -- the page, its stylesheet, the built modules and the four parts' files copied unchanged from their pinned release files -- with a manifest of every file's SHA-256, attached to a GitHub release (IT-D10).

**A deploy.**\
Copies one release's files into the lab bucket, served at `input-lab.apnex.io`, runs the deploy's checks there, then copies the same files into the production bucket, served at `input.apnex.io`, and runs them again.

**Hosting.**\
Two public storage buckets, each a backend of the existing load balancer, which already holds a certificate for every `apnex.io` name; neither host is behind IAP; each backend sets the response headers, the browser rule among them (IT-D5); there is no server logic.

---

## 10. Owed and open

| # | Owed or open | Why it matters |
|---|---|---|
| 1 | The current architecture, `docs/ARCHITECTURE.md`, is derived by a generator from the code and the gate's results, never written by hand; the generator is owed with the first code | AR1 forbids a hand-written current instant |
| 2 | The Keyboard Map is offered by Chromium browsers alone (measured present in headless Chrome; other browsers not measured) | Elsewhere every label is the US printing, marked as assumed |
| 3 | A real touchpad, keyboards other than ANSI, and browsers other than Chrome are not proved by the gate | Fidelity is proved for what Chrome delivers to synthesized input |
| 4 | Safari's trackpad pinch arrives as its own gesture events, which `input-capture` does not listen for (not measured here) | A Safari pinch shows as nothing, and must at least be named unreported |
| 5 | Input through an input method arrives as key events with `key` `Process` and as composition events, which `input-capture` does not listen for (not measured here) | Such typing is shown only as its key events |
| 6 | Caps Lock's and Num Lock's state is not shown: no shared part carries it | Lock state is not an input, so coverage holds; a person may still expect it |
| 7 | Physical keyboards other than full-size ANSI -- ISO, JIS, compact -- are not drawn (IT-D2) | Their extra keys are logged as not on the drawn keyboard |
| 8 | A browser rule cannot stop a page navigating away, carrying data in the address (measured in Chrome) | Containment of navigation rests on GT1 and the gate, not on the rule |
| 9 | No telemetry, by containment | A failure in production is seen only by its visitor |
| 10 | Whether the load balancer caches the buckets' objects at its edge is unmeasured | A cached old object would break the deploy's byte check, or show a mixed release |
| 11 | The router's duty is general (IT-D3) | A shared part, once a second application's routing is shown alike |
| 12 | The trusted-input driver is the fifth copy of one harness -- each shared part keeps its own | A shared test driver, once a change must be made in more than one copy |
| 13 | The guide's cold reading is owed | Teachability is claimed until a newcomer has built from it |
| 14 | Should `input-binding` not hold the keys held, the picture state holds them itself | One record of held keys either way, never two |

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

**IT-D2 -- Keyboard plan and labels.**

| Option | Cost |
|---|---|
| Full-size ANSI (104 keys) as data, labels from the Keyboard Map where offered, other physical keyboards held | About 17 rows more than tenkeyless; every key of the commonest desktop keyboard drawn |
| ANSI tenkeyless (87 keys) as data, labels likewise, others held | As the first build drew; a numeric keypad's keys are logged only |
| Full-size ANSI and a Chromebook keyboard, the person choosing which is drawn | Two plans; a Chromebook has no numeric keypad, a search key where Caps Lock is, and a top row of action keys whose `code` values are not measured here, so its plan waits on a run on a real Chromebook, whose undrawn codes the tester itself logs |
| Several physical keyboards now, chosen by the person or guessed from the Keyboard Map | Three or four plans to keep exact; a guess is not "exactly" |
| No drawn keyboard, a list of keys pressed | Fails the vision's "a picture of the keyboard" |

**Recommended:** full-size ANSI with labels from the Keyboard Map, marked as reported or assumed, others held with the trigger "a person on another physical keyboard reports a key drawn wrong or missing".

**IT-D3 -- Where the routing between capture and binding lives.**

| Option | Cost |
|---|---|
| A declared part inside the tester, the router, written to be lifted out | About forty lines here; general code held in an application until a second consumer's routing is compared |
| A fifth shared part now | A contract over two other contracts' shapes before either routing is proven; the parts import none of each other, so it would bind to their shapes by convention |
| Inside `input-binding` | Binding would have to know `input-capture`'s fact types, which it reads as opaque (IB1) |
| Doing nothing: each application writes its own | The sequence that hides a stuck-gesture trap is rewritten by every newcomer |

**Recommended:** a declared part inside the tester, and a candidate shared part registered with the trigger "a second application's routing, made a declared part of its own, is shown alike".

**IT-D4 -- What lies under a captured pointer.**

| Option | Cost |
|---|---|
| `vector-scene`'s `itemAt(screen)`, answered by the platform's own hit test at a point | A change to `vector-scene` in its next release; exact as the browser hit-tests, `pointer-events` honoured (measured in Chrome under capture) |
| The tester's own map of blocks, asked by `snap-grid` geometry, as the first build did | About twelve lines here, a second hit test that disagrees with the browser's at every edge, and general capability held in an application |
| Not taking the pointer | A drag leaving the `<svg>` loses its events |

**Recommended:** `vector-scene`'s `itemAt`.

**IT-D5 -- The browser rule's text, and where headers are set.**\
Proposed text, one line: `default-src 'none'; script-src 'self' 'sha256-<the import map's hash>'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'none'; object-src 'none'; frame-src 'none'; worker-src 'none'; manifest-src 'none'; form-action 'none'; base-uri 'none'; frame-ancestors 'none'`, with `Referrer-Policy: no-referrer` and `X-Content-Type-Options: nosniff` beside it and no `report-uri` or `report-to`, since a report is itself a request.\
Under such a rule an inline import map allowed by its hash loads its modules, and `fetch`, a beacon, a socket and an image from elsewhere are each refused, but a `style` attribute written by script is refused too, so the painter states every look by class or presentation attribute (each measured in Chrome).

| Option | Cost |
|---|---|
| The backend buckets' custom response headers, with the same rule in the page's `meta` element, both generated from one declaration in the repository | Two places, held equal by the deploy check; the gate proves the `meta` rule in its own browser run; `frame-ancestors` only in the header |
| The response headers alone | The gate cannot prove the rule without the load balancer |
| Object metadata | A storage object carries its fixed metadata and custom `x-goog-meta-` fields, which are not sent as a browser rule (from the storage service's documentation, not tried) |
| The `meta` element alone | Outside `H26-13`'s ruling that the response headers carry the rule |

**Recommended:** the backend buckets' custom response headers and the same rule in a `meta` element, from one declaration.

**IT-D6 -- Where the guide to using the four parts together lives.**

| Option | Cost |
|---|---|
| `docs/GUIDE.md` in this repository, each part's `README.md` linking to it | Beside its worked example, the one public place that composes all four; a part's release does not carry it |
| A repository of its own | A fifth home to keep in step, with no code to test its examples against |
| Split across the four parts' `README.md` files | No part may name another's internals; the composition is nobody's |
| In mission-kit | Far from both the parts and the example |

**Recommended:** `docs/GUIDE.md` here, linked from each part's `README.md`.

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
| A note in the plan on each key the UI Events code values call seldom or never reported, shown on the key; a fixed sentence for what no page can know -- shortcuts the operating system keeps, a pinch told from Ctrl and the wheel | Notes are general, never per person; a key kept on one machine and not another is not known |
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
| CI builds a release file from a tag, as the shared parts do; an operator runs the deploy script with their own cloud credentials | No cloud credential in CI; a deploy is a person's or an agent's deliberate act, checked |
| CI deploys on each tag | A credential able to write the production bucket lives in CI |
| A deploy from a working copy | Not a release; the byte check has nothing to compare against |

**Recommended:** the first.

**IT-D11 -- Caching.**

| Option | Cost |
|---|---|
| Every object `Cache-Control: no-cache`, so a browser revalidates each file on load | A revalidation per file per load, small at the page's size; never a mix of two releases |
| The page `no-cache`, every other file under a release's own folder, cached for good | Fewer requests; each release a new folder, and the import map's hash changes with it |
| Nothing set | The storage service's default, which may cache a public object for an hour (from its documentation, not tried) |

**Recommended:** `no-cache` on every object.

# Decisions

One ruling per entry, append-only.\
A ruling is never edited; a later one supersedes it and says so.

Rulings of the programme that made this tester are held in the programme's records, `apnex/drawv2` (`dev/DECISIONS.md`), and cited here by their ids, `H26-12` and the like.\
This file holds the tester's own.

---

## 0001 - The architecture ratified as recommended

**Ruled by:** the director, 2026-10-24 (the programme's `H26-14`).\
**Affects:** `docs/ARCHITECTURE-TARGET.md`, and everything built from it.

**Ruling.**\
`docs/ARCHITECTURE-TARGET.md`, revision 4, is ratified, every section approved and every decision of its section 11, IT-D1 to IT-D12, at its recommendation.\
The four shared parts' next releases it composes -- `input-capture`, `input-binding` and `vector-scene` at `0.2.0`, `snap-grid` at `0.1.1` -- were ratified with it, in the programme's design of those releases.

**Why.**\
The tester's vision (`VISION.md`, the programme's `H26-13`) asks for every input shown exactly and nothing worked around; the architecture was read three times by reviewers of several model families before it was put to the director, and every finding given one disposition (section 12).

**Owed by the ruling.**\
The director's acceptance runs on a Chromebook -- what its top-row keys send, a touchpad pinch, typing through a real input method, and whether any lag can be seen -- are recorded once the tester is in the lab; IT-D2's Chromebook plan and IT-D12's coverage of an input method's typing rest on them.

---

## 0002 - The first build: what it settled, and its errata against the architecture

**Status:** proposed -- the builder's record of the first build, for the director's ratification; it amends nothing of `0001` until ratified.\
**Drafted by:** the engineer who built the first release, 2026-10-25.\
**Amends:** none.\
**Affects:** `docs/ARCHITECTURE-TARGET.md` sections 6 to 9, where the errata below would be absorbed; `src/`, `page/`, `tools/`, `test/`, `docs/GUIDE.md`, `docs/BACKLOG.md`.

**Ruling proposed.**\
The first build stands as the nearest faithful reading of revision 4, with the choices and the five errata below; each erratum's evidence is cited, and each is to be absorbed into the target, or overruled, by the director.

**Errata against the architecture.**
1. The buttons drawn do not follow boundary facts. [MEASURED]
   Section 6 has the buttons drawn follow the `buttons` of every fact whose `pointerType` is `mouse`.
   In headless Chrome, under trusted input over the DevTools protocol, a middle press delivered `pointerdown` with `button` 1 and `buttons` 4, and once its pointer was taken the boundary events that followed, `pointerout`, `pointerleave` and `pointerover`, each carried `buttons` 1 -- the left button's bit, while only the middle was held; a pen's press made the mouse's boundary events carry `buttons` 1 likewise; and a review measured the right button the same way, its press's `pointerdown` carrying `buttons` 2 and the boundary events after the capture `buttons` 0, while the right was held.
   Section 2 puts "events the browser derives from inputs already shown -- pointer capture changes -- drawn again" out of scope, so the nearest faithful reading is that the buttons drawn follow a mouse's `down`, `move`, `up`, `cancel` and `context-menu`, and every `wheel`, never `over`, `out` or `leave` (`BUTTONS_REPORTED_BY`, `src/picture-state.ts`; `test/picture-state.test.js`; `docs/BACKLOG.md` B13).
2. The overlap proof's count. [MEASURED]
   Section 6 reports 46,661 facts; the text does not state how they were counted, so the space was built from its description -- every key fact's type, repeat flag and sixteen modifier states over 119 codes, both plans' and the browser's own keys' among them, `''` and `null` too, and every pointer, wheel, context-menu, `blur` and derived commit fact -- and is 17,291 facts with the four contexts, 69,164 combinations (`overlapProofFacts`, `src/input-bindings.ts`; `test/table-overlaps.test.js`).
   What the count stood for holds over it: no two of the 42 rows hit together, no fact of a browser's own key is claimed, and every row is hit by some fact.
3. "Each of the release's files once." [ARGUED]
   Section 8 has the monitor find the entry, then each of the release's files once; but a release also holds files no page requests -- the parts' declarations and maps, its manifest -- so the monitor holds the requests to the files the page loads: its stylesheet and every module its one module script reaches by static import, each once, and nothing else (`test/support/containment.js`).
4. Choosing the plan on the page. [ARGUED]
   Section 7 has the plan chosen on the page or by the address's `plan` parameter, so a bookmark keeps it and nothing is stored.
   GT1 refuses navigation and any element made but through `vector-scene`, and the painter's allowlist refuses `a`, so the page's choice is two plain links in the entry document, `?plan=ansi` and `?plan=chromebook`, which set the parameter by an ordinary navigation the person makes; the code changes no address.
5. "A harness around the composition root's `deliver`." [ARGUED]
   Section 8 times each delivery; the harness, set into the page before its own scripts, times each listener the capture adds, which calls the delivery synchronously, so what is timed is the delivery and the capture's reading of the event, a bound at least as strict (`test/browser/immediacy.test.js`).

**Choices settled at build, each argued unless tagged.**
- The rows: 42, as section 6 counts them, the chorded press and the chorded release each one row over all five buttons; the claim flag is `claims`, defaulting to `false`, and a press row names its gesture in `gesture`; each row carries its legend's words and how the gate proves it.
- The browser's own keys are read exactly as accelerators are: a key "with Ctrl" holds neither Alt nor Meta, `F11` and `F12` hold no modifier, and `BrowserRefresh` and `ZoomToggle` are the browser's whatever is held.
- A key's notes are four: often kept by the operating system (`MetaLeft`, `MetaRight` and `PrintScreen` on full-size ANSI; the Chromebook's keys from Fullscreen up and its Search key), kept by the browser, never reaching a page (the Chromebook's Back, Forward and Refresh, which Chromium reserves), seldom reported, and code not measured on this keyboard (the Chromebook's ten action keys and its Search key).
  No drawn key is one the code values call seldom reported: only `Fn` is, and neither plan draws it.
- The log writes a line for a delivered fact that hits a row or makes a session step worth a word, a derived commit fact a line of its own; a plain move and a boundary fact write none; a repeat rewrites its key's newest line; it keeps 14 lines.
- The wheel is lit while the latest fact is a wheel fact, and unlit at the next fact, since no timer may end a flash.
- The page's one module script is `page-entry.js`, which reads the browser's globals and calls `composeTesterPage`, so the composition root composes on any platform of the parts' shape, the gate's fakes among them; the composed page is left at `globalThis.inputTester` for the proof to read.
- A page closed before the Keyboard Map answers paints nothing when it does: found by the guide's own example, which closed the page it composed.
- `vendor/` is committed, each part's whole `dist` and its licence, and checked byte for byte against the installed packages by every gate; the release folder is `v<version>`, holding `app/`, `vendor/`, the stylesheet and `SHA256SUMS`; the tester's own modules are built without source maps.
- The entry asks for no favicon with an empty `data:` icon, which the rule refuses before any request; the viewport `meta` element is left out, since a phone is out of scope and its text holds another application's word.
- The vocabulary check runs over `src/`, `page/` and `docs/GUIDE.md`, with the list the parts refuse on behalf of their first consumer; four texts that are the platform's own names are allowed by exact text: `getLayoutMap`, `<link rel="stylesheet"`, `<link rel="icon"` and `text-anchor` (`tools/consumer-vocabulary.json`).
- The source check refuses free names and members by list, `navigator`'s members but `keyboard` and `userAgentData`, dynamic `import()`, `declare` and triple-slash directives; `tsconfig.json` compiles `src` alone, with the ES2022 and DOM libraries.
- A public-text check refuses any run of sixteen or more hex digits in a file or a commit message, but an action pinned by its full commit in a workflow's `uses:` line, as the parts' workflows pin theirs, and only exactly there.
- The gate is `tools/run-gate.mjs`, writing `.gate/results.json`, from which, with the code, `tools/generate-architecture.mjs` derives `docs/ARCHITECTURE.md`, checked last.
- The guide's `js` examples run in headless Chrome beside the tester's modules, under its own browser rule; its `mjs` examples in the gate's own runtime.
- The deploy is a Node script over steps (`tools/deploy-steps.mjs`) whose storage, host, edge-cache reading and smoke run are handed in, so the gate's deploy-sequence test runs the very steps over local buckets, loading the page between every pair of its 274; each object's content type is set by its extension, from the one table the gate's server sends too; every folder object is copied with `--if-generation-match=0`, only where no object is, and the entry, the one object a deploy replaces, with `--if-generation-match` and the generation read just before; the backend buckets' names are required, to read their edge cache.
- A release attaches three files: the archive of the entry and its folder, packed by name with no owner and no time, its SHA-256, and `SHA256SUMS`.

**Mutants planted, and what failed each, as measured.**\
Every check is able to fail.\
Planted builds are part of the gate itself, each run by every gate: seven leaks, each carrying a key in its address -- a same-origin script element, a dynamic import, a stylesheet, a prefetch, an image, a shape's href and a navigation to the page's own origin -- each failing the containment monitor; a delivery waiting 50 ms, failing the immediacy bound; the router's claim taken away, the pinch's positive control, zooming the page to 2; and an inline script in the entry, refused by the rule.\
Beside them, 40 mutants of the code and of the gate's own checks were planted by `tools/run-mutants.mjs`, each edit applied in place, the site rebuilt, the named tests run and the edit taken back; all 40 were killed.

| Mutant | What it breaks | Failed by |
|---|---|---|
| `M1` | the first press ignores another key held | `test/table-overlaps.test.js`, 1 failing |
| `M2` | a browser's own key is a keyed fact | `test/table-overlaps.test.js`, 2 failing |
| `M3` | F5 with Alt held is the browser's own | `test/table-overlaps.test.js`, 1 failing |
| `M4` | a chorded press reads its button's bit clear | `test/table-overlaps.test.js`, 1 failing |
| `M5` | a button's release is not claimed | `test/browser/rows.test.js`, 4 failing |
| `M6` | the threshold is 5 drawing units | `test/browser/rows.test.js`, 2 failing |
| `M7` | the drag is become from the move's point | `test/worked-verdicts.test.js`, 2 failing |
| `M8` | a mouse press takes no pointer | `test/worked-verdicts.test.js`, 1 failing |
| `M9` | nothing is claimed | `test/worked-verdicts.test.js`, 3 failing |
| `M10` | focus lost leaves the gesture live | `test/worked-verdicts.test.js`, 1 failing |
| `M11` | a modifier held makes another key's press a roll-over | `test/browser/rows.test.js`, 4 failing |
| `M12` | repeats are not counted | `test/picture-state.test.js`, 2 failing |
| `M13` | the repeat interval is taken from the first fact | `test/picture-state.test.js`, 1 failing |
| `M14` | wheel facts of another unit are alike | `test/picture-state.test.js`, 1 failing |
| `M15` | the buttons drawn follow boundary facts | `test/picture-state.test.js`, 1 failing |
| `M16` | a hold first seen repeating is not 'at least' | `test/picture-state.test.js`, 1 failing |
| `M17` | a lit key's look by a style attribute | `test/painter-allowlist.test.js`, 1 failing |
| `M18` | a shape taking an address | `test/painter-allowlist.test.js`, 1 failing |
| `M19` | the paint deferred past the delivery | `test/painter-allowlist.test.js`, 1 failing |
| `M20` | a page closed before the map answers paints | `test/painter-allowlist.test.js`, 1 failing |
| `M21` | every browser counts as covered | `test/browser/rows.test.js`, 1 failing |
| `M22` | a key's code mistyped | `test/keyboard-plans.test.js`, 2 failing |
| `M23` | a Chromium code marked a UI Events code value | `test/keyboard-plans.test.js`, 2 failing |
| `M24` | a key's rect one position short | `test/keyboard-plans.test.js`, 1 failing |
| `M25` | a reported label marked assumed | `test/keyboard-plans.test.js`, 1 failing |
| `M26` | the entry copied before the folder | `test/browser/deploy-sequence.test.js`, 2 failing |
| `M27` | a differing object replaced | `test/browser/deploy-sequence.test.js`, 1 failing |
| `M28` | the rule's headers not checked through the host | `test/browser/deploy-sequence.test.js`, 1 failing |
| `M29` | the source check lets fetch through | `test/tools/gate-checks.test.js`, 2 failing |
| `M30` | the vocabulary check lets a listed word through | `test/tools/gate-checks.test.js`, 1 failing |
| `M31` | the backlog check never finds a release installed | `test/tools/gate-checks.test.js`, 1 failing |
| `M32` | the monitor ignores a request the rule refused | `test/browser/containment.test.js`, 6 failing |
| `M33` | an inline script in the entry | `test/release-layout.test.js`, 1 failing |
| `M34` | the rule without script-src | `test/browser/containment.test.js`, 10 failing |
| `M35` | the browser's own keys claimed | `test/table-overlaps.test.js`, 1 failing |
| `M36` | the vendoring check passes any bytes | `test/tools/gate-checks.test.js`, 1 failing |
| `M37` | a pen's press routed to the session | `test/picture-state.test.js`, 1 failing |
| `M38` | a held key never relit | `test/browser/rows.test.js`, 4 failing |
| `M39` | a delivery slower than the bound by 12 ms | `test/browser/immediacy.test.js`, 1 failing |
| `M40` | the overlap space without the fixtures' facts | `test/table-overlaps.test.js`, 1 failing |

**Amended, 2026-10-25, after two reviews of the first release, each of which failed it.**\
The amendment folds every finding; what each changed is in the commits that follow `73f83ae`.\
The recorder ruled two errata, within the ratified intent of IT-D9 and of section 8.
6. The browser's own keys are matched by the letter a key prints, and view source joins them. [DIRECTOR]
   IT-D9 leaves reload, full screen and the developer tools to the browser on any keyboard, and Chrome matches its shortcuts by the letter the keyboard prints, so Dvorak's Ctrl+R arrives as `code` `KeyO` and `key` "r"; a key fact whose `code` is a non-empty string is left unclaimed when its `code`, or its `key` case-folded to the letter an entry's letter key names, matches an entry, with each modifier as the entry asks.
   Ctrl+U, view source, in Chromium's developer-tools group, joins the list on Windows, Linux and ChromeOS, and Command+Option+U, Meta and Alt with `KeyU`, on macOS (`BROWSERS_OWN_KEYS`, `src/input-bindings.ts`; held both ways by `test/table-overlaps.test.js` against the specification's literal list and by trusted input in `test/browser/rows.test.js`).
   A key with no reported identity stays one whatever letter it prints, so the rows stay exclusive.
7. GT9 is judged at the 95th percentile of deliveries. [DIRECTOR]
   The bound of 10 ms failed under load from other processes in 9 of about 30 gate runs across the two reviewers, while the median stayed near 1.7 ms; section 8 asks for a generous bound and a slow build that fails it.
   The gate judges the deliveries' 95th percentile by nearest rank against 10 ms and reports the maximum and the median beside it; planted builds that wait 50 ms and 12 ms in every delivery each still fail it (`test/browser/immediacy.test.js`).

The reviews' other findings, folded without a ruling:
- The tests no longer read their expectations from the code under test: section 6's rows' words and Claims column, its per-platform list of the browser's own keys, its modifier codes and chord modifiers and the Mouse button entity's bits are literals in `test/support/architecture-section-6.js`, and every fact of the overlap proof's space hits exactly one row but those section 6 gives none -- a mouse's plain move, its boundary facts and its cancel, and pointer facts no platform makes -- which hit none.
- A touch's or a pen's fact no longer changes the item under the pointer drawn; every held key is shown, past three named on one line; the threshold shown is the session's declaration's; the buttons' bits are defined once, in `src/keyboard-plans.ts`.
- The entry was copied under `--no-clobber`, which the Cloud SDK skips silently, so no later deploy could switch it and no rollback was possible; it is now replaced under the generation read just before, and every folder object copied only where none is.
- The deploy refuses a release unless its manifest is the `SHA256SUMS` attached to its tag's GitHub release; takes a missing object only on gcloud's `not found: 404.`; checks every object's content type and a missing object's 404 through the host; reads its options in any order; and is tested as run, against stand-ins for `gcloud` and `gh`.
- The release's archive sets every file's mode, so it is the same bytes under any umask, and the release workflow checks the packed manifest against the one the gate built; `GH_TOKEN` is handed to the `gh` steps alone.
- The gate prints every failing test's whole block, and keeps each step's output in `.gate/`.

**Why not the alternatives.**\
For erratum 1, following every mouse fact's `buttons` would draw the left button lit while the middle is held, a delivered value contradicting the press before it, from an event section 2 does not draw again; dropping `buttons` altogether would leave a chord's moves undrawn.\
For erratum 4, `history.replaceState` would keep a choice made by script in the address, but GT1 refuses navigation, and an address written by script is a channel a keylogger could use; a drawn control would make a press of button 0 an action of the page, a meaning outside the table.

**Named costs.**\
The plan chosen by a link reloads the page, ending what it showed.\
The buttons drawn can lag a boundary fact that was right, until the next press, move or release.

**Consequences.**\
The target absorbs errata 1 to 5 in sections 6 to 8 when ratified; `docs/BACKLOG.md` carries B13 until real hardware is measured.

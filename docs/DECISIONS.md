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
The first build stands as the nearest faithful reading of revision 4, with the choices and the seven errata below -- five found at build, and two the recorder ruled after the reviews --; each erratum's evidence is cited, and each is to be absorbed into the target, or overruled, by the director.

**Errata against the architecture.**
1. The buttons drawn do not follow boundary facts. [MEASURED]
   Section 6 has the buttons drawn follow the `buttons` of every fact whose `pointerType` is `mouse`.
   In headless Chrome, under trusted input over the DevTools protocol, a middle press delivered `pointerdown` with `button` 1 and `buttons` 4, and once its pointer was taken the boundary events that followed, `pointerout`, `pointerleave` and `pointerover`, each carried `buttons` 1 -- the left button's bit, while only the middle was held; a pen's press made the mouse's boundary events carry `buttons` 1 likewise; and a review measured the right button the same way, its press's `pointerdown` carrying `buttons` 2 and the boundary events after the capture `buttons` 0, while the right was held.
   Review A measured the cause: the wrong `buttons` appear when the page's content changes under a pressed button, Chromium then synthesizing a hover move that sets only the left button's flag.
   Section 2 puts "events the browser derives from inputs already shown -- pointer capture changes -- drawn again" out of scope, so the nearest faithful reading is that the buttons drawn follow a mouse's `down`, `move`, `up`, `cancel` and `context-menu`, and every `wheel`, never `over`, `out` or `leave` (`BUTTONS_REPORTED_BY`, `src/picture-state.ts`; `test/picture-state.test.js`; `docs/BACKLOG.md` B13).
2. The overlap proof's count. [MEASURED]
   Section 6 reports 46,661 facts; the text does not state how they were counted, so the space was built from its description -- every key fact's type, repeat flag and sixteen modifier states over 119 codes, both plans' and the browser's own keys' among them, `''` and `null` too, and every pointer, wheel, context-menu, `blur` and derived commit fact -- and was 17,291 facts with the four contexts, 69,164 combinations; with each key fact given four `key` values once the browser's own keys were matched by the letter a key prints (erratum 6), it was 40,139 facts; and with eight -- a letter no entry names, each of the six letters the browser's own letter keys name, in lower or upper case by turns, and none -- after review A's confirming pass, it is 70,603 facts, 282,412 combinations (`overlapProofFacts`, `src/input-bindings.ts`; `test/table-overlaps.test.js`).
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
Planted builds are part of the gate itself, each run by every gate: seven leaks, each carrying a key in its address -- a same-origin script element, a dynamic import, a stylesheet, a prefetch, an image, a shape's href and a navigation to the page's own origin -- each failing the containment monitor; deliveries waiting 50 ms and 12 ms, each failing the immediacy bound; the router's claim taken away, the pinch's positive control, zooming the page to 2; and an inline script in the entry, refused by the rule.\
Beside them, the mutants of `tools/run-mutants.mjs`, each edit applied in place, the site rebuilt, the named tests run and the edit taken back: the first build's 40; review A's 15, `MU1` to `MU15`, which its gate let survive, two of them run again against trusted input; review B's deploy mutants; and one for each other finding folded.\
In the run after the reviews, 76 of the 77 were killed at once, and the one that survived, `B-N`, was killed once its test was made to refuse the object's reading alone; in the final run before the driver's correction below, `MU15c` survived, and in the final run after it all 77 were killed, as the table gives.\
After review A's confirming pass, three more, `N2` to `N4`, after review B's, two, `B-I` and `B-K`, and after GitHub's gate, one, `W1`, were planted and each killed, run alone by the director's ruling `H26-15` that a test-strength finding is fixed with one targeted check; they close the table.

| Mutant | What it breaks | Failed by |
|---|---|---|
| `M1` | the first press ignores another key held | `test/table-overlaps.test.js`, 1 failing |
| `M2` | a browser's own key is a keyed fact | `test/table-overlaps.test.js`, 3 failing |
| `M3` | F5 with Alt held is the browser's own | `test/table-overlaps.test.js`, 4 failing |
| `M4` | a chorded press reads its button's bit clear | `test/table-overlaps.test.js`, 1 failing |
| `M5` | a button's release is not claimed | `test/browser/rows.test.js`, 6 failing |
| `M6` | the threshold is 5 drawing units | `test/browser/rows.test.js`, 2 failing |
| `M7` | the drag is become from the move's point | `test/worked-verdicts.test.js`, 2 failing |
| `M8` | a mouse press takes no pointer | `test/worked-verdicts.test.js`, 1 failing |
| `M9` | nothing is claimed | `test/worked-verdicts.test.js`, 3 failing |
| `M10` | focus lost leaves the gesture live | `test/worked-verdicts.test.js`, 1 failing |
| `M11` | a modifier held makes another key's press a roll-over | `test/browser/rows.test.js`, 5 failing |
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
| `M26` | the entry copied before the folder | `test/browser/deploy-sequence.test.js`, 5 failing |
| `M27` | a differing object replaced | `test/browser/deploy-sequence.test.js`, 1 failing |
| `M28` | the rule's headers not checked through the host | `test/browser/deploy-sequence.test.js`, 1 failing |
| `M29` | the source check lets fetch through | `test/tools/gate-checks.test.js`, 2 failing |
| `M30` | the vocabulary check lets a listed word through | `test/tools/gate-checks.test.js`, 1 failing |
| `M31` | the backlog check never finds a release installed | `test/tools/gate-checks.test.js`, 1 failing |
| `M32` | the monitor ignores a request the rule refused | `test/browser/containment.test.js`, 6 failing |
| `M33` | an inline script in the entry | `test/release-layout.test.js`, 1 failing |
| `M34` | the rule without script-src | `test/browser/containment.test.js`, 10 failing |
| `M35` | the browser's own keys claimed | `test/table-overlaps.test.js`, 4 failing |
| `M36` | the vendoring check passes any bytes | `test/tools/gate-checks.test.js`, 1 failing |
| `M37` | a pen's press routed to the session | `test/picture-state.test.js`, 1 failing |
| `M38` | a held key never relit | `test/browser/rows.test.js`, 4 failing |
| `M39` | a delivery slower than the bound by 12 ms | `test/browser/immediacy.test.js`, 1 failing |
| `MU1` | buttons drawn ignore a mouse cancel's buttons | `test/picture-state.test.js`, 1 failing |
| `MU2` | a mouse cancel never reaches pointerLost | `test/picture-state.test.js`, 1 failing |
| `MU3` | otherHeld counts the fact's own code | `test/picture-state.test.js`, 1 failing |
| `MU4` | wheel lines ignore the sign of deltaX | `test/picture-state.test.js`, 1 failing |
| `MU5` | macOS Meta+Alt+J dropped from the browser's own keys | `test/table-overlaps.test.js`, 4 failing |
| `MU6` | Meta is no chord modifier | `test/table-overlaps.test.js`, 1 failing |
| `MU7` | the wheel sideways only rightward | `test/table-overlaps.test.js`, 1 failing |
| `MU8` | the context menu not claimed | `test/table-overlaps.test.js`, 2 failing |
| `MU8c` | the context menu not claimed, against trusted input | `test/browser/rows.test.js`, 1 failing |
| `MU9` | a chorded press not claimed | `test/table-overlaps.test.js`, 2 failing |
| `MU10` | the status line not repainted when only the buttons change | `test/picture-state.test.js`, 1 failing |
| `MU11` | the item under the pointer never updates | `test/picture-state.test.js`, 1 failing |
| `MU12` | MetaRight no modifier code | `test/table-overlaps.test.js`, 1 failing |
| `MU13` | a chord naming button 4 matches no chord row | `test/table-overlaps.test.js`, 1 failing |
| `MU14` | a commit's derived fact always a click | `test/worked-verdicts.test.js`, 1 failing |
| `MU15` | hit without IT-D4's itemAt fallback | `test/picture-state.test.js`, 1 failing |
| `MU15c` | hit without IT-D4's itemAt fallback, against trusted input | `test/browser/rows.test.js`, 1 failing |
| `R1` | the browser's own keys matched by code alone, not by the letter a key prints | `test/table-overlaps.test.js`, 3 failing |
| `R2` | view source not among the browser's own keys | `test/table-overlaps.test.js`, 4 failing |
| `R3` | a touch's or a pen's fact changes the item under the pointer | `test/picture-state.test.js`, 1 failing |
| `R4` | held keys past three dropped unsaid | `test/picture-state.test.js`, 1 failing |
| `R5` | a threshold shown that is not the session's | `test/picture-state.test.js`, 1 failing |
| `R6` | GT9 judged at the maximum | `test/browser/immediacy.test.js`, 1 failing |
| `R7` | the gate's failure blocks without their YAML | `test/tools/run-gate.test.js`, 1 failing |
| `B-L` | the deploy's byte check through the host disabled | `test/browser/deploy-sequence.test.js`, 3 failing |
| `B-G` | the deploy's Cache-Control check disabled | `test/browser/deploy-sequence.test.js`, 1 failing |
| `B-A` | the entry copied before the folder is checked | `test/browser/deploy-sequence.test.js`, 3 failing |
| `B-B` | production's folder unchecked | `test/browser/deploy-sequence.test.js`, 2 failing |
| `B-Q` | every object copied text/plain | `test/browser/deploy-sequence.test.js`, 3 failing |
| `B-C` | the entry copied as a folder object is, never replacing | `test/browser/deploy-sequence.test.js`, 1 failing |
| `B-D` | the gcloud wrapper copies under --no-clobber | `test/browser/deploy-cli.test.js`, 3 failing |
| `B-N` | any gcloud error taken as a missing object | `test/browser/deploy-cli.test.js`, 1 failing |
| `B-T` | the release not checked against its tag's attached manifest | `test/browser/deploy-cli.test.js`, 2 failing |
| `B-O` | the release directory read only as the first argument | `test/browser/deploy-cli.test.js`, 3 failing |
| `B-6` | a missing object's 404 not checked for the rule | `test/browser/deploy-sequence.test.js`, 1 failing |
| `B-M` | the archive's file modes left to the umask | `test/tools/pack-release.test.js`, 1 failing |
| `B-P` | the public-text check lets a hex identifier stand anywhere in a workflow | `test/tools/gate-checks.test.js`, 1 failing |
| `N2` | the overlap space without the letters r and U | `test/table-overlaps.test.js`, 1 failing |
| `N3` | a touch's or a pen's fact moves the drag line's end | `test/picture-state.test.js`, 1 failing |
| `N4` | the driver names a move's held button only when it is the left, so Chrome drops the other buttons' drags | `test/browser/rows.test.js`, 5 failing |
| `B-I` | the deploy's smoke run takes its request monitor from the browser tests' helper, which loads the built site | `test/tools/deploy-imports.test.js`, 1 failing |
| `B-K` | a workflow's checkout persists the token in .git/config | `test/tools/workflows.test.js`, 1 failing |
| `W1` | the header rule without worker-src 'none' | `test/browser/containment.test.js`, 3 failing |
| `M40` | the overlap space without the fixtures' facts | `test/table-overlaps.test.js`, 1 failing |

**Amended, 2026-10-25, after two reviews of the first release, each of which failed it.**\
The amendment folds every finding; what each changed is in the commits that follow `73f83ae`.\
The recorder ruled two errata, within the ratified intent of IT-D9 and of section 8.\
`[RECORDER]` marks a ruling the programme's recorder made within a ratified decision's intent, which is no ruling of the director's; it is a fifth tag beside mission-kit `AR4`'s four.
6. The browser's own keys are matched by the letter a key prints, and view source joins them. [RECORDER]
   IT-D9 leaves reload, full screen and the developer tools to the browser on any keyboard, and Chrome matches its shortcuts by the letter the keyboard prints, so Dvorak's Ctrl+R arrives as `code` `KeyO` and `key` "r"; a key fact whose `code` is a non-empty string is left unclaimed when its `code`, or its `key` case-folded to the letter an entry's letter key names, matches an entry, with each modifier as the entry asks.
   Ctrl+U, view source, in Chromium's developer-tools group, joins the list on Windows, Linux and ChromeOS, and Command+Option+U, Meta and Alt with `KeyU`, on macOS (`BROWSERS_OWN_KEYS`, `src/input-bindings.ts`; held both ways by `test/table-overlaps.test.js` against the specification's literal list and by trusted input in `test/browser/rows.test.js`).
   A key with no reported identity stays one whatever letter it prints, so the rows stay exclusive.
7. GT9 is judged at the 95th percentile of deliveries. [RECORDER]
   The bound of 10 ms failed under load from other processes in 9 of about 30 gate runs across the two reviewers, while the median stayed near 1.7 ms; section 8 asks for a generous bound and a slow build that fails it.
   The gate judges the deliveries' 95th percentile by nearest rank against 10 ms and reports the maximum and the median beside it; planted builds that wait 50 ms and 12 ms in every delivery each still fail it (`test/browser/immediacy.test.js`).

**Correction, 2026-10-26, as measured: the trusted-input driver dropped every taken pointer.**\
The gate's driver, `test/browser/tester-in-chrome.js`, sent each move during a drag with the held bits in `buttons` but `button` `"none"`, and Chrome drops the capture of a pointer whose move names no held button: `gotpointercapture` and at once `lostpointercapture`, and the move targets what lies under it, not the `<svg>` -- six of six trials on the tester's page, and on a page of its own whether or not the press changed the page.\
Section 3 states its measurements were made "under a trusted-input driver that names the held button on every move"; this build's driver did not, so until this correction no browser test of a taken pointer tested one, and `MU15c` -- `hit` without IT-D4's `itemAt` fallback -- lived or died by timing, surviving the final mutant run before the correction.\
The driver now names the lowest-numbered held button on every move, as a real mouse's move carries it; the IT-D4 test asserts the move targets the `<svg>` with the pointer still taken; a test pins Chrome's dropping of a pointer whose move names none; and the guide's section 8, which had taught the bits alone, teaches both.\
Erratum 1 was measured with the faulty driver and is measured again with the held button named: the capture holds, the move and the release target the `<svg>`, and still the boundary facts Chrome sends as the capture begins carry `buttons` 1 while only button 1 is held and `buttons` 0 while only button 2 is, so the erratum stands.

**Review A's confirming pass, 2026-10-26: three test gaps closed, each by one targeted check (the director's `H26-15`).**\
The drag tests of every button, the chord test and the focus-lost drag test of every button each assert, after their moves, that the pointer is still taken and every move targeted the `<svg>`, so a driver naming only the left button's moves fails them (`N4`).\
A touch's or a pen's every pointer fact during a live mouse drag is held to leave every drawn entry unchanged -- the buttons, the pointer's position and so the drag line, the press, the gesture, the held keys and the item under the pointer (`N3`).\
The code already kept the drag line's end to mouse facts, so no code changed; what was missing was the test.\
[MEASURED] In Chrome a pen's first press on the page is followed by a mouse `move` at the pen's position, which moves the line as any mouse move does: a mouse fact the browser delivered, shown as delivered (`docs/BACKLOG.md` B15).\
The overlap proof's space gives every letter the browser's own letter keys name, and the test holds it to section 6's literal list, a letter printed on another key for each, so the space cannot shrink unseen (`N2`).

**Review B's confirming pass, 2026-10-26: two fixes and a note, each by one targeted check (`H26-15`).**\
`tools/deploy` crashed on a checkout never built, its smoke run taking the request monitor from the browser tests' helper, which loads the built site at import time; the monitor is now a module of its own that loads nothing, a test imports every module the deploy imports in a copy with no `site/`, and the README's prerequisites build the checkout all the same (`B-I`).\
`actions/checkout` persists the job's token into `.git/config` by default, so the release workflow's comment that only the `gh` steps hold it was false; all four checkouts now set `persist-credentials: false`, and a test holds both that and the `gh` steps alone holding `GH_TOKEN` (`B-K`).\
The release a deploy downloads into the checkout, `release-<tag>/`, is ignored by git.

**GitHub's gate, 2026-10-26, as measured: a worker refused by an error event, not a throw (`H26-15`).**\
On GitHub's runner, whose Chrome is newer than this machine's 136, the IT-D5 test failed: there a worker the rule's `worker-src 'none'` refuses is made, fires an `error` event and has its script's fetch blocked, where Chrome 136 throws `SecurityError` from the constructor and makes no request.\
The test judged the refusal by the throw alone; it now judges a worker refused when its construction throws or it fires an `error` event within a bounded wait and posts no message -- the planted worker script posting one the moment it runs -- and no byte of its script is delivered, every request the monitor saw for it blocked and the gate's server answering none.\
A second test shows each witness failing on Chrome 136 under the rule without `worker-src`, which section 11 measured letting a worker load: a worker whose script runs is judged made by its message, the monitor and the server, and one whose script is missing fires an `error` event yet is judged not refused, the server having answered it.\
No other browser test judged a refusal synchronously: the fetch is judged by its promise, the planted leaks by the monitor after a wait, the inline script after the page loaded, and a `style` attribute where the browser blocks it as it is set, which passed on GitHub's Chrome too (`W1`).

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
The target absorbs errata 1 to 7 in sections 6 to 8 when ratified; `docs/BACKLOG.md` carries B13 until real hardware is measured.

---

## 0003 - v0.1.0 accepted on the director's Chromebook and deployed to production

**Ruled by:** the director, 2026-10-26.\
**Affects:** `input.apnex.io`; `docs/BACKLOG.md` rows B1 to B4 and B14.

**Ruling.**\
`v0.1.0`, in the lab at `input-lab.apnex.io`, is accepted on the director's Chromebook and deployed to production at `input.apnex.io`.\
The director's report, whole: "Look fine, buttons, touchpad and keys all seem to respond correctly without lag."

**Why.**\
The acceptance `0001` owed was run on the device the tester was built around: the mouse buttons, the touchpad's scroll and pinch, and the keys, the top row among them, responded as drawn, with no lag seen (B3 and B4 retired; B1 narrowed to the page's mark).\
No input method was used, so typing through one stays outside the covered inputs until it is tried (B2, IT-D12).\
The deploy ran as section 9 states, the lab first; every file served by both hosts was read back byte-identical to the release (B14 retired).

---

## 0004 - The first build's record ratified as written

**Ruled by:** the director, 2026-10-26.\
**Ratifies:** `0002`, as amended.\
**Affects:** `docs/ARCHITECTURE-TARGET.md` sections 4, 6, 7, 8 and 11, which absorb its seven errata in revision 5.

**Ruling.**\
`0002` is ratified as written, its seven errata among it: the buttons drawn follow no boundary fact; the overlap proof counted as it states; the monitor holding the files a page loads, each once; the plan chosen by two plain links; the immediacy harness timing each listener the capture adds; the browser's own keys matched by the letter a key prints as well as its code, view source among them; and GT9 judged at the deliveries' 95th percentile.\
The two the recorder ruled, 6 and 7, are the director's from this ruling.

**Why.**\
Each erratum was found by the build or by an independent review, and checked by the reviews that followed (`0002`); the director was shown all seven, the two that change what a person meets named apart, and ratified them as written rather than one at a time.

---

## 0005 - The tests run on test-harness

**Ruled by:** the director, 2026-10-31 (draw's `H26-19` as amended: no test run may leave anything behind, and what the repositories' copies share is one component, `test-harness`, taken by each in its tests alone, pinned to its release file).\
**Affects:** `package.json` and its lockfile, `test/browser/`, the tests that make scratch folders, `tools/run-gate.mjs`, `tools/smoke-run.mjs`, `tools/serve-site.mjs`, `tools/run-mutants.mjs` and `docs/BACKLOG.md`; nothing in `src/` or `page/`, and nothing the release or the site holds.

**Ruling.**\
`@apnex/test-harness` `0.1.0` is a development dependency, pinned to its release file by its URL and, in the lockfile, by its hash; the release packs the site alone, so no file of it is released or deployed.\
The gate's two test steps, and `npm test`, run under its runner, `test-harness run`, each in a run folder of its own, which fails the step on anything left in it or still running after it -- the gate's one check of leftovers -- and the gate shows the runner's verdict beside the counts.\
`test/browser/chrome-driver.js` is gone: Chrome is its `launchChrome`, in a folder of its own, and the protocol session, events and all, its `connectToPage`; the button tables and each mouse event's params are its `BUTTON_NAMES`, `BUTTON_BITS` and `mouseEventParams`, its bits held equal to the Mouse button entity's in `test/table-overlaps.test.js`, as the driver's own were by construction; and the focus loss of the rows and containment tests is its `loseFocus`, which also fails when the focus does not move as it must.\
`test/browser/site-server.js` keeps the rule, its table and a bucket copy's metadata, and serves through its `serveStatic`, whose headers function adds the rule and its companions to every answer, a missing file's among them, and each object's Cache-Control and content type as before.\
`tools/serve-site.mjs` must be found at a fixed port, and `serveStatic` listens only on one the system gives it, so the tool passes each connection to its fixed port, byte for byte, to the gate's server: the one local piece, recorded as `B17`, until `test-harness`'s server takes a port.\
The deploy's smoke run, `tools/smoke-run.mjs`, launches its Chrome the same way; the deploy's checkout installs its packages with `npm ci`, which installs the development dependencies, and `test/tools/deploy-imports.test.js` still loads every module the deploy imports in a checkout never built.\
`test/browser/deploy-cli.test.js` starts `tools/deploy` tethered with `spawnTethered`, so the deploy, and its smoke run's Chrome, end with the test however it ends; its time bound kills the deploy's whole process group, which a tethered child's `kill()` signals.\
The request monitor, the page steps, the fake cloud and the local buckets are this repository's, as before, and so are the tests' scratch folders' names, each now a `scratchFolder`.\
Mutant `N4`, which made the driver name a move's held button only when it is the left, now makes the same fault where the held button is named, the `mouse` helper's call to `mouseEventParams`; the old text is `test-harness`'s, held by its own tests.\
`B6`, the driver as the fifth copy of one harness, is retired.\
The runner is not given `--test-force-exit`, which `test-harness`'s README recommends: on Node.js 22 it cut the results a test file reports when they are many -- `snap-grid`'s `test/contract/declared-grid.test.js` reported 61 of its 78 tests with it -- and no test here leaves anything running for it to end.

---

## 0006 - The tests run on clean-runner and headless-chromium

**Ruled by:** the director, 2026-10-31 (draw's `H26-19`, amended again: the shared component split by its two duties into `clean-runner` and `headless-chromium`, and purged, no legacy retained).\
**Affects:** `package.json` and its lockfile, `README.md`, `test/`, `tools/run-gate.mjs`, `tools/smoke-run.mjs`, `tools/serve-site.mjs` and `docs/BACKLOG.md`; nothing in `src/` or `page/`, and nothing the release or the site holds.

**Ruling.**\
The development dependency `0005` names is replaced by two, each pinned to its release file by its URL and, in the lockfile, by its hash: `@apnex/clean-runner` `0.2.0`, for the runner -- the gate's two test steps and `npm test` under `clean-runner run` -- `scratchFolder` and `spawnTethered`, which starts `tools/deploy` in `deploy-cli.test.js`; and `@apnex/headless-chromium` `0.1.0`, for `launchChrome`, `connectToPage`, `mouseEventParams`, the button tables, `loseFocus` and `serveStatic`.\
The deploy's smoke run, `tools/smoke-run.mjs`, launches its Chrome through `headless-chromium`, which the deploy's checkout installs with `npm ci`; the deploy still loads in a checkout never built (`test/tools/deploy-imports.test.js`).\
`B17`, the fixed port `tools/serve-site.mjs` relays, now names `headless-chromium`'s `serveStatic`; the calls are otherwise `0005`'s, and the runner is still given no `--test-force-exit`.

---

## 0007 - The view's rows: pan and zoom, shown as verdicts

**Ruled by:** the programme, 2026-11-02 (draw's `H26-23`, ratifying `dev/design/components/PAN-ZOOM.md` revision 10: its PZ30 at (a), the tester's step, and its move 5, the view's rows).\
**Affects:** `src/input-bindings.ts`, `src/input-router.ts`, `src/picture-state.ts`, `src/picture-painter.ts`, `src/composition-root.ts`, the new `src/view-steps.ts`, `page/input-tester.css`, `test/`, `tools/run-mutants.mjs`, `tools/generate-architecture.mjs`, `docs/GUIDE.md`, `docs/BACKLOG.md`, and `docs/ARCHITECTURE-TARGET.md`, revision 6.

**Ruling.**\
The architecture's non-goal "Pan and zoom of the picture" becomes "Pan and zoom of anything but the view pane": the picture of the keyboard and mouse stays still, and the view's gestures are in scope.\
The table gains the view's rows of PAN-ZOOM.md 3.6 -- `scroll-pan`, a `wheel` without Ctrl, and `pinch-zoom`, one with it, in place of the five wheel rows, IT-D8's sentence kept beside the pinch; `pan-middle`, a mouse's press of button 1 with no gesture live; `pan-right`, of button 2 on open ground with no gesture live; and `pan-space`, of button 0 with Space held and no gesture live -- each claiming, and the table stays at 42 rows.\
The session declares the three pan gestures, each under its own name with its one button, `engaged` true, and `measure: 'screen'`, threshold 4, so every press is measured in screen pixels (PZ17, `input-binding` `0.3.0`'s IB16).\
Each view row's verdict is shown in words beside the wheel, and in the log: a scroll pan by its normalised pixels, a pinch zoom by its levels, its factor and the screen point it keeps, a pan by its travel on screen from where it engaged, its release committing nothing.

**Settled by the build.**
- A pan row opens its button's press gesture, `press-b`, as the press row does, so a press that never travels the threshold stays a click of button b, as the tester shows it today; once it travels beyond, the router asks `becomeGesture` for the row's pan gesture, without `from`, and takes the pointer then, never at the press (3.6, engagement).
- The press rows of buttons 0, 1 and 2 take the complement of their pan row's `when`, so each press meets one row: the view's rows are rows of the one table, where draw asks a table of their own first, and the overlap proof holds them exclusive.
- The context gains three flags of a pointer fact, `gestureLive`, `spaceHeld` and `openGround`; open ground is a fact whose `hit` is `null`, no key or mouse button under it, the tester holding no zones.
- The overlap proof runs a key fact with the four contexts of its two flags and every other fact with the eight of its three, 321,160 combinations in about 34 seconds.
- The view is kept in the picture as numbers -- the level among `0.5x`, `1x`, `2x` and `3x`, the pinch's held pixels, a live pan's travel -- by `src/view-steps.ts`, the one place the levels, the step of 100 pixels and the line of 40 are held; a page is the surface's `clientHeight`, read at each wheel fact, and a page of a surface whose height is not a number above 0 moves no view, said so.
- A scroll pan leaves the pinch's held pixels as they were, since the wheel set that view; a pan's engagement and its every move set them to 0, as a drag's pan does, and focus lost does; a pan cancelled leaves the view where it was.
- The drag line starts at the press's drawing point, kept beside the session's press, whose point is now on screen; the status line names the press's screen point and the threshold in screen pixels.
- Seven mutants plant the view's rules wrong -- a right press panning off open ground, a pan taking the pointer at its press, a pan engaging as a drag, the session measuring drawing units, the pinch keeping its held pixels across a change of sign, a line of one pixel, focus lost keeping the held pixels -- `M41` to `M47` in `tools/run-mutants.mjs`, each killed; `M7`, `M8` and `M11` follow the router's new text, and are killed still.
- The deploy test derives its count of steps from the release's files, three per target beside one per folder object; its literal, 274, went stale when the raised pins added files, a commit that ran no browser test.
- In headless Chrome a pinch synthesized to twice the scale arrives as Ctrl wheel facts whose `deltaY` sum to -69.3 pixels, -100 times its logarithm, so the step of 100 pixels asks a pinch to about 2.7 times the scale; the step stays 100 until the director's Chromebook calibrates it.

**Not built here.**\
The view pane and the view keys, `=` or `+`, `-`, `Shift+0`, `Shift+1` and `h`, the last row of 3.6, are move 6's: fit and home act on the pane's view, and a key row would take keys every key row now claims as a press; held as `B18`, its trigger move 6 beginning.\
PZ27's datum is draw's: the tester holds none, so Space held is a context alone, its own press still a first press.

---

## 0008 - Move 5's verification: the mouse column's lines clear of the legend, and open ground as the code tests it

**Ruled by:** move 5's verifier, 2026-11-02, failing `0007`'s build on one blocking finding, B1, with two findings and two notes beside it (draw's `H26-23`, PAN-ZOOM.md move 5).\
**Affects:** `src/picture-painter.ts`, `src/picture-state.ts`, `src/input-bindings.ts` and `src/input-router.ts` in their words, the new `test/browser/panel-layout.test.js`, `test/browser/rows.test.js`, `test/worked-verdicts.test.js`, `tools/run-mutants.mjs`, `docs/BACKLOG.md`, and `docs/ARCHITECTURE-TARGET.md`, revision 7.

**Ruling.**\
The view's words no longer run into the legend: `0007` drew them on one line at the legend's height, from x 910, where at rest they ended at x 1202 and printed over the legend's standing column, which starts at x 1160, once any input gave its rows a standing, and reached x 1612 during a long right pan (measured).\
They are drawn as lines in the mouse column, the 250 units from the mouse's text to the legend, below the wheel's: the level and the pinch's held pixels, then the pan, then what the latest view row did, wrapped at 34 characters.\
The wheel's words, drawn on one line since `v0.1.0`, ran into the legend too after any wheel turn, to x 1280 at large deltas (measured), and are wrapped in the same column above the view's.\
`test/browser/panel-layout.test.js` drives both to their longest wordings -- a key press, a long right pan live and released, a scroll and a pinch of large fractional deltas with every modifier, a pinch held short of a step -- and holds every line's box clear of every legend row, the drawn keyboard and mouse and every other text, left of the legend and inside the picture; the widest line ends at x 1104.\
Open ground is what the code tests, a pointer fact whose `hit` is `null`: nothing of the picture under it, neither a key nor the mouse's buttons, body or wheel, and the panel's text, which the platform looks through, is open ground; this supersedes `0007`'s "no key or mouse button under it".\
A pan's release is said to make no edit, beside the session's commit of its gesture, in place of `0007`'s "nothing committed"; screen points in the view's words are written to a tenth, as its pixels are.

**Settled by the build.**
- A right press on a drawn mouse button or on the mouse's body is a press of button 2, and one on the panel's text is `pan-right`, in trusted input (`test/browser/rows.test.js`); a scroll pan leaving the pinch's held pixels alone is a worked verdict -- Ctrl and the wheel 30, a scroll of 40, then Ctrl and the wheel 80, give 2x with 10 held.
- Four mutants: `M48`, a drawn mouse button counted as open ground (the verifier's v3); `M49`, a scroll pan setting the held pixels to 0 (v5); `M50`, the view's words on one line at the legend's height, as `0007` drew them; `M51`, the wheel's words on one line, as `v0.1.0` drew them; each killed by the new tests.
- A long log line still runs under the legend, as since `v0.1.0`: held as `B19`.

---

## 0009 - Move 5's re-review: the picture's text as one layout

**Ruled by:** move 5's re-review, 2026-11-02, confirming `0008` and failing the build on two blocking findings, B2 and B3, the same fault as B1 in two more places (draw's `H26-23`, PAN-ZOOM.md move 5).\
**Affects:** `src/picture-painter.ts`, `test/browser/panel-layout.test.js`, `test/browser/tester-in-chrome.js`, `tools/run-mutants.mjs`, `docs/BACKLOG.md`, and `docs/ARCHITECTURE-TARGET.md`, revision 8.

**Ruling.**\
Every line of the picture's text is held to one layout: inside the picture, clear of every other line and of the drawn keyboard and mouse, measured line by line, each tspan on its own.\
The log's lines ran over the legend for ordinary input, this move's row words and the view's words appended -- a scroll of -120 to x 1543, a synthesized pinch to 1722, Ctrl and the wheel to 1748, a pan released to about 1360 (the re-review's measurements) -- where at `v0.1.0` a scroll's ended at 710.\
Each log entry is now wrapped at 168 characters, ending by x 1113 in the log's monospace face, and never cut: the log shows its newest entries whole, as many as fit its fourteen lines, newest first, and the picture record still keeps fourteen.\
The pinch row's words, "a pinch zoom: Ctrl and wheel, or a touchpad pinch: the browser does not tell them apart", ran past the picture's edge at rest, to x 1702, 1764 bold, cutting IT-D8's sentence.\
A legend row's words longer than 64 characters are now drawn on two lines, broken after the last colon that leaves both within 64, so IT-D8's sentence, "the browser does not tell them apart", stands whole on its own line; the rows below move down by the extra line, the last row's baseline at y 839.\
`B19`, held by `0008` as a fault since `v0.1.0`, is retired with its framing corrected: the long lines were this move's.

**Settled by the build.**
- `test/browser/panel-layout.test.js` measures every line, at rest and with every legend row marked bold as the input, after a key press, a four-line wheel -- a Chromebook's fractional delta, -66.66666412353516 on both axes, repeated twelve times with every modifier -- a long right pan live and released, a middle pan released, a scroll of -120, a synthesized pinch, Ctrl and the wheel 120, and a pinch stepping in with the rest dropped; the legend's words end by x 1586 bold.
- Four mutants, each killed by it: `M52`, room for three wheel lines above the view's (the re-review's w2); `M53`, a column's lines at one height (w4); `M54`, the log's entries on one line each, as `0008` drew them; `M55`, every legend row on one line, the pinch's as `0008` drew it; `M50` and `M51` are killed by it still.
- The proof's newest log line joins a wrapped entry's lines by the spaces they were broken at.
- The status and held-key lines are measured with the rest: at these inputs they end left of the mouse column; they would reach it only with a dozen keys held at once, past any keyboard's measured roll-over here, and are left as they stand.

---

## 0010 - Move 5's targeted check: every free text block bounded by construction

**Ruled by:** move 5's targeted check, 2026-11-02, passing `0009`'s log and legend and failing the build on one blocking finding, B4 (draw's `H26-23`, PAN-ZOOM.md move 5).\
**Affects:** `src/picture-painter.ts`, `page/input-tester.css`, `test/browser/panel-layout.test.js`, `test/browser/rows.test.js`, `tools/run-mutants.mjs`, and `docs/ARCHITECTURE-TARGET.md`, revision 9.

**Ruling.**\
During a pan pressed at a fractional screen point, which a Chromebook at 125% reports, the status line wrote the point exact -- "press from screen 933.6000366210938, 86.4000244140625" -- and ran to x 921, into the view's lines from x 910 (the check's measurement, and this build's on the code before it); a left drag from such a point reached 901, and six keys held with one, 907.\
`0009`'s bound, that the status lines would reach the mouse column "only with a dozen keys held at once", understated it, and is superseded: the press point, not the keys, drove the length, and a bound found by measuring worst cases is no bound.\
The status line writes its press point to a tenth, as the view's words do.\
Every free text block is now bounded by construction, each given a column and a width and wrapped within it, a word longer than a line broken into pieces, so no wording of any length reaches a neighbour.\
The left column, from x 0 to 900 under the keyboard, holds the plan line, the labels line and the browser line at its head, its fixed notices at its foot, laid upward from y 890, and between them a flow: the status lines, the held keys, the log's heading and the log, each wrapped at 132 monospace characters and each placed below the last -- where they stand for ordinary input, or lower when a block above runs longer.\
The log shows its newest entries whole, as many as fit above the foot; the held keys, which grow only with keys held at once, leave room for the log's heading, their last line saying how many lines found no room when there are more than fit.\
The mouse column, from x 910 to 1150, holds the wheel's lines and then the view's, each wrapped at 34 monospace characters, the view's starting below room for four of the wheel's, or below its last line when it has more.\
The legend, from x 1160 to the picture's edge, wraps each row's words at 64 characters, as `0009` settled.\
The blocks that can hold an input's own words or numbers -- the plan line, which shows a plan named in the address, the status lines, the held keys, the log, the wheel's lines and the view's -- are drawn in the monospace face, so a budget in characters is a budget in units; the fixed notices and the legend hold only the page's own words, measured.

**Settled by the build.**
- `test/browser/panel-layout.test.js` adds a pan pressed at 933.6000366210938, 86.4000244140625 and live, which the code before this fails -- the status line, to x 921, overlapping the view's line "pan-middle live, 0 screen pixels" -- and a second test driving each block to the longest wording its inputs give: thirty-two keys held, thirty first seen repeating, with a key of no identity, during a pan from a fractional point; a wheel of deltas -123456789.12345679 and -98765432.98765432 with every modifier, alike in a row; a plan named in the address by 400 characters; a browser naming no Chromium, on the Chromebook plan.
- Seven mutants, `M56` to `M62`: the press point exact; the status lines, the held keys and the plan line each unwrapped; the held keys and the log's heading each at a fixed place whatever the block above; a word longer than a line left whole; `M50` to `M52`, which named the code this replaces, name it as it now stands, `M52` as a fixed room of three wheel lines (the re-review's w2).
- Two mutants left stale by `0007`, found now, name the code as it stands: `MU3`, whose router text `0007` changed, and `MU7`, whose sideways-wheel row `0007` retired, now a scroll pan for a vertical delta only.
- The proof reads the page's fixed lines as its lines joined by the spaces they were broken at, since a wrapped notice is two lines.
- `docs/GUIDE.md` and the picture state are unchanged: the layout is the painter's alone.

---

## 0011 - Move 5's bounded-layout check: a refused opening's problems drawn again

**Ruled by:** move 5's bounded-layout check, 2026-11-02, passing `0010`'s layout and failing the build on one blocking finding, B5, with two findings to fix beside it (draw's `H26-23`, PAN-ZOOM.md move 5).\
**Affects:** `src/picture-painter.ts`, `src/composition-root.ts`, `page/input-tester.css`, `test/painter-allowlist.test.js`, `test/browser/panel-layout.test.js`, `tools/run-mutants.mjs`, and `docs/ARCHITECTURE-TARGET.md`, revision 10.

**Ruling.**\
`0010`'s rewrite of `paintWholePage` dropped its drawing of `view.notices.problems` and put nothing in its place, so a capture that refused its declaration -- whose problem the composition root adds before painting the whole page again -- left the page showing nothing of it, against the architecture's "a refused opening shows its problems on the page".\
The removal rested on a wrong reading, that the problems reached `paintWholePage` only on a path that returns before it; the capture's refusal is painted by it.\
The problems are drawn again, in the left column's head below the browser line, each wrapped at its 132 monospace characters and the flow placed below them; a refusal before anything else is drawn -- the grid, the table or the session -- is painted by the painter's `paintRefusedOpening`, at the column's top, wrapped the same way, where the composition root put one unwrapped line at y 892.\
The view's pan line, "pan-middle live, N screen pixels", is wrapped as the view's other lines are: at 14,206 pixels it reached x 1162, into the legend.

**Every text the old `paintWholePage` drew, and where it is drawn now.**\
The list is `b2bceb8`'s `paintWholePage`, line by line, each item held by `test/painter-allowlist.test.js`, "every text the painter drew before 0010 is drawn", but the drag line, a shape drawn only while a drag is live, which `test/browser/rows.test.js` holds:
- every key, its label and its note's corner, and the labels line (`paintEveryKey`): drawn, the labels line at the head's labels place;
- the mouse's body and its five buttons with their labels (`paintMouse`): drawn, unchanged;
- the wheel's arrow and the wheel's line (`paintWheel`): drawn, the line as the wheel's lines;
- the view's line (`paintViewLine`): drawn, as the view's lines;
- the drag line (`paintTrail`): drawn, unchanged;
- the plan line: drawn, wrapped in the head;
- the browser line, outside Chromium: drawn, wrapped in the head;
- the problems, when there are any: dropped by `0010`, drawn again here;
- the log's heading: drawn, in the flow;
- what no page can know, its heading and its four lines: drawn, in the foot;
- the claims line: drawn, in the foot;
- the notes' key: drawn, in the foot;
- the legend's heading: drawn, unchanged;
- the status lines and the held keys (`paintStatus`): drawn, in the flow;
- the log's fourteen lines (`paintLog`): drawn, in the flow;
- the legend's 42 rows (`paintLegend`): drawn.

**Settled by the build.**
- `test/painter-allowlist.test.js` composes the page on the fake platform with a key source the capture refuses and a browser naming no Chromium: the problem is drawn whole, each line within 132 characters, between the browser line and the status lines; both its tests fail on the code before this.
- `test/browser/panel-layout.test.js` drives a five-line wheel -- deltas of -1.2345678e-7 and -9.8765432e-7, below 1e-6, with every modifier, twelve alike -- so the view's lines must move below more than four wheel lines, and a middle pan of 14,206.4 screen pixels, live, whose unwrapped pan line ends at x 1162; it now holds every line within its column's edge too -- x 900, 1150 or the picture's -- as well as clear of every other line.
- Three mutants: `M63`, room for exactly four wheel lines above the view's (the check's b4); `M64`, the view's pan line unwrapped; `M65`, a refused capture's problems not drawn.
- The problems are drawn in the monospace face, so their budget in characters is a budget in units.


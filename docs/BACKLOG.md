# input-tester - backlog

The record of what the tester has not done, and of every workaround it ever needed (`docs/ARCHITECTURE-TARGET.md`, IT-D7).\
A row is never deleted: it is retired with its reason.\
The board, where one exists, is the plan; this is the record.

---

## Adding a row

A row is required for every deferral of the tester's own -- a decision's recommendation held, an acceptance owed, a measurement not made -- and for every workaround the tester needed because a shared part lacked something.\
Each row cites its evidence, a file and line or a command run, and every row not retired carries a revival trigger: an observable condition, never a date or "later" (mission-kit `RU3`).\
A workaround row names the shared part's release that retires it, as `` `part` `version` ``, and `tools/check-backlog.mjs` fails the gate when a workaround is open while that release, or a later one, is pinned (GT4).\
Revival re-triages a row; it does not resume it.

---

## Workarounds

No workaround was needed: the tester is built from the four parts as published, through their documented interfaces alone.\
A row is added here, and the gap fixed in the part, the moment one is.

| id | workaround | evidence | retired by | state |
|---|---|---|---|---|

---

## What the parts' documents left to guess

Building the tester from the four parts' published documents alone, these were not said, or said wrongly; none needed a workaround, and each belongs to its part's next release.

| id | finding | evidence | revival trigger |
|---|---|---|---|
| D1 | `snap-grid`'s `README.md` says "the guide below gives the conservative scale to pass", but no part's document holds the recipe or its counterexamples: the guide is this repository's, written with this build, and the smaller singular value and the three naive scales that crowd were derived here | `docs/GUIDE.md` section 3, its example run by the gate | A release of `snap-grid` whose `README.md` states the recipe, or names the guide by its address |
| D2 | `input-capture`'s `README.md` says `takePointer` answers `false` for a synthetic event; in headless Chrome it answered `true` for a synthetic `pointerdown` naming pointer 1, the mouse's own, with no button down, and `false` for pointer 9 | `docs/GUIDE.md` section 5, its example run by the gate | A release of `input-capture` whose `README.md` corrects the trap |
| D3 | No part's documents say that a taken pointer's press and release are followed by boundary facts, `out`, `leave` and `over`, nor that Chrome sends them with `buttons` 1 while only button 1 is held; the tester met both at its gate, its picture and its tests each reading past them | `docs/DECISIONS.md` 0002, erratum 1; `test/browser/rows.test.js`, `releaseLines` | A release of `input-capture` whose traps name boundary facts after `takePointer` |
| D4 | The vocabulary list the parts refuse on behalf of their first consumer, which GT7 runs here, is held only in each part's repository, `tools/consumer-vocabulary.json`, in no published document or release file; the tester copied it from there | `tools/consumer-vocabulary.json` | A part's release file or `README.md` carries the list, or mission-kit holds it |
| D6 | No part's `README.md` or `CONTRACT.md` says that a protocol move of trusted input must name its held button in `button`, not only in `buttons`, or Chrome drops the taken pointer; only `input-capture`'s own test code shows it, by example, and this build's driver, missing it, tested no taken pointer until a review's mutant exposed it | `docs/DECISIONS.md` 0002, the driver's correction; `test/browser/rows.test.js`, the test pinning it | A release of `input-capture` or `vector-scene` whose `README.md` states the trap for trusted input |
| D5 | `vector-scene`'s scene is generic in the root's kind of element, so a painter written for any scene types its target as `Scene["put"]` and `Scene["remove"]`, which hold for every kind; no document says those two do not depend on it, and it was found by compiling | `src/picture-painter.ts`, `PaintTarget` | A release of `vector-scene` whose `README.md` shows a function written over any scene |

---

## Open

| id | finding | evidence | revival trigger |
|---|---|---|---|
| B1 | The page marks the Chromebook plan's top-row codes and the Search key's `MetaLeft` unmeasured, though the director's acceptance on their Chromebook, 2026-10-26, found the keys responding correctly (`0003`): a key whose `code` the plan did not draw would light nothing and be logged as not on the drawn keyboard, so each key the director pressed sent the code drawn for it; each key's code was not written down one by one | `src/keyboard-plans.ts`, `CHROMEBOOK_PLAN`; `docs/DECISIONS.md` `0003` | The tester's next release, which drops the mark on the director's report, or a person reports a top-row key drawn wrong |
| B2 | Typing through a native input method is not covered: injected composition reached no listener, which says nothing of a native one's key events (IT-D12) | `docs/ARCHITECTURE-TARGET.md` section 10, row 5; the director's acceptance, 2026-10-26, did not use an input method (`0003`) | The director uses a native input method on the page on their Chromebook and the keys delivered are recorded |
| B5 | Old release folders accumulate in both buckets, since no deploy step deletes | `tools/deploy-steps.mjs`, `deploySteps`; section 10, row 10 | A bucket's size or listing becomes a cost |
| B17 | `tools/serve-site.mjs` passes each connection to its fixed port, byte for byte, to the gate's server, since `test-harness`'s `serveStatic` listens only on a port the system gives it | `tools/serve-site.mjs`; `0005` | A release of `test-harness` whose `serveStatic` takes a port |
| B7 | The guide's cold reading is owed: a newcomer, given the guide and this repository alone, builds a small application from the four parts | `docs/GUIDE.md`; section 10, row 14 | A reader with no part in the build is available to the programme, or a newcomer reports trying to build from the guide |
| B8 | Keyboards other than the two plans are not drawn | `src/keyboard-plans.ts`; IT-D2 | A person on another physical keyboard reports a key drawn wrong or missing |
| B9 | Caps Lock's and Num Lock's state is not shown: no shared part carries it | section 10, row 6; `input-capture`'s fit criteria, "composition and lock state" | A shared part carries lock state as facts |
| B10 | Browsers that are not Chromium-based are not covered; the page says so (IT-D12) | `src/composition-root.ts`, `isChromiumBrowser`; `test/browser/rows.test.js` | A person reports using the tester in a browser that is not Chromium-based |
| B11 | The Keyboard Map is asked once, at load: a keyboard's language switched while the page is open leaves the labels the page loaded with | `src/composition-root.ts`, `askKeyboardMap`; `src/key-labels.ts` | A person reports a label that did not follow a layout they switched to |
| B12 | Headless Chrome requests no favicon, so whether a headful browser asks for one beside the entry's empty icon is not measured; the browser rule refuses an image either way | `page/index.html`; `test/browser/containment.test.js` | The lab's smoke run, or the director's acceptance in a headful browser, sees a request for an icon |
| B13 | Chrome sends a captured pointer's boundary facts, `over`, `out` and `leave`, with `buttons` 1 while only button 1 is held, and with `buttons` 0 while only button 2 is, measured again with the held button named on every move; the buttons drawn do not follow boundary facts, and whether real hardware does the same is not measured | `docs/DECISIONS.md` 0002; `src/picture-state.ts`, `BUTTONS_REPORTED_BY` | A real mouse, on the director's acceptance, shows a boundary fact's `buttons` disagreeing with the press before it, or agreeing |
| B15 | In Chrome a pen's first press on the page is followed by a mouse `move` at the pen's position, which moves a live mouse drag's line there; the tester shows the mouse fact as delivered, and whether a real pen, or a finger on a touch screen, makes the browser send it is not measured | `docs/DECISIONS.md` 0002, review A's confirming pass; `test/picture-state.test.js`, the pen and touch test during a live drag | A person reports a drag's line jumping to where a pen or a finger touched |
| B16 | Matching the browser's own keys by `code` or by the letter a key prints (`0002` erratum 6) leaves a few shortcuts no entry names to the browser on Dvorak and Colemak -- Ctrl+P on `KeyR` opens printing, Colemak's Ctrl+L on `KeyU` takes focus to the address bar, Dvorak's Ctrl+G on `KeyU` finds the next match -- since Chromium takes a Latin letter's shortcut by its letter first; argued from Chromium's source (`xkb_keyboard_layout_engine.cc`), not measured on those layouts; the refinement is to match by the letter when `key` is a Latin letter and by `code` otherwise | review A's confirming pass, recorded in `0002`; `src/input-bindings.ts`, `BROWSERS_OWN_KEYS`; `docs/ARCHITECTURE-TARGET.md` section 10, row 15 | A person on Dvorak or Colemak reports a shortcut taken by the browser while the page is open |

---

## Parked

| id | finding | evidence | revival trigger |
|---|---|---|---|

---

## Retired

| id | finding | reason retired | revives on |
|---|---|---|---|
| B6 | The trusted-input driver is the fifth copy of one harness; each shared part keeps its own | The parts and the tester take one harness, `@apnex/test-harness` `0.1.0`, a development dependency, and `test/browser/chrome-driver.js` is gone (`0005`) | The browser tests need what `test-harness` lacks, and a copy of it is kept here again |
| B3 | A real touchpad's scroll and pinch, and a mouse wheel's page zoom with Ctrl, are proved only as Chrome delivers synthesized input; headless Chrome makes no page zoom for Ctrl and the wheel, claimed or not | The director's acceptance on their Chromebook, 2026-10-26, found the touchpad's scroll and pinch shown as delivered, the page neither scrolling nor zooming (`0003`) | The director's Chromebook acceptance pinches and turns a wheel with Ctrl held on the page in the lab |
| B4 | Immediacy on real hardware rests on an acceptance, not the gate: the gate measured every delivery within 3.5 ms in headless Chrome | The director's acceptance on their Chromebook, 2026-10-26, saw no lag in typing, chords or drags (`0003`) | The director watches fast typing, chords and a drag on their Chromebook and records whether any lag is seen |
| B14 | `tools/deploy` has never run against the buckets: it is the operator's, run with their own credentials, and the lab's measurement of the backends' headers (IT-D5), a missing object's 404 among them, is owed with it; the recorder reports, 2026-10-26, both buckets made -- `gs://input-lab-apnex-io` and `gs://input-apnex-io`, public read, main page `index.html` -- served at `input-lab.apnex.io` and `input.apnex.io` through backend buckets with their edge cache off, and both hosts answering with the rule, `Referrer-Policy` and `X-Content-Type-Options`, a 404 among them, which this build has not measured, having touched no cloud resource; its `gcloud` forms -- `storage objects describe --format=value(generation)`, `storage cp --if-generation-match`, 0 meaning no object, and the missing object's `not found: 404.` -- are taken from the Cloud SDK's documentation and messages and proved only against a stand-in | `tools/deploy` ran against both buckets, 2026-10-26: `v0.1.0` to the lab, then to the lab and production, each step passing -- 134 folder objects copied where none was, then skipped as present; the entry copied where none was, then replaced under the generation it read; every object's bytes, headers and content type, a missing object's 404 with the rule, the edge cache and the smoke run checked through each host -- and every file read back through both hosts byte-identical to the release (`0003`) | The first deploy of a release to the lab |

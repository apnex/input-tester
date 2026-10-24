# input-tester - Vision

**Status: ratified by the director as written, 2026-10-24 (ruling `H26-13`, in draw's `dev/DECISIONS.md`, where the programme that made this tester keeps its rulings); enduring.**\
This document states why input-tester exists and what it will never be.\
It carries no current state, no roadmap, and no schedule; where the tester is now belongs to its derived architecture, and what it does next to its board.

Holding this document authorises nothing.\
It approves no design, no release of any shared part, and no deploy.\
A change of direction is recorded as a decision first and absorbed here afterwards.

---

**North star.**\
Show a person, live and exactly, what their keyboard, mouse and touchpad send and what each gesture is taken to mean, using nothing but parts that any application can reuse.

Two words in it carry weight, and mean only this:
- **exactly** - what is shown is what the browser delivered and what the declared bindings decided, never smoothed, guessed, merged or invented; and what the browser cannot report is said to be unreported, never filled in;
- **parts that any application can reuse** - shared parts published on their own, for any application, with no knowledge of this one; the tester adds only what is its own, and holds no general capability a part should hold.

**Why it exists.**\
A person cannot see what their input devices actually send: which key code a key produces, which buttons a press carries, what a touchpad's scroll and pinch arrive as, and which of their movements a program takes to be a click, a drag or a chord.\
input-tester shows them, as it happens, on a picture of the keyboard and the mouse.

It exists for a second reason.\
Shared parts lifted out of one application are proven only by that application until another, unrelated one is built from them.\
input-tester is that other application: whatever it cannot do with the parts as published is a gap in the parts, fixed in the parts and never worked around here, and its own code is the worked example a newcomer reads to learn how the parts fit together.

**What it is.**\
A web page at `input.apnex.io`, wholly in the browser: a keyboard and a mouse drawn on a canvas, each key and button lit while held, every gesture named as it is recognised, and every rule it is matched against listed, the one that matched marked.

**What it is not.**
- Not a keylogger: nothing typed, pressed or moved leaves the page, nothing is stored, and nothing is counted or reported anywhere.
- Not a service: it has no accounts, no server logic, and no data of its own beyond the page itself.
- Not a remapper or configurator: it shows what input means, and never changes what a key or button does.
- Not a hardware diagnostic beyond the browser: what the operating system or the browser keeps from a page is out of its sight, and it says so rather than guessing.
- Not a typing trainer or a game.
- Not draw, and not part of it: it shares no code and no words with draw, and owes draw nothing.
- Not a home for capability the shared parts lack: a need any application would have is met by the part that owns it.

**What success means.**\
Each of these is judged on its own; none makes up for another.
- **Fidelity:** every key, button, scroll and gesture shown is one the browser delivered and the bindings decided, and nothing is shown that was not.
- **Immediacy:** each input shows while it happens, with no lag a person can see.
- **Coverage:** every input a person can make with a keyboard, a mouse or a touchpad shows, or is plainly marked as one the browser does not report.
- **Containment:** no keystroke or movement ever leaves the page.
- **Proof of reuse:** the tester is built from the shared parts as published, with no fork, no variant and no private copy; every workaround it ever needed is recorded, and none remains once its part is fixed.
- **Teachability:** a newcomer who reads the tester's code, and nothing of draw, can build their own application from the same parts.

**Authority.**\
Held by the director; drafted by anyone, ratified only by the director; amended, never quietly rewritten.

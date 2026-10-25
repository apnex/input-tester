/**
 * Opening and closing a capture, and the listeners (CONTRACT.md, IC3, IC4, IC6 and IC7).
 *
 * openCapture reads and judges the declaration first, calling no platform method; it then adds the
 * listeners in IC4's order -- the ten always added, then those `listen` names, in the table's order whatever
 * order it names them -- each through the addEventListener read as the capture opened, with two arguments,
 * the wheel's with a third, a fresh frozen { passive: false } made for that call. If an addEventListener
 * throws, it removes that very listener -- which the platform may have added before throwing -- and then the
 * listeners already added, in the reverse of the order added, attempting every removal, each with two
 * arguments, and throws the error the addEventListener threw; the capture is never open. close, on its first
 * call, closes the capture and then removes every listener in reverse, with two arguments, attempting every
 * removal, and throws the first error a removal threw; every later call does nothing.
 *
 * A listener of a capture not open reads nothing and calls nothing. A listener of an open capture makes
 * one fact from the event, synchronously, and delivers it with a fresh reply before it returns; capture
 * queues, merges, defers and synthesizes nothing, and keeps no state between events but whether it is
 * open. Every application function is called with no receiver, at most once for each event.
 */
import { judgeDeclaration } from "./declaration-reading.js";
import { readBlurFields, readConvertedPoint, readKeyFields, readPointerFields } from "./event-reading.js";
import { frozenPoint, makeBlurFact, makeKeyFact, makePointerFact } from "./fact.js";
import { makeReply } from "./reply.js";
/** IC4: the events that become pointer facts, in the order their listeners are added to the surface. */
const POINTER_EVENTS = [
    ["pointerleave", "leave"],
    ["pointerdown", "down"],
    ["pointermove", "move"],
    ["pointerup", "up"],
    ["pointercancel", "cancel"],
    ["pointerover", "over"],
    ["pointerout", "out"],
    ["dblclick", "double"],
];
/** IC4: the events that become key facts, in the order their listeners are added to the key source. */
const KEY_EVENTS = [
    ["keydown", "key-down"],
    ["keyup", "key-up"],
];
/**
 * IC4: the events listened for only when `listen` names them, in the order their listeners are added after the
 * ten above, whatever order `listen` names them: the name listed, the platform event, and where it is listened on.
 */
const LISTENED_EVENTS = [
    ["wheel", "wheel", "surface"],
    ["context-menu", "contextmenu", "surface"],
    ["blur", "blur", "keys"],
];
/** IC6: one pointer, double-click, context-menu or wheel event into one fact, delivered with its reply. */
function deliverPointerFact(judged, name, type, event) {
    const fields = readPointerFields(name, event, type === "wheel");
    const screen = frozenPoint(fields.clientX, fields.clientY);
    const converted = readConvertedPoint(Reflect.apply(judged.toDrawing, undefined, [screen]));
    const at = frozenPoint(converted.x, converted.y);
    let fact = makePointerFact(type, at, screen, null, fields);
    if (judged.hit !== null)
        fact = makePointerFact(type, at, screen, Reflect.apply(judged.hit, undefined, [fields.target, fact]), fields);
    const { reply, end } = makeReply(event, fields.preventDefault, judged.surface, fact.pointerId);
    try {
        Reflect.apply(judged.deliver, undefined, [fact, reply]);
    }
    finally {
        end();
    }
}
/** IC6: one key event into one fact, delivered with its reply. */
function deliverKeyFact(judged, name, type, event) {
    const fields = readKeyFields(name, event);
    let fact = makeKeyFact(type, null, fields);
    if (judged.focus !== null)
        fact = makeKeyFact(type, Reflect.apply(judged.focus, undefined, [fields.target, fact]), fields);
    const { reply, end } = makeReply(event, fields.preventDefault, judged.surface, null);
    try {
        Reflect.apply(judged.deliver, undefined, [fact, reply]);
    }
    finally {
        end();
    }
}
/** IC6: the key source's blur into one fact, delivered with its reply; neither hit nor focus is asked for it. */
function deliverBlurFact(judged, name, event) {
    const fields = readBlurFields(name, event);
    const fact = makeBlurFact(fields);
    const { reply, end } = makeReply(event, fields.preventDefault, judged.surface, null);
    try {
        Reflect.apply(judged.deliver, undefined, [fact, reply]);
    }
    finally {
        end();
    }
}
/** Calls a platform method with its object as receiver. */
const callPlatform = (method, on, args) => Reflect.apply(method, on, args);
/**
 * IC3: opens a capture on a surface, and optionally a key source, from the application's functions; or
 * refuses the declaration with every problem it has. Never throws while it judges the declaration; it
 * throws only the error an addEventListener threw, after taking back the listeners it added.
 */
export function openCapture(declaration) {
    const judged = judgeDeclaration(declaration);
    if (!judged.ok)
        return judged.refusal;
    let state = "opening";
    const added = [];
    const plan = [
        ...POINTER_EVENTS.map(([name, type]) => ({ on: judged.surface, name, nonPassive: false, handle: (event) => deliverPointerFact(judged, name, type, event) })),
        ...(judged.keys === null ? [] : KEY_EVENTS.map(([name, type]) => ({ on: judged.keys, name, nonPassive: false, handle: (event) => deliverKeyFact(judged, name, type, event) }))),
        ...LISTENED_EVENTS.filter(([listed]) => judged.listen.includes(listed)).map(([listed, name, where]) => ({
            // 'blur' is judged to require keys (IC3 step 9), so a listed blur always has its key source
            on: where === "surface" ? judged.surface : judged.keys,
            name,
            // the wheel's listener is added with { passive: false }, so a claim prevents its scroll (IC4)
            nonPassive: listed === "wheel",
            handle: listed === "blur" ? (event) => deliverBlurFact(judged, name, event) : (event) => deliverPointerFact(judged, name, listed, event),
        })),
    ];
    for (const { on, name, nonPassive, handle } of plan) {
        const listener = (event) => {
            // IC3 rule 1: a listener of a capture not open reads nothing and calls nothing
            if (state !== "open")
                return;
            handle(event);
        };
        Object.freeze(listener);
        try {
            // a fresh frozen options object made for this call alone, never shared with another call or capture
            callPlatform(on.addEventListener, on.object, nonPassive ? [name, listener, Object.freeze({ passive: false })] : [name, listener]);
        }
        catch (error) {
            state = "closed";
            // the listener whose adding threw first -- the platform may have added it before throwing -- then the rest in reverse
            const takeBack = [{ on: on.object, removeEventListener: on.removeEventListener, name, listener }, ...[...added].reverse()];
            for (const entry of takeBack) {
                try {
                    callPlatform(entry.removeEventListener, entry.on, [entry.name, entry.listener]);
                }
                catch {
                    // every removal is attempted; the error thrown is the addEventListener's
                }
            }
            throw error;
        }
        added.push({ on: on.object, removeEventListener: on.removeEventListener, name, listener });
    }
    state = "open";
    const close = () => {
        if (state === "closed")
            return undefined;
        state = "closed";
        let failed = false;
        let first;
        for (const entry of [...added].reverse()) {
            try {
                callPlatform(entry.removeEventListener, entry.on, [entry.name, entry.listener]);
            }
            catch (error) {
                if (!failed) {
                    failed = true;
                    first = error;
                }
            }
        }
        if (failed)
            throw first;
        return undefined;
    };
    Object.freeze(close);
    const capture = Object.freeze({ close });
    return Object.freeze({ ok: true, capture });
}
//# sourceMappingURL=open-capture.js.map
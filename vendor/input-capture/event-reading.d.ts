/**
 * Reading an event's fields, and the conversion's answer (CONTRACT.md, IC2 rules 3 and 4, and IC6).
 *
 * An event is judged by typeof alone, which runs no trap, and its prototype is never read. Its fields are
 * read once each through ordinary property access -- a browser's being inherited accessors -- in IC6's
 * order, each judged as it is read, the reading stopping at the first refused: clientX is judged before
 * clientY is read, since an event is not a point, and a wheel's deltaX before its deltaY. Every event's
 * timeStamp is read, as data the platform delivered: a value that is no finite number is kept as none, and
 * a getter that throws refuses the event, as every read does. A blur names no target, so none is read. The
 * conversion's answer is a point: its x and then its y are read, both before either is judged, so a point
 * with getters answers.
 *
 * A refusal is a TypeError whose message begins with the platform event's name and a colon, or with
 * "toDrawing: " for the conversion's answer; a value a getter or a trap threw is named after
 * "could not be read:" without running any of its code: a primitive as String writes it, an object as
 * "an object" and a function as "a function", nothing of either read beyond its typeof -- so no getter
 * and no trap of the thrown value runs after the point of refusal.
 */
import type { PlatformMethod } from "./declaration-reading.js";
/**
 * The fields of a pointer, double-click, context-menu or wheel event, as read: each but the judged ones exactly
 * as the event held it; the deltas, judged finite, and deltaMode read of a wheel event alone, and null for any
 * other.
 */
export interface PointerFields {
    readonly clientX: number;
    readonly clientY: number;
    readonly button: number | null | undefined;
    readonly buttons: unknown;
    readonly pointerId: unknown;
    readonly pointerType: unknown;
    readonly shiftKey: unknown;
    readonly ctrlKey: unknown;
    readonly altKey: unknown;
    readonly metaKey: unknown;
    readonly deltaX: number | null;
    readonly deltaY: number | null;
    readonly deltaZ: number | null;
    readonly deltaMode: unknown;
    readonly timeStamp: unknown;
    readonly target: unknown;
    readonly preventDefault: PlatformMethod;
}
/** The fields of a key event, as read. */
export interface KeyFields {
    readonly key: unknown;
    readonly code: unknown;
    readonly repeat: unknown;
    readonly shiftKey: unknown;
    readonly ctrlKey: unknown;
    readonly altKey: unknown;
    readonly metaKey: unknown;
    readonly timeStamp: unknown;
    readonly target: unknown;
    readonly preventDefault: PlatformMethod;
}
/** The fields of the key source's blur, as read: no target, which nothing would be handed. */
export interface BlurFields {
    readonly timeStamp: unknown;
    readonly preventDefault: PlatformMethod;
}
/**
 * The name of a value a getter or a trap threw, made from its typeof alone for an object or a function:
 * reading its message, its prototype or its string form could run its getters, its traps or its
 * toString, the application's code, after the event was refused.
 */
export declare function nameOfThrown(thrown: unknown): string;
/**
 * IC6 steps 1 and 2 for a pointer, double-click, context-menu or wheel event: clientX, clientY, button,
 * buttons, pointerId, pointerType, the modifiers, for a wheel event deltaX, deltaY, deltaZ and deltaMode, then
 * timeStamp, target and preventDefault, each read once and judged as it is read.
 */
export declare function readPointerFields(name: string, given: unknown, wheel: boolean): PointerFields;
/** IC6 steps 1 and 2 for a key event: key, code, repeat, the modifiers, timeStamp, target and preventDefault; no coordinate and no button. */
export declare function readKeyFields(name: string, given: unknown): KeyFields;
/** IC6 steps 1 and 2 for the key source's blur: timeStamp, then preventDefault; no target. */
export declare function readBlurFields(name: string, given: unknown): BlurFields;
/** IC2 rule 4 and IC6 step 3: the conversion's answer, judged by typeof, its x then its y read, both before either is judged. */
export declare function readConvertedPoint(answer: unknown): {
    readonly x: number;
    readonly y: number;
};

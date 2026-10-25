/**
 * The reply (CONTRACT.md, IC8): what the application may ask of one fact while it is delivered.
 *
 * A reply is a frozen { claim, takePointer }, fresh for each fact and live from its delivery's start until
 * deliver returns or throws, whether or not the capture closes meanwhile. Each method acts at once, so
 * what a delivery asked before it threw is done; once the reply is no longer live, each throws an Error
 * of the base constructor. A claim is spent before preventDefault is called, so a claim made again from
 * inside it does nothing; a takePointer made again while setPointerCapture runs throws.
 */
import type { PlatformMethod, PlatformSurface } from "./declaration-reading.js";
import type { CaptureReply } from "./types.js";
/** A reply, and the means to end its life when its delivery returns or throws. */
export interface LiveReply {
    readonly reply: CaptureReply;
    readonly end: () => void;
}
/**
 * The reply for one fact: claim calls the event's preventDefault, read with its fields, with the event
 * as receiver; takePointer calls the surface's setPointerCapture, read as the capture opened, with the
 * surface as receiver and the fact's pointerId.
 */
export declare function makeReply(event: object, preventDefault: PlatformMethod, surface: PlatformSurface, pointerId: number | null): LiveReply;

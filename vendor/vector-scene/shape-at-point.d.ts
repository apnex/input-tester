import type { PlatformMethod } from "./declaration-reading.js";
/**
 * VS12 steps 3 and 4: the record `recordOf` answers for the first element of the platform's hit stack at the
 * point that it answers any record for, or undefined when none does.
 */
export declare function firstHeldAtPoint<R>(fn: string, rootDocument: object, elementsFromPoint: PlatformMethod, point: {
    readonly x: number;
    readonly y: number;
}, recordOf: (element: object) => R | undefined): R | undefined;

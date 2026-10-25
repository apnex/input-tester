import type { PlatformRoot } from "./declaration-reading.js";
import type { ScenePoint } from "./types.js";
/** VS10 step 1 and VS2 rule 6: the point's x then y, both read before either is judged, or the function's TypeError. */
export declare function readPoint(fn: string, value: unknown): {
    readonly x: number;
    readonly y: number;
};
/** VS10 steps 3 to 6: the point converted through the root's screen transform, or its inverse for toDrawing. */
export declare function convertPoint(fn: string, platform: PlatformRoot, point: {
    readonly x: number;
    readonly y: number;
}, inverted: boolean): ScenePoint;

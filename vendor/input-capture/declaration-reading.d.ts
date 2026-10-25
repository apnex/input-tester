import type { ListenName, OpenCaptureResult } from "./types.js";
/** A platform method as read when the capture opens: the function, called with its object as receiver every time. */
export type PlatformMethod = (...args: unknown[]) => unknown;
/** An object capture reaches the platform through, with the methods read from it as the capture opened. */
export interface PlatformObject {
    readonly object: object;
    readonly addEventListener: PlatformMethod;
    readonly removeEventListener: PlatformMethod;
}
/** The surface, with its setPointerCapture read beside the other two. */
export interface PlatformSurface extends PlatformObject {
    readonly setPointerCapture: PlatformMethod;
}
/** An application function, called with no receiver (IC7). */
export type ApplicationFunction = (...args: unknown[]) => unknown;
/** A declaration with no problem: what a capture is opened from. */
export interface JudgedDeclaration {
    readonly ok: true;
    readonly surface: PlatformSurface;
    readonly keys: PlatformObject | null;
    readonly toDrawing: ApplicationFunction;
    readonly hit: ApplicationFunction | null;
    readonly focus: ApplicationFunction | null;
    readonly deliver: ApplicationFunction;
    /** The names `listen` held, in its order; empty when it is absent. */
    readonly listen: readonly ListenName[];
}
/** IC2 and IC3: every problem a declaration has, or what a capture is opened from. Never throws. */
export declare function judgeDeclaration(declaration: unknown): JudgedDeclaration | {
    readonly ok: false;
    readonly refusal: OpenCaptureResult;
};

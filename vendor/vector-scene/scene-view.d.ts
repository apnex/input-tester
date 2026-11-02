import type { SceneView, SceneVisible } from "./types.js";
/** The least and the greatest scale the scene writes (VS14). */
export declare const SCALE_LEAST: number;
export declare const SCALE_GREATEST: number;
/** The greatest magnitude of a transform member the scene writes (VS14). */
export declare const MEMBER_GREATEST: number;
/** The view a viewed scene opens at (VS14): a fresh frozen record each call, so each scene's opening view is its own. */
export declare function openingView(): SceneView;
/**
 * VS14 and VS2 rule 1: a view as setView reads one -- its prototype, its own keys, then each of x, y and scale
 * in that order, its descriptor read and judged before the next is read; or the function's TypeError.
 */
export declare function readView(fn: string, value: unknown): {
    readonly x: number;
    readonly y: number;
    readonly scale: number;
};
/** VS14: the transform's members, s, -s * x and -s * y, each computed once in binary64. */
export declare function transformMembers(view: {
    readonly x: number;
    readonly y: number;
    readonly scale: number;
}): {
    readonly s: number;
    readonly e: number;
    readonly f: number;
};
/**
 * VS14: why a view cannot be written, or null when it can -- a member of the view, or of its transform, not
 * finite, or the view outside the range the scene supports: scale from 2^-16 to 2^16, and each member of the
 * transform of magnitude at most 2^24.
 */
export declare function unwritable(view: {
    readonly x: number;
    readonly y: number;
    readonly scale: number;
}): string | null;
/** VS14: the transform attribute's value, `matrix(s, 0, 0, s, -s * x, -s * y)`, each member written by String. */
export declare function transformText(view: {
    readonly x: number;
    readonly y: number;
    readonly scale: number;
}): string;
/**
 * VS15: what visible() answers, `{ region: { kind: 'rect', x, y, w, h }, scale }` frozen to its depth, or Errors'
 * Error when a member is not finite, a far edge -- x + w or y + h, computed in binary64 -- is not finite, or
 * the scale is not above 0.
 */
export declare function visibleAnswer(fn: string, x: number, y: number, w: number, h: number, scale: number): SceneVisible;

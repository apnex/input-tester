/**
 * A session's declaration, checked (CONTRACT.md, IB9): every problem it has, each at its pointer, or the
 * threshold and the gestures a session is opened from.
 *
 * Read whole, value by value, in IB2's order: the declaration; its threshold; its gestures, each
 * gesture's name, engaged and button. Each value is judged at its own pointer before anything beneath it
 * is read (src/reflection.ts), so a gestures descriptor whose trap rewrites the threshold finds it read.
 */
import { ProblemList } from "./declaration-problems.js";
import type { GestureDeclaration } from "./types.js";
/** A declaration with no problem: the threshold and the gestures, each number written with -0 as 0. */
export interface CheckedSessionDeclaration {
    readonly ok: true;
    readonly threshold: number;
    readonly gestures: readonly GestureDeclaration[];
}
/** IB9: every problem a session's declaration has, or what a session is opened from. */
export declare function checkSessionDeclaration(declaration: unknown): CheckedSessionDeclaration | {
    readonly ok: false;
    readonly problems: ProblemList;
};

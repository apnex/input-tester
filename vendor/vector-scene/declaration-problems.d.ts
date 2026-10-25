/**
 * The problem records of a refused declaration (CONTRACT.md, VS3): RFC 6901 pointers, and one order.
 */
import type { DeclarationProblemCode, OpenSceneResult } from "./types.js";
/** A pointer to a member of the value a pointer names: "~" written "~0" and "/" written "~1". */
export declare function childPointer(parent: string, name: string | number): string;
/** Collects problems, then orders them by pointer and then by problem, by UTF-16 code unit, with no record twice. */
export declare class ProblemList {
    #private;
    add(pointer: string, problem: DeclarationProblemCode): void;
    get size(): number;
    /** The refusal: a fresh, frozen `{ ok: false, problems }`, the list ordered, each record fresh and frozen. */
    refusal(): OpenSceneResult;
}
/** The refusal of a declaration that is not a plain object, or whose reflection threw: `not-an-object` at "", and nothing else. */
export declare function notAnObject(): OpenSceneResult;

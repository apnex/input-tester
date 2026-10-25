/**
 * The problem records of a refused declaration (CONTRACT.md, IB3 and IB9): RFC 6901 pointers, and one order.
 */
import type { DeclarationProblemCode, RefusedDeclaration } from "./types.js";
/** A pointer to a member of the value a pointer names: "~" written "~0" and "/" written "~1". */
export declare function childPointer(parent: string, name: string | number): string;
/** Collects problems, then orders them by pointer and then by problem, by UTF-16 code unit, with no record twice. */
export declare class ProblemList {
    #private;
    add(pointer: string, problem: DeclarationProblemCode): void;
    get size(): number;
    /** True when a problem lies at the pointer or beneath it. */
    hasAtOrBeneath(pointer: string): boolean;
    /** The refusal: a fresh, frozen `{ ok: false, problems }`, the list ordered, each record fresh and frozen. */
    refusal(): RefusedDeclaration;
}

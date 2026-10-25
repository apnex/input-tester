/**
 * The problem records of a refused declaration (CONTRACT.md, SG1): RFC 6901 pointers, and one order.
 */
import { type OwnProperty } from "./plain-data.js";
import type { DeclarationProblemCode, OpenGridResult } from "./types.js";
/** A pointer to a member of the value a pointer names: "~" written "~0" and "/" written "~1". */
export declare function childPointer(parent: string, name: string): string;
/** Collects problems, then orders them by pointer and then by problem, by UTF-16 code unit, with no record twice. */
export declare class ProblemList {
    #private;
    add(pointer: string, problem: DeclarationProblemCode): void;
    get size(): number;
    /** True when a problem lies at the pointer or beneath it. */
    hasAtOrBeneath(pointer: string): boolean;
    /** The refusal: a fresh, frozen, ordered list of fresh records. */
    refusal(): OpenGridResult<never>;
}
/** The value of an own property when it is a data property; undefined for an accessor or an absent one. */
export declare const dataValue: (p: OwnProperty | undefined) => unknown;
/** Steps 1 to 3: the shape a declaration names, when it is a plain object naming one the call knows. */
export declare function checkShapeName(declaration: unknown, knows: (name: string) => boolean): {
    readonly name: string;
    readonly root: Map<string, OwnProperty>;
} | {
    readonly problems: ProblemList;
};

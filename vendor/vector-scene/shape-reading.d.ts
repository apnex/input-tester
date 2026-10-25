import type { DescribedShape } from "./types.js";
/** The deepest a shape may nest, an item's own shapes at depth 1 (VS5). */
export declare const DEEPEST = 32;
/** One shape as the scene keeps it: its tag, its attributes in order, its text, its child shapes, and its frozen description. */
export interface Spec {
    readonly tag: string;
    readonly attrs: readonly (readonly [string, string])[];
    readonly attrMap: ReadonlyMap<string, string>;
    readonly text: string;
    readonly kids: readonly Spec[];
    readonly described: DescribedShape;
}
/** What reading an attribute record answers: its attributes in order, or why it was refused. */
export type AttributeReading = {
    readonly ok: true;
    readonly entries: readonly (readonly [string, string])[];
} | {
    readonly ok: false;
    readonly kind: "not-an-object" | "invalid-value";
    readonly why: string;
    readonly threw: boolean;
    readonly thrown?: unknown;
};
/** True when a name is an attribute name VS5 admits. */
export declare const isAttributeName: (name: string) => boolean;
/** VS2 rule 5: an attribute record, read and judged; never throws. */
export declare function readAttributeRecord(value: unknown): AttributeReading;
/** A frozen plain object of the attributes, in their order; defined, never assigned, so a name such as __proto__ is an own property like any other. */
export declare function frozenAttributes(entries: readonly (readonly [string, string])[]): {
    readonly [name: string]: string;
};
/** VS5 and VS2 rule 3: an item's shapes, an array of at least one shape, each read whole before the next, or the function's TypeError. */
export declare function readShapes(fn: string, value: unknown): readonly Spec[];

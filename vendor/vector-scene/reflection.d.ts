/**
 * Judging a value at its own pointer, as input-binding's IB2 reads one and VS2 rule 1 adopts it
 * (CONTRACT.md, VS2).
 *
 * Every reflection is guarded: a value whose reflection throws -- a revoked or trapping Proxy, a throwing
 * trap -- is of no form, never an exception. A value is judged by the reflections that decide its own
 * form, in a fixed order, and the reading stops at the first that refuses it, so nothing beneath a value
 * refused at its pointer is read. No getter is ever called here: properties are read by descriptor.
 *
 * A key Reflect.ownKeys lists is judged by what IB2's order reads of it. Where the order reads its
 * descriptor -- a property a form names, an array's index -- a descriptor that reads undefined, which only
 * a Proxy can give, makes the key absent. Where the order reads no descriptor -- a property a form does not
 * name, a key of an array that is no index -- the key is known by its key alone (rule 8).
 *
 * A plain object is a value whose prototype is Object.prototype or null. An array is a value for which
 * Array.isArray is true and whose prototype is Array.prototype, dense -- every index from 0 to
 * length - 1 an own data property -- and holding no own string-named property but those indices and
 * length. A symbol-named property is ignored everywhere.
 */
/** One own property, read through its descriptor: its value when it is a data property, none for an accessor. */
export type OwnProperty = {
    readonly data: true;
    readonly value: unknown;
} | {
    readonly data: false;
};
/** Why a value was refused at its own pointer: it is of another kind, or a reflection of it threw. */
export type Refusal = {
    readonly refused: "kind";
} | {
    readonly refused: "thrown";
    readonly error: unknown;
};
/** A plain object judged at its own pointer: the properties its form names that it holds, and the keys it holds that its form does not name. */
export interface JudgedRecord {
    readonly refused: false;
    readonly properties: ReadonlyMap<string, OwnProperty>;
    readonly unknown: readonly string[];
}
/** An array judged at its own pointer: its elements, read from their descriptors. */
export interface JudgedArray {
    readonly refused: false;
    readonly elements: readonly unknown[];
}
/** The value a data property holds, or undefined for an accessor or an absent property. */
export declare const dataValue: (property: OwnProperty | undefined) => unknown;
/**
 * Judges a plain object at its own pointer: its prototype, then its own keys, then the descriptor of each
 * property `named` lists that its own keys hold, in the order `named` gives. A key it holds that `named`
 * does not list is known by its key alone. Stops at the first reflection that refuses it.
 */
export declare function judgeRecord(value: unknown, named: readonly string[]): JudgedRecord | Refusal;
/**
 * Judges an array at its own pointer: Array.isArray first, then its prototype, its own keys, the
 * descriptor of its length and then of each index in order. Stops at the first reflection that refuses
 * it: an own string-named key that is neither length nor an index below it, a missing index, an accessor
 * element, or a reflection that throws.
 */
export declare function judgeArray(value: unknown): JudgedArray | Refusal;

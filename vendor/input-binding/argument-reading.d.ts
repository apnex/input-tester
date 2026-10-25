/** A TypeError whose message begins with the function's name. */
export declare function malformed(fn: string, what: string): TypeError;
/** The TypeError for a value whose reading threw: a getter's or a trap's error, rethrown as the function's own. */
export declare function unreadable(fn: string, label: string, error: unknown): TypeError;
/** IB2 rule 5: a non-null value whose typeof is 'object', so a function is not one; nothing of it is read. */
export declare function requireObjectValue(fn: string, value: unknown, label: string): object;
/** IB2 rule 1: a plain object, its prototype Object.prototype or null, the prototype read once. */
export declare function requirePlainObject(fn: string, value: unknown, label: string): object;
/** The own string-named keys of a value, in their own order; symbol-named keys are ignored. */
export declare function readOwnStringKeys(fn: string, value: object, label: string): string[];
/** One own property read by its descriptor: absent, or present with its value; an accessor is present and of no form, so malformed. */
export type OwnData = {
    readonly present: false;
} | {
    readonly present: true;
    readonly value: unknown;
};
/** Reads an own property by its descriptor, never calling a getter; an accessor is malformed, an inherited property absent. */
export declare function readOwnData(fn: string, value: object, key: string, label: string): OwnData;
/** IB2 rule 5: a point's x then y, read once each through ordinary property access, both read before either is checked; each must be a finite number. */
export declare function readPoint(fn: string, value: unknown, label: string): {
    readonly x: number;
    readonly y: number;
};
/** An array argument, read as rule 8 reads one: Array.isArray, its prototype, its own keys, its length's descriptor and its elements' in index order. */
export declare function readArrayArgument(fn: string, value: unknown, label: string): readonly unknown[];
/**
 * A guard state (IB5): a plain object whose own string-named properties each name a state the table's
 * guards declare and hold a boolean as a data property. Read as IB2's table says: its prototype, its own
 * keys, then each key's descriptor in the order the keys gave, each judged as it is read. A key whose
 * descriptor reads undefined -- which only a Proxy can give -- is absent, so it names no state, declared
 * or not; a key that is present must name a declared state and hold a boolean. Answers the states it
 * holds; a state it omits is false.
 */
export declare function readGuardState(fn: string, value: unknown, declaredStates: ReadonlySet<string>, label: string): ReadonlyMap<string, boolean>;

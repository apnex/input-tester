/**
 * The name of a value a getter or a trap threw, made from its typeof alone for an object or a function:
 * reading its message, its prototype or its string form could run its getters, its traps or its
 * toString, the application's code, after the argument was refused.
 */
export declare function nameOfThrown(thrown: unknown): string;
/** A TypeError whose message begins with the function's name and a colon. */
export declare function malformed(fn: string, what: string): TypeError;
/** The TypeError for a value whose reading threw. */
export declare function unreadable(fn: string, label: string, thrown: unknown): TypeError;
/** VS2 rule 6 and IC2 rule 5: an object is a non-null value whose typeof is 'object', so a function never is one. */
export declare const isObject: (value: unknown) => value is object;
/** A function is a value whose typeof is 'function'. */
export declare const isFunction: (value: unknown) => value is (...args: never[]) => unknown;
/**
 * A plain object holding only the properties `named` lists, read by descriptor: its prototype, then its own
 * keys -- a string-named key `named` does not list refusing it there -- then the descriptor of each named
 * property its own keys hold, in `named`'s order, an accessor or a value present as undefined refusing it,
 * and a key whose descriptor reads undefined absent. Answers the values present, by name.
 */
export declare function readRecordArgument(fn: string, value: unknown, named: readonly string[], label: string): ReadonlyMap<string, unknown>;
/** An array argument, read as VS2 rule 1 reads one: Array.isArray, its prototype, its own keys, its length's descriptor and its elements' in index order. */
export declare function readArrayArgument(fn: string, value: unknown, label: string): readonly unknown[];

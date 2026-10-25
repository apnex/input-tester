/**
 * Reading plain objects without running a caller's code, and freezing what snap-grid returns
 * (CONTRACT.md, "Errors" and "What is returned").
 *
 * A plain object is a value whose prototype is Object.prototype or null (SG1).
 * Its properties are read through their descriptors, so a getter is never called; a property that is
 * an accessor holds no value. An object a Proxy makes unreadable -- a trap that throws -- is not a
 * plain object.
 */
/** One own property of a plain object: its value when it is a data property, or none for an accessor. */
export type OwnProperty = {
    readonly data: true;
    readonly value: unknown;
} | {
    readonly data: false;
};
/** True when the value is an object whose prototype is Object.prototype or null. */
export declare function isPlainObject(value: unknown): value is object;
/**
 * The own string-named properties of a plain object, in their own order, each read through its
 * descriptor; null when the value is not a plain object or cannot be read.
 * Symbol-named properties are left out: no pointer can name one.
 */
export declare function ownStringProperties(value: unknown): Map<string, OwnProperty> | null;
/**
 * The values of a plain object holding exactly the named properties, every one a data property, and no
 * other own property, string- or symbol-named; `optional` names those that may be absent.
 * Returns null when the value is not of that form.
 */
export declare function exactRecord(value: unknown, required: readonly string[], optional?: readonly string[]): Map<string, unknown> | null;
/** Freezes a value snap-grid made, and every object and function reachable from it. */
export declare function deepFreeze<T>(value: T): T;

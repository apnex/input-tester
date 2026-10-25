/**
 * Bringing the platform to a description (CONTRACT.md, VS7), and which item an element belongs to (VS9).
 *
 * Each put and removal makes exactly these platform calls, in this order, and reads nothing of the platform:
 * a shape's element is made by createElementNS with its tag, each attribute set in order, its text written
 * when it has text, each child made the same way, depth first, and appended, and only then is it inserted
 * where it goes. An item put again is brought from its old shapes to its new list by list -- its own shapes,
 * and the children of every element kept -- position by position: where both lists hold a shape of the same
 * tag the element is kept and patched; where the new list holds a shape and the old none, or one of another
 * tag, a new element is made and inserted before the old element at that position or, past the old list's
 * end, appended to its parent; then the old element there, if any, is removed; and the old elements past
 * the new list's end are removed, in order.
 *
 * An element is patched by setting each new attribute whose value differs or which the old lacked, in the
 * new order, and removing each old attribute the new lacks, in the old order; then its content, by the four
 * cases VS7 step 4 names. Every element made is answered by an element record, held in a WeakMap by the
 * element's identity alone, so which item an element belongs to is answered without reading the element.
 *
 * Each of VS1's methods of an element is read as it is called, and judged: an element the root's document
 * made that holds no function by that name, or that refuses its text, is a platform failure, the scene's own
 * Error beginning with the function's name, as an answer of createElementNS that is no object is -- never
 * the engine's TypeError, which would read as a malformed argument.
 */
import type { Spec } from "./shape-reading.js";
import type { PlatformMethod } from "./declaration-reading.js";
import type { DescribedShape, SceneElement } from "./types.js";
/** The SVG namespace, in which the scene makes every element. */
export declare const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
/** An item: the shapes held under one key in one scene layer, and, with a root, its elements. */
export interface ItemRecord {
    readonly layer: string;
    readonly key: string;
    specs: readonly Spec[];
    shapes: readonly DescribedShape[];
    elements: ElementRecord[];
}
/** One element the scene made for a shape of an item: its parent's record, its index among its siblings, and its own children's records. */
export interface ElementRecord {
    readonly element: SceneElement;
    readonly parent: ElementRecord | null;
    readonly index: number;
    readonly holder: ItemRecord;
    kids: ElementRecord[];
}
/** Where a new element at a position past the old list's end goes: before an element, or appended to its parent. */
type Append = (element: SceneElement) => void;
/** VS1's calls on an element the root's document made, each method read as it is called and judged before it is called. */
export interface ElementCalls {
    setAttribute(element: SceneElement, name: string, value: string): void;
    removeAttribute(element: SceneElement, name: string): void;
    appendChild(element: SceneElement, child: SceneElement): void;
    insertBefore(element: SceneElement, child: SceneElement, before: SceneElement | null): void;
    remove(element: SceneElement): void;
    writeText(element: SceneElement, text: string): void;
}
/** VS1's calls on elements, a failure named for the function `fn` answers: an element holding no such function, or refusing its text, throws Error. */
export declare function elementCalls(fn: () => string): ElementCalls;
/** Makes and patches elements for one scene, through the root's document's createElementNS read as the scene opened. */
export interface ElementWriter {
    /** Makes a shape's element and its children's, depth first, registering each; does not insert it. */
    make(spec: Spec, parent: ElementRecord | null, index: number, holder: ItemRecord): ElementRecord;
    /** Brings a list of elements from old shapes to new, position by position; answers the new list's records. */
    reconcile(records: readonly ElementRecord[], olds: readonly Spec[], news: readonly Spec[], parent: ElementRecord | null, holder: ItemRecord, container: SceneElement, append: Append): ElementRecord[];
    /** Removes an element and forgets it and every element beneath it. */
    removeElement(record: ElementRecord): void;
    /** The record of an element the scene made and still holds, by identity alone. */
    recordOf(value: object): ElementRecord | undefined;
}
/** VS7 and VS9: the element writer of one scene. `fn` names the function whose writing a refusal reports. */
export declare function elementWriter(rootDocument: object, createElementNS: PlatformMethod, fn: () => string): ElementWriter;
export {};

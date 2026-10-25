import type { InViewOptions } from "./types.js";
/** A TypeError whose message begins with the function's name. */
export declare function malformed(fn: string, what: string): TypeError;
/** The x and y of a point, read once each, or a TypeError. */
export declare function readPoint(fn: string, point: unknown, label?: string): {
    readonly x: number;
    readonly y: number;
};
/** The elements of an array, read once each, or a TypeError. */
export declare function readArray(fn: string, value: unknown, label: string): unknown[];
/** A rect: exactly kind 'rect', x, y, w and h, each a number, w and h each at least 0, so neither NaN; infinities are well formed. */
export declare function readRect(fn: string, rect: unknown, label?: string): {
    readonly x: number;
    readonly y: number;
    readonly w: number;
    readonly h: number;
};
/** A view: exactly region and scale, the region a rect with finite x, y, w, h, x + w and y + h, the scale finite and above 0. */
export declare function readView(fn: string, view: unknown): {
    readonly x: number;
    readonly y: number;
    readonly w: number;
    readonly h: number;
    readonly scale: number;
};
/** inView's options, with their defaults: minSpacing 0, max 10000. */
export declare function readInViewOptions(fn: string, options: unknown): Required<InViewOptions>;

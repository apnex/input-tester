import type { GridShape, GridShapeCase, GridShapeFailure } from "./types.js";
export type { GridShapeCase, GridShapeFailure, GridShapeInvariant } from "./types.js";
/** Judges a shape over cases, returning a frozen array of failures, empty when none. */
export declare function checkGridShape(shape: GridShape, cases: readonly GridShapeCase[]): readonly GridShapeFailure[];

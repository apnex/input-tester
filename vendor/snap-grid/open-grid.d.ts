import type { OpenGridOptions, OpenGridResult } from "./types.js";
/** Opens a declaration into a grid, or refuses it with every problem it has. */
export declare function openGrid(declaration: unknown, options?: OpenGridOptions): OpenGridResult;

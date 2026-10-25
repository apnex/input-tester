/**
 * A square declaration, checked in the order CONTRACT.md's SG1 fixes, and copied when it is valid.
 *
 * A check that fails at a pointer suppresses every check beneath that pointer and none at a sibling's;
 * step 7 runs only when steps 1 to 6 found no problem anywhere.
 */
import { ProblemList } from "./declaration-problems.js";
export declare const DOMAIN_LIMIT: number;
/** A planar coordinate pair as a square declaration writes it. */
export interface DeclaredPoint {
    readonly x: number;
    readonly y: number;
}
/** A valid square declaration, -0 written 0. */
export interface SquareDeclaration {
    readonly shape: "square";
    readonly pitch: number;
    readonly origin: DeclaredPoint;
    readonly bounds?: {
        readonly min: DeclaredPoint;
        readonly max: DeclaredPoint;
    };
}
/** A square declaration copied, -0 written 0, or its problems. */
export declare function checkSquareDeclaration(declaration: unknown): {
    readonly declaration: SquareDeclaration;
} | {
    readonly problems: ProblemList;
};

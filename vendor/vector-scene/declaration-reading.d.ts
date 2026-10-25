import type { OpenSceneResult } from "./types.js";
/** A platform method as read when the scene opens: the function, called with its object as receiver every time. */
export type PlatformMethod = (...args: unknown[]) => unknown;
/** The root and what the scene read of it as it opened (VS1); elementsFromPoint is null when the document held no function by that name. */
export interface PlatformRoot {
    readonly root: object;
    readonly rootDocument: object;
    readonly createElementNS: PlatformMethod;
    readonly elementsFromPoint: PlatformMethod | null;
    readonly appendChild: PlatformMethod;
    readonly getScreenCTM: PlatformMethod;
}
/** One layer as judged: its name, its attributes in order, and whether it is foreign. */
export interface JudgedLayer {
    readonly name: string;
    readonly attrs: readonly (readonly [string, string])[];
    readonly foreign: boolean;
}
/** A declaration with no problem: what a scene is opened from. */
export interface JudgedDeclaration {
    readonly ok: true;
    readonly platform: PlatformRoot | null;
    readonly layers: readonly JudgedLayer[];
}
/** VS2 rule 2 and VS3: every problem a declaration has, or what a scene is opened from. Never throws. */
export declare function judgeDeclaration(declaration: unknown): JudgedDeclaration | {
    readonly ok: false;
    readonly refusal: OpenSceneResult;
};

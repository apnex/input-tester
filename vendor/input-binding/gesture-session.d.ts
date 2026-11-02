import type { GestureSessionDeclaration, OpenGestureSessionResult } from "./types.js";
/**
 * IB9: opens a session from a threshold and the gestures an application declares, or refuses the
 * declaration with every problem it has, each naming where it lies. Never throws, for any argument.
 */
export declare function openGestureSession(declaration: GestureSessionDeclaration): OpenGestureSessionResult;

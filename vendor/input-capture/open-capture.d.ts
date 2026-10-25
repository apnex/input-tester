import type { CaptureDeclaration, ListenName, OpenCaptureResult } from "./types.js";
/**
 * IC3: opens a capture on a surface, and optionally a key source, from the application's functions; or
 * refuses the declaration with every problem it has. Never throws while it judges the declaration; it
 * throws only the error an addEventListener threw, after taking back the listeners it added.
 */
export declare function openCapture<Hit = null, Focus = null, Listen extends ListenName = never>(declaration: CaptureDeclaration<Hit, Focus, Listen>): OpenCaptureResult;

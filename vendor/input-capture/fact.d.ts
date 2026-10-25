/**
 * The fact (CONTRACT.md, IC5): a frozen record of exactly twenty-one properties, in one order, each null where
 * its family carries none.
 *
 * at and screen hold exactly the numbers read, -0 kept, and every other number is the event's own: capture
 * computes no number. A wheel's deltas are carried as delivered, -0 kept, and its deltaMode only when it names
 * a unit, 0, 1 or 2, written v + 0 so -0 gives 0. time is the event's own timeStamp when a finite number: a
 * fact holds no clock reading, no event, no target and no function.
 */
import type { BlurFields, KeyFields, PointerFields } from "./event-reading.js";
import type { BlurFact, CapturePoint, ContextMenuFact, KeyFact, KeyFactType, PointerFact, PointerFactType, WheelFact } from "./types.js";
/** The type of a fact made from a pointer-family event: the eight always listened for, and the two `listen` adds. */
export type PointerFamilyType = PointerFactType | "wheel" | "context-menu";
/** A point: a fresh frozen record of the two numbers given, exactly. */
export declare const frozenPoint: (x: number, y: number) => CapturePoint;
/** A pointer fact -- a wheel's and a context menu's among them: the event's fields, the converted point and the screen point, and the hit answer given. */
export declare function makePointerFact<Hit>(type: PointerFamilyType, at: CapturePoint, screen: CapturePoint, hit: Hit, fields: PointerFields): PointerFact<Hit> | WheelFact<Hit> | ContextMenuFact<Hit>;
/** A key fact: the event's fields and the focus answer given. */
export declare function makeKeyFact<Focus>(type: KeyFactType, focus: Focus, fields: KeyFields): KeyFact<Focus>;
/** A blur fact: its time, every modifier false, and every other property null. */
export declare function makeBlurFact(fields: BlurFields): BlurFact;

/**
 * The name of a value a getter or a trap threw, made from its typeof alone for an object or a function:
 * reading its message, its prototype or its string form could run its getters, its traps or its
 * toString, the application's code, after the event was refused.
 */
export function nameOfThrown(thrown) {
    if (typeof thrown === "object" && thrown !== null)
        return "an object";
    if (typeof thrown === "function")
        return "a function";
    return String(thrown);
}
/** IC2 rule 5: an object is a non-null value whose typeof is 'object', so a function never is one. */
const isObject = (value) => typeof value === "object" && value !== null;
const isFiniteNumber = (value) => typeof value === "number" && Number.isFinite(value);
/** IC6 step 1: the event, judged by typeof alone. */
function requireEvent(name, event) {
    if (!isObject(event))
        throw new TypeError(`${name}: the event must be an object, not a function or a primitive`);
    return event;
}
/** One field of the event, read once through ordinary property access; a getter's or a trap's error rethrown as the listener's TypeError. */
function readField(name, event, field) {
    try {
        return event[field];
    }
    catch (error) {
        throw new TypeError(`${name}: the event's ${field} could not be read: ${nameOfThrown(error)}`);
    }
}
/** The event's preventDefault, read last and refused unless it is a function. */
function readPreventDefault(name, event) {
    const preventDefault = readField(name, event, "preventDefault");
    if (typeof preventDefault !== "function")
        throw new TypeError(`${name}: the event's preventDefault must be a function`);
    return preventDefault;
}
/** One delta of a wheel event, read once and refused unless a finite number. */
function readDelta(name, event, field) {
    const delta = readField(name, event, field);
    if (!isFiniteNumber(delta))
        throw new TypeError(`${name}: the event's ${field} must be a finite number`);
    return delta;
}
/**
 * IC6 steps 1 and 2 for a pointer, double-click, context-menu or wheel event: clientX, clientY, button,
 * buttons, pointerId, pointerType, the modifiers, for a wheel event deltaX, deltaY, deltaZ and deltaMode, then
 * timeStamp, target and preventDefault, each read once and judged as it is read.
 */
export function readPointerFields(name, given, wheel) {
    const event = requireEvent(name, given);
    const clientX = readField(name, event, "clientX");
    if (!isFiniteNumber(clientX))
        throw new TypeError(`${name}: the event's clientX must be a finite number`);
    const clientY = readField(name, event, "clientY");
    if (!isFiniteNumber(clientY))
        throw new TypeError(`${name}: the event's clientY must be a finite number`);
    const button = readField(name, event, "button");
    if (button !== undefined && button !== null && !(typeof button === "number" && Number.isSafeInteger(button)))
        throw new TypeError(`${name}: the event's button must be undefined, null or a safe integer`);
    const buttons = readField(name, event, "buttons");
    const pointerId = readField(name, event, "pointerId");
    const pointerType = readField(name, event, "pointerType");
    const shiftKey = readField(name, event, "shiftKey");
    const ctrlKey = readField(name, event, "ctrlKey");
    const altKey = readField(name, event, "altKey");
    const metaKey = readField(name, event, "metaKey");
    let deltaX = null;
    let deltaY = null;
    let deltaZ = null;
    let deltaMode = null;
    if (wheel) {
        deltaX = readDelta(name, event, "deltaX");
        deltaY = readDelta(name, event, "deltaY");
        deltaZ = readDelta(name, event, "deltaZ");
        // never refusing: a value that is no unit is kept as none (IC5)
        deltaMode = readField(name, event, "deltaMode");
    }
    const timeStamp = readField(name, event, "timeStamp");
    const target = readField(name, event, "target");
    const preventDefault = readPreventDefault(name, event);
    return { clientX, clientY, button: button, buttons, pointerId, pointerType, shiftKey, ctrlKey, altKey, metaKey, deltaX, deltaY, deltaZ, deltaMode, timeStamp, target, preventDefault };
}
/** IC6 steps 1 and 2 for a key event: key, code, repeat, the modifiers, timeStamp, target and preventDefault; no coordinate and no button. */
export function readKeyFields(name, given) {
    const event = requireEvent(name, given);
    const key = readField(name, event, "key");
    const code = readField(name, event, "code");
    const repeat = readField(name, event, "repeat");
    const shiftKey = readField(name, event, "shiftKey");
    const ctrlKey = readField(name, event, "ctrlKey");
    const altKey = readField(name, event, "altKey");
    const metaKey = readField(name, event, "metaKey");
    const timeStamp = readField(name, event, "timeStamp");
    const target = readField(name, event, "target");
    const preventDefault = readPreventDefault(name, event);
    return { key, code, repeat, shiftKey, ctrlKey, altKey, metaKey, timeStamp, target, preventDefault };
}
/** IC6 steps 1 and 2 for the key source's blur: timeStamp, then preventDefault; no target. */
export function readBlurFields(name, given) {
    const event = requireEvent(name, given);
    const timeStamp = readField(name, event, "timeStamp");
    const preventDefault = readPreventDefault(name, event);
    return { timeStamp, preventDefault };
}
/** IC2 rule 4 and IC6 step 3: the conversion's answer, judged by typeof, its x then its y read, both before either is judged. */
export function readConvertedPoint(answer) {
    if (!isObject(answer))
        throw new TypeError("toDrawing: the answer must be an object, not a function or a primitive");
    let x, y;
    try {
        x = answer["x"];
        y = answer["y"];
    }
    catch (error) {
        throw new TypeError(`toDrawing: the answer could not be read: ${nameOfThrown(error)}`);
    }
    if (!isFiniteNumber(x) || !isFiniteNumber(y))
        throw new TypeError("toDrawing: the answer must hold finite numbers x and y");
    return { x, y };
}
//# sourceMappingURL=event-reading.js.map
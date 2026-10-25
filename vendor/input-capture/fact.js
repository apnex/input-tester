const safeIntegerOrNull = (value) => (typeof value === "number" && Number.isSafeInteger(value) ? value : null);
const stringOrNull = (value) => (typeof value === "string" ? value : null);
/** IC5's time: the event's timeStamp when a finite number, exactly, else null. */
const timeOf = (value) => (typeof value === "number" && Number.isFinite(value) ? value : null);
/** IC5's deltaMode: 0, 1 or 2 when the event's value is one, written v + 0 so -0 gives 0, else null. */
const unitOf = (value) => (value === 0 || value === 1 || value === 2 ? (value + 0) : null);
/** A point: a fresh frozen record of the two numbers given, exactly. */
export const frozenPoint = (x, y) => Object.freeze({ x, y });
/** A pointer fact -- a wheel's and a context menu's among them: the event's fields, the converted point and the screen point, and the hit answer given. */
export function makePointerFact(type, at, screen, hit, fields) {
    const fact = {
        type,
        at,
        screen,
        hit,
        focus: null,
        button: fields.button ?? 0,
        buttons: safeIntegerOrNull(fields.buttons),
        pointerId: safeIntegerOrNull(fields.pointerId),
        pointerType: stringOrNull(fields.pointerType),
        key: null,
        code: null,
        repeat: null,
        shiftKey: !!fields.shiftKey,
        ctrlKey: !!fields.ctrlKey,
        altKey: !!fields.altKey,
        metaKey: !!fields.metaKey,
        deltaX: fields.deltaX,
        deltaY: fields.deltaY,
        deltaZ: fields.deltaZ,
        deltaMode: unitOf(fields.deltaMode),
        time: timeOf(fields.timeStamp),
    };
    return Object.freeze(fact);
}
/** A key fact: the event's fields and the focus answer given. */
export function makeKeyFact(type, focus, fields) {
    return Object.freeze({
        type,
        at: null,
        screen: null,
        hit: null,
        focus,
        button: null,
        buttons: null,
        pointerId: null,
        pointerType: null,
        key: stringOrNull(fields.key),
        code: stringOrNull(fields.code),
        repeat: !!fields.repeat,
        shiftKey: !!fields.shiftKey,
        ctrlKey: !!fields.ctrlKey,
        altKey: !!fields.altKey,
        metaKey: !!fields.metaKey,
        deltaX: null,
        deltaY: null,
        deltaZ: null,
        deltaMode: null,
        time: timeOf(fields.timeStamp),
    });
}
/** A blur fact: its time, every modifier false, and every other property null. */
export function makeBlurFact(fields) {
    return Object.freeze({
        type: "blur",
        at: null,
        screen: null,
        hit: null,
        focus: null,
        button: null,
        buttons: null,
        pointerId: null,
        pointerType: null,
        key: null,
        code: null,
        repeat: null,
        shiftKey: false,
        ctrlKey: false,
        altKey: false,
        metaKey: false,
        deltaX: null,
        deltaY: null,
        deltaZ: null,
        deltaMode: null,
        time: timeOf(fields.timeStamp),
    });
}
//# sourceMappingURL=fact.js.map
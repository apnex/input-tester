/**
 * A capture's declaration, read and judged (CONTRACT.md, IC2 and IC3): every problem it has, each at its
 * pointer, or the values a capture is opened from.
 *
 * The declaration is read as input-binding reads one, in this order: its prototype; its own keys; the
 * descriptors of surface, keys, toDrawing, hit, focus, deliver and listen its own keys hold, in that order --
 * never a getter of it, an inherited property absent, a symbol-named property ignored, a key whose
 * descriptor reads undefined absent, and a reflection that throws refusing the whole declaration,
 * nothing further read. Then, when surface holds an object, its addEventListener, removeEventListener
 * and setPointerCapture, and when keys holds one, its addEventListener and removeEventListener, each
 * through ordinary property access, judged as it is read, the reading of that object stopping at the
 * first member whose read throws or which is not a function. Last, when listen holds a data property, its
 * array, as input-binding reads one: Array.isArray, its prototype, its own keys, its length's descriptor,
 * then each index's descriptor in order, each element judged as it is read -- so a member's getter that
 * changes the array is seen. Nothing here calls a platform method.
 */
import { childPointer, notAnObject, ProblemList } from "./declaration-problems.js";
const NAMES = ["surface", "keys", "toDrawing", "hit", "focus", "deliver", "listen"];
/** IC3: the names `listen` may hold, each at most once. */
const LISTEN_NAMES = ["wheel", "context-menu", "blur"];
const CANONICAL_INDEX = /^(?:0|[1-9][0-9]*)$/;
/** The greatest array index plus one: an array index is a canonical integer string below 2^32 - 1. */
const INDEX_LIMIT = 2 ** 32 - 1;
/** True when a key is an array index: a canonical non-negative integer string whose value is below 2^32 - 1. */
const isArrayIndex = (key) => CANONICAL_INDEX.test(key) && Number(key) < INDEX_LIMIT;
const REQUIRED = ["surface", "toDrawing", "deliver"];
const SURFACE_MEMBERS = ["addEventListener", "removeEventListener", "setPointerCapture"];
const KEY_SOURCE_MEMBERS = ["addEventListener", "removeEventListener"];
/** IC2 rule 5: an object is a non-null value whose typeof is 'object', so a function never is one. */
const isObject = (value) => typeof value === "object" && value !== null;
const isFunction = (value) => typeof value === "function";
/** The value an own property holds when it is a data property; undefined for an accessor. */
const dataValue = (property) => (property !== undefined && property.data ? property.value : undefined);
/**
 * IC2 rule 2: the named members of a platform object, each read through ordinary property access and
 * judged as it is read; null at the first whose read throws or which is not a function, nothing after
 * it read.
 */
function readMembers(object, names) {
    const members = {};
    for (const name of names) {
        let member;
        try {
            member = object[name];
        }
        catch {
            return null;
        }
        if (!isFunction(member))
            return null;
        members[name] = member;
    }
    return members;
}
/**
 * IC3 steps 7 to 9: `listen`'s array, read as input-binding reads one -- Array.isArray, its prototype, its own
 * keys, its length's descriptor, then each index's descriptor in order, each element judged as it is read --
 * the reading stopping at the first reflection that refuses the array or throws. An accessor, a value that
 * is no array of Array.prototype, an own string-named key that is neither length nor an index below it, a
 * missing index or an accessor element refuse the array at /listen, and nothing beneath it is reported; an
 * element that is none of the three names or equals an earlier element, or a 'blur' when the declaration
 * holds no keys, is refused at its own pointer. Answers the names held, or null when anything is refused.
 */
function judgeListen(property, keysHeld, problems) {
    const refuse = () => {
        problems.add("/listen", "invalid-value");
        return null;
    };
    if (!property.data)
        return refuse();
    const array = property.value;
    const names = [];
    const earlier = [];
    const refusedAt = [];
    try {
        if (!Array.isArray(array))
            return refuse();
        if (Object.getPrototypeOf(array) !== Array.prototype)
            return refuse();
        const indices = [];
        for (const key of Reflect.ownKeys(array)) {
            if (typeof key !== "string" || key === "length")
                continue;
            if (!isArrayIndex(key))
                return refuse();
            indices.push(Number(key));
        }
        const lengthDescriptor = Reflect.getOwnPropertyDescriptor(array, "length");
        if (lengthDescriptor === undefined || !("value" in lengthDescriptor))
            return refuse();
        const count = lengthDescriptor.value;
        if (typeof count !== "number" || !Number.isSafeInteger(count) || count < 0)
            return refuse();
        if (indices.length !== count || indices.some((index) => index >= count))
            return refuse();
        for (let index = 0; index < count; index++) {
            const descriptor = Reflect.getOwnPropertyDescriptor(array, String(index));
            if (descriptor === undefined || !("value" in descriptor))
                return refuse();
            const element = descriptor.value;
            // step 8: none of the three names, or equal to an earlier element; step 9: 'blur' with no keys
            if (typeof element !== "string" || !LISTEN_NAMES.includes(element) || earlier.includes(element))
                refusedAt.push(index);
            else if (element === "blur" && !keysHeld)
                refusedAt.push(index);
            else
                names.push(element);
            earlier.push(element);
        }
    }
    catch {
        // a reflection that throws -- a revoked or trapping Proxy -- refuses the array at its own pointer
        return refuse();
    }
    for (const index of refusedAt)
        problems.add(`/listen/${index}`, "invalid-value");
    return refusedAt.length > 0 ? null : names;
}
/** IC2 and IC3: every problem a declaration has, or what a capture is opened from. Never throws. */
export function judgeDeclaration(declaration) {
    // step 1: a plain object, its prototype, own keys and every descriptor read, or not-an-object at "" and nothing further read
    if (!isObject(declaration))
        return { ok: false, refusal: notAnObject() };
    let keys;
    try {
        const proto = Object.getPrototypeOf(declaration);
        if (proto !== Object.prototype && proto !== null)
            return { ok: false, refusal: notAnObject() };
        keys = Reflect.ownKeys(declaration);
    }
    catch {
        return { ok: false, refusal: notAnObject() };
    }
    const held = new Set();
    const unknown = [];
    for (const key of keys) {
        if (typeof key !== "string")
            continue;
        held.add(key);
        if (!NAMES.includes(key))
            unknown.push(key);
    }
    const properties = new Map();
    for (const name of NAMES) {
        if (!held.has(name))
            continue;
        let descriptor;
        try {
            descriptor = Reflect.getOwnPropertyDescriptor(declaration, name);
        }
        catch {
            return { ok: false, refusal: notAnObject() };
        }
        // a key its own keys list whose descriptor reads undefined -- which only a Proxy can give -- is absent
        if (descriptor === undefined)
            continue;
        properties.set(name, "value" in descriptor ? { data: true, value: descriptor.value } : { data: false });
    }
    const problems = new ProblemList();
    // step 2
    for (const name of unknown)
        problems.add(childPointer(name), "unknown-property");
    for (const name of REQUIRED)
        if (!properties.has(name))
            problems.add(childPointer(name), "missing-property");
    // step 3: the surface, its three members read and judged as read when it holds an object
    let surface = null;
    const surfaceProperty = properties.get("surface");
    if (surfaceProperty !== undefined) {
        const object = dataValue(surfaceProperty);
        const members = surfaceProperty.data && isObject(object) ? readMembers(object, SURFACE_MEMBERS) : null;
        if (members === null)
            problems.add("/surface", "invalid-value");
        else
            surface = { object: object, ...members };
    }
    // step 4: the key source, its two members read whatever the surface's were
    let keySource = null;
    const keysProperty = properties.get("keys");
    if (keysProperty !== undefined) {
        const object = dataValue(keysProperty);
        const members = keysProperty.data && isObject(object) ? readMembers(object, KEY_SOURCE_MEMBERS) : null;
        if (members === null)
            problems.add("/keys", "invalid-value");
        else
            keySource = { object: object, ...members };
    }
    // step 5: the application's functions
    const functions = new Map();
    for (const name of ["toDrawing", "hit", "focus", "deliver"]) {
        const property = properties.get(name);
        if (property === undefined)
            continue;
        const value = dataValue(property);
        if (property.data && isFunction(value))
            functions.set(name, value);
        else
            problems.add(childPointer(name), "invalid-value");
    }
    // step 6: focus requires keys
    if (properties.has("focus") && !properties.has("keys"))
        problems.add("/focus", "invalid-value");
    // steps 7 to 9: listen's array, read last, so what a member's getter did to it is seen; 'blur' requires keys, as step 6 tests it
    let listen = [];
    const listenProperty = properties.get("listen");
    if (listenProperty !== undefined)
        listen = judgeListen(listenProperty, properties.has("keys"), problems) ?? [];
    if (problems.size > 0 || surface === null)
        return { ok: false, refusal: problems.refusal() };
    return {
        ok: true,
        surface,
        keys: keySource,
        toDrawing: functions.get("toDrawing"),
        hit: functions.get("hit") ?? null,
        focus: functions.get("focus") ?? null,
        deliver: functions.get("deliver"),
        listen,
    };
}
//# sourceMappingURL=declaration-reading.js.map
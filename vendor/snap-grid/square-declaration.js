/**
 * A square declaration, checked in the order CONTRACT.md's SG1 fixes, and copied when it is valid.
 *
 * A check that fails at a pointer suppresses every check beneath that pointer and none at a sibling's;
 * step 7 runs only when steps 1 to 6 found no problem anywhere.
 */
import { checkShapeName, childPointer, dataValue, ProblemList } from "./declaration-problems.js";
import { ceilIndex, floorIndex } from "./exact-index.js";
import { ownStringProperties } from "./plain-data.js";
export const DOMAIN_LIMIT = 2 ** 50;
const ROOT_NAMES = ["shape", "pitch", "origin", "bounds"];
const ROOT_REQUIRED = ["pitch", "origin"];
const POINT_NAMES = ["x", "y"];
const BOUNDS_NAMES = ["min", "max"];
const isDeclaredInteger = (v) => typeof v === "number" && Number.isInteger(v) && Math.abs(v) <= DOMAIN_LIMIT;
const isPitch = (v) => typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= DOMAIN_LIMIT;
/**
 * Checks a member of point form -- a plain object of exactly x and y, each an integer of magnitude at
 * most 2^50 -- at a pointer, and returns it with -0 written 0, or null when it has a problem.
 */
function checkDeclaredPoint(value, pointer, problems) {
    const members = value.data ? ownStringProperties(value.value) : null;
    if (members === null) {
        problems.add(pointer, "not-an-object");
        return null;
    }
    const before = problems.size;
    for (const name of members.keys())
        if (!POINT_NAMES.includes(name))
            problems.add(childPointer(pointer, name), "unknown-property");
    for (const name of POINT_NAMES)
        if (!members.has(name))
            problems.add(childPointer(pointer, name), "missing-property");
    for (const name of POINT_NAMES) {
        const member = members.get(name);
        if (member !== undefined && !isDeclaredInteger(dataValue(member)))
            problems.add(childPointer(pointer, name), "invalid-value");
    }
    if (problems.size !== before)
        return null;
    return { x: dataValue(members.get("x")) + 0, y: dataValue(members.get("y")) + 0 };
}
/** A square declaration copied, -0 written 0, or its problems. */
export function checkSquareDeclaration(declaration) {
    const named = checkShapeName(declaration, (name) => name === "square");
    if ("problems" in named)
        return named;
    const { root } = named;
    const problems = new ProblemList();
    for (const name of root.keys())
        if (!ROOT_NAMES.includes(name))
            problems.add(childPointer("", name), "unknown-property");
    for (const name of ROOT_REQUIRED)
        if (!root.has(name))
            problems.add(childPointer("", name), "missing-property");
    const pitch = root.get("pitch");
    if (pitch !== undefined && !isPitch(dataValue(pitch)))
        problems.add("/pitch", "invalid-value");
    const originValue = root.get("origin");
    const origin = originValue === undefined ? null : checkDeclaredPoint(originValue, "/origin", problems);
    let bounds = null;
    const boundsValue = root.get("bounds");
    if (boundsValue !== undefined) {
        const members = boundsValue.data ? ownStringProperties(boundsValue.value) : null;
        if (members === null) {
            problems.add("/bounds", "not-an-object");
        }
        else {
            for (const name of members.keys())
                if (!BOUNDS_NAMES.includes(name))
                    problems.add(childPointer("/bounds", name), "unknown-property");
            for (const name of BOUNDS_NAMES)
                if (!members.has(name))
                    problems.add(childPointer("/bounds", name), "missing-property");
            const minValue = members.get("min");
            const maxValue = members.get("max");
            const min = minValue === undefined ? null : checkDeclaredPoint(minValue, "/bounds/min", problems);
            const max = maxValue === undefined ? null : checkDeclaredPoint(maxValue, "/bounds/max", problems);
            if (min !== null && max !== null) {
                if (min.x > max.x)
                    problems.add("/bounds/max/x", "invalid-value");
                if (min.y > max.y)
                    problems.add("/bounds/max/y", "invalid-value");
                if (!problems.hasAtOrBeneath("/bounds"))
                    bounds = { min, max };
            }
        }
    }
    if (problems.size > 0 || origin === null)
        return { problems };
    const copy = {
        shape: "square",
        pitch: dataValue(pitch),
        origin,
        ...(bounds === null ? {} : { bounds }),
    };
    if (bounds !== null) {
        const p = copy.pitch;
        const empty = ceilIndex(bounds.min.x, origin.x, p) > floorIndex(bounds.max.x, origin.x, p) ||
            ceilIndex(bounds.min.y, origin.y, p) > floorIndex(bounds.max.y, origin.y, p);
        if (empty) {
            problems.add("/bounds", "no-position-in-bounds");
            return { problems };
        }
    }
    return { declaration: copy };
}
//# sourceMappingURL=square-declaration.js.map
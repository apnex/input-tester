/**
 * The square shape (CONTRACT.md, SG1 to SG9): positions { col, row }, one integer pitch for both axes,
 * an integer origin and optional integer bounds, every answer exact over the domain of coordinates of
 * magnitude at most 2^50.
 *
 * On each axis the offered indices run from ceil((lo - origin) / pitch) to floor((hi - origin) / pitch),
 * lo and hi being the bounds on that axis, or -2^50 and 2^50 with none; the representable indices are
 * those of the domain, -2^50 to 2^50. Each is computed once, at open.
 */
import { malformed, readInViewOptions, readPoint, readRect, readView } from "./argument-check.js";
import { ceilIndex, floorIndex, roundIndex } from "./exact-index.js";
import { deepFreeze, exactRecord } from "./plain-data.js";
import { checkSquareDeclaration, DOMAIN_LIMIT } from "./square-declaration.js";
const STRIDE_LIMIT = 2 ** 52;
const OPPOSITES = new Map([
    ["-x", "+x"],
    ["+x", "-x"],
    ["-y", "+y"],
    ["+y", "-y"],
]);
const STEPS = new Map([
    ["-x", [-1, 0]],
    ["+x", [1, 0]],
    ["-y", [0, -1]],
    ["+y", [0, 1]],
]);
const inDomain = (v) => Number.isFinite(v) && Math.abs(v) <= DOMAIN_LIMIT;
const clamp = (i, lo, hi) => Math.min(Math.max(i, lo), hi) + 0;
function axisOf(origin, pitch, lo, hi) {
    return {
        origin,
        least: ceilIndex(lo, origin, pitch),
        greatest: floorIndex(hi, origin, pitch),
        leastRepresentable: ceilIndex(-DOMAIN_LIMIT, origin, pitch),
        greatestRepresentable: floorIndex(DOMAIN_LIMIT, origin, pitch),
    };
}
/** The offered indices of an axis whose coordinate lies from lo to hi, edges included, exactly; null when none. */
function offeredRange(axis, pitch, lo, hi) {
    const from = Math.max(lo, -DOMAIN_LIMIT);
    const to = Math.min(hi, DOMAIN_LIMIT);
    if (!(from <= to))
        return null;
    const first = Math.max(ceilIndex(from, axis.origin, pitch), axis.least);
    const last = Math.min(floorIndex(to, axis.origin, pitch), axis.greatest);
    return first <= last ? [first, last] : null;
}
/** How many multiples of the stride an index range holds. */
const countAt = (range, stride) => (range === null ? 0 : Math.floor(range[1] / stride) - Math.ceil(range[0] / stride) + 1);
function readPosition(fn, position, label = "position") {
    const r = exactRecord(position, ["col", "row"]);
    const col = r?.get("col");
    const row = r?.get("row");
    if (!Number.isSafeInteger(col) || !Number.isSafeInteger(row))
        throw malformed(fn, `${label} must be a plain object of exactly col and row, each a safe integer`);
    return { col: col, row: row };
}
function makeSquareGrid(declaration) {
    const pitch = declaration.pitch;
    const lo = declaration.bounds?.min ?? { x: -DOMAIN_LIMIT, y: -DOMAIN_LIMIT };
    const hi = declaration.bounds?.max ?? { x: DOMAIN_LIMIT, y: DOMAIN_LIMIT };
    const ax = axisOf(declaration.origin.x, pitch, lo.x, hi.x);
    const ay = axisOf(declaration.origin.y, pitch, lo.y, hi.y);
    const directions = Object.freeze([...OPPOSITES.keys()]);
    const isOffered = (p) => p.col >= ax.least && p.col <= ax.greatest && p.row >= ay.least && p.row <= ay.greatest;
    const isRepresentable = (p) => p.col >= ax.leastRepresentable && p.col <= ax.greatestRepresentable && p.row >= ay.leastRepresentable && p.row <= ay.greatestRepresentable;
    // exact: a representable index times the pitch is an integer of magnitude at most 2^51
    const coordinate = (i, axis) => i * pitch + axis.origin + 0;
    const pointAt = (p) => ({ x: coordinate(p.col, ax), y: coordinate(p.row, ay) });
    const nearestTo = (x, y) => {
        if (!inDomain(x) || !inDomain(y))
            return null;
        return { col: clamp(roundIndex(x, ax.origin, pitch), ax.least, ax.greatest), row: clamp(roundIndex(y, ay.origin, pitch), ay.least, ay.greatest) };
    };
    const readDirection = (fn, direction) => {
        if (typeof direction !== "string" || !OPPOSITES.has(direction))
            throw malformed(fn, `direction must be one of ${directions.join(", ")}`);
        return direction;
    };
    const grid = {
        declaration: deepFreeze(declaration),
        directions,
        opposite(direction) {
            return OPPOSITES.get(readDirection("opposite", direction));
        },
        offers(position) {
            return isOffered(readPosition("offers", position));
        },
        nearest(point) {
            const { x, y } = readPoint("nearest", point);
            const n = nearestTo(x, y);
            return n === null ? null : deepFreeze(n);
        },
        pointOf(position) {
            const p = readPosition("pointOf", position);
            if (!isRepresentable(p))
                throw new RangeError("pointOf: the position's point lies outside the domain, coordinates of magnitude at most 2^50");
            return deepFreeze(pointAt(p));
        },
        positionAt(point) {
            const { x, y } = readPoint("positionAt", point);
            const n = nearestTo(x, y);
            if (n === null)
                return null;
            const at = pointAt(n);
            return at.x === x && at.y === y ? deepFreeze(n) : null;
        },
        inView(view, options) {
            const v = readView("inView", view);
            const { minSpacing, max } = readInViewOptions("inView", options);
            const cols = offeredRange(ax, pitch, v.x, v.x + v.w);
            const rows = offeredRange(ay, pitch, v.y, v.y + v.h);
            let stride = 1;
            while (stride < STRIDE_LIMIT && !(pitch * v.scale * stride >= minSpacing))
                stride *= 2;
            while (stride < STRIDE_LIMIT && countAt(cols, stride) * countAt(rows, stride) > max)
                stride *= 2;
            const positions = [];
            if (cols !== null && rows !== null && countAt(cols, stride) * countAt(rows, stride) > 0) {
                const firstCol = Math.ceil(cols[0] / stride) * stride;
                const firstRow = Math.ceil(rows[0] / stride) * stride;
                for (let row = firstRow; row <= rows[1]; row += stride) {
                    for (let col = firstCol; col <= cols[1]; col += stride) {
                        const position = { col: col + 0, row: row + 0 };
                        positions.push({ position, point: pointAt(position) });
                    }
                }
            }
            return deepFreeze({ stride, positions });
        },
        next(position, direction) {
            const p = readPosition("next", position);
            const [dc, dr] = STEPS.get(readDirection("next", direction));
            if (!isOffered(p))
                return null;
            const n = { col: p.col + dc + 0, row: p.row + dr + 0 };
            return isOffered(n) ? deepFreeze(n) : null;
        },
        span(from, to) {
            const a = readPosition("span", from, "from");
            const b = readPosition("span", to, "to");
            if (!isRepresentable(a) || !isRepresentable(b))
                throw new RangeError("span: a position's point lies outside the domain, coordinates of magnitude at most 2^50");
            const x = coordinate(Math.min(a.col, b.col), ax);
            const y = coordinate(Math.min(a.row, b.row), ay);
            const w = Math.abs(b.col - a.col) * pitch + 0;
            const h = Math.abs(b.row - a.row) * pitch + 0;
            const half = pitch / 2;
            return deepFreeze({
                through: { kind: "rect", x, y, w, h },
                covering: { kind: "rect", x: x - half + 0, y: y - half + 0, w: w + pitch, h: h + pitch },
            });
        },
        regionContains(region, point) {
            const r = readRect("regionContains", region, "region");
            const { x, y } = readPoint("regionContains", point);
            return r.x <= x && x <= r.x + r.w && r.y <= y && y <= r.y + r.h;
        },
        enclosing(rect) {
            const r = readRect("enclosing", rect);
            const right = r.x + r.w;
            const bottom = r.y + r.h;
            if (!inDomain(r.x) || !inDomain(r.y) || !inDomain(right) || !inDomain(bottom))
                return null;
            return deepFreeze({
                from: { col: clamp(floorIndex(r.x, ax.origin, pitch), ax.least, ax.greatest), row: clamp(floorIndex(r.y, ay.origin, pitch), ay.least, ay.greatest) },
                to: { col: clamp(ceilIndex(right, ax.origin, pitch), ax.least, ax.greatest), row: clamp(ceilIndex(bottom, ay.origin, pitch), ay.least, ay.greatest) },
            });
        },
    };
    return deepFreeze(grid);
}
/** Opens a square declaration: what openGrid returns for it. */
function openSquare(declaration) {
    const checked = checkSquareDeclaration(declaration);
    if ("problems" in checked)
        return checked.problems.refusal();
    return deepFreeze({ ok: true, grid: makeSquareGrid(checked.declaration) });
}
/** The square shape, the one snap-grid ships. */
export const square = deepFreeze({ name: "square", open: openSquare });
//# sourceMappingURL=square.js.map
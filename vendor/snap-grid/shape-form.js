/**
 * The form of a shape (CONTRACT.md, SG11): a frozen plain object of exactly name and open, the name a
 * non-empty string and open a function, both data properties.
 */
import { exactRecord } from "./plain-data.js";
/** The shape's parts when the value is of a shape's form, else null; never throws. */
export function readGridShape(value) {
    const r = exactRecord(value, ["name", "open"]);
    if (r === null)
        return null;
    try {
        if (!Object.isFrozen(value))
            return null;
    }
    catch {
        return null;
    }
    const name = r.get("name");
    const open = r.get("open");
    return typeof name === "string" && name.length > 0 && typeof open === "function" ? { name, open: open } : null;
}
//# sourceMappingURL=shape-form.js.map
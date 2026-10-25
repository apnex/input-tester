/**
 * The reply for one fact: claim calls the event's preventDefault, read with its fields, with the event
 * as receiver; takePointer calls the surface's setPointerCapture, read as the capture opened, with the
 * surface as receiver and the fact's pointerId.
 */
export function makeReply(event, preventDefault, surface, pointerId) {
    let live = true;
    let claimed = false;
    let taking = false;
    let taken;
    const claim = () => {
        if (!live)
            throw new Error("claim: the fact's delivery has ended, so its reply can no longer act");
        if (claimed)
            return undefined;
        claimed = true;
        Reflect.apply(preventDefault, event, []);
        return undefined;
    };
    const takePointer = () => {
        if (!live)
            throw new Error("takePointer: the fact's delivery has ended, so its reply can no longer act");
        if (taken !== undefined)
            return taken;
        if (taking)
            throw new Error("takePointer: called again before its first call returned");
        if (pointerId === null) {
            taken = false;
            return taken;
        }
        taking = true;
        let answer;
        try {
            Reflect.apply(surface.setPointerCapture, surface.object, [pointerId]);
            answer = true;
        }
        catch {
            // the platform refuses a pointer that is not active, as for a synthetic event
            answer = false;
        }
        finally {
            taking = false;
        }
        taken = answer;
        return taken;
    };
    Object.freeze(claim);
    Object.freeze(takePointer);
    return { reply: Object.freeze({ claim, takePointer }), end: () => (live = false) };
}
//# sourceMappingURL=reply.js.map
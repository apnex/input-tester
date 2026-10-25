/** A shape's name and open, read from their descriptors, so a Proxy's get trap is never asked for them. */
export interface ShapeParts {
    readonly name: string;
    readonly open: (declaration: unknown) => unknown;
}
/** The shape's parts when the value is of a shape's form, else null; never throws. */
export declare function readGridShape(value: unknown): ShapeParts | null;

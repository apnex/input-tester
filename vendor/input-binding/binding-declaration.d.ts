/**
 * A table's declaration, checked (CONTRACT.md, IB3): every problem it has, each at its pointer, or the
 * parts a table is made of.
 *
 * The declaration is read whole, value by value, in IB2's order: the declaration; its guards, each
 * guard's state, flag, default and refuses; its claim's flag and default; its opens's field; its tenants,
 * each tenant's owner and rows, and each row's id, on and when, then -- when step 9 runs -- each guard's
 * flag in order, the claim's flag and the opens field. Each value is judged at its own pointer before
 * anything beneath it is read (src/reflection.ts), and nothing beneath a value refused there is read.
 * A row's other properties are its application's payload and are never inspected.
 */
import { ProblemList } from "./declaration-problems.js";
import type { BindingClaim, BindingGuard, BindingOpens } from "./types.js";
/** One row as the table holds it: what composition read of it, once, and the row itself (IB4). */
export interface CheckedRow {
    readonly id: string;
    readonly owner: string;
    readonly on: (fact: unknown) => unknown;
    readonly when: ((context: unknown) => unknown) | null;
    /** Each guard's flag, in the guards' order, the declared default where the row omits it. */
    readonly guardFlags: readonly boolean[];
    /** The claim flag, the declared default where the row omits it; false when no claim is declared. */
    readonly claims: boolean;
    readonly opens: string | null;
    readonly row: object;
}
/** A declaration with no problem: the parts a table is made of. */
export interface CheckedBindingDeclaration {
    readonly ok: true;
    readonly guards: readonly BindingGuard[];
    readonly claim: BindingClaim | null;
    readonly opens: BindingOpens | null;
    readonly rows: readonly CheckedRow[];
}
/** IB3: every problem a table's declaration has, or the parts of its table. */
export declare function checkBindingDeclaration(declaration: unknown): CheckedBindingDeclaration | {
    readonly ok: false;
    readonly problems: ProblemList;
};

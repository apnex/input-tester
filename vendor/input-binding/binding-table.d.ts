import type { BindingRow, BindingTableDeclaration, ComposeBindingTableResult } from "./types.js";
/**
 * IB3: composes a table from a declaration, or refuses it with every problem it has, each naming where
 * it lies. Never throws, for any argument.
 */
export declare function composeBindingTable<Fact = unknown, Context = unknown, Row extends BindingRow<Fact, Context> = BindingRow<Fact, Context>>(declaration: BindingTableDeclaration<Fact, Context, Row>): ComposeBindingTableResult<Fact, Context, Row>;

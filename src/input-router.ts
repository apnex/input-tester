/**
 * Router: takes each delivered fact through the table and the session (docs/ARCHITECTURE-TARGET.md sections
 * 5, 6 and 7), and answers one verdict holding every step in order.
 *
 * For every fact it makes the context from the session's held keys before it, traces and matches the fact
 * (IB6, IB7), and asks the reply to claim it when the match says so (IC8). Then each family's route makes the
 * session calls that family names: a key's `keyDown` or `keyUp`; a mouse press's pointer taken and the press
 * handed to `resolvePress` (IB15) with the match already found, so the router keeps no policy between the press
 * and the match; a mouse move's `pointerMove`, and `becomeGesture` to the drag when a press gesture's press
 * crosses the threshold, without `from`, so its release stays a drop (IB10); a mouse release's `pointerUp`,
 * whose commit gives a derived fact, traced and matched in its turn; a mouse cancel's `pointerLost`; and focus
 * lost's `keysLost` then `pointerLost`. Which route a fact takes is the composition root's switch.
 */
import type { BecomeGestureOutcome, BindingEntry, BindingTable, GestureOutcome, GestureSession, KeyOutcome, KeysLostOutcome, PointerMoveOutcome, PointerUpOutcome, ResolvePressOutcome, TraceRecord } from "../vendor/input-binding/index.js";
import type { BlurFact, KeyFact, PointerFact } from "../vendor/input-capture/index.js";
import { DRAG_OF_PRESS, NO_KEY_CONTEXT, isModifierCode } from "./input-bindings.js";
import type { CommitFact, DeliveredFact, ItemUnderPointer, TesterContext, TesterFact, TesterRow } from "./input-bindings.js";

/** What the router asks of a fact's reply: `input-capture`'s claim and takePointer (IC8). */
export interface FactReply {
	readonly claim: () => unknown;
	readonly takePointer: () => boolean;
}

/** A commit's derived fact, with its trace and its match (section 6, Verdict). */
export interface DerivedVerdict {
	readonly fact: CommitFact;
	readonly trace: readonly TraceRecord[];
	readonly match: BindingEntry<TesterRow> | null;
}

/** One session call the router made, in the order made, with the outcome it answered and, for a commit, its derived fact. */
export type VerdictStep =
	| { readonly operation: "keyDown" | "keyUp"; readonly outcome: KeyOutcome; readonly derived: null }
	| { readonly operation: "resolvePress"; readonly outcome: ResolvePressOutcome<BindingEntry<TesterRow>>; readonly derived: null }
	| { readonly operation: "pointerMove"; readonly outcome: PointerMoveOutcome; readonly derived: null }
	| { readonly operation: "becomeGesture"; readonly outcome: BecomeGestureOutcome; readonly derived: null }
	| { readonly operation: "pointerUp"; readonly outcome: PointerUpOutcome; readonly derived: DerivedVerdict | null }
	| { readonly operation: "pointerLost"; readonly outcome: GestureOutcome; readonly derived: null }
	| { readonly operation: "keysLost"; readonly outcome: KeysLostOutcome; readonly derived: null };

/** One fact's verdict (section 6): the fact, whether it was claimed, its trace, and every session step in order. */
export interface Verdict {
	readonly fact: DeliveredFact;
	readonly claimed: boolean;
	readonly trace: readonly TraceRecord[];
	readonly steps: readonly VerdictStep[];
}

/** A mouse pointer fact, as the session's pointer operations take it. */
export type MouseFact = PointerFact<ItemUnderPointer>;

/** The router's routes, one per family of fact the composition root switches on. */
export interface InputRouter {
	/** A `key-down` or `key-up`: traced, matched, claimed, then `keyDown` or `keyUp`. */
	readonly routeKeyFact: (fact: KeyFact<null>, reply: FactReply) => Verdict;
	/** A mouse `down`: the pointer taken, traced, matched, claimed, then `resolvePress` with the match found. */
	readonly routeMousePress: (fact: MouseFact, reply: FactReply) => Verdict;
	/** A mouse `move`: traced, matched, claimed, then `pointerMove`, and `becomeGesture` to the drag when a press crosses the threshold. */
	readonly routeMouseMove: (fact: MouseFact, reply: FactReply) => Verdict;
	/** A mouse `up`: traced, matched, claimed, then `pointerUp`, a commit's derived fact traced and matched. */
	readonly routeMouseRelease: (fact: MouseFact, reply: FactReply) => Verdict;
	/** A mouse `cancel`: traced, matched, claimed, then `pointerLost`. */
	readonly routeMouseCancel: (fact: MouseFact, reply: FactReply) => Verdict;
	/** A `blur`: traced, matched, claimed, then `keysLost` and `pointerLost`. */
	readonly routeFocusLost: (fact: BlurFact, reply: FactReply) => Verdict;
	/** Every other fact -- a wheel, a double click, a context menu, a mouse's hover, a touch or a pen -- traced, matched and claimed alone. */
	readonly routeFactAlone: (fact: DeliveredFact, reply: FactReply) => Verdict;
}

/** The context of a fact, from the session's held keys before it: whether they hold its code, and a non-modifier code other than it. */
export function contextOfFact(fact: DeliveredFact, heldKeys: readonly string[]): TesterContext {
	if (fact.type !== "key-down" && fact.type !== "key-up") return NO_KEY_CONTEXT;
	const code = fact.code;
	return Object.freeze({ wasHeld: code !== null && heldKeys.includes(code), otherHeld: heldKeys.some((held) => held !== code && !isModifierCode(held)) });
}

/** Opens a router over one table and the session it drives. */
export function openInputRouter(table: BindingTable<TesterFact, TesterContext, TesterRow>, session: GestureSession): InputRouter {
	/** Traces and matches a fact in its context, and claims it when the match says so: the start of every route. */
	const traceMatchAndClaim = (fact: DeliveredFact, reply: FactReply) => {
		const context = contextOfFact(fact, session.state.keys);
		const trace = table.traceInput(fact, context);
		const { match, claimed } = table.matchInput(fact, context);
		if (claimed) reply.claim();
		return { trace, match, claimed };
	};
	const verdictOf = (fact: DeliveredFact, claimed: boolean, trace: readonly TraceRecord[], steps: readonly VerdictStep[]): Verdict => Object.freeze({ fact, claimed, trace, steps: Object.freeze([...steps]) });
	const step = <S extends VerdictStep>(s: S): S => Object.freeze(s);

	/** A commit's derived fact, traced and matched in the context of no key. */
	const deriveCommit = (outcome: PointerUpOutcome): DerivedVerdict | null => {
		if (outcome.phase !== "commit" || outcome.gesture === null || outcome.trigger === null) return null;
		const fact: CommitFact = Object.freeze({ type: "commit", gesture: outcome.gesture.name, trigger: outcome.trigger });
		return Object.freeze({ fact, trace: table.traceInput(fact, NO_KEY_CONTEXT), match: table.matchInput(fact, NO_KEY_CONTEXT).match });
	};

	const router: InputRouter = {
		routeKeyFact: (fact, reply) => {
			const { trace, claimed } = traceMatchAndClaim(fact, reply);
			const operation = fact.type === "key-down" ? "keyDown" : "keyUp";
			const outcome = operation === "keyDown" ? session.keyDown(fact) : session.keyUp(fact);
			return verdictOf(fact, claimed, trace, [step({ operation, outcome, derived: null })]);
		},
		routeMousePress: (fact, reply) => {
			reply.takePointer();
			const { trace, match, claimed } = traceMatchAndClaim(fact, reply);
			const outcome = session.resolvePress(fact, { match: () => match });
			return verdictOf(fact, claimed, trace, [step({ operation: "resolvePress", outcome, derived: null })]);
		},
		routeMouseMove: (fact, reply) => {
			const { trace, claimed } = traceMatchAndClaim(fact, reply);
			const moved = session.pointerMove(fact);
			const steps: VerdictStep[] = [step({ operation: "pointerMove", outcome: moved, derived: null })];
			const live = moved.state.gesture;
			const drag = live === null ? undefined : DRAG_OF_PRESS[live.name];
			if (!moved.otherPointer && moved.crossed && drag !== undefined) steps.push(step({ operation: "becomeGesture", outcome: session.becomeGesture({ gesture: drag }), derived: null }));
			return verdictOf(fact, claimed, trace, steps);
		},
		routeMouseRelease: (fact, reply) => {
			const { trace, claimed } = traceMatchAndClaim(fact, reply);
			const outcome = session.pointerUp(fact);
			return verdictOf(fact, claimed, trace, [step({ operation: "pointerUp", outcome, derived: deriveCommit(outcome) })]);
		},
		routeMouseCancel: (fact, reply) => {
			const { trace, claimed } = traceMatchAndClaim(fact, reply);
			return verdictOf(fact, claimed, trace, [step({ operation: "pointerLost", outcome: session.pointerLost(), derived: null })]);
		},
		routeFocusLost: (fact, reply) => {
			const { trace, claimed } = traceMatchAndClaim(fact, reply);
			const keys = step({ operation: "keysLost", outcome: session.keysLost(), derived: null });
			const pointer = step({ operation: "pointerLost", outcome: session.pointerLost(), derived: null });
			return verdictOf(fact, claimed, trace, [keys, pointer]);
		},
		routeFactAlone: (fact, reply) => {
			const { trace, claimed } = traceMatchAndClaim(fact, reply);
			return verdictOf(fact, claimed, trace, []);
		},
	};
	return Object.freeze(router);
}

/**
 * Whether a press has travelled beyond the threshold, decided exactly (CONTRACT.md, IB10; the design's D7).
 *
 * With (x0, y0) the press's origin, (x1, y1) a move's point and t the threshold, the press is beyond when
 * (x1 - x0)^2 + (y1 - y0)^2 > t^2 holds of the exact real numbers the binary64 values denote; a travel of
 * exactly the threshold is not beyond. It is computed in two steps:
 *
 * 1. A binary64 filter. With dx, dy, s = dx * dx + dy * dy and q = t * t each rounded once, all four
 *    finite, and each of dx * dx, dy * dy and q either 0 because its operand is 0 or at least 2^-1022:
 *    beyond when s > q * (1 + 2^-49), not beyond when s < q * (1 - 2^-49). A subtraction whose result is
 *    subnormal is exact, and otherwise errs by at most one rounding, u = 2^-53 relative; so with no
 *    underflow the computed s lies within a factor 1 +- 5u of the exact sum and q within 1 +- u of t^2,
 *    and the margin 2^-49 = 16u absorbs both and the one rounding that forms each bound.
 * 2. An exact fallback, for every travel the filter leaves: the five values read as their exact
 *    significands and exponents, shifted as BigInts to the least exponent among the nonzero ones, and
 *    compared exactly. The exponents of the last places of finite binary64 values run from -1074 to 971,
 *    so each shifted operand has at most 2,098 bits and each square 4,198.
 */
/** Step 1, the binary64 filter: true or false when it decides the travel, undefined when it leaves it to the fallback. */
export declare function filterTravelBeyond(x0: number, y0: number, x1: number, y1: number, threshold: number): boolean | undefined;
/** Step 2, the exact fallback: the comparison made on the values' exact significands, shifted to their least exponent. */
export declare function exactTravelBeyond(x0: number, y0: number, x1: number, y1: number, threshold: number): boolean;
/** IB10: whether a travel from (x0, y0) to (x1, y1) lies beyond the threshold -- the filter where it decides, the fallback otherwise. */
export declare function travelBeyond(x0: number, y0: number, x1: number, y1: number, threshold: number): boolean;

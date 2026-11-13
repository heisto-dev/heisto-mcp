/** Public arithmetic only; no wallet or transaction helpers. */
export function currentFee(baseFee: bigint, attackCount: bigint): bigint {
  const scaled = (baseFee * (100n + attackCount)) / 100n;
  const cap = baseFee * 3n;
  return scaled < cap ? scaled : cap;
}
export const lamportsToSol = (l: bigint) => Number(l) / 1e9;

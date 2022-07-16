export function limitPrecision(num: number, decimalLimit = 9) {
  const decimals = Math.pow(10, decimalLimit);
  return Math.round(num * decimals) / decimals;
}

export function calculateQuotationAmount(projectTotal: number, upliftRate: number) {
  return Math.round(projectTotal * (1 + upliftRate / 100) * 100) / 100;
}

export function calculateQuotationAmountByFixed(projectTotal: number, upliftAmount: number) {
  return Math.round((projectTotal + upliftAmount) * 100) / 100;
}

export function calculateUpliftRate(projectTotal: number, quotationAmount: number) {
  if (projectTotal <= 0) return 0;
  return Math.round((quotationAmount / projectTotal - 1) * 10000) / 100;
}

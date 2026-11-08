// The VAT rates used in Bangladesh, in basis points: 15% standard, and the reduced rates.
// 0 covers zero-rated and exempt sales.
export const VAT_RATES = [1500, 1000, 750, 500, 0] as const;

// "15%", "7.5%", "0%".
export const rateLabel = (bp: number) => `${bp / 100}%`;

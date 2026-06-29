/**
 * Formats a given amount (assumed in USD database values) into Indian Rupees (INR)
 * by converting it with a standard exchange rate (1 USD = 80 INR) and styling
 * with the rupee symbol (₹) using Indian locale formatting.
 */
export const formatINR = (usdAmount: number): string => {
  const inrAmount = usdAmount * 80;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(inrAmount);
};

/**
 * Formats a raw INR amount directly to Indian Rupees string.
 */
export const formatDirectINR = (inrAmount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(inrAmount);
};

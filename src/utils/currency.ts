/**
 * Currency formatting utilities
 * Handles price conversion from PostgreSQL Decimal (string) to number
 */

/**
 * Format a price value (number or string) to a fixed decimal string
 * @param price - Price value (can be number, string, null, or undefined)
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted price string or 'N/A' if invalid
 */
export function formatPrice(price: number | string | null | undefined, decimals: number = 2): string {
  if (price == null) return 'N/A';

  const numPrice = typeof price === 'string' ? parseFloat(price) : price;

  if (isNaN(numPrice)) return 'N/A';

  return numPrice.toFixed(decimals);
}

/**
 * Format a price value with currency symbol
 * @param price - Price value (can be number, string, null, or undefined)
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted price with € symbol or fallback message
 */
export function formatCurrency(price: number | string | null | undefined, decimals: number = 2): string {
  if (price == null) return 'Prezzo da definire';

  const formatted = formatPrice(price, decimals);

  if (formatted === 'N/A') return 'Prezzo da definire';

  return `€${formatted}`;
}

/**
 * Convert price to number
 * @param price - Price value (can be number, string, null, or undefined)
 * @returns Number value or 0 if invalid
 */
export function toNumber(price: number | string | null | undefined): number {
  if (price == null) return 0;

  const numPrice = typeof price === 'string' ? parseFloat(price) : price;

  return isNaN(numPrice) ? 0 : numPrice;
}

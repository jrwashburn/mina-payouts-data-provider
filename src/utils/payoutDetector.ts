import { PayoutConfig } from '../models/taxExport.js';

/**
 * Determines if a transaction is a pool payout based on configuration
 *
 * Uses OR logic:
 * - If memo contains any of the configured keywords, it's a payout
 * - OR if the transaction is from any of the configured payout accounts, it's a payout
 *
 * @param event - Partial tax event with memo and/or from address
 * @param payoutConfig - Payout detection configuration
 * @returns true if transaction is a pool payout
 */
export function isPoolPayout(
  event: { memo?: string; from?: string },
  payoutConfig?: PayoutConfig,
): boolean {
  if (!payoutConfig) {
    return false;
  }

  const { memoKeywords, payoutAccounts } = payoutConfig;

  // Check memo keywords (OR logic)
  if (memoKeywords && memoKeywords.length > 0 && event.memo) {
    const memo = event.memo.toLowerCase();
    const hasKeyword = memoKeywords.some((keyword) => memo.includes(keyword.toLowerCase()));
    if (hasKeyword) return true;
  }

  // Check source account (OR logic)
  if (payoutAccounts && payoutAccounts.length > 0 && event.from) {
    if (payoutAccounts.includes(event.from)) return true;
  }

  return false;
}

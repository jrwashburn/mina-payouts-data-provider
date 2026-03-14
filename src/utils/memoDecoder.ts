import bs58 from 'bs58';
import { TAX_EXPORT_CONFIG } from '../configurations/taxConstants.js';

/**
 * Decodes a base58-encoded Mina memo to UTF-8 text
 *
 * Mina memos are base58-encoded with:
 * - First 3 bytes: version info
 * - Last 4 bytes: checksum
 * These need to be stripped before decoding to text
 *
 * @param base58Memo - Base58-encoded memo string
 * @returns Decoded UTF-8 text, or empty string if decoding fails
 */
export function decodeMemo(base58Memo: string | null | undefined): string {
  if (!base58Memo || base58Memo === '' || base58Memo === TAX_EXPORT_CONFIG.EMPTY_MEMO_HASH) {
    return '';
  }

  try {
    // Decode from base58
    const bytes = bs58.decode(base58Memo);

    // Remove first 3 bytes (version) and last 4 bytes (checksum)
    if (bytes.length <= 7) {
      return ''; // Too short to be valid
    }

    const dataBytes = bytes.slice(3, -4);

    // Convert to UTF-8 string
    const decoder = new TextDecoder('utf-8');
    let decoded = decoder.decode(dataBytes);

    // Remove null characters and trim whitespace
    decoded = decoded.replace(/\0/g, '').trim();

    return decoded;
  } catch {
    // If decoding fails, return empty string
    return '';
  }
}

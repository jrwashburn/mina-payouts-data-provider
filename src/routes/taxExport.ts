import express from 'express';
import type { Request, Response } from 'express';
import type { Pool } from 'pg';
import { getTaxExport } from '../controllers/taxExportQuery.js';
import { TAX_EXPORT_CONFIG } from '../configurations/taxConstants.js';
import type { TaxExportRequest } from '../models/taxExport.js';
import { createBlockQueryPool } from '../database/databaseFactory.js';

const router = express.Router();

// Lazy singleton pool
let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = createBlockQueryPool();
  }
  return pool;
}

/**
 * Convert YYYYMMDD format to YYYY-MM-DD format
 * @param dateString - Date in YYYYMMDD format
 * @returns Date in YYYY-MM-DD format
 * @throws Error if format is invalid
 */
function convertDateFormat(dateString: string): string {
  if (!/^\d{8}$/.test(dateString)) {
    throw new Error(`Date must be in YYYYMMDD format, got: ${dateString}`);
  }
  const year = dateString.substring(0, 4);
  const month = dateString.substring(4, 6);
  const day = dateString.substring(6, 8);
  return `${year}-${month}-${day}`;
}

/**
 * GET /tax-export - Simple interface (single account)
 *
 * Query Parameters:
 * - key (required): Single Mina public key
 * - startDate (required): YYYYMMDD
 * - endDate (required): YYYYMMDD
 * - format (optional): koinly | ledgible | blockpit | json (default: json)
 * - payoutKeyword (optional): Single keyword for payout detection
 * - payoutAccount (optional): Single payout source account
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { key, startDate, endDate, format, payoutKeyword, payoutAccount } = req.query;

    // Validate required params
    if (!key || !startDate || !endDate) {
      return res.status(400).json({
        error: 'Required parameters: key, startDate, endDate',
      });
    }

    // Convert date format from YYYYMMDD to YYYY-MM-DD
    const convertedStartDate = convertDateFormat(startDate as string);
    const convertedEndDate = convertDateFormat(endDate as string);

    // Build request from query params
    const request: TaxExportRequest = {
      accounts: [key as string],
      startDate: convertedStartDate,
      endDate: convertedEndDate,
      format: (format as any) || 'json',
    };

    // Add payout config if provided
    if (payoutKeyword || payoutAccount) {
      request.payoutConfig = {
        memoKeywords: payoutKeyword ? [payoutKeyword as string] : undefined,
        payoutAccounts: payoutAccount ? [payoutAccount as string] : undefined,
      };
    } else {
      // Default payout keyword
      request.payoutConfig = {
        memoKeywords: [...TAX_EXPORT_CONFIG.DEFAULT_PAYOUT_KEYWORDS],
      };
    }

    // Execute
    await executeExport(request, res);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * POST /tax-export - Advanced interface (multiple accounts, full config)
 *
 * Request Body:
 * {
 *   accounts: string[],
 *   startDate: string (YYYYMMDD),
 *   endDate: string (YYYYMMDD),
 *   format: 'koinly' | 'ledgible' | 'blockpit' | 'json',
 *   payoutConfig?: {
 *     memoKeywords?: string[],
 *     payoutAccounts?: string[]
 *   }
 * }
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const request: TaxExportRequest = req.body;

    // Validate request structure
    if (!request.accounts || !Array.isArray(request.accounts) || request.accounts.length === 0) {
      return res.status(400).json({
        error: 'accounts array is required and must contain at least one public key',
      });
    }

    if (!request.startDate || !request.endDate) {
      return res.status(400).json({
        error: 'startDate and endDate are required (YYYYMMDD format)',
      });
    }

    // Convert date format from YYYYMMDD to YYYY-MM-DD
    request.startDate = convertDateFormat(request.startDate);
    request.endDate = convertDateFormat(request.endDate);

    // Set defaults
    if (!request.format) {
      request.format = 'json';
    }

    if (!request.payoutConfig) {
      request.payoutConfig = {
        memoKeywords: [...TAX_EXPORT_CONFIG.DEFAULT_PAYOUT_KEYWORDS],
      };
    }

    // Execute
    await executeExport(request, res);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * Shared execution logic for GET and POST routes
 */
async function executeExport(request: TaxExportRequest, res: Response) {
  // Validate format
  if (!['koinly', 'ledgible', 'blockpit', 'json'].includes(request.format)) {
    return res.status(400).json({
      error: 'format must be: koinly, ledgible, blockpit, or json',
    });
  }

  if (request.accounts.length > TAX_EXPORT_CONFIG.MAX_ACCOUNTS_PER_REQUEST) {
    return res.status(400).json({
      error: `Maximum ${TAX_EXPORT_CONFIG.MAX_ACCOUNTS_PER_REQUEST} accounts per request`,
    });
  }

  // Execute controller
  const result = await getTaxExport(getPool(), request, res.req.log);

  if (result.responseError) {
    return res.status(result.responseCode || 500).json({
      error: result.responseError,
    });
  }

  // Set headers based on format
  const accountsLabel =
    request.accounts.length === 1
      ? request.accounts[0].substring(0, 10)
      : `${request.accounts.length}-accounts`;

  if (request.format === 'koinly' || request.format === 'ledgible') {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${accountsLabel}-${request.format}.csv"`,
    );
  } else if (request.format === 'blockpit') {
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${accountsLabel}-blockpit.xlsx"`);
  } else {
    res.setHeader('Content-Type', 'application/json');
  }

  res.status(result.responseCode || 200).send(result.responseData);
}

export default router;

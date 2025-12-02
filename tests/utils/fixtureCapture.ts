/**
 * Fixture Capture Utility
 *
 * This utility downloads real endpoint responses from the data provider API
 * and stores them as JSON fixtures for integration tests.
 *
 * Usage:
 *   npm run test:fixtures -- --endpoint consensus
 *   npm run test:fixtures -- --endpoint blocks
 *   npm run test:fixtures -- --endpoint all
 */

import * as fs from 'fs';
import * as path from 'path';

interface CaptureConfig {
  baseUrl: string;
  outputDir: string;
  endpoints: {
    name: string;
    path: string;
    query?: Record<string, string>;
  }[];
}

const config: CaptureConfig = {
  baseUrl: process.env.API_URL || 'https://api.minastakes.com',
  outputDir: path.join(process.cwd(), 'tests', 'fixtures'),
  endpoints: [
    {
      name: 'consensus',
      path: '/consensus',
    },
    {
      name: 'blocks',
      path: '/blocks',
      query: {
        key: 'B62qkBqSkXgkirtU3n8HJ9YgwHh3vUD6kGJ5ZRkQYGNPeL5xYL2tL1L',
        minHeight: '1000',
        maxHeight: '2000',
      },
    },
    {
      name: 'epoch',
      path: '/epoch/1',
    },
    {
      name: 'staking-ledger',
      path: '/staking-ledgers/jwyody4XQNTnGxkXQEKf87AN27wXadAjYgnGLAtvHahDkn2uWDU',
      query: {
        key: 'B62qkBqSkXgkirtU3n8HJ9YgwHh3vUD6kGJ5ZRkQYGNPeL5xYL2tL1L',
      },
    },
  ],
};

async function captureFixture(
  name: string,
  url: string,
): Promise<void> {
  try {
    console.log(`Capturing fixture: ${name} from ${url}`);
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const outputPath = path.join(config.outputDir, `${name}.json`);

    // Ensure directory exists
    if (!fs.existsSync(config.outputDir)) {
      fs.mkdirSync(config.outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
    console.log(`✓ Saved: ${outputPath}`);
  } catch (error) {
    console.error(`✗ Failed to capture ${name}:`, error);
    throw error;
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const endpointFilter = args.includes('--endpoint')
    ? args[args.indexOf('--endpoint') + 1]
    : 'all';

  console.log(`\nCapturing fixtures from ${config.baseUrl}\n`);

  let endpoints = config.endpoints;
  if (endpointFilter !== 'all') {
    endpoints = endpoints.filter((e) => e.name === endpointFilter);
    if (endpoints.length === 0) {
      console.error(`Unknown endpoint: ${endpointFilter}`);
      process.exit(1);
    }
  }

  for (const endpoint of endpoints) {
    let url = `${config.baseUrl}${endpoint.path}`;
    if (endpoint.query) {
      const params = new URLSearchParams(endpoint.query);
      url += `?${params.toString()}`;
    }

    await captureFixture(endpoint.name, url);
  }

  console.log('\nFixture capture complete!\n');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

# Integration Tests for mina-payouts-data-provider

This directory contains comprehensive integration tests for all API endpoints of the data provider service.

## Overview

The test suite uses **Jest** with **TypeScript** and **Supertest** for HTTP endpoint testing. Tests verify:

- ✅ Endpoint existence and HTTP status codes
- ✅ Response structure and data types
- ✅ Field validation (Mina addresses, hash formats, numeric ranges)
- ✅ Edge cases and error handling
- ✅ Fixture data consistency

## Quick Start

### Run All Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Generate Coverage Report

```bash
npm run test:coverage
```

### Update Production Fixtures

```bash
npm run test:fixtures
```

## Structure

```
tests/
├── README.md                    # This file
├── .env.test                    # Test environment variables
├── fixtures/                    # Real endpoint response data
│   ├── consensus.json          # Network consensus state
│   ├── blocks.json             # Block data snapshots
│   ├── epoch.json              # Epoch block height ranges
│   └── staking-ledger.json     # Staking ledger examples
├── integration/                # Integration test files
│   ├── consensus.test.ts       # /consensus endpoint tests
│   ├── blocks.test.ts          # /blocks endpoint tests
│   ├── epoch.test.ts           # /epoch/:epoch endpoint tests
│   ├── stakingLedgers.test.ts  # /staking-ledgers endpoint tests
│   └── health.test.ts          # /health endpoint tests
├── utils/
│   ├── testServer.ts           # Express app setup for tests
│   ├── mockDatabase.ts         # Fixture data and mock utilities
│   ├── fixtureCapture.ts       # CLI for downloading live data
│   └── setup.ts                # Jest global setup
└── jest.config.js              # Jest configuration (root)
```

## Test Files

### Consensus Endpoint Tests (`consensus.test.ts`)

Tests for `GET /consensus` which returns current network tip information:

- **Consensus State Structure**: Validates all required fields present
- **Epoch Calculation**: Verifies epoch = floor(globalSlotSinceGenesis / 7140)
- **Type Validation**: Ensures blockHeight is string, numbers are correct types
- **Hash Format**: Validates Mina state hashes (3N prefix) and ledger hashes (j prefix)
- **DateTime**: Checks ISO 8601 format validation

### Blocks Endpoint Tests (`blocks.test.ts`)

Tests for `GET /blocks?key=...&minHeight=...&maxHeight=...`:

- **Block Retrieval**: Fetches blocks for a public key within height range
- **Block Structure**: Validates coinbase, fees, producer keys
- **Sorting**: Ensures blocks returned in ascending height order
- **Address Validation**: Verifies Mina address format (B62q prefix)
- **Fee Amounts**: Validates non-negative fee values
- **Hash Validation**: State hash (3N) and ledger hash (j) formats

### Epoch Endpoint Tests (`epoch.test.ts`)

Tests for `GET /epoch/:epoch?fork=...`:

- **Height Ranges**: Returns minBlockHeight and maxBlockHeight for epoch
- **Type Validation**: Heights returned as numeric strings
- **Range Logic**: minBlockHeight <= maxBlockHeight always
- **Fork Parameter**: Handles fork=0 (mainnet) and fork=1 (Berkeley hard fork)
- **Default Behavior**: Gracefully handles missing fork parameter

### Staking Ledgers Endpoint Tests (`stakingLedgers.test.ts`)

Tests for `GET /staking-ledgers/:ledgerHash?key=...`:

- **Ledger Retrieval**: Fetches stakes by ledger hash and delegator key
- **Stake Structure**: Validates public key, balance, vesting info, share class
- **Balance Calculations**: Verifies totalStakingBalance = sum of individual stakes
- **Vesting Validation**: untimedAfterSlot represents lock period in slots
- **Share Classes**: Validates "Common" and "NPS" designations
- **Decimal Handling**: Supports precise decimal amounts for Mina tokens

### Health Endpoint Tests (`health.test.ts`)

Tests for `GET /health` simple availability check:

- **Always Available**: Returns 200 regardless of database state
- **Fast Response**: Responds within 100ms
- **Idempotent**: Multiple calls return same status
- **No Auth Required**: Works without authentication headers

## Fixtures

Fixture files contain real JSON responses from production API endpoints. These are used to:

1. **Validate response structure** - Tests check against known-good data
2. **Test field validation** - Rules applied to real values
3. **Provide test data** - Tests can reference fixture values

### Updating Fixtures

Fixtures are generated from live production data. To refresh them:

```bash
npm run test:fixtures -- --endpoint consensus
npm run test:fixtures -- --endpoint blocks
npm run test:fixtures -- --endpoint epoch
npm run test:fixtures -- --endpoint staking-ledger
npm run test:fixtures -- --endpoint all
```

**Requirements:**
- API must be accessible at `https://api.minastakes.com` (configurable via `API_URL` env var)
- Internet connection
- Network timeouts may occur with large ledgers

## Test Setup

### Environment Variables

Test environment is configured in `tests/.env.test`:

```env
# Consensus
NUM_SLOTS_IN_EPOCH=7140

# Server
API_PORT=0                          # Random available port

# Database (mocked in tests)
BLOCK_DB_QUERY_HOST=localhost
BLOCK_DB_VERSION=v1

# Authentication
LEDGER_UPLOAD_API_USER=test-user
LEDGER_UPLOAD_API_PASSWORD=test-password
```

### Real Database Testing

Tests can run in two modes:

#### Mode 1: Fixture-Based (Default)
```bash
npm test
```
- Uses JSON fixture files
- No database required
- Fast execution
- Tests structure and validation logic

#### Mode 2: Real Database (Integration)
```bash
npm run test:db:start      # Start PostgreSQL containers
npm run test:integration   # Run tests against real databases
npm run test:db:stop       # Stop when done
```

**What's included:**
- 2 PostgreSQL containers (archive & stakes)
- Full schema with `createStakesDb.sql`
- All migrations applied (`migration-0001.sql`, `migration-0002.sql`)
- Sample staking ledger test data
- Vesting schedules and multiple delegators

**Databases:**
- **Archive DB** (port 5433): Block data queries
- **Stakes DB** (port 5434): Staking ledger data

This approach validates:
- Database schema correctness
- Query performance
- Real data handling
- Transaction logic

## Running Tests in CI/CD

In GitHub Actions or similar CI environments:

```bash
npm test 2>&1 | tee test-results.log
```

Jest will:
1. Load environment from `tests/.env.test`
2. Discover test files matching `**/*.test.ts`
3. Execute with timeout of 10 seconds per test
4. Report coverage to stdout
5. Force exit to prevent hanging

## Test Patterns

### Basic Endpoint Test

```typescript
it('should return 200 OK', async () => {
  const response = await request(app).get('/health');
  expect(response.status).toBe(200);
});
```

### Validation Test

```typescript
it('should have valid Mina addresses', async () => {
  const response = await request(app).get('/blocks?key=...');
  response.body.blocks.forEach(block => {
    expect(block.creatorpublickey).toMatch(/^B62q[a-zA-Z0-9]+$/);
  });
});
```

### Fixture Data Test

```typescript
it('should return matching fixture data', async () => {
  const response = await request(app).get('/consensus');
  expect(response.body.epoch).toBe(fixtures.consensus.epoch);
});
```

## Troubleshooting

### Tests Timeout

If tests hang, check:
- PostgreSQL connectivity (even if mocked)
- Network calls to external nodes
- Long-running database queries

### Module Resolution Errors

Ensure `.js` extensions are in imports:
```typescript
// ✅ Correct
import { createTestServer } from '../utils/testServer.js';

// ❌ Wrong
import { createTestServer } from '../utils/testServer';
```

### Tests Fail on First Run

Without database mocking, tests that require database queries will fail. This is expected. Implement database mocking following the [Database Mocking](#database-mocking) section.

## Jest Configuration

Key settings in `jest.config.js`:

- **preset**: `ts-jest` - TypeScript support
- **testEnvironment**: `node` - Node.js environment
- **extensionsToTreatAsEsm**: `['.ts']` - Treat TypeScript as ESM
- **globals.ts-jest.useESM**: `true` - Use ESM loader

## Consensus Endpoint Special Handling

The consensus endpoint returns a moving target (always the current network tip). Tests validate:

- ✅ Response structure
- ✅ Type correctness
- ✅ Calculated fields (epoch from slot)
- ✅ Cryptographic hash formats

But NOT:
- ❌ Specific block heights (these change every block)
- ❌ Exact timestamps (these depend on network state)

For testing with fixed consensus state, create a fixture and use a mock that returns it consistently.

## Contributing Tests

When adding new endpoints:

1. **Create test file**: `tests/integration/{endpoint}.test.ts`
2. **Add fixture**: `tests/fixtures/{endpoint}.json`
3. **Write tests**:
   - Structure validation
   - Type validation
   - Field format validation
   - Edge cases
   - Error handling
4. **Document special cases** in this README

## Performance Considerations

- **Test timeout**: 10 seconds per test (see `tests/setup.ts`)
- **Database**: Currently not mocked - tests will fail if PostgreSQL unavailable
- **Network calls**: Tests don't make external API calls (use fixtures instead)
- **Parallel execution**: Jest runs test files in parallel by default

## Resources

- [Jest Documentation](https://jestjs.io/)
- [Supertest](https://github.com/visionmedia/supertest)
- [Mina Protocol Documentation](https://docs.minaprotocol.com/)
- [mina-addresses README](../../src/mina-addresses/README.md)

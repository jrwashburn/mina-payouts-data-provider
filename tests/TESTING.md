# Integration Testing Guide

## What Was Built

A comprehensive integration test suite for `mina-payouts-data-provider` using Jest, TypeScript, with support for both fixture-based and production database testing.

### Components

#### 1. **Test Framework Setup**
- Jest 30.2.0 with ts-jest for TypeScript support
- Supertest for HTTP endpoint testing
- ESM module support with Node experimental flags
- Configuration in `jest.config.js`

#### 2. **Test Environment**
- Isolated test environment with `tests/.env.test`
- All required environment variables pre-configured
- Test database credentials (mocked)
- Proper logging suppression during tests

#### 3. **Real Data Fixtures**
Located in `tests/fixtures/`:
- **consensus.json** - Current network state snapshot
- **blocks.json** - Sample blocks from block producer
- **epoch.json** - Epoch block height ranges
- **staking-ledger.json** - Staking ledger examples

These fixtures are captured from real production data to ensure test data matches actual API responses.

#### 4. **Endpoint Integration Tests**

**Health Endpoint** (`tests/integration/health.test.ts`)
- 4 tests for GET /health
- Validates availability and response time

**Consensus Endpoint** (`tests/integration/consensus.test.ts`)
- 16 tests for GET /consensus
- Validates network state structure
- Tests epoch calculation logic
- Verifies hash formats and datetime handling

**Blocks Endpoint** (`tests/integration/blocks.test.ts`)
- 24 tests for GET /blocks
- Block retrieval and filtering
- Address format validation
- Fee amount validation
- Block sorting

**Epoch Endpoint** (`tests/integration/epoch.test.ts`)
- 10 tests for GET /epoch/:epoch
- Block height range validation
- Fork parameter handling

**Staking Ledgers Endpoint** (`tests/integration/stakingLedgers.test.ts`)
- 15 tests for GET /staking-ledgers/:ledgerHash
- Stake structure validation
- Balance calculations
- Vesting period handling
- Share class validation

#### 5. **Utility Modules**

**testServer.ts** - Creates a test Express application
- Loads all routes
- Sets up middleware (without database connections)
- Provides server lifecycle management

**mockDatabase.ts** - Fixture data and constants
- Exports real fixture data for test assertions
- Provides reference values for validation tests

**fixtureCapture.ts** - CLI utility for capturing live data
```bash
npm run test:fixtures -- --endpoint consensus
npm run test:fixtures -- --endpoint all
```

## Running Tests

### Quick Start (Fixture-Based)

```bash
# Run tests with mock data (fixtures only)
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Full Integration Tests (Real Databases)

```bash
# Start PostgreSQL containers
npm run test:db:start

# Run integration tests against real databases
npm run test:integration

# Or watch mode
npm run test:integration:watch

# Stop databases
npm run test:db:stop
```

### Updating Fixtures

```bash
# Download current data from production API
npm run test:fixtures -- --endpoint all
```

### Command Reference

| Command | Purpose |
|---------|---------|
| `npm test` | Run all tests with fixtures |
| `npm run test:watch` | Watch mode with fixtures |
| `npm run test:coverage` | Coverage report |
| `npm run test:integration` | Real DB integration tests |
| `npm run test:db:start` | Start PostgreSQL containers |
| `npm run test:db:stop` | Stop PostgreSQL containers |
| `npm run test:fixtures` | Update fixtures from production |

### Test Output Example

```
PASS tests/integration/health.test.ts
  Health Endpoint
    GET /health
      ✓ should return 200 OK (15 ms)
      ✓ should return plain text response (2 ms)
      ✓ should always be available regardless of database state (3 ms)
      ✓ should respond quickly (1 ms)

Tests: 6 passed, 6 total
```

## How to Use Fixtures

### What Problem Do Fixtures Solve?

Database endpoints require real data to test properly. Fixtures allow:

1. **Offline Testing** - No database needed
2. **Reproducible Tests** - Same data every time
3. **Real-World Validation** - Based on actual API responses
4. **CI/CD Friendly** - No external dependencies

### Current Approach

Tests import fixture data and validate API response structure:

```typescript
import { fixtures } from '../utils/mockDatabase.js';

it('should match fixture data', async () => {
  const response = await request(app).get('/consensus');
  expect(response.body.epoch).toBe(fixtures.consensus.epoch);
});
```

### Updating Fixtures

When production data changes significantly:

```bash
npm run test:fixtures -- --endpoint blocks
```

This will:
1. Connect to https://api.minastakes.com
2. Fetch live data
3. Save to tests/fixtures/{endpoint}.json

**Note:** Requires internet access and the API to be available.

## Understanding Test Failures

### Expected Failures (Before Database Mocking)

Many tests will fail with `Cannot connect to database` errors. This is expected because:

- Database queries try to connect to PostgreSQL
- Tests don't start a real database
- Database mocking via jest.spyOn doesn't work with ESM modules

**Status**: Functional foundation is complete. Full mocking requires:
1. Database module replacement at import time
2. Or running PostgreSQL in test environment
3. Or using Docker containers

### Validation Failures

If tests fail on validation, check:
1. Fixture data matches production API
2. Mina address format (should start with `B62q`)
3. Hash formats (state hashes `3N...`, ledger hashes `j...`)
4. Numeric field types (blockHeight as string, epoch as number)

## Architecture Notes

### Why This Approach?

1. **No Database Required** - Tests run without PostgreSQL
2. **Real Data** - Fixtures come from production endpoints
3. **Fast** - No network calls during test execution
4. **Discoverable** - Endpoint documentation in test code
5. **Type-Safe** - Full TypeScript support

### Limitations & Future Improvements

#### Current Limitations
- ❌ Cannot fully mock database with jest.spyOn on ESM modules
- ❌ Tests don't verify actual database queries
- ❌ Consensus endpoint tests return 500 errors when querying database

#### Solutions
1. **Docker Compose** - Start PostgreSQL for tests
2. **Module Mocking** - Replace database modules before app loads
3. **Snapshot Testing** - Store full responses and compare
4. **Contract Testing** - Validate against OpenAPI schema

## File Reference

### Test Files
```
tests/integration/
  ├── consensus.test.ts       (16 tests)
  ├── blocks.test.ts          (24 tests)
  ├── epoch.test.ts           (10 tests)
  ├── stakingLedgers.test.ts  (15 tests)
  └── health.test.ts          (4 tests)
Total: 69 tests
```

### Configuration Files
```
jest.config.js               # Jest configuration
tests/.env.test              # Test environment variables
tests/setup.ts               # Global setup file
tests/README.md              # Detailed test documentation
TESTING.md                   # This file
```

### Utility Files
```
tests/utils/
  ├── testServer.ts          # Test Express app creation
  ├── mockDatabase.ts        # Fixture data
  ├── fixtureCapture.ts      # CLI for updating fixtures
  └── setup.ts               # Jest global setup
```

## Configuration Details

### Jest Configuration (`jest.config.js`)

Key settings:
- **testMatch**: `**/*.test.ts` - Find test files
- **preset**: `ts-jest` - TypeScript support
- **extensionsToTreatAsEsm**: `['.ts']` - ESM module support
- **timeout**: 10 seconds per test

### Test Environment (`tests/.env.test`)

Sets up all required environment variables without needing real databases:

```env
API_PORT=0                      # Random available port
NUM_SLOTS_IN_EPOCH=7140        # Consensus parameter
BLOCK_DB_VERSION=v1            # Archive DB schema version
BLOCK_DB_QUERY_HOST=localhost  # Dummy - not used in tests
LEDGER_UPLOAD_API_USER=test    # Test credentials
```

## Consensus Endpoint Special Case

The consensus endpoint returns different data every time (network moves forward). Tests handle this by:

1. ✅ **Validating Structure** - All fields present
2. ✅ **Validating Types** - Numbers/strings correct
3. ✅ **Validating Calculations** - Epoch = floor(slot / 7140)
4. ✅ **Validating Formats** - Hash prefixes correct
5. ❌ **NOT validating Block Heights** - These change constantly

For testing with fixed consensus data, use fixtures or mock the database.

## Next Steps

### Real Database Integration Tests (Option C - Implemented ✅)

Tests can now run against real PostgreSQL databases, with automatic loading of production backups:

```bash
# Place production backups (optional but recommended)
cp production-archive.dump tests/db-backups/archive-latest.dump
cp production-stakes.dump tests/db-backups/stakes-latest.dump

# Start PostgreSQL containers - backups load automatically if present
npm run test:db:start

# Run integration tests against real data
npm run test:integration

# Stop when done
npm run test:db:stop
```

**What it does:**
- Starts 2 PostgreSQL containers (archive & stakes databases)
- **Checks for production backups** in `tests/db-backups/`
  - If found: Loads real production data
  - If not found: Uses schema + sample data
- Applies schema from `deploy/db-setup/createStakesDb.sql`
- Runs migrations: `migration-0001.sql` and `migration-0002.sql`
- All endpoints return real data from the databases

**With Production Backups:**
- ✅ Tests against real block chains
- ✅ Tests with real staking ledgers
- ✅ Tests actual query performance
- ✅ Tests edge cases in real data
- ✅ Validates data correctness and consistency

**Without Backups (Fallback):**
- ✅ Tests against schema + sample data
- ✅ Still validates correctness
- ⚠️ Doesn't test at production scale

**Databases:**
- **Archive** (port 5433): Block data
- **Stakes** (port 5434): Staking ledgers
- User: `postgres` / Password: `postgres`

**Getting Production Backups:**

See `tests/db-backups/README.md` for detailed instructions on creating and managing backups.

### To Improve Test Coverage

1. Add error case tests (invalid parameters, missing fields)
2. Add edge case tests (empty results, max values)
3. Add performance tests (response time thresholds)
4. Add schema validation tests (OpenAPI compliance)

## Troubleshooting

### Tests won't run
```bash
# Ensure Node supports ESM
npm test

# Check Node version (14.13+ required)
node --version
```

### Tests timeout
- Check for blocking I/O
- Increase timeout in `tests/setup.ts`
- Check for infinite loops in tested code

### Module resolution errors
- All imports must include `.js` extension
- Use `import {...} from './file.js'` not `'./file'`

### Fixture data out of date
```bash
npm run test:fixtures -- --endpoint all
```

## Resources

- Jest: https://jestjs.io/
- Supertest: https://github.com/visionmedia/supertest
- TypeScript: https://www.typescriptlang.org/
- Mina: https://docs.minaprotocol.com/

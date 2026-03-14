# Tax Export Testing

## Test Coverage

### Unit Tests

#### Utilities
- **memoDecoder** (`tests/unit/utils/memoDecoder.test.ts`)
  - Empty/invalid memo handling
  - Base58 decoding
  - Null character stripping
  - Error handling

- **payoutDetector** (`tests/unit/utils/payoutDetector.test.ts`)
  - Memo keyword detection (case-insensitive)
  - Payout account detection
  - OR logic (memo OR account)
  - Edge cases

- **taxFormatters** (`tests/unit/utils/taxFormatters.test.ts`)
  - JSON format
  - Koinly CSV format (12/13 columns)
  - Ledgible CSV format (11/12 columns)
  - Accointing XLSX format (8/9 columns)
  - CSV escaping
  - Date formatting
  - Event type categorization

#### Database Queries
- **taxExportDb** (`tests/unit/database/taxExportDb.test.ts`)
  - All 6 query functions
  - Parameter passing
  - Canonical chain filtering
  - Command type filtering
  - Timestamp range handling

#### Controller
- **taxExportQuery** (`tests/unit/controllers/taxExportQuery.test.ts`)
  - Request validation (accounts, dates, format)
  - Data transformation (all event types)
  - Event sorting (chronological + account key)
  - Parallel query execution
  - Success/error responses

### Integration Tests

- **taxExport** (`tests/integration/taxExport.test.ts`)
  - GET endpoint validation
  - POST endpoint validation
  - Multiple accounts support
  - Payout configuration
  - Response headers by format
  - Error handling

## Running Tests

```bash
# Run all unit tests
npm run test:unit

# Run specific test file
npm run test:unit -- tests/unit/utils/memoDecoder.test.ts

# Run with coverage
npm run test:unit:coverage

# Run integration tests
npm run test:integration

# Run all tests
npm test
```

## Test Data

Tests use mocked data and do not require a database connection for unit tests.
Integration tests may require database connection depending on configuration.

## Coverage Goals

- Unit tests: ~70% of total test count
- Integration tests: ~20% of total test count
- Code coverage: >85% for critical paths

## Adding New Tests

When adding features to tax export:
1. Add unit tests for new utilities/transformations
2. Add controller tests for new event types
3. Add integration tests for new routes/parameters
4. Update this documentation

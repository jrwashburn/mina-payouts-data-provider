# Production Database Integration Testing

## Overview

The integration test suite now supports testing against **real database backups**. This allows you to test actual correctness, performance, and edge cases with realistic data.

## Three Testing Approaches

### 1. Fixture-Based Tests (Fastest) ⚡

```bash
npm test
```

- No database needed
- Tests in seconds
- Validates API response structure
- **Use for:** Quick feedback during development

### 2. Schema + Sample Data (Medium) 🐘

```bash
npm run test:db:start      # Uses sample data
npm run test:integration
npm run test:db:stop
```

- Starts PostgreSQL containers
- Uses schema + sample data
- Tests database connectivity & queries
- **Use for:** CI/CD, basic integration testing

### 3. Production Backup (Most Realistic) 🏗️

```bash
cp production-archive.dump tests/db-backups/archive-latest.dump
cp production-stakes.dump tests/db-backups/stakes-latest.dump

npm run test:db:start      # Auto-loads backups
npm run test:integration
npm run test:db:stop
```

- Tests against **real production data**
- Real block chains, real stakes, real scale
- Tests actual query correctness
- Tests edge cases & performance
- **Use for:** Comprehensive testing, regression prevention

## Getting Production Backups

### Prerequisites

- Access to production database(s)
- `pg_dump` and `pg_restore` tools installed

### Backup Steps

**Option A: Direct database access**

```bash
# Archive database
pg_dump -Fc -h archive-prod-host -U postgres archive > \
  tests/db-backups/archive-latest.dump

# Stakes database
pg_dump -Fc -h stakes-prod-host -U postgres stakes > \
  tests/db-backups/stakes-latest.dump
```

**Option B: Via SSH/SCP**

```bash
# On production server
ssh user@prod-server
pg_dump -Fc postgres://user:pass@localhost/archive > archive.dump
pg_dump -Fc postgres://user:pass@localhost/stakes > stakes.dump
exit

# Copy to local
scp user@prod-server:~/archive.dump tests/db-backups/archive-latest.dump
scp user@prod-server:~/stakes.dump tests/db-backups/stakes-latest.dump
```

**Option C: From S3/Cloud Storage**

```bash
aws s3 cp s3://backup-bucket/archive-latest.dump tests/db-backups/
aws s3 cp s3://backup-bucket/stakes-latest.dump tests/db-backups/
```

### File Naming

- `archive-latest.dump` - Most recent archive backup
- `stakes-latest.dump` - Most recent stakes backup

Or with dates:

- `archive-20250127.dump`
- `stakes-20250127.dump`

The script auto-detects the most recent backup.

## What Gets Tested

### ✅ Structure & Format (All modes)

- Response fields exist
- Data types correct
- Hash formats valid (3N prefix for state, j for ledger)
- Address formats valid (B62q prefix)

### ✅ Real Database Queries (Schema + Sample + Production modes)

- Queries execute without errors
- Query results have expected structure
- Database connectivity works
- Transaction handling correct

### ✅ Real Data Correctness (Production mode only)

- Block hashes are valid
- Block chains are valid
- Staking ledgers are consistent
- Vesting schedules are correct
- Balance calculations match

### ✅ Performance (Production mode only)

- Queries complete in reasonable time
- No N+1 query problems
- Database indexes are effective

### ✅ Edge Cases (Production mode only)

- Handles large result sets
- Handles old/new blocks
- Handles complex vesting
- Handles large balances

## File Structure

```
tests/
├── db-backups/                      # Production backups (not in git)
│   ├── README.md                    # Backup instructions
│   ├── archive-latest.dump          # Archive DB backup
│   └── stakes-latest.dump           # Stakes DB backup
├── integration/
│   └── *.test.ts                    # 69 tests
├── fixtures/
│   └── *.json                       # Fixture snapshots
└── utils/
    ├── mockDatabase.ts              # Test data
    └── ...
```

## Environment Files

### `.env.test` (Fixture mode)

```env
API_PORT=0
NUM_SLOTS_IN_EPOCH=7140
# etc.
```

### `.env.test.integration` (Database mode)

```env
BLOCK_DB_QUERY_HOST=localhost
BLOCK_DB_QUERY_PORT=5433
LEDGER_DB_QUERY_HOST=localhost
LEDGER_DB_QUERY_PORT=5434
# etc.
```

## How It Works - Volume-Based Persistence

The startup script (`tests/start-test-databases.sh`) uses Docker **named volumes** for efficient data management:

### First Run (Backup Loading)

1. **Starts Docker containers** for PostgreSQL with named volumes
2. **Checks if databases already exist** in the volume
3. **Loads backup** from `tests/db-backups/` into the volume (one-time)
4. **Subsequent starts** reuse the same volume (instant)

### Subsequent Runs (Reuse Persistent Volume)

- Containers start instantly (no backup restore)
- Existing data in volume is reused
- Perfect for iterative test development

### Performance

- **First run** (`npm run test:db:start`): 1-3 minutes (restores backups)
- **Subsequent runs**: Instant (volume already loaded)
- **Reset data** (`npm run test:db:reload`): 10-30 seconds (reload backups into volume)
- **Full refresh** (`npm run test:db:refresh`): 1-3 minutes (delete volumes and restart)

**Typical workflow output (reusing volume):**

```
🐘 Starting PostgreSQL containers for integration tests...
⏳ Waiting for databases to be ready...
✅ Databases are ready!
📊 Initializing databases...
  ✅ Using existing archive database from volume
  ✅ Using existing stakes database from volume
✨ Test databases are ready!
```

**First-time output (loading backups):**

```
🐘 Starting PostgreSQL containers for integration tests...
⏳ Waiting for databases to be ready...
✅ Databases are ready!
📊 Initializing databases...
  📦 Database archive not found, initializing...
    ⏳ Restoring from backup: archive-latest.dump...
  ✅ Archive database reloaded
  📦 Database stakes not found, initializing...
    ⏳ Restoring from backup: stakes-latest.dump...
  ✅ Stakes database reloaded
✨ Test databases are ready!
```

## Actual Test Results

With production backups, tests will:

**✅ Pass with correct implementation:**

```
PASS tests/integration/blocks.test.ts
  Blocks Endpoint
    GET /blocks
      ✓ should return blocks for a given key (45ms)
      ✓ should return blocks with correct structure (32ms)
      ✓ should have valid coinbase amounts (28ms)
```

**❌ Fail with incorrect queries:**

```
FAIL tests/integration/blocks.test.ts
  ● should return blocks for block producer key

    Expected 5 blocks, received 0

    Query may not be filtering by correct producer key
```

This is the real value - **catching actual bugs** that wouldn't show with fixtures.

## Using in CI/CD

### GitHub Actions Example

```yaml
name: Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Download backup from S3
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        run: |
          mkdir -p tests/db-backups
          aws s3 cp s3://my-backups/archive-latest.dump tests/db-backups/
          aws s3 cp s3://my-backups/stakes-latest.dump tests/db-backups/

      - name: Install dependencies
        run: npm install

      - name: Run integration tests
        run: |
          npm run test:db:start
          npm run test:integration
          npm run test:db:stop
```

## Backup Management

### Size Considerations

```bash
# Check backup sizes
ls -lh tests/db-backups/

# Archive backup: ~500MB - 5GB (depending on chain height)
# Stakes backup: ~10MB - 100MB (depending on delegators)
```

### Rotation

```bash
# Keep only last 3 backups
ls -t tests/db-backups/*.dump | tail -n +4 | xargs rm

# Or by date
find tests/db-backups -name "*.dump" -mtime +7 -delete  # Keep 7 days
```

### Compression

```bash
# Backups are already compressed in -Fc format
# To further compress for storage:
gzip tests/db-backups/archive-latest.dump

# Restore from gzip:
gunzip tests/db-backups/archive-latest.dump.gz
```

## Security Considerations

⚠️ **Production backups may contain:**

- Real block data from mainnet
- Real staking ledger data
- Real delegator information

✅ **Protection:**

- Not committed to git (.gitignore)
- Keep on secure local machine
- Use secure storage for CI/CD (S3 bucket, GitHub Secrets, etc.)
- Consider anonymizing copies for team sharing

## Troubleshooting

### "No backup found, initializing with schema"

This is normal if you haven't added backups yet. Tests will still work with sample data.

### "pg_restore: error: archiver failed"

Backup file is corrupted. Recreate it:

```bash
pg_dump -Fc postgres://user:pass@host/database > tests/db-backups/backup.dump
```

### Tests run very slowly

You're testing against a large production backup with millions of rows. This is expected and correct. It means:

- Your tests are comprehensive
- You're validating against realistic data
- Performance issues in queries will be caught

### "Connection refused" errors

Docker containers didn't start. Check:

```bash
docker ps                     # See running containers
npm run test:db:stop         # Clean up
npm run test:db:start        # Try again
```

## Next Steps

1. **Get production backups:**

   ```bash
   pg_dump -Fc production_archive > tests/db-backups/archive-latest.dump
   pg_dump -Fc production_stakes > tests/db-backups/stakes-latest.dump
   ```

2. **Run integration tests:**

   ```bash
   npm run test:db:start
   npm run test:integration
   npm run test:db:stop
   ```

3. **Watch the differences:**
   - Fixture tests: ✅ Pass (mocked data)
   - Integration with backups: ✅ Pass (real correctness validated)
   - Integration without backups: ✅ Pass (schema validated)

## Documentation

- **TEST_QUICK_START.md** - Quick commands
- **TESTING.md** - Full guide
- **tests/README.md** - Detailed test reference
- **tests/db-backups/README.md** - Backup management

## Questions?

See the documentation files above or check:

- `tests/start-test-databases.sh` - How backups are loaded
- `.env.test.integration` - Database configuration
- `docker-compose.test.yml` - Container setup

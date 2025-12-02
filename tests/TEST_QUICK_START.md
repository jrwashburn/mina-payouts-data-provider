# Quick Start: Integration Tests

## Two Testing Modes

### 🚀 Fast Mode: Fixture-Based Tests
No database required. Tests use JSON fixtures from production.

```bash
npm test
```

- ✅ Runs in seconds
- ✅ No dependencies
- ✅ Tests API response structure
- ❌ Doesn't test actual database queries

### 🐘 Full Mode: Real Database Tests
Tests run against actual PostgreSQL with production data.

```bash
# First time: Start databases (loads backups into persistent volume)
npm run test:db:start          # ~1-3 min (restores 3.8 GB of backups)

# Run tests against real data
npm run test:integration       # ~30-60 sec

# Optional: Reset data between test runs (containers stay running)
npm run test:db:reload         # ~10-30 sec (reloads from existing volume)

# When done: Stop databases
npm run test:db:stop
```

**Performance:**
- **First run** (`npm run test:db:start`): 1-3 minutes (loads backups from files)
- **Subsequent runs**: Reuses persistent volume (instant start)
- **Reset data** (`npm run test:db:reload`): 10-30 seconds (no container restart)
- **Full refresh** (`npm run test:db:refresh`): 1-3 minutes (new volumes)

**What you get:**
- If backups exist: Tests against real block chains, real staking data, real scale
- If no backups: Tests against schema with sample data
- Automatically detects and loads backups from `tests/db-backups/`
- Data persists in volumes between runs

## Getting Production Data

### Option 1: Use Production Backups (Recommended)

```bash
# 1. Get backups from production
pg_dump -Fc postgres://user:pass@archive-host/archive > tests/db-backups/archive-latest.dump
pg_dump -Fc postgres://user:pass@stakes-host/stakes > tests/db-backups/stakes-latest.dump

# 2. Run tests - backups load automatically
npm run test:db:start
npm run test:integration
npm run test:db:stop
```

Tests will **automatically detect** the backups and load them.

See `tests/db-backups/README.md` for detailed backup instructions.

### Option 2: Sample Data (No Backups)

```bash
# Run without backups - uses schema + sample data
npm run test:db:start
npm run test:integration
npm run test:db:stop
```

## Quick Commands

```bash
# Fixture-based testing (no DB needed)
npm test                    # Run tests once
npm run test:watch         # Watch mode
npm run test:coverage      # Coverage report

# Database testing (with or without backups)
npm run test:db:start      # Start PostgreSQL (auto-loads backups if present)
npm run test:integration   # Run tests against DB
npm run test:db:stop       # Stop PostgreSQL

# Database volume management
npm run test:db:reload     # Reset data in running containers (fast, ~10-30 sec)
npm run test:db:refresh    # Complete reset with new volume (slower, used for cleanup)

# Maintenance
npm run test:fixtures      # Update fixtures from production
npm run test:fixtures -- --endpoint consensus  # Single endpoint
```

## What Gets Tested

### All Modes Test
- ✅ Response structure
- ✅ Field types
- ✅ Format validation (addresses, hashes)
- ✅ Calculation logic

### Database Mode Additionally Tests
- ✅ Database connectivity
- ✅ Query execution
- ✅ Schema correctness
- ✅ Real data handling
- ✅ Migration compatibility

## Database Ports

When running `npm run test:db:start`:

- **Archive DB**: `localhost:5433` (blocks data)
- **Stakes DB**: `localhost:5434` (staking ledgers)

Use `psql` to query:
```bash
psql -h localhost -p 5434 -U postgres -d stakes
```

Default password: `postgres`

## CI/CD

In GitHub Actions:
```yaml
- name: Run tests
  run: npm test

# Or with databases:
- name: Start databases
  run: npm run test:db:start
- name: Run integration tests
  run: npm run test:integration
- name: Cleanup
  run: npm run test:db:stop
```

## Troubleshooting

**Tests fail with "Cannot connect to database"**
- You're running `npm test` - use `npm run test:integration` for DB tests
- Or start databases: `npm run test:db:start`

**Port already in use**
- Another container is running: `docker ps`
- Stop existing containers: `npm run test:db:stop`

**Permission denied on start-test-databases.sh**
```bash
chmod +x tests/start-test-databases.sh
npm run test:db:start
```

**Want to inspect test database**
```bash
npm run test:db:start
psql -h localhost -p 5434 -U postgres -d stakes
# queries...
npm run test:db:stop
```

## Test Files

- `tests/integration/` - All test specs (69 tests)
- `tests/fixtures/` - Sample JSON responses
- `tests/.env.test` - Fixture test config
- `tests/.env.test.integration` - DB test config
- `tests/setup-test-data.sql` - Seed data for databases

## Documentation

- **TESTING.md** - Comprehensive testing guide
- **tests/README.md** - Detailed test reference
- **This file** - Quick start guide

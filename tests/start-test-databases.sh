#!/bin/bash

# Integration Test Database Setup
# This script starts PostgreSQL containers and initializes them with test data

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🐘 Starting PostgreSQL containers for integration tests..."

# Start containers (use docker compose if docker-compose not found)
if command -v docker-compose &> /dev/null; then
  docker-compose -f "$PROJECT_ROOT/docker-compose.test.yml" up -d
else
  docker compose -f "$PROJECT_ROOT/docker-compose.test.yml" up -d
fi

# Wait for databases to be healthy
echo "⏳ Waiting for databases to be ready..."
for i in {1..30}; do
  if docker exec mppdp-test-stakes pg_isready -U postgres > /dev/null 2>&1 && \
     docker exec mppdp-test-archive pg_isready -U postgres > /dev/null 2>&1; then
    echo "✅ Databases are ready!"
    break
  fi
  echo "  Waiting... ($i/30)"
  sleep 1
done

# Initialize databases - check for production backups first
echo "📊 Initializing databases..."

# Function to check if database is already initialized
is_database_initialized() {
  local db_container=$1
  local db_name=$2

  docker exec "$db_container" psql -U postgres -d "$db_name" -c "SELECT 1" > /dev/null 2>&1
}

# Function to load database from backup or schema
init_database() {
  local db_name=$1
  local db_container=$2
  local backup_pattern=$3
  local schema_file=$4

  # Check if already initialized (from persistent volume)
  if is_database_initialized "$db_container" "$db_name"; then
    echo "  ✅ Using existing $db_name database from volume"
    return 0
  fi

  echo "  📦 Database $db_name not found, initializing..."

  # Look for most recent backup dump
  local latest_dump=$(ls -t "$PROJECT_ROOT/tests/db-backups/${backup_pattern}"*.dump 2>/dev/null | head -1)

  if [ -n "$latest_dump" ]; then
    echo "    ⏳ Restoring from backup: $(basename "$latest_dump")... (this may take several minutes)"

    # Create temp file for output
    local restore_log=$(mktemp)
    trap "rm -f $restore_log" EXIT

    # Use --clean, --if-exists, --no-owner, and --no-privileges to skip all permission conflicts
    if docker exec -i "$db_container" pg_restore -U postgres -d "$db_name" --clean --if-exists --no-owner --no-privileges < "$latest_dump" > "$restore_log" 2>&1; then
      echo "    ✅ Backup restored successfully"
    else
      echo "    ⚠️  Backup restore failed"
      # Show last few lines of error if restore failed
      if [ -s "$restore_log" ]; then
        echo "    Last error messages:"
        tail -5 "$restore_log" | sed 's/^/      /'
      fi
      echo "    Falling back to schema..."
      docker exec -i "$db_container" psql -U postgres -d "$db_name" < "$schema_file" > /dev/null 2>&1 || true
    fi

    rm -f "$restore_log"
  else
    echo "    ℹ️  No backup found, initializing with schema..."
    docker exec -i "$db_container" psql -U postgres -d "$db_name" < "$schema_file" > /dev/null 2>&1 || true

    # Apply migrations for stakes database
    if [ "$db_name" = "stakes" ]; then
      docker exec -i "$db_container" psql -U postgres -d "$db_name" < "$PROJECT_ROOT/deploy/db-setup/migration-0001.sql" > /dev/null 2>&1 || true
      docker exec -i "$db_container" psql -U postgres -d "$db_name" < "$PROJECT_ROOT/deploy/db-setup/migration-0002.sql" > /dev/null 2>&1 || true
      # Add sample test data if not loaded from backup
      docker exec -i "$db_container" psql -U postgres -d "$db_name" < "$PROJECT_ROOT/tests/setup-test-data.sql" > /dev/null 2>&1 || true
    fi
  fi
}

# Initialize both databases
init_database "archive" "mppdp-test-archive" "archive" "$PROJECT_ROOT/deploy/db-setup/createStakesDb.sql"
init_database "stakes" "mppdp-test-stakes" "stakes" "$PROJECT_ROOT/deploy/db-setup/createStakesDb.sql"

echo "✨ Test databases are ready!"
echo ""
echo "Test environment variables:"
echo "  BLOCK_DB_QUERY_HOST=localhost"
echo "  BLOCK_DB_QUERY_PORT=5433"
echo "  LEDGER_DB_QUERY_HOST=localhost"
echo "  LEDGER_DB_QUERY_PORT=5434"
echo ""
echo "To run tests:"
echo "  npm test"
echo ""
echo "To stop databases:"
echo "  docker-compose -f docker-compose.test.yml down"

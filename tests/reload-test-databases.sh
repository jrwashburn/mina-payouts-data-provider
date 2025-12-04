#!/bin/bash

# Reload Test Database Data
# This script refreshes test database data from backups while keeping containers running
# Useful when you want to reset databases between test runs without stopping containers

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🔄 Reloading test database data..."
echo ""

# Function to reload a database
reload_database() {
  local db_name=$1
  local db_container=$2
  local backup_pattern=$3
  local schema_file=$4

  # Look for most recent backup dump
  local latest_dump=$(ls -t "$PROJECT_ROOT/tests/db-backups/${backup_pattern}"*.dump 2>/dev/null | head -1)

  echo "📦 Reloading $db_name database..."

  # Drop and recreate the database
  docker exec "$db_container" psql -U postgres -c "DROP DATABASE IF EXISTS $db_name;" > /dev/null 2>&1 || true
  docker exec "$db_container" psql -U postgres -c "CREATE DATABASE $db_name;" > /dev/null 2>&1 || true

  if [ -n "$latest_dump" ]; then
    echo "  ⏳ Restoring from backup: $(basename "$latest_dump")... (this may take several minutes)"

    # Create temp file for output
    local restore_log=$(mktemp)
    trap "rm -f $restore_log" EXIT

    # Use --clean, --if-exists, --no-owner, and --no-privileges to skip permission conflicts
    if docker exec -i "$db_container" pg_restore -U postgres -d "$db_name" --clean --if-exists --no-owner --no-privileges < "$latest_dump" > "$restore_log" 2>&1; then
      echo "  ✅ Backup restored successfully"
    else
      echo "  ⚠️  Backup restore failed after waiting"
      # Show last few lines of error if restore failed
      if [ -s "$restore_log" ]; then
        echo "  Last error messages:"
        tail -5 "$restore_log" | sed 's/^/    /'
      fi
      echo "  Falling back to schema..."
      docker exec -i "$db_container" psql -U postgres -d "$db_name" < "$schema_file" > /dev/null 2>&1 || true
    fi

    rm -f "$restore_log"
  else
    echo "  ℹ️  No backup found, initializing with schema..."
    docker exec -i "$db_container" psql -U postgres -d "$db_name" < "$schema_file" > /dev/null 2>&1 || true

    # Apply migrations for stakes database
    if [ "$db_name" = "stakes" ]; then
      docker exec -i "$db_container" psql -U postgres -d "$db_name" < "$PROJECT_ROOT/deploy/db-setup/migration-0001.sql" > /dev/null 2>&1 || true
      docker exec -i "$db_container" psql -U postgres -d "$db_name" < "$PROJECT_ROOT/deploy/db-setup/migration-0002.sql" > /dev/null 2>&1 || true
      # Add sample test data if not loaded from backup
      docker exec -i "$db_container" psql -U postgres -d "$db_name" < "$PROJECT_ROOT/tests/setup-test-data.sql" > /dev/null 2>&1 || true
    fi
  fi

  echo "  ✅ $db_name database reloaded"
}

# Reload both databases
reload_database "archive" "mppdp-test-archive" "archive" "$PROJECT_ROOT/deploy/db-setup/createStakesDb.sql"
reload_database "stakes" "mppdp-test-stakes" "stakes" "$PROJECT_ROOT/deploy/db-setup/createStakesDb.sql"

echo ""
echo "✨ Test database data has been reloaded!"
echo ""
echo "Containers are still running. You can:"
echo "  npm run test:integration    # Run tests again"
echo "  npm run test:db:stop        # Stop containers"

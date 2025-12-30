#!/bin/bash

# Quick comparison script for specific endpoints
# Usage: ./quick-compare.sh [max_fork_to_test] [max_fork0_epoch] [max_fork1_epoch] [bp_key]

LOCAL="http://localhost:8080"
PROD="https://api.minastakes.com"
MAX_FORK_TO_TEST=${1:-1}
MAX_FORK0_EPOCH=${2:-79}
MAX_FORK1_EPOCH=${3:-37}
BP_KEY=${4:-"B62qkBqSkXgkirtU3n8HJ9YgwHh3vUD6kGJ5ZRkQYGNPeL5xYL2tL1L"}

# Setup log file
LOGFILE="quick-compare-$(date +%Y%m%d-%H%M%S).log"
exec > >(tee -a "$LOGFILE")
exec 2>&1

echo "Testing Forks 0-$MAX_FORK_TO_TEST (Fork 0: 0-$MAX_FORK0_EPOCH, Fork 1: 0-$MAX_FORK1_EPOCH)"
echo "Block Producer Key: $BP_KEY"
echo "Logging to: $LOGFILE"
echo ""

test_epoch() {
    local epoch=$1
    local fork=$2
    local url="/epoch/$epoch?fork=$fork"
    
    echo "  Testing: $url" >&2
    local_result=$(curl -s "$LOCAL$url")
    prod_result=$(curl -s "$PROD$url")
    
    echo "  LOCAL: $local_result" >&2
    echo "  PROD:  $prod_result" >&2
    
    local_normalized=$(echo "$local_result" | jq -c -S .)
    prod_normalized=$(echo "$prod_result" | jq -c -S .)
    
    if [ "$local_normalized" == "$prod_normalized" ]; then
        echo "✅ Epoch $epoch Fork $fork"
        return 0
    else
        echo "❌ Epoch $epoch Fork $fork - MISMATCH"
        echo "  DIFF:" >&2
        diff <(echo "$local_normalized" | jq .) <(echo "$prod_normalized" | jq .) >&2 || true
        return 1
    fi
}

test_consensus() {
    local url="/consensus"
    
    echo "  Testing: $url" >&2
    local_result=$(curl -s "$LOCAL$url")
    prod_result=$(curl -s "$PROD$url")
    
    echo "  LOCAL: $local_result" >&2
    echo "  PROD:  $prod_result" >&2
    
    local_normalized=$(echo "$local_result" | jq -c -S .)
    prod_normalized=$(echo "$prod_result" | jq -c -S .)
    
    if [ "$local_normalized" == "$prod_normalized" ]; then
        echo "✅ Consensus"
        return 0
    else
        echo "❌ Consensus - MISMATCH"
        echo "  DIFF:" >&2
        diff <(echo "$local_normalized" | jq .) <(echo "$prod_normalized" | jq .) >&2 || true
        return 1
    fi
}

test_blocks() {
    local min_height=$1
    local max_height=$2
    local url="/blocks?key=$BP_KEY&minHeight=$min_height&maxHeight=$max_height"
    
    echo "  Testing: $url" >&2
    local_result=$(curl -s "$LOCAL$url")
    prod_result=$(curl -s "$PROD$url")
    
    echo "  LOCAL: $local_result" >&2
    echo "  PROD:  $prod_result" >&2
    
    # Normalize JSON for comparison
    local_normalized=$(echo "$local_result" | jq -c -S .)
    prod_normalized=$(echo "$prod_result" | jq -c -S .)
    
    if [ "$local_normalized" == "$prod_normalized" ]; then
        echo "✅ Blocks $min_height-$max_height"
        return 0
    else
        echo "❌ Blocks $min_height-$max_height - MISMATCH"
        echo "  DIFF:" >&2
        diff <(echo "$local_normalized" | jq .) <(echo "$prod_normalized" | jq .) >&2 || true
        return 1
    fi
}

test_staking_ledger() {
    local ledger_hash=$1
    local url="/staking-ledgers/$ledger_hash?key=$BP_KEY"
    
    echo "  Testing: $url" >&2
    local_result=$(curl -s "$LOCAL$url")
    local_http_code=$(curl -s -o /dev/null -w "%{http_code}" "$LOCAL$url")
    prod_result=$(curl -s "$PROD$url")
    prod_http_code=$(curl -s -o /dev/null -w "%{http_code}" "$PROD$url")
    
    # Save full responses to separate files for analysis
    local local_file="local-ledger-${ledger_hash}.json"
    local prod_file="prod-ledger-${ledger_hash}.json"
    echo "$local_result" > "$local_file"
    echo "$prod_result" > "$prod_file"
    
    echo "  LOCAL (HTTP $local_http_code): Saved to $local_file" >&2
    echo "  PROD (HTTP $prod_http_code):  Saved to $prod_file" >&2
    
    # Check HTTP codes first
    if [ "$local_http_code" != "$prod_http_code" ]; then
        echo "❌ Staking Ledger $ledger_hash - HTTP CODE MISMATCH (Local: $local_http_code, Prod: $prod_http_code)"
        return 1
    fi
    
    # If both returned error codes, consider it a pass (both don't have the ledger)
    if [ "$local_http_code" != "200" ]; then
        echo "⚠️  Staking Ledger $ledger_hash - Both returned HTTP $local_http_code (skipping)"
        rm -f "$local_file" "$prod_file"  # Clean up error files
        return 0
    fi
    
    # Normalize JSON for comparison (sort keys and stakes array by publicKey)
    local_normalized=$(echo "$local_result" | jq -c -S '.stakes |= sort_by(.publicKey)')
    prod_normalized=$(echo "$prod_result" | jq -c -S '.stakes |= sort_by(.publicKey)')
    
    if [ "$local_normalized" == "$prod_normalized" ]; then
        echo "✅ Staking Ledger $ledger_hash"
        rm -f "$local_file" "$prod_file"  # Clean up matching files
        return 0
    else
        echo "❌ Staking Ledger $ledger_hash - MISMATCH"
        echo "  Full responses saved to $local_file and $prod_file for comparison" >&2
        echo "  You can compare sorted versions with: diff <(jq -S '.stakes |= sort_by(.publicKey)' $local_file) <(jq -S '.stakes |= sort_by(.publicKey)' $prod_file)" >&2
        return 1
    fi
}

PASS=0
FAIL=0

# Generate random epochs for testing
get_random_epochs() {
    local max=$1
    local count=3
    local epochs=()
    
    # If range is smaller than count, test all
    if [ $max -lt $count ]; then
        for i in $(seq 0 $max); do
            epochs+=($i)
        done
    else
        # Generate unique random epochs
        while [ ${#epochs[@]} -lt $count ]; do
            local rand=$((RANDOM % (max + 1)))
            # Check if already in array
            if [[ ! " ${epochs[@]} " =~ " ${rand} " ]]; then
                epochs+=($rand)
            fi
        done
        # Sort the epochs
        IFS=$'\n' epochs=($(sort -n <<<"${epochs[*]}"))
        unset IFS
    fi
    
    echo "${epochs[@]}"
}

# Get max epoch for a given fork
get_max_epoch_for_fork() {
    local fork=$1
    case $fork in
        0) echo $MAX_FORK0_EPOCH ;;
        1) echo $MAX_FORK1_EPOCH ;;
        *) echo 50 ;;  # default for unknown forks
    esac
}

# Test consensus endpoint
echo "━━━ Testing Consensus Endpoint ━━━"
if test_consensus; then
    ((PASS++))
else
    ((FAIL++))
fi
echo ""

# Test epoch endpoint for all forks
for fork in $(seq 0 $MAX_FORK_TO_TEST); do
    MAX_EPOCH=$(get_max_epoch_for_fork $fork)
    
    echo "━━━ Fork $fork: Testing Epochs (5 random from 0-$MAX_EPOCH) ━━━"
    EPOCHS=($(get_random_epochs $MAX_EPOCH))
    echo "Testing epochs: ${EPOCHS[@]}"
    
    for epoch in "${EPOCHS[@]}"; do
        if test_epoch $epoch $fork; then
            ((PASS++))
        else
            ((FAIL++))
        fi
    done
    echo ""
done

# Test blocks endpoint - sample at least 3 blocks from each fork
echo "━━━ Testing Blocks Endpoint ━━━"
for fork in $(seq 0 $MAX_FORK_TO_TEST); do
    echo "Fork $fork: Testing 3 random block ranges"
    MAX_EPOCH=$(get_max_epoch_for_fork $fork)
    
    # Get random epochs to test block ranges
    EPOCHS=($(get_random_epochs $MAX_EPOCH))
    count=0
    for epoch in "${EPOCHS[@]}"; do
        if [ $count -ge 3 ]; then
            break
        fi
        
        # Get block heights for this epoch
        epoch_data=$(curl -s "$LOCAL/epoch/$epoch?fork=$fork" | jq -r '.minBlockHeight, .maxBlockHeight')
        if [ -n "$epoch_data" ]; then
            min_height=$(echo "$epoch_data" | sed -n '1p')
            max_height=$(echo "$epoch_data" | sed -n '2p')
            
            if [ "$min_height" != "null" ] && [ "$max_height" != "null" ]; then
                if test_blocks $min_height $max_height; then
                    ((PASS++))
                else
                    ((FAIL++))
                fi
                ((count++))
            fi
        fi
    done
    echo ""
done

# Test staking-ledgers endpoint - sample at least 1 ledger from each fork
echo "━━━ Testing Staking Ledgers Endpoint ━━━"
for fork in $(seq 0 $MAX_FORK_TO_TEST); do
    echo "Fork $fork: Testing 1 random staking ledger"
    MAX_EPOCH=$(get_max_epoch_for_fork $fork)
    
    # Get a random epoch
    EPOCHS=($(get_random_epochs $MAX_EPOCH))
    epoch=${EPOCHS[0]}
    
    # Get a block from this epoch to extract the staking ledger hash
    epoch_data=$(curl -s "$LOCAL/epoch/$epoch?fork=$fork" | jq -r '.minBlockHeight, .maxBlockHeight')
    if [ -n "$epoch_data" ]; then
        min_height=$(echo "$epoch_data" | sed -n '1p')
        max_height=$(echo "$epoch_data" | sed -n '2p')
        
        if [ "$min_height" != "null" ] && [ "$max_height" != "null" ]; then
            # Get blocks to extract a staking ledger hash
            blocks_data=$(curl -s "$LOCAL/blocks?key=$BP_KEY&minHeight=$min_height&maxHeight=$max_height")
            ledger_hash=$(echo "$blocks_data" | jq -r '.blocks[0].stakingledgerhash' 2>/dev/null)
            
            if [ -n "$ledger_hash" ] && [ "$ledger_hash" != "null" ]; then
                if test_staking_ledger "$ledger_hash"; then
                    ((PASS++))
                else
                    ((FAIL++))
                fi
            else
                echo "⚠️  No staking ledger hash found for Fork $fork Epoch $epoch"
            fi
        fi
    fi
    echo ""
done

echo "━━━ Summary ━━━"
echo "Passed: $PASS"
echo "Failed: $FAIL"

[ $FAIL -eq 0 ] && exit 0 || exit 1

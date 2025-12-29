#!/bin/bash

# Quick comparison script for specific epochs
# Usage: ./quick-compare.sh [max_fork_to_test] [max_fork0_epoch] [max_fork1_epoch] [bp_key]

LOCAL="http://localhost:8080"
PROD="https://api.minastakes.com"
MAX_FORK_TO_TEST=${1:-1}
MAX_FORK0_EPOCH=${1:-79}
MAX_FORK1_EPOCH=${1:-37}
BP_KEY=${4:-"B62qkBqSkXgkirtU3n8HJ9YgwHh3vUD6kGJ5ZRkQYGNPeL5xYL2tL1L"}

echo "Testing Forks 0-$MAX_FORK_TO_TEST (Fork 0: 0-$MAX_FORK0_EPOCH, Fork 1: 0-$MAX_FORK1_EPOCH)"
echo ""

test_epoch() {
    local epoch=$1
    local fork=$2
    local url="/epoch/$epoch?fork=$fork"
    
    local_result=$(curl -s "$LOCAL$url" | jq -c -S .)
    prod_result=$(curl -s "$PROD$url" | jq -c -S .)
    
    if [ "$local_result" == "$prod_result" ]; then
        echo "✅ Epoch $epoch Fork $fork"
        return 0
    else
        echo "❌ Epoch $epoch Fork $fork - MISMATCH"
        return 1
    fi
}

PASS=0
FAIL=0

# Generate random epochs for testing
get_random_epochs() {
    local max=$1
    local count=5
    local epochs=()
    
    # If range is smaller than count, test all
    if [ $max -lt $count ]; then
        for i in $(seq 0 $max); do
            epochs+=($i)
        done
    else
        # Generate 5 unique random epochs
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

# Test all forks
for fork in $(seq 0 $MAX_FORK_TO_TEST); do
    MAX_EPOCH=$(get_max_epoch_for_fork $fork)
    
    echo "━━━ Fork $fork (testing 5 random epochs from 0-$MAX_EPOCH) ━━━"
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

echo "━━━ Summary ━━━"
echo "Passed: $PASS"
echo "Failed: $FAIL"

[ $FAIL -eq 0 ] && exit 0 || exit 1

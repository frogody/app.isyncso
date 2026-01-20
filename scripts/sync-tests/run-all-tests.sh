#!/bin/bash
# run-all-tests.sh - Run all SYNC agent tests

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "================================================"
echo "    SYNC AGENT FULL TEST SUITE"
echo "    $(date)"
echo "================================================"
echo ""

TOTAL_PASSED=0
TOTAL_FAILED=0
TOTAL_SILENT=0

run_test_suite() {
    local script="$1"
    local name="$2"

    echo ""
    echo "================================================"
    echo "  Running: $name"
    echo "================================================"
    echo ""

    if bash "$SCRIPT_DIR/$script"; then
        echo ""
        echo "Suite $name: PASSED"
        ((TOTAL_PASSED++))
    else
        exit_code=$?
        echo ""
        if [ $exit_code -eq 2 ]; then
            echo "Suite $name: CRITICAL (Silent bugs detected)"
            ((TOTAL_SILENT++))
        else
            echo "Suite $name: FAILED"
            ((TOTAL_FAILED++))
        fi
    fi
}

# Voice Tests
run_test_suite "voice-test-basic.sh" "Voice Basic Responses"
run_test_suite "voice-quality-check.sh" "Voice Quality Checks"
run_test_suite "voice-silent-bug-test.sh" "Voice Silent Bug Detection"

# Chat Tests
run_test_suite "chat-test-suite.sh" "Chat Comprehensive Suite"

echo ""
echo "================================================"
echo "    OVERALL SUMMARY"
echo "================================================"
echo "Test Suites Passed: $TOTAL_PASSED"
echo "Test Suites Failed: $TOTAL_FAILED"
echo "Test Suites with Silent Bugs: $TOTAL_SILENT"
echo ""

if [ "$TOTAL_SILENT" -gt 0 ]; then
    echo "OVERALL: CRITICAL - Silent bugs require immediate attention!"
    exit 2
elif [ "$TOTAL_FAILED" -gt 0 ]; then
    echo "OVERALL: FAILING - Some test suites failed"
    exit 1
else
    echo "OVERALL: ALL TESTS PASSING"
    exit 0
fi

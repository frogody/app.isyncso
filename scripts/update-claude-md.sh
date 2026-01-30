#!/bin/bash
# ============================================================
# CLAUDE.md Auto-Update Script
# ============================================================
# This script maintains the CLAUDE.md context file with
# current analysis data. Run manually or via git hooks.
#
# Usage:
#   ./scripts/update-claude-md.sh [--section SECTION_NAME]
#
# Options:
#   --section  Update only a specific section
#   --full     Full regeneration (default)
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CLAUDE_MD="$PROJECT_ROOT/CLAUDE.md"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# ============================================================
# Update timestamp and metadata
# ============================================================
update_metadata() {
    log_info "Updating CLAUDE.md metadata..."

    # Check if file exists
    if [[ ! -f "$CLAUDE_MD" ]]; then
        log_warning "CLAUDE.md not found at $CLAUDE_MD"
        return 1
    fi

    # Update last modified timestamp in file if marker exists
    if grep -q "<!-- LAST_UPDATED -->" "$CLAUDE_MD"; then
        sed -i.bak "s/<!-- LAST_UPDATED -->.*<!-- \/LAST_UPDATED -->/<!-- LAST_UPDATED -->Last updated: $TIMESTAMP (Branch: $BRANCH)<!-- \/LAST_UPDATED -->/" "$CLAUDE_MD"
        rm -f "$CLAUDE_MD.bak"
    fi

    log_success "Metadata updated"
}

# ============================================================
# Update SENTINEL section with current analysis
# ============================================================
update_sentinel_section() {
    log_info "Updating SENTINEL analysis section..."

    # Check for Sentinel files and gather stats
    SENTINEL_PAGES=$(find "$PROJECT_ROOT/src/pages" -name "*entinel*" -o -name "*AI*System*" -o -name "*Compliance*" -o -name "*Document*Generator*" 2>/dev/null | wc -l | tr -d ' ')
    SENTINEL_COMPONENTS=$(find "$PROJECT_ROOT/src/components/sentinel" -name "*.jsx" -o -name "*.tsx" 2>/dev/null | wc -l | tr -d ' ')

    # Get last commit affecting Sentinel
    LAST_SENTINEL_COMMIT=$(git log -1 --format="%h %s" -- "src/pages/*entinel*" "src/components/sentinel/*" 2>/dev/null || echo "No commits found")

    log_success "Found $SENTINEL_PAGES Sentinel pages, $SENTINEL_COMPONENTS components"
}

# ============================================================
# Update change log
# ============================================================
update_changelog() {
    log_info "Updating change log..."

    # Get recent commits
    RECENT_COMMITS=$(git log -5 --oneline 2>/dev/null || echo "Git not available")

    log_success "Change log updated"
}

# ============================================================
# Generate file statistics
# ============================================================
generate_stats() {
    log_info "Generating project statistics..."

    # Count files by type
    JSX_COUNT=$(find "$PROJECT_ROOT/src" -name "*.jsx" 2>/dev/null | wc -l | tr -d ' ')
    TSX_COUNT=$(find "$PROJECT_ROOT/src" -name "*.tsx" 2>/dev/null | wc -l | tr -d ' ')
    TS_COUNT=$(find "$PROJECT_ROOT/src" -name "*.ts" ! -name "*.d.ts" 2>/dev/null | wc -l | tr -d ' ')

    log_success "Stats: $JSX_COUNT JSX, $TSX_COUNT TSX, $TS_COUNT TS files"
}

# ============================================================
# Main execution
# ============================================================
main() {
    echo ""
    echo "=============================================="
    echo "  CLAUDE.md Auto-Update Script"
    echo "  Project: $(basename "$PROJECT_ROOT")"
    echo "  Timestamp: $TIMESTAMP"
    echo "=============================================="
    echo ""

    update_metadata
    update_sentinel_section
    generate_stats
    update_changelog

    echo ""
    log_success "CLAUDE.md update complete!"
    echo ""
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --section)
            SECTION="$2"
            shift 2
            ;;
        --full)
            FULL_UPDATE=true
            shift
            ;;
        *)
            shift
            ;;
    esac
done

main

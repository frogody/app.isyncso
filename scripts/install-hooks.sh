#!/bin/bash
# ============================================================
# Git Hooks Installer for CLAUDE.md Auto-Update
# ============================================================
# This script installs git hooks that automatically update
# CLAUDE.md with current analysis context before each push.
#
# Usage: ./scripts/install-hooks.sh
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
GIT_HOOKS_DIR="$PROJECT_ROOT/.git/hooks"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo "=============================================="
echo "  Git Hooks Installer"
echo "=============================================="
echo ""

# Check if we're in a git repository
if [[ ! -d "$PROJECT_ROOT/.git" ]]; then
    echo "Error: Not a git repository"
    exit 1
fi

# Create hooks directory if it doesn't exist
mkdir -p "$GIT_HOOKS_DIR"

# ============================================================
# Create pre-push hook
# ============================================================
echo -e "${BLUE}[INFO]${NC} Installing pre-push hook..."

cat > "$GIT_HOOKS_DIR/pre-push" << 'HOOK_EOF'
#!/bin/bash
# ============================================================
# Pre-push hook: Updates CLAUDE.md before each push
# ============================================================
# This hook ensures the AI context file is current when
# pushing to the repository.
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"

echo ""
echo "🤖 Pre-push: Updating CLAUDE.md context file..."

# Run the update script if it exists
if [[ -f "$PROJECT_ROOT/scripts/update-claude-md.sh" ]]; then
    bash "$PROJECT_ROOT/scripts/update-claude-md.sh"

    # Check if CLAUDE.md was modified
    if git diff --name-only | grep -q "CLAUDE.md"; then
        echo "📝 CLAUDE.md was updated. Adding to commit..."
        git add CLAUDE.md
        git commit --amend --no-edit 2>/dev/null || true
    fi
else
    echo "⚠️  update-claude-md.sh not found, skipping..."
fi

echo "✅ Pre-push checks complete"
echo ""

exit 0
HOOK_EOF

chmod +x "$GIT_HOOKS_DIR/pre-push"
echo -e "${GREEN}[SUCCESS]${NC} pre-push hook installed"

# ============================================================
# Create post-merge hook (updates after pulling)
# ============================================================
echo -e "${BLUE}[INFO]${NC} Installing post-merge hook..."

cat > "$GIT_HOOKS_DIR/post-merge" << 'HOOK_EOF'
#!/bin/bash
# ============================================================
# Post-merge hook: Logs when CLAUDE.md changes are pulled
# ============================================================

echo ""
echo "🔄 Post-merge: Checking for CLAUDE.md updates..."

# Check if CLAUDE.md was modified in the merge
if git diff HEAD@{1} --name-only | grep -q "CLAUDE.md"; then
    echo "📋 CLAUDE.md was updated in this merge"
    echo "   Review changes: git diff HEAD@{1} CLAUDE.md"
fi

echo ""
HOOK_EOF

chmod +x "$GIT_HOOKS_DIR/post-merge"
echo -e "${GREEN}[SUCCESS]${NC} post-merge hook installed"

# ============================================================
# Make update script executable
# ============================================================
if [[ -f "$PROJECT_ROOT/scripts/update-claude-md.sh" ]]; then
    chmod +x "$PROJECT_ROOT/scripts/update-claude-md.sh"
    echo -e "${GREEN}[SUCCESS]${NC} update-claude-md.sh made executable"
fi

echo ""
echo "=============================================="
echo "  Installation Complete!"
echo "=============================================="
echo ""
echo "Hooks installed:"
echo "  - pre-push: Updates CLAUDE.md before each push"
echo "  - post-merge: Notifies when CLAUDE.md changes are pulled"
echo ""
echo "To manually update CLAUDE.md:"
echo "  ./scripts/update-claude-md.sh"
echo ""

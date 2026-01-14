#!/bin/bash
#
# sync-to-secondary-repo.sh
# Sync commits between main repo and secondary repo for mass-migration
#

set -e

show_help() {
    cat << 'EOF'
SYNC-TO-SECONDARY-REPO

Syncs commits between the main tokenmigration repo and the secondary
rogers-mass-migration repo. Preserves commit order, author, and message.

USAGE:
    ./scripts/sync-to-secondary-repo.sh [OPTIONS] [COMMIT]

OPTIONS:
    --status        Show status of both repos and pending actions
    --dry-run       Show what would be synced without making changes
    --reverse       Sync from secondary repo back to main repo
    --help          Show this help message

ARGUMENTS:
    COMMIT          Start syncing from this specific commit hash

EXAMPLES:
    # Check current sync status
    ./scripts/sync-to-secondary-repo.sh --status

    # Preview what will be synced (main -> secondary)
    ./scripts/sync-to-secondary-repo.sh --dry-run

    # Sync new commits from main to secondary repo
    ./scripts/sync-to-secondary-repo.sh

    # Sync commits from secondary repo back to main
    ./scripts/sync-to-secondary-repo.sh --reverse

    # Sync from a specific commit onwards
    ./scripts/sync-to-secondary-repo.sh abc1234

REPOSITORIES:
    Main:      git@github.com:phinestsoftware/tokenmigration.git
               Contains full codebase including mass-migration/

    Secondary: git@github.com:phinestsoftware/rogers-mass-migration.git
               Contains only mass-migration/ folder (restricted access)

WHY TWO REPOS?
    The secondary repo provides access to mass-migration code for specific
    people without exposing the full codebase. CLAUDE.md files are excluded
    from the secondary repo (internal documentation only).

EXCLUDED FILES:
    The following are NOT synced to secondary repo:
    - CLAUDE.md                         (internal Claude Code instructions)
    - node_modules/                     (install via npm)
    - .terraform/                       (Terraform state directory)
    - dist/                             (build output)
    - local.settings.json               (local Azure Functions settings)
    - terraform.tfvars                  (Terraform variables with secrets)
    - *.tfstate*                        (Terraform state files)
    - tfplan*                           (Terraform plan files)
    - scripts/sync-to-secondary-repo.sh (this script)
    - scripts/query-db.js               (internal database query tool)
    - scripts/benchmark.js              (internal benchmark tool)

WORKFLOW:
    Normal workflow (main -> secondary):
    1. Make changes to mass-migration/ in main repo
    2. Commit and push to main repo
    3. Run: ./scripts/sync-to-secondary-repo.sh

    If someone commits directly to secondary repo:
    1. Run: ./scripts/sync-to-secondary-repo.sh --reverse
    2. Push main repo: git push origin main
    3. Then forward sync again if needed

HOW IT WORKS:
    - Tracks last synced commit in /tmp/mass-migration-repo/.last-sync-commit
    - Finds commits since last sync
    - Applies each commit in order with original author, date, and message
    - Excludes files listed above

NOTE:
    The secondary repo started fresh with no history from the main repo.
    Prefer making changes in the main repo when possible.
EOF
}

# Configuration
MAIN_REPO="/Users/gurvindersingh/projects/rogers/tokenmigration"
SECONDARY_REPO="/tmp/mass-migration-repo"
SECONDARY_REMOTE="https://github.com/phinestsoftware/rogers-mass-migration.git"
SUBFOLDER="mass-migration"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LAST_SYNC_FILE="$SCRIPT_DIR/.last-sync-commit"
LAST_REVERSE_SYNC_FILE="$SCRIPT_DIR/.last-reverse-sync-commit"

# Files/folders to exclude from sync
EXCLUDES=(
    ".git"
    "CLAUDE.md"
    "node_modules"
    "scripts/.last-sync-commit"
    "scripts/.last-reverse-sync-commit"
    ".terraform"
    "dist"
    "local.settings.json"
    "terraform.tfvars"
    ".DS_Store"
    "*.tfstate"
    "*.tfstate.*"
    "tfplan*"
    ".terraform.lock.hcl"
    "scripts/sync-to-secondary-repo.sh"
    "scripts/query-db.js"
    "scripts/benchmark.js"
)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Parse arguments
DRY_RUN=false
REVERSE=false
STATUS=false
START_COMMIT=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --help|-h)
            show_help
            exit 0
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --reverse)
            REVERSE=true
            shift
            ;;
        --status)
            STATUS=true
            shift
            ;;
        *)
            START_COMMIT="$1"
            shift
            ;;
    esac
done

# Ensure secondary repo exists
if [ ! -d "$SECONDARY_REPO/.git" ]; then
    log_info "Cloning secondary repo..."
    rm -rf "$SECONDARY_REPO"
    git clone "$SECONDARY_REMOTE" "$SECONDARY_REPO"
fi

#############################################
# STATUS: Show state of both repos
#############################################
if [ "$STATUS" = true ]; then
    echo ""
    echo "========================================"
    echo "  Repository Sync Status"
    echo "========================================"
    echo ""

    # Main repo status
    echo -e "${GREEN}MAIN REPO${NC} ($MAIN_REPO)"
    echo "----------------------------------------"
    cd "$MAIN_REPO"

    MAIN_BRANCH=$(git rev-parse --abbrev-ref HEAD)
    MAIN_HEAD=$(git log -1 --format='%h' HEAD)
    MAIN_HEAD_MSG=$(git log -1 --format='%s' HEAD)
    MAIN_HEAD_AUTHOR=$(git log -1 --format='%an' HEAD)
    MAIN_HEAD_DATE=$(git log -1 --format='%ar' HEAD)

    echo "  Branch: $MAIN_BRANCH"
    echo "  Latest commit: $MAIN_HEAD - $MAIN_HEAD_MSG"
    echo "  Author: $MAIN_HEAD_AUTHOR ($MAIN_HEAD_DATE)"

    # Check for uncommitted changes
    if ! git diff --quiet -- "$SUBFOLDER/" 2>/dev/null || ! git diff --cached --quiet -- "$SUBFOLDER/" 2>/dev/null; then
        echo -e "  ${YELLOW}⚠ Has uncommitted changes in $SUBFOLDER/${NC}"
    fi

    # Check remote status
    git fetch origin --quiet 2>/dev/null || true
    LOCAL=$(git rev-parse HEAD 2>/dev/null)
    REMOTE=$(git rev-parse origin/$MAIN_BRANCH 2>/dev/null || echo "")
    if [ -n "$REMOTE" ] && [ "$LOCAL" != "$REMOTE" ]; then
        AHEAD=$(git rev-list --count origin/$MAIN_BRANCH..HEAD 2>/dev/null || echo "0")
        BEHIND=$(git rev-list --count HEAD..origin/$MAIN_BRANCH 2>/dev/null || echo "0")
        if [ "$AHEAD" -gt 0 ]; then
            echo -e "  ${YELLOW}⚠ $AHEAD commit(s) ahead of origin (need to push)${NC}"
        fi
        if [ "$BEHIND" -gt 0 ]; then
            echo -e "  ${YELLOW}⚠ $BEHIND commit(s) behind origin (need to pull)${NC}"
        fi
    else
        echo "  ✓ In sync with origin"
    fi

    # Last synced commit for forward sync
    if [ -f "$LAST_SYNC_FILE" ]; then
        LAST_FORWARD=$(cat "$LAST_SYNC_FILE")
        LAST_FORWARD_SHORT=$(cd "$MAIN_REPO" && git log -1 --format='%h' "$LAST_FORWARD" 2>/dev/null || echo "unknown")
        LAST_FORWARD_MSG=$(cd "$MAIN_REPO" && git log -1 --format='%s' "$LAST_FORWARD" 2>/dev/null || echo "")
        echo "  Last forward sync: $LAST_FORWARD_SHORT - $LAST_FORWARD_MSG"
    else
        echo "  Last forward sync: Never"
    fi

    echo ""

    # Secondary repo status
    echo -e "${GREEN}SECONDARY REPO${NC} ($SECONDARY_REMOTE)"
    echo "----------------------------------------"
    cd "$SECONDARY_REPO"
    git fetch origin --quiet 2>/dev/null || true
    git pull origin main --quiet 2>/dev/null || true

    SEC_BRANCH=$(git rev-parse --abbrev-ref HEAD)
    SEC_HEAD=$(git log -1 --format='%h' HEAD)
    SEC_HEAD_MSG=$(git log -1 --format='%s' HEAD)
    SEC_HEAD_AUTHOR=$(git log -1 --format='%an' HEAD)
    SEC_HEAD_DATE=$(git log -1 --format='%ar' HEAD)
    SEC_TOTAL=$(git rev-list --count HEAD)

    echo "  Branch: $SEC_BRANCH"
    echo "  Latest commit: $SEC_HEAD - $SEC_HEAD_MSG"
    echo "  Author: $SEC_HEAD_AUTHOR ($SEC_HEAD_DATE)"
    echo "  Total commits: $SEC_TOTAL"

    # Last reverse synced commit
    if [ -f "$LAST_REVERSE_SYNC_FILE" ]; then
        LAST_REVERSE=$(cat "$LAST_REVERSE_SYNC_FILE")
        LAST_REVERSE_SHORT=$(git log -1 --format='%h' "$LAST_REVERSE" 2>/dev/null || echo "unknown")
        echo "  Last reverse sync: $LAST_REVERSE_SHORT"
    else
        echo "  Last reverse sync: Never"
    fi

    echo ""

    # Pending syncs
    echo -e "${GREEN}PENDING ACTIONS${NC}"
    echo "----------------------------------------"

    # Check forward sync (main -> secondary)
    cd "$MAIN_REPO"
    if [ -f "$LAST_SYNC_FILE" ]; then
        LAST_SYNCED=$(cat "$LAST_SYNC_FILE")
        FORWARD_PENDING=$(git log --oneline "$LAST_SYNCED"..HEAD -- "$SUBFOLDER/" 2>/dev/null | wc -l | tr -d ' ')
    else
        FORWARD_PENDING=$(git log --oneline -- "$SUBFOLDER/" 2>/dev/null | wc -l | tr -d ' ')
    fi

    if [ "$FORWARD_PENDING" -gt 0 ]; then
        echo -e "  ${YELLOW}→ $FORWARD_PENDING commit(s) pending: Main → Secondary${NC}"
        echo "    Run: ./mass-migration/scripts/sync-to-secondary-repo.sh"
    else
        echo "  ✓ Forward sync: Up to date"
    fi

    # Check reverse sync (secondary -> main)
    cd "$SECONDARY_REPO"
    if [ -f "$LAST_REVERSE_SYNC_FILE" ]; then
        LAST_REV_SYNCED=$(cat "$LAST_REVERSE_SYNC_FILE")
        REVERSE_PENDING=$(git log --oneline "$LAST_REV_SYNCED"..HEAD 2>/dev/null | wc -l | tr -d ' ')
    else
        # If never reverse synced, check if secondary has commits not from forward sync
        if [ -f "$LAST_SYNC_FILE" ]; then
            # Compare commit counts - rough heuristic
            REVERSE_PENDING=0
        else
            REVERSE_PENDING=$(git rev-list --count HEAD 2>/dev/null || echo "0")
        fi
    fi

    if [ "$REVERSE_PENDING" -gt 0 ]; then
        echo -e "  ${YELLOW}← $REVERSE_PENDING commit(s) pending: Secondary → Main${NC}"
        echo "    Run: ./mass-migration/scripts/sync-to-secondary-repo.sh --reverse"
    else
        echo "  ✓ Reverse sync: Up to date"
    fi

    echo ""
    echo "========================================"

    exit 0
fi

# Build rsync exclude arguments
RSYNC_EXCLUDES=""
for EXCL in "${EXCLUDES[@]}"; do
    RSYNC_EXCLUDES="$RSYNC_EXCLUDES --exclude=$EXCL"
done

#############################################
# REVERSE SYNC: Secondary -> Main
#############################################
if [ "$REVERSE" = true ]; then
    log_info "Reverse sync: Secondary repo -> Main repo"

    # Pull latest from secondary repo
    cd "$SECONDARY_REPO"
    git pull origin main

    # Get last reverse synced commit
    if [ -n "$START_COMMIT" ]; then
        LAST_SYNCED="$START_COMMIT^"
    elif [ -f "$LAST_REVERSE_SYNC_FILE" ]; then
        LAST_SYNCED=$(cat "$LAST_REVERSE_SYNC_FILE")
        log_info "Last reverse synced commit: $LAST_SYNCED"
    else
        # First reverse sync - start from initial commit
        LAST_SYNCED=$(git log --reverse --format='%H' | head -1)^
        log_info "First reverse sync - checking all commits"
    fi

    # Get commits from secondary repo (oldest first)
    COMMITS=$(git log --reverse --format='%H' "$LAST_SYNCED"..HEAD 2>/dev/null || \
              git log --reverse --format='%H')

    if [ -z "$COMMITS" ]; then
        log_info "No new commits to reverse sync"
        exit 0
    fi

    # Count commits
    COMMIT_COUNT=$(echo "$COMMITS" | wc -l | tr -d ' ')
    log_info "Found $COMMIT_COUNT commit(s) in secondary repo"

    if [ "$DRY_RUN" = true ]; then
        echo ""
        log_info "Commits that would be synced to main repo (dry-run):"
        echo "----------------------------------------"
        for HASH in $COMMITS; do
            AUTHOR=$(git log -1 --format='%an' "$HASH")
            MSG=$(git log -1 --format='%s' "$HASH")
            echo "  $HASH - $AUTHOR: $MSG"
        done
        exit 0
    fi

    # Process each commit
    SYNCED=0
    for HASH in $COMMITS; do
        cd "$SECONDARY_REPO"

        # Get commit metadata
        AUTHOR=$(git log -1 --format='%an <%ae>' "$HASH")
        AUTHOR_DATE=$(git log -1 --format='%ai' "$HASH")
        MSG=$(git log -1 --format='%B' "$HASH")
        SHORT_HASH=$(git log -1 --format='%h' "$HASH")

        log_info "Reverse syncing commit $SHORT_HASH: $(echo "$MSG" | head -1)"

        # Checkout the specific commit's version
        git checkout "$HASH" -- .

        # Sync files to main repo's mass-migration folder (excluding CLAUDE.md etc)
        rsync -av --delete $RSYNC_EXCLUDES \
            "$SECONDARY_REPO/" "$MAIN_REPO/$SUBFOLDER/"

        # Restore secondary repo to HEAD
        git checkout HEAD -- .

        # Commit in main repo
        cd "$MAIN_REPO"
        git add "$SUBFOLDER/"

        # Check if there are changes to commit
        if git diff --cached --quiet; then
            log_warn "No changes to commit (commit may already exist in main repo)"
            echo "$HASH" > "$LAST_REVERSE_SYNC_FILE"
            continue
        fi

        # Commit with original author and date
        GIT_AUTHOR_DATE="$AUTHOR_DATE" git commit --author="$AUTHOR" -m "$MSG"

        # Save last reverse synced commit
        echo "$HASH" > "$LAST_REVERSE_SYNC_FILE"

        SYNCED=$((SYNCED + 1))
    done

    if [ $SYNCED -gt 0 ]; then
        log_info "Synced $SYNCED commit(s) to main repo"
        log_warn "Don't forget to push main repo: cd $MAIN_REPO && git push origin main"
    else
        log_info "No commits were synced"
    fi

    exit 0
fi

#############################################
# FORWARD SYNC: Main -> Secondary
#############################################
log_info "Forward sync: Main repo -> Secondary repo"

# Get the last synced commit
if [ -n "$START_COMMIT" ]; then
    LAST_SYNCED="$START_COMMIT^"  # Start from parent of specified commit
elif [ -f "$LAST_SYNC_FILE" ]; then
    LAST_SYNCED=$(cat "$LAST_SYNC_FILE")
    log_info "Last synced commit: $LAST_SYNCED"
else
    # First time sync - secondary repo was initialized from this commit
    # (this is the baseline from when rogers-mass-migration was created)
    LAST_SYNCED="3415672"
    log_info "First sync - using baseline commit: $LAST_SYNCED (fix issues with flie name)"
fi

# Get list of commits to sync (oldest first)
cd "$MAIN_REPO"
COMMITS=$(git log --reverse --format='%H' "$LAST_SYNCED"..HEAD -- "$SUBFOLDER/" 2>/dev/null || \
          git log --reverse --format='%H' -- "$SUBFOLDER/")

if [ -z "$COMMITS" ]; then
    log_info "No new commits to sync"
    exit 0
fi

# Count commits
COMMIT_COUNT=$(echo "$COMMITS" | wc -l | tr -d ' ')
log_info "Found $COMMIT_COUNT commit(s) to sync"

if [ "$DRY_RUN" = true ]; then
    echo ""
    log_info "Commits that would be synced (dry-run):"
    echo "----------------------------------------"
    for HASH in $COMMITS; do
        AUTHOR=$(git log -1 --format='%an' "$HASH")
        MSG=$(git log -1 --format='%s' "$HASH")
        echo "  $HASH - $AUTHOR: $MSG"
    done
    exit 0
fi

# Process each commit
SYNCED=0
for HASH in $COMMITS; do
    cd "$MAIN_REPO"

    # Get commit metadata
    AUTHOR=$(git log -1 --format='%an <%ae>' "$HASH")
    AUTHOR_DATE=$(git log -1 --format='%ai' "$HASH")
    MSG=$(git log -1 --format='%B' "$HASH")
    SHORT_HASH=$(git log -1 --format='%h' "$HASH")

    log_info "Syncing commit $SHORT_HASH: $(echo "$MSG" | head -1)"

    # Extract the specific commit's version of mass-migration to a temp directory
    # (git checkout doesn't remove files that don't exist in that commit)
    TEMP_DIR=$(mktemp -d)
    git archive "$HASH" -- "$SUBFOLDER/" | tar -xf - -C "$TEMP_DIR"

    # Sync files to secondary repo
    rsync -av --delete $RSYNC_EXCLUDES \
        "$TEMP_DIR/$SUBFOLDER/" "$SECONDARY_REPO/"

    # Clean up temp directory
    rm -rf "$TEMP_DIR"

    # Commit in secondary repo
    cd "$SECONDARY_REPO"
    git add -A

    # Check if there are changes to commit (might be empty if only CLAUDE.md changed)
    if git diff --cached --quiet; then
        log_warn "No changes to commit (possibly only excluded files changed)"
        continue
    fi

    # Commit with original author and date
    GIT_AUTHOR_DATE="$AUTHOR_DATE" git commit --author="$AUTHOR" -m "$MSG"

    # Save last synced commit
    echo "$HASH" > "$LAST_SYNC_FILE"

    SYNCED=$((SYNCED + 1))
done

# Push to remote
if [ $SYNCED -gt 0 ]; then
    log_info "Pushing $SYNCED commit(s) to remote..."
    cd "$SECONDARY_REPO"
    git push origin main
    log_info "Sync complete!"
else
    log_info "No commits were synced"
fi

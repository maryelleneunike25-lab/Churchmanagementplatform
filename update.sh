#!/bin/bash
set -e

# Navigate to the script's directory
cd "$(dirname "$0")"

echo "========================================="
echo " Pushing Updates to GBI Jeltim GitHub Repo"
echo "========================================="

# 1. Build check
if command -v npm &> /dev/null; then
    echo "Building GBI Jeltim Website..."
    if ! npm run build; then
        echo "[ERROR] Build failed! Aborting."
        exit 1
    fi
else
    echo "[INFO] npm tidak ditemukan di sistem lokal, melewati build lokal."
    echo "       (Build akan otomatis diproses oleh Vercel / GitHub CI saat push)."
fi

echo ""
# In non-interactive environments, default to COMMIT_MSG
if [ -t 0 ]; then
    read -r -p "Enter commit message (default: Update website): " COMMIT_MSG
fi

if [ -z "$COMMIT_MSG" ]; then
    COMMIT_MSG="Update website"
fi

echo ""
echo "Staging all changes..."
git add -A

echo "Committing with message: \"$COMMIT_MSG\""
# Allow commit to exit cleanly if there is nothing to commit
git commit -m "$COMMIT_MSG" || echo "No changes to commit."

echo ""
echo "Pushing to GitHub (origin main)..."
if git push origin main; then
    echo ""
    echo "[SUCCESS] Project successfully updated on GitHub!"
else
    echo ""
    echo "[ERROR] Failed to push to GitHub."
    exit 1
fi

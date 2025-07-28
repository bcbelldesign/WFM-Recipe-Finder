#!/bin/bash

# Script to create a clean git bundle for the Vibe Sandbox project
# This removes all problematic git history and creates a distribution-ready bundle
#
# What this script does:
# 1. Creates a temporary clean git repository (NOT cloning into itself)
# 2. Copies only essential source files (excludes node_modules, .git, bundles, etc.)
# 3. Creates a single clean commit with current state
# 4. Generates a lightweight bundle (~78KB vs ~85MB with history)
# 5. Verifies the bundle works correctly
#
# This is NOT cloning the repo into itself - it creates a brand new, clean repository
# with just the current state of files, eliminating all git history bloat.

set -e  # Exit on any error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR"
BUNDLE_NAME="vibe-sandbox.bundle"
TEMP_DIR="vibe-clean-temp-$(date +%s)"  # Add timestamp to avoid conflicts

echo "🧹 Creating clean Vibe Sandbox bundle..."
echo "📍 Working directory: $PROJECT_DIR"

# Show current bundle size if it exists
if [ -f "$PROJECT_DIR/$BUNDLE_NAME" ]; then
    OLD_SIZE=$(ls -lah "$PROJECT_DIR/$BUNDLE_NAME" | awk '{print $5}')
    echo "📦 Current bundle size: $OLD_SIZE"
    echo "🗑️  Removing existing bundle: $BUNDLE_NAME"
    rm "$PROJECT_DIR/$BUNDLE_NAME"
fi

# Create temporary clean directory
echo "🔧 Setting up temporary clean repository..."
cd "$PROJECT_DIR/.."
rm -rf "$TEMP_DIR"
mkdir "$TEMP_DIR"
cd "$TEMP_DIR"

# Initialize new git repo with main branch (not master)
git init --initial-branch=main

# Copy files excluding problematic ones
echo "📋 Copying source files (excluding node_modules, bundles, .git, etc.)..."
rsync -av \
    --exclude='*.bundle' \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='build' \
    --exclude='dist' \
    --exclude='*.log' \
    --exclude='.DS_Store' \
    --exclude='coverage' \
    --exclude='.nyc_output' \
    --exclude='*.tmp' \
    --exclude='*.temp' \
    --exclude='.cache' \
    "../$(basename "$PROJECT_DIR")/" ./

# Show what files are being included
echo "📄 Files being bundled:"
find . -type f -not -path './.git/*' | head -20
TOTAL_FILES=$(find . -type f -not -path './.git/*' | wc -l)
echo "   ... and $(($TOTAL_FILES - 20)) more files (total: $TOTAL_FILES files)"

# Add and commit clean files
echo "✅ Committing clean files..."
git add .
git commit -m "Clean Vibe Sandbox - ready for distribution

This bundle contains only the essential source code and configuration files.
Recipients should run 'npm install' to install dependencies.

Bundle created from: $(basename "$PROJECT_DIR")
Generated on: $(date)
Git commit: $(cd "../$(basename "$PROJECT_DIR")" && git rev-parse --short HEAD 2>/dev/null || echo "unknown")
"

# Create the bundle
echo "📦 Creating bundle: $BUNDLE_NAME"
git bundle create "../$(basename "$PROJECT_DIR")/$BUNDLE_NAME" --all

# Clean up temporary directory
echo "🧽 Cleaning up temporary files..."
cd ..
rm -rf "$TEMP_DIR"

# Verify the bundle
echo "🔍 Verifying bundle..."
cd "$(basename "$PROJECT_DIR")"
if git bundle verify "$BUNDLE_NAME" >/dev/null 2>&1; then
    BUNDLE_SIZE=$(ls -lah "$BUNDLE_NAME" | awk '{print $5}')
    BUNDLE_SIZE_BYTES=$(ls -l "$BUNDLE_NAME" | awk '{print $5}')
    
    echo "✅ Bundle created successfully!"
    echo "📊 Bundle size: $BUNDLE_SIZE ($BUNDLE_SIZE_BYTES bytes)"
    echo "📍 Location: $PROJECT_DIR/$BUNDLE_NAME"
    
    # Test clone the bundle to make sure it works
    echo "🧪 Testing bundle by cloning..."
    TEST_DIR="bundle-test-$(date +%s)"
    cd /tmp
    rm -rf "$TEST_DIR"
    if git clone "$PROJECT_DIR/$BUNDLE_NAME" "$TEST_DIR" >/dev/null 2>&1; then
        cd "$TEST_DIR"
        if [ -f "package.json" ]; then
            echo "✅ Bundle test successful - package.json found"
            cd /tmp && rm -rf "$TEST_DIR"
        else
            echo "❌ Bundle test failed - package.json missing"
            cd /tmp && rm -rf "$TEST_DIR"
            exit 1
        fi
    else
        echo "❌ Bundle test failed - could not clone"
        exit 1
    fi
    
    echo ""
    echo "🚀 Usage instructions for recipients:"
    echo "   git clone $BUNDLE_NAME vibe-sandbox"
    echo "   cd vibe-sandbox"
    echo "   npm install"
    echo "   npm start"
    echo ""
    echo "💡 Bundle benefits:"
    echo "   • No git history bloat (single clean commit)"
    echo "   • No node_modules included (installed via npm install)"
    echo "   • Fast download and clone times"
    echo "   • Uses 'main' branch (no master/main warnings)"
else
    echo "❌ Bundle verification failed!"
    exit 1
fi

echo "🎉 Clean bundle creation complete!"

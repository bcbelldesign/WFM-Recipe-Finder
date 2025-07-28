# Vibe Sandbox Bundle Creation

This directory contains a script to create clean, distribution-ready git bundles of the Vibe Sandbox project.

## Quick Usage

```bash
./create-clean-bundle.sh
```

This will create/replace `vibe-sandbox.bundle` in the current directory.

## What the Script Does

**Important**: This is NOT cloning the repo into itself. Instead, it creates a brand new, clean repository with just the current state of files.

1. **Removes existing bundle** - Deletes any existing `vibe-sandbox.bundle`
2. **Creates clean repository** - Sets up a temporary git repository with `main` branch
3. **Copies source files** - Excludes problematic files like:
   - `node_modules/` (dependencies installed via npm)
   - `*.bundle` files (previous bundles)
   - `.git/` directory (eliminates git history bloat)
   - `build/`, `dist/` directories (generated files)
   - Log files, cache files, and OS files
4. **Creates fresh commit** - Single clean commit with timestamp and source info
5. **Generates bundle** - Creates the final `vibe-sandbox.bundle` with `--all` flag
6. **Tests bundle** - Automatically clones and verifies the bundle works
7. **Cleans up** - Removes temporary files

## Bundle Benefits

- **Size**: ~78KB (vs 85MB with full git history)
- **Speed**: Fast download and clone times
- **Clean**: No git history bloat, single commit
- **Compatible**: Uses `main` branch (no master/main warnings)
- **Complete**: All source code and configuration included
- **Efficient**: Dependencies installed fresh via `npm install`

## For Recipients

Share these instructions with people receiving the bundle:

```bash
# Clone the bundle
git clone vibe-sandbox.bundle vibe-sandbox

# Install dependencies
cd vibe-sandbox
npm install

# Start development server
npm start
```

## When to Run This Script

- Before sharing the project with others
- When the bundle size has grown too large
- After making significant changes to the project
- When you want a clean distribution without git history

## Troubleshooting

If the script fails:

1. **Permission denied**: Run `chmod +x create-clean-bundle.sh`
2. **Git errors**: Ensure you're in a git repository
3. **Space issues**: Check available disk space (script needs ~200MB temporarily)
4. **Bundle verification fails**: Check if all required files are being copied
5. **Test clone fails**: Verify the bundle was created correctly

## Script Location

The script should be run from the project root directory where `package.json` is located.

## Technical Details

The process creates a completely separate, temporary git repository that:
- Contains only the current working state of files
- Has no connection to the original repository's history
- Uses a single commit with metadata about the source
- Generates a lightweight bundle suitable for distribution

This approach respects git repository integrity rules by never modifying the original repository's history.

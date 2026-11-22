#!/usr/bin/env bash
# Builds the read-only preview for GitHub Pages into ./out
# The admin and upload parts need a server, so they are left out of this build.
set -euo pipefail
cd "$(dirname "$0")/.."
STASH=.pages-stash
rm -rf "$STASH" && mkdir -p "$STASH"
restore() { for d in admin api media; do [ -e "$STASH/$d" ] && mv "$STASH/$d" "app/$d"; done; rm -rf "$STASH"; }
trap restore EXIT
for d in admin api media; do mv "app/$d" "$STASH/$d"; done
STATIC_EXPORT=1 npx next build
touch out/.nojekyll

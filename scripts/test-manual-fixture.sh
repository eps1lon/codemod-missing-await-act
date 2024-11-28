#!/usr/bin/env bash
# Simple test runner for upgrade fixtures.
# For manual verification only (check the README.md) in the fixtures
# for the expected behavior.
# Usage:
# - cwd must repo root
# - `yarn test:manual-fixture <fixture-name> <...codemod-args>`

CODEMOD_BIN=$(pwd)/bin/codemod-missing-await-act.cjs
cd "$1" || exit 1
# We're only interested in the changes the upgrade command does.
git add -A .
node "$CODEMOD_BIN" . "${@:2}"
git --no-pager diff .
git restore .
git reset --quiet HEAD -- .

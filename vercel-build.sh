#!/usr/bin/env bash
# Build entry point used by the Vercel project ("bash vercel-build.sh").
# When the deployment comes from Git the source is already checked out, so
# this simply runs the standard Next.js production build.
set -euo pipefail
npx next build

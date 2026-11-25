#!/usr/bin/env bash
# Build and put a new version live.
#
# The build goes into .next-new while the running server keeps serving from
# .next; only when it succeeds are the two swapped and the app restarted.
# Building straight into .next deletes files the live server still needs,
# which is how /penilaian broke for a visitor during an earlier deploy.
set -euo pipefail
cd "$(dirname "$0")/.."
export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}"

rm -rf .next-new
NEXT_DIST_DIR=.next-new bunx next build
[ -f .next-new/BUILD_ID ] || { echo "Build gagal; versi yang berjalan tidak diubah." >&2; exit 1; }

rm -rf .next-old
[ -d .next ] && mv .next .next-old
mv .next-new .next
systemctl --user restart pemdi-app.service
until curl -s -o /dev/null -m 3 localhost:3100/login; do sleep 1; done
rm -rf .next-old
echo "Versi baru aktif."

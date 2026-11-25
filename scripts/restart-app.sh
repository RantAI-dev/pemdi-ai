#!/usr/bin/env bash
# Restart the production server on port 3100 (run `bun run build` first).
# The app runs as the user service pemdi-app; the tunnel as pemdi-tunnel.
export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}"
systemctl --user restart pemdi-app.service

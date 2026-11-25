#!/usr/bin/env bash
# Menyalakan lagi lakehouse bila API-nya tidak menjawab (dipanggil timer
# systemd pemdi-lakehouse-jaga). Data ada di volume, jadi aman diulang.
set -euo pipefail
curl -s -o /dev/null -m 10 http://127.0.0.1:8080/health && exit 0
echo "Lakehouse tidak menjawab; menyalakan ulang."
exec "$(dirname "$0")/lakehouse.sh" start

#!/usr/bin/env bash
# Turn the AI on: store the LLM key, check it, restart what reads it, and run
# the whole pipeline over the documents already in the registry.
#
#   scripts/aktifkan-ai.sh            asks for the key (input is hidden)
#   LLM_KEY=... scripts/aktifkan-ai.sh
#
# LLM_URL and LLM_MODEL are taken from infra/lakehouse.env (default: MiniMax).
set -euo pipefail
cd "$(dirname "$0")/.."
ENV=infra/lakehouse.env

get() { grep -E "^$1=" "$ENV" | tail -1 | cut -d= -f2-; }
URL="$(get LLM_URL)"; MODEL="$(get LLM_MODEL)"
KEY="${LLM_KEY:-}"
if [ -z "$KEY" ]; then
  read -r -s -p "LLM key untuk $MODEL ($URL): " KEY; echo
fi
[ -n "$KEY" ] || { echo "Key kosong." >&2; exit 1; }

echo "Memeriksa key ..."
code=$(curl -s -o /tmp/llm-check.json -w '%{http_code}' -m 60 "${URL%/}/chat/completions" \
  -H "authorization: Bearer $KEY" -H 'content-type: application/json' \
  -d "{\"model\":\"$MODEL\",\"max_tokens\":16,\"messages\":[{\"role\":\"user\",\"content\":\"Balas: ok\"}]}")
if [ "$code" != 200 ]; then
  echo "LLM menolak key ini (HTTP $code): $(head -c 300 /tmp/llm-check.json)" >&2
  exit 1
fi

# Written with python so a key containing sed metacharacters is stored as is.
KEY="$KEY" python3 - "$ENV" <<'PY'
import os, re, sys
p = sys.argv[1]; s = open(p).read()
s = re.sub(r"^LLM_KEY=.*$", lambda m: "LLM_KEY=" + os.environ["KEY"], s, flags=re.M)
open(p, "w").write(s)
PY
chmod 600 "$ENV"

echo "Memulai ulang lakehouse API dan aplikasi ..."
scripts/lakehouse.sh up >/dev/null 2>&1
until curl -s -m 3 localhost:8080/health | grep -q ok; do sleep 2; done
bun run scripts/lakehouse-bootstrap.ts
scripts/restart-app.sh
until curl -s -o /dev/null -m 3 localhost:3100/api/dokumen; do sleep 2; done

echo "Menjalankan AI atas semua dokumen ..."
curl -s -X POST localhost:3100/api/dokumen -H 'content-type: application/json' -d '{"ids":"semua"}'; echo
echo "Pantau di http://localhost:3100/dokumen (sekitar 20-40 menit untuk 138 dokumen)."

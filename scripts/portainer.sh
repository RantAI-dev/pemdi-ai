#!/usr/bin/env bash
# Pindahkan / perbarui Pemdi-AI di host Docker yang dikelola Portainer.
#
#   scripts/portainer.sh build <tag>      bangun image aplikasi DI HOST TUJUAN
#   scripts/portainer.sh volumes          salin volume lakehouse, data/ dan konfigurasi tunnel
#   scripts/portainer.sh sumber           unggah semua kumpulan sumber/ + dokumen asli ke volume pemdi-ai_sumber
#   scripts/portainer.sh stack <tag> [tag lakehouse]   buat/perbarui stack "pemdi-ai"
#   scripts/portainer.sh token            perbarui token JWT lakehouse (berlaku 30 hari, tidak diperbarui otomatis)
#
# Butuh PORTAINER_KEY di .env. PORTAINER_URL dan PORTAINER_ENDPOINT bisa diatur.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
set -a; . "$ROOT/.env"; set +a
PORTAINER_URL="${PORTAINER_URL:-https://192.168.18.148:9443}"
EP="${PORTAINER_ENDPOINT:-3}"
API="$PORTAINER_URL/api"
D="$API/endpoints/$EP/docker"
# Kunci lewat berkas, bukan argumen, supaya tidak tampak di daftar proses.
HDR=$(mktemp); chmod 600 "$HDR"; trap 'rm -f "$HDR"' EXIT
printf 'X-API-Key: %s\n' "$PORTAINER_KEY" > "$HDR"
pc() { curl -skf -H @"$HDR" "$@"; }

# upload_volume <volume tujuan> <tar isi volume>
upload_volume() {
  local vol=$1 tarfile=$2 tmp id
  tmp=$(mktemp -d)
  cp "$tarfile" "$tmp/in.tar"
  tar -C "$tmp" -cf "$tmp/outer.tar" in.tar
  pc -X POST -H 'Content-Type: application/json' -d "{\"Name\":\"$vol\"}" "$D/volumes/create" >/dev/null
  pc -X DELETE "$D/containers/pemdi-ai-pulihkan?force=1" >/dev/null 2>&1 || true
  id=$(pc -X POST -H 'Content-Type: application/json' "$D/containers/create?name=pemdi-ai-pulihkan" -d "{
    \"Image\":\"alpine:3.20\",
    \"Cmd\":[\"sh\",\"-c\",\"find /v -mindepth 1 -delete && tar -xf /in.tar -C /v && du -sh /v\"],
    \"HostConfig\":{\"Binds\":[\"$vol:/v\"]}}" | jq -r .Id)
  pc -X PUT -H 'Content-Type: application/x-tar' --data-binary @"$tmp/outer.tar" "$D/containers/$id/archive?path=/" >/dev/null
  pc -X POST "$D/containers/$id/start" >/dev/null
  local code; code=$(pc -X POST "$D/containers/$id/wait" | jq -r .StatusCode)
  echo "$vol: $(pc "$D/containers/$id/logs?stdout=1&stderr=1" | tr -cd '[:print:]\n' | tail -1) (exit $code)"
  pc -X DELETE "$D/containers/$id?force=1" >/dev/null
  rm -rf "$tmp"
  [ "$code" = 0 ]
}

case "${1:-}" in
  build)
    tag=$2; ctx=$(mktemp)
    tar -C "$ROOT" --exclude-vcs --exclude=./node_modules --exclude=./.next --exclude=./.next-new \
      --exclude=./.next-old --exclude=./data --exclude=./sumber --exclude=./TBB --exclude=./infra --exclude=./.env \
      --exclude=./.env.local --exclude='*.tsbuildinfo' --exclude=__pycache__ --exclude='./deploy/stack*.yml' -cf "$ctx" .
    pc -N -m 3000 -H 'Content-Type: application/x-tar' --data-binary @"$ctx" \
      "$D/build?t=pemdi-ai/app:$tag&dockerfile=deploy/Dockerfile&rm=1&forcerm=1" \
      | jq -r '.stream // .error // empty' | grep -v '^\s*$' | tee /tmp/pemdi-build.txt | tail -3
    rm -f "$ctx"
    ! grep -q -E "returned a non-zero code|^ERROR" /tmp/pemdi-build.txt
    ;;
  volumes)
    w=$(mktemp -d)
    for v in clickhouse_data connector_secrets oidc_data oidc_tokens postgres_data rustfs_data; do
      docker run --rm -v "pemdi-lakehouse_lakehouse_$v:/v:ro" alpine:3.20 tar -C /v -cf - . > "$w/$v.tar"
      upload_volume "pemdi-ai_lakehouse_$v" "$w/$v.tar"
    done
    tar -C "$ROOT/data" -cf "$w/app.tar" .
    upload_volume pemdi-ai_app_data "$w/app.tar"
    # Tunnel: kredensial yang sama, layanan diarahkan ke kontainer app.
    t=$(awk '/^tunnel:/{print $2}' ~/.cloudflared/pemdi-ai.yml)
    mkdir "$w/cf"
    cp ~/.cloudflared/"$t".json "$w/cf/kredensial.json"
    printf 'tunnel: %s\ncredentials-file: /etc/cloudflared/kredensial.json\ningress:\n  - hostname: pemdi.rantai.dev\n    service: http://app:3100\n  - service: http_status:404\n' "$t" > "$w/cf/config.yml"
    chmod 644 "$w/cf/"*
    tar -C "$w/cf" -cf "$w/cf.tar" .
    upload_volume pemdi-ai_cloudflared "$w/cf.tar"
    rm -rf "$w"
    ;;
  sumber)
    # Volume khusus berkas sumber: aman bila dihapus/ditulis ulang (hanya berisi
    # PDF/laporan sumber dan salinan dokumen asli untuk tautan halaman di dasbor).
    # Semua subfolder sumber/ yang punya manifest.json ikut, ditambah dokumen/.
    w=$(mktemp -d)
    kumpulan=()
    # SUMBER_LEWATI="prosn spm" melewatkan folder yang belum ditampilkan (default: prosn, lihat src/lib/fitur.ts).
    lewati=" ${SUMBER_LEWATI-prosn} "
    for d in "$ROOT"/sumber/*/; do
      n=$(basename "$d")
      [[ "$lewati" == *" $n "* ]] && continue
      [ -f "$d/manifest.json" ] && kumpulan+=("$n")
    done
    kumpulan+=(dokumen)
    tar -C "$ROOT/sumber" -cf "$w/sumber.tar" "${kumpulan[@]}"
    upload_volume pemdi-ai_sumber "$w/sumber.tar"
    rm -rf "$w"
    ;;
  stack)
    "$ROOT/scripts/portainer-stack.py" "${@:2}" >/dev/null
    body=$(jq -n --rawfile f "$ROOT/deploy/stack.yml" '{name:"pemdi-ai", stackFileContent:$f, env:[]}')
    id=$(pc "$API/stacks" | jq -r '.[] | select(.Name=="pemdi-ai") | .Id')
    if [ -n "$id" ]; then
      pc -X PUT -H 'Content-Type: application/json' "$API/stacks/$id?endpointId=$EP" \
        -d "$(jq -n --rawfile f "$ROOT/deploy/stack.yml" '{stackFileContent:$f, env:[], prune:true, pullImage:false}')" | jq -r '"stack \(.Id) \(.Name) diperbarui"'
    else
      pc -m 900 -X POST -H 'Content-Type: application/json' "$API/stacks/create/standalone/string?endpointId=$EP" -d "$body" | jq -r '"stack \(.Id) \(.Name) dibuat"'
      id=$(pc "$API/stacks" | jq -r '.[] | select(.Name=="pemdi-ai") | .Id')
    fi
    # Portainer menjawab sebelum compose selesai; tunggu hasilnya (1 aktif, 4 gagal).
    sleep 5
    for _ in $(seq 120); do
      st=$(pc "$API/stacks/$id")
      case $(jq -r .Status <<<"$st") in
        1) echo "stack aktif"; exit 0 ;;
        4) jq -r '.DeploymentStatus[-1].Message' <<<"$st" >&2; exit 1 ;;
      esac
      sleep 5
    done
    echo "stack belum selesai setelah 10 menit" >&2; exit 1
    ;;
  token)
    # oidc-mock membuat token tiap principal sekali dan tidak memperbaruinya.
    # Setelah 30 hari kueri ke icecat_api.* gagal "Authentication failed".
    # Kunci penanda tangan tetap, jadi cukup pindahkan token lama, restart
    # oidc-mock agar membuat yang baru, lalu restart pemakainya.
    D="$API/endpoints/$EP/docker"
    ex() {  # ex <container> <perintah sh>
      local id
      id=$(pc -X POST -H 'Content-Type: application/json' "$D/containers/$1/exec" \
        -d "$(jq -n --arg c "$2" '{AttachStdout:true,AttachStderr:true,Cmd:["sh","-c",$c]}')" | jq -r .Id)
      pc -X POST -H 'Content-Type: application/json' "$D/exec/$id/start" -d '{"Detach":false,"Tty":true}'
    }
    ex pemdi-ai-oidc-mock-1 'd=/tokens/lama-$(date -u +%Y%m%d%H%M); mkdir -p $d && mv /tokens/*.jwt $d/'
    pc -X POST "$D/containers/pemdi-ai-oidc-mock-1/restart" >/dev/null
    until [ "$(ex pemdi-ai-oidc-mock-1 'ls /tokens/*.jwt 2>/dev/null | wc -l' | tr -dc 0-9)" -ge 9 ]; do sleep 2; done
    for c in lakekeeper clickhouse lakehouse-api dagster-code-location dagster-daemon dagster-webserver; do
      pc -X POST "$D/containers/pemdi-ai-$c-1/restart" >/dev/null && echo "restart $c"
    done
    echo "token baru berlaku sampai $(date -u -d '+30 days' +%F)"
    ;;
  *) sed -n '2,10p' "$0"; exit 1 ;;
esac

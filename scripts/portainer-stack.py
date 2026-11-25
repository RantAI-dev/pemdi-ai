#!/usr/bin/env python3
"""Tulis deploy/stack.yml: stack Portainer berisi lakehouse + aplikasi + tunnel.

Usage: scripts/portainer-stack.py <tag aplikasi> [tag lakehouse]

Konfigurasi lakehouse diambil dari compose repo lakehouse (diselesaikan dengan
infra/lakehouse.env), lalu: build diganti image pemdi-ai/<layanan>:<tag lakehouse> yang
sudah dikirim ke host (image lakehouse tidak ikut dibangun ulang tiap rilis
aplikasi), port host dibuang, dan volume memakai volume eksternal
pemdi-ai_* yang datanya diunggah lebih dulu. Hasilnya memuat rahasia, jadi
berkasnya mode 600 dan tidak masuk git.
"""
import os, subprocess, sys, yaml
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LAKEHOUSE_DIR = Path(os.environ.get("LAKEHOUSE_DIR", Path.home() / "rantai/RantAI-Lakehouse"))
SERVICES = ["lakehouse-api", "clickhouse-iceberg-init", "dagster-code-location", "dagster-webserver", "dagster-daemon"]
BUILT = ["lakehouse-api", "dagster-code-location", "dagster-webserver", "dagster-daemon", "oidc-mock"]
tag = sys.argv[1]
# Image lakehouse yang dikirim saat pindah ke Portainer.
lh_tag = sys.argv[2] if len(sys.argv) > 2 else "202610150358"

env = dict(os.environ, GIT_SHA=subprocess.check_output(["git", "-C", str(LAKEHOUSE_DIR), "rev-parse", "HEAD"], text=True).strip())
rendered = subprocess.check_output(
    ["docker", "compose", "-p", "pemdi-lakehouse", "--env-file", str(ROOT / "infra/lakehouse.env"),
     "-f", str(LAKEHOUSE_DIR / "docker-compose.yml"), "--profile", "dagster", "config", *SERVICES],
    text=True, env=env)
stack = yaml.safe_load(rendered)
stack.pop("name", None)
stack["networks"] = {"default": {"name": "pemdi-ai_default"}}

for name, svc in stack["services"].items():
    svc.pop("ports", None)
    svc.pop("profiles", None)  # Portainer tidak mengaktifkan profile
    if svc.pop("build", None) is not None:
        assert name in BUILT, name
        svc["image"] = f"pemdi-ai/{name}:{lh_tag}"
        svc["pull_policy"] = "never"

stack["volumes"] = {k: {"external": True, "name": "pemdi-ai_" + k} for k in stack["volumes"]}
stack["volumes"]["app_data"] = {"external": True, "name": "pemdi-ai_app_data"}
stack["volumes"]["cloudflared"] = {"external": True, "name": "pemdi-ai_cloudflared"}
stack["volumes"]["sumber"] = {"external": True, "name": "pemdi-ai_sumber"}

app_env = {}
for line in (ROOT / ".env.local").read_text().splitlines():
    if "=" in line and not line.lstrip().startswith("#"):
        k, v = line.split("=", 1)
        app_env[k.strip()] = v.strip()
app_env["LAKEHOUSE_URL"] = "http://lakehouse-api:8080"
app_env["SUMBER_DIR"] = "/app/sumber"
app_env.pop("PEMDI_PASSWORD", None)  # hanya sandi awal; akun ada di data/users.json

stack["services"]["app"] = {
    "image": f"pemdi-ai/app:{tag}",
    "pull_policy": "never",
    "restart": "unless-stopped",
    "environment": app_env,
    "volumes": [
        {"type": "volume", "source": "app_data", "target": "/app/data"},
        {"type": "volume", "source": "sumber", "target": "/app/sumber", "read_only": True},
    ],
    "ports": ["3100:3100"],
    "depends_on": {"lakehouse-api": {"condition": "service_started"}},
}
# AI Tubaba's LLM client (lakehouse-api) cannot send extra headers, and OpenCode Go needs
# x-opencode-session, so the lakehouse reaches the LLM through this small header-adding proxy.
stack["services"]["llm-proxy"] = {
    "image": "caddy:2.10-alpine",
    "restart": "unless-stopped",
    "command": ["caddy", "reverse-proxy", "--from", ":8080", "--to", "https://opencode.ai", "--change-host-header",
                "--header-up", "x-opencode-session: pemdi-tubaba", "--header-up", "User-Agent: pemdi-ai/1.0"],
}
stack["services"].setdefault("lakehouse-api", {}).setdefault("depends_on", {})
if isinstance(stack["services"]["lakehouse-api"]["depends_on"], dict):
    stack["services"]["lakehouse-api"]["depends_on"]["llm-proxy"] = {"condition": "service_started"}
stack["services"]["tunnel"] = {
    "image": "cloudflare/cloudflared:2026.10.0",
    "restart": "unless-stopped",
    "command": ["tunnel", "--no-autoupdate", "--config", "/etc/cloudflared/config.yml", "run"],
    "volumes": [{"type": "volume", "source": "cloudflared", "target": "/etc/cloudflared", "read_only": True}],
    "depends_on": {"app": {"condition": "service_healthy"}},
}

# Domain kedua (epemdi.ai.id) ada di akun Cloudflare lain, jadi punya tunnel
# sendiri yang dikelola dari dasbor Cloudflare (public hostname -> http://app:3100).
# Token-nya disimpan di .env.local sebagai EPEMDI_TUNNEL_TOKEN.
def env_local(key):
    for line in (ROOT / ".env.local").read_text().splitlines():
        if line.startswith(key + "="):
            return line.split("=", 1)[1].strip().strip('"')
    return None

if token := env_local("EPEMDI_TUNNEL_TOKEN"):
    stack["services"]["tunnel-epemdi"] = {
        "image": "cloudflare/cloudflared:2026.10.0",
        "restart": "unless-stopped",
        "command": ["tunnel", "--no-autoupdate", "run"],
        "environment": {"TUNNEL_TOKEN": token},
        "depends_on": {"app": {"condition": "service_healthy"}},
    }

out =ROOT / "deploy/stack.yml"
out.touch(mode=0o600)
out.write_text(yaml.safe_dump(stack, sort_keys=False, width=1000))
os.chmod(out, 0o600)
print(out)

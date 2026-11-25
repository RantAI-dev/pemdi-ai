# Pemdi-AI web app. Dibangun di host Docker tujuan (lihat scripts/portainer.ts),
# bukan di mesin pengembang.
FROM oven/bun:1-debian AS bun

FROM node:22-bookworm-slim AS build
COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN node node_modules/.bin/next build

FROM node:22-bookworm-slim
# pdftotext/pdftoppm, unzip (PowerPoint) dan uv + Python untuk OCR.
RUN apt-get update \
 && apt-get install -y --no-install-recommends poppler-utils unzip python3 ca-certificates curl libgl1 libglib2.0-0 \
 && rm -rf /var/lib/apt/lists/*
COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun
COPY --from=ghcr.io/astral-sh/uv:0.9 /uv /usr/local/bin/uv
ENV UV_CACHE_DIR=/opt/uv-cache UV_PYTHON_PREFERENCE=only-system NODE_ENV=production
# Unduh model OCR sekali di image, supaya unggahan pertama tidak menunggu.
RUN uv run -q --with rapidocr-onnxruntime python3 -c "from rapidocr_onnxruntime import RapidOCR; RapidOCR()" \
 && chmod -R a+rwX /opt/uv-cache
WORKDIR /app
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/next.config.ts ./
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/src ./src
COPY --from=build /app/tsconfig.json ./
VOLUME /app/data
EXPOSE 3100
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s CMD curl -fs -o /dev/null http://localhost:3100/login || exit 1
CMD ["node", "node_modules/.bin/next", "start", "-p", "3100"]

# syntax=docker/dockerfile:1

# Testify — the bot, and the dashboard it serves from the same process.
# Build:  docker build -t testify .
# Run:    docker compose up -d      (see docker-compose.yml and docs/hosting.md)

ARG NODE_VERSION=24-bookworm-slim

# ── Build ───────────────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION} AS build
WORKDIR /app

# `prepare` runs husky, which needs a .git this context does not carry — and an install
# script is not something a build should run unreviewed. `build:shared` is invoked below.
COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY dashboard/package.json ./dashboard/
RUN npm ci --ignore-scripts

COPY tsconfig.json tsup.config.ts ./
COPY scripts ./scripts
COPY assets ./assets
COPY src ./src
COPY shared ./shared
# COPY merges rather than replaces, which this depends on: the install above puts React 19 in
# dashboard/node_modules while the root holds 18, and losing it would build a page that cannot mount.
COPY dashboard ./dashboard

# shared first: both the bot and the SPA import it, and tsx reads its built dist rather than its source.
RUN npm run build:shared && npm run build:bot && npm run build:dashboard

# ── Runtime ─────────────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION} AS runtime
WORKDIR /app
ENV NODE_ENV=production

# @napi-rs/canvas statically links Skia but resolves font families through the OS, and a slim
# image ships none — without this the rank, leaderboard and welcome cards render without text.
RUN apt-get update \
	&& apt-get install --no-install-recommends -y fonts-dejavu-core \
	&& rm -rf /var/lib/apt/lists/*

# The dashboard workspace is build-time only: at runtime the API serves its compiled assets as
# static files, so its React tree never has to be installed.
COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY dashboard/package.json ./dashboard/
RUN npm ci --omit=dev --ignore-scripts --workspace @testify/shared --include-workspace-root \
	&& npm cache clean --force

COPY --from=build /app/dist ./dist
COPY --from=build /app/shared/dist ./shared/dist
COPY --from=build /app/dashboard/dist ./dashboard/dist

# `dist/api` resolves the SPA at ../../dashboard/dist, so the two must keep this layout.
USER node
EXPOSE 3000
CMD ["node", "dist/index.js"]

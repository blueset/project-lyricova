# syntax=docker/dockerfile:1

# Project Lyricova image, built in stages:
#
#   os-base    - runtime OS dependencies (mecab + neologd, ffmpeg, yt-dlp).
#   builder    - full npm install + Rust/wasm toolchain; compiles every package.
#   prod-deps  - the same lockfile installed with `--omit=dev`.
#   serve-base - the process supervisor + ports + CMD shared by both runtimes.
#   runtime    - DEFAULT. Self-contained: ships the compiled apps.
#   host-build - SECONDARY. OS deps only, for the legacy bind-mount workflow.
#
# `runtime` needs no database to build: nothing in the build graph queries the
# DB. GraphQL/OpenAPI codegen reads the committed `packages/api/schema.graphql`,
# the API build is `tsc`/eslint only, its drizzle pool connects lazily, and both
# Next apps fetch with `cache: "no-store"` so no route is prerendered with data.
# A database is still required at *runtime* (and for `db:migrate`).


##############################################################################
# Stage: os-base - OS packages shared by the build and the runtime.
##############################################################################
FROM node:24 AS os-base

WORKDIR /app

# Install mecab and mecab-ipadic-neologd, plus ffmpeg and the Python used for
# yt-dlp. `git`/`make`/`curl`/`xz-utils`/`file` are build inputs for neologd.
RUN apt-get update && apt-get install -y \
    mecab libmecab-dev mecab-ipadic-utf8 git make curl xz-utils file ffmpeg \
    python3 python3-venv \
    && rm -rf /var/lib/apt/lists/*

# Make sudo dummy replacement, so we don't weaken docker security.
RUN printf '#!/bin/bash\n"$@"\n' > /usr/bin/sudo && chmod +x /usr/bin/sudo

RUN git clone --depth 1 https://github.com/neologd/mecab-ipadic-neologd.git /tmp/neologd && \
    /tmp/neologd/bin/install-mecab-ipadic-neologd -n -a -y && \
    rm -rf /tmp/neologd

RUN python3 -m venv /opt/yt-dlp && \
    /opt/yt-dlp/bin/pip install --upgrade pip && \
    /opt/yt-dlp/bin/pip install "yt-dlp[default,curl-cffi]" && \
    ln -s /opt/yt-dlp/bin/yt-dlp /usr/local/bin/yt-dlp

# Corepack does not shim npm by default. Enable its npm shim so every stage uses
# the exact version from the root package.json `packageManager` field instead
# of whichever npm happens to ship with the current `node:24` image.
#
# Deliberately copied AFTER the apt/neologd/yt-dlp layers so package metadata
# changes do not rebuild ~60s of OS provisioning.
COPY package.json ./
RUN corepack enable npm && npm --version

COPY mecabrc /etc/

ENV YTDLP_PATH=/usr/local/bin/yt-dlp
ENV MUSIC_FILES_PATH=/var/music/


##############################################################################
# Stage: builder - compiles every workspace package from source.
#
# NODE_ENV is deliberately left unset here: `npm ci` treats NODE_ENV=production
# exactly like `--omit=dev` and would drop the 500+ devDependencies that the
# build needs (turbo, typescript, wasm-pack, ...).
##############################################################################
FROM os-base AS builder

# `@lyricova/glyph-renderer` compiles a Rust crate to wasm. wasm-pack itself is
# already a devDependency, but it needs a stable toolchain + the wasm target.
#
# The toolchain is installed to rustup's DEFAULT location ($HOME/.rustup +
# $HOME/.cargo) rather than a relocated RUSTUP_HOME/CARGO_HOME: Turborepo runs
# every task in strict env mode, which passes PATH through but STRIPS
# RUSTUP_HOME and CARGO_HOME. With a relocated toolchain the `cargo` proxy is
# still on PATH but can no longer find its settings, and the wasm build dies
# with "rustup could not choose a version of cargo to run ... no default is
# configured". Keeping the default location makes the toolchain discoverable
# from PATH alone. (This also matches CI, which uses dtolnay/rust-toolchain.)
ENV PATH=/root/.cargo/bin:$PATH
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | \
    sh -s -- -y --no-modify-path --profile minimal \
    --default-toolchain stable --target wasm32-unknown-unknown \
    && cargo --version && rustc --version

# Install dependencies from the manifests alone so this layer is cached until
# the lockfile or a package.json actually changes. The root package.json was
# copied above to select the npm version through Corepack.
COPY package-lock.json ./
COPY packages/api/package.json ./packages/api/
COPY packages/components/package.json ./packages/components/
COPY packages/glyph-renderer/package.json ./packages/glyph-renderer/
COPY packages/jukebox/package.json ./packages/jukebox/
COPY packages/lyricova/package.json ./packages/lyricova/
COPY packages/lyrics-kit/package.json ./packages/lyrics-kit/
RUN npm ci --no-audit --no-fund

# @posthog/cli ships a JS wrapper that downloads its real (Rust) binary on first
# invocation. Trigger that download HERE, in the cached dependency layer, rather
# than letting it happen inside `npm run build` — the layer that is invalidated
# by every commit. Otherwise each build would re-fetch it from GitHub releases,
# putting a rate-limitable third-party download on the hottest path. Non-fatal:
# if the fetch fails the build still works, the binary is simply fetched later
# (and is not needed at all unless sourcemap upload is enabled).
RUN node node_modules/@posthog/cli/run-posthog-cli.js --version >/dev/null 2>&1 \
    && echo "posthog-cli binary warmed" \
    || echo "WARNING: could not pre-fetch posthog-cli binary; it will be fetched during build if needed"

COPY . .

# Next.js inlines NEXT_PUBLIC_* into the *client* bundle at build time, so any
# value that a `"use client"` component reads must be present HERE, not at
# container start. `packages/jukebox/src/app/clientProviders.tsx` is a client
# component, so without these the jukebox ships `undefined` and its PostHog /
# Clarity telemetry is silently dead. (lyricova reads the same variables from a
# server component, so it happens to resolve them at runtime — the asymmetry is
# easy to miss.) These are publishable client-side identifiers, not secrets, so
# baking them into the image is safe; never pass real secrets as build args,
# they persist in the image history.
#
# Declared after `npm ci` so changing an analytics key does not invalidate the
# dependency layer.
ARG NEXT_PUBLIC_POSTHOG_KEY=""
# Defaults to the same-origin reverse-proxy path that BOTH next.config.mjs files
# hardcode (`/ingest/*` -> us.i.posthog.com / us-assets.i.posthog.com). That
# rewrite lives in the repo and is baked into this image, so the path is a
# property of the image rather than of a deployment. Leaving it empty is a
# footgun: TelemetryProvider falls back to `https://us.i.posthog.com`, which
# still works but bypasses the proxy the rewrites exist to provide (ad-blocker
# evasion). Note an explicitly-empty --build-arg overrides this default, so
# docker-compose and CI repeat the `/ingest` fallback rather than passing "".
ARG NEXT_PUBLIC_POSTHOG_HOST="/ingest"
ARG NEXT_PUBLIC_CLARITY_PROJECT_ID=""
ARG NEXT_PUBLIC_TELEMETRY_ENABLED=""
ENV NEXT_PUBLIC_POSTHOG_KEY=${NEXT_PUBLIC_POSTHOG_KEY} \
    NEXT_PUBLIC_POSTHOG_HOST=${NEXT_PUBLIC_POSTHOG_HOST} \
    NEXT_PUBLIC_CLARITY_PROJECT_ID=${NEXT_PUBLIC_CLARITY_PROJECT_ID} \
    NEXT_PUBLIC_TELEMETRY_ENABLED=${NEXT_PUBLIC_TELEMETRY_ENABLED}

# The commit this image is built from. PostHog derives `releaseVersion` from git
# by default, but `.git` is excluded from the build context (284 MB), so that
# auto-detection finds no repository and silently uploads sourcemaps with NO
# release association — it does not fail. Passing the SHA explicitly is what
# makes uploaded maps resolvable back to a commit.
ARG SOURCE_COMMIT=""
# PostHog project id. Not a secret (it is just an identifier), so a plain ARG.
ARG POSTHOG_ENV_ID=""
ENV SOURCE_COMMIT=${SOURCE_COMMIT} \
    POSTHOG_ENV_ID=${POSTHOG_ENV_ID} \
    POSTHOG_CLI_PROJECT_ID=${POSTHOG_ENV_ID}

# Topological Turborepo build: lyrics-kit + glyph-renderer (wasm) -> components
# -> api / jukebox / lyricova.
#
# The PostHog personal API key is a real secret with write access, so it is
# mounted as a BuildKit secret rather than passed as an ARG: ARG values persist
# in the image config and are readable with `docker history` by anyone who can
# pull the (public) image. The secret is only visible to this one RUN and never
# lands in a layer.
#
# Sourcemap upload self-enables only when the secret is actually present, so
# builds without it behave exactly as before. Both upload paths are fed:
# POSTHOG_API_KEY for the Next.js plugin, POSTHOG_CLI_API_KEY for the
# @lyricova/api CLI step.
RUN --mount=type=secret,id=posthog_api_key \
    if [ -s /run/secrets/posthog_api_key ]; then \
    POSTHOG_API_KEY="$(cat /run/secrets/posthog_api_key)"; \
    export POSTHOG_API_KEY; \
    export POSTHOG_CLI_API_KEY="$POSTHOG_API_KEY"; \
    export POSTHOG_SOURCEMAPS=1; \
    echo "PostHog sourcemap upload enabled (release ${SOURCE_COMMIT:-<unset>})"; \
    else \
    echo "No posthog_api_key secret: skipping sourcemap upload"; \
    fi; \
    npm run build


##############################################################################
# Stage: prod-deps - the runtime dependency tree (no devDependencies).
#
# Only the manifests are copied: no workspace defines a prepare/postinstall
# script, so npm never needs the sources here. The result is a /app containing
# the root node_modules *and* the per-package node_modules that npm could not
# hoist - both are required at runtime.
##############################################################################
FROM os-base AS prod-deps

ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY packages/api/package.json ./packages/api/
COPY packages/components/package.json ./packages/components/
COPY packages/glyph-renderer/package.json ./packages/glyph-renderer/
COPY packages/jukebox/package.json ./packages/jukebox/
COPY packages/lyricova/package.json ./packages/lyricova/
COPY packages/lyrics-kit/package.json ./packages/lyrics-kit/
RUN npm ci --omit=dev --no-audit --no-fund


##############################################################################
# Stage: serve-base - everything both runtime variants share.
##############################################################################
FROM os-base AS serve-base

ENV NODE_ENV=production
ENV DENO_INSTALL=/usr/local
ENV PATH="${DENO_INSTALL}/bin:${PATH}"

# Defaults matching docker-compose; override via the environment.
ENV LYRICOVA_PORT=8001
ENV JUKEBOX_PORT=8002
ENV API_PORT=8083

# All three processes share this container's network namespace, so the internal
# API address is a property of the image, not of the deployment. The apps
# already fall back to this value; setting it makes the contract explicit and
# still overridable (e.g. if the API is ever split into its own container).
ENV API_INTERNAL_URL=http://localhost:8083

RUN apt-get update && apt-get install -y unzip \
    && rm -rf /var/lib/apt/lists/* \
    && curl -fsSL https://deno.land/install.sh | sh \
    && deno --version \
    && npm install -g concurrently

EXPOSE 8001 8002

VOLUME ["/var/music"]

# Start the API, the blog and the jukebox concurrently. concurrently runs each
# command through a shell, so the $PORT variables expand at container start.
CMD ["concurrently", "-n", "api,lyricova,jukebox", "-c", "yellow,green,blue", "--restart-tries", "-1", "cd packages/api && npm run start", "cd packages/lyricova && npm run start -- -p $LYRICOVA_PORT", "cd packages/jukebox && npm run start -- -p $JUKEBOX_PORT"]


##############################################################################
# Stage: host-build (SECONDARY) - the legacy bind-mount workflow.
#
# Provisions runtime OS deps only; it does NOT compile the apps or the wasm
# crate. docker-compose's `bindmount` profile mounts the repo at /app and runs
# `npm run start`, so the container serves artifacts built on the HOST
# (`npm install && npm run build`). Jukebox's `prestart` hook verifies those
# prebuilt wasm/JS artifacts exist before serving. Prefer the `runtime` stage.
#
# Declared before `runtime` on purpose: the final stage in this file is what a
# bare `docker build .` produces, and that should be the self-contained image.
##############################################################################
FROM serve-base AS host-build

VOLUME ["/app", "/var/music"]


##############################################################################
# Stage: runtime (DEFAULT) - self-contained image, no host build required.
##############################################################################
FROM serve-base AS runtime

# Production dependency tree + every workspace package.json.
COPY --from=prod-deps /app ./

COPY --from=builder /app/packages/lyrics-kit/build ./packages/lyrics-kit/build
COPY --from=builder /app/packages/components/build ./packages/components/build

# glyph-renderer ships `build/` + `pkg/` (imported and served at runtime). Its
# Rust/TS sources and manifests come along because jukebox's `prestart` hook
# re-derives the artifact fingerprint from them; without the inputs the check
# reports the prebuilt artifacts as stale and refuses to start.
COPY --from=builder /app/packages/glyph-renderer/build ./packages/glyph-renderer/build
COPY --from=builder /app/packages/glyph-renderer/pkg ./packages/glyph-renderer/pkg
COPY --from=builder /app/packages/glyph-renderer/scripts ./packages/glyph-renderer/scripts
COPY --from=builder /app/packages/glyph-renderer/src ./packages/glyph-renderer/src
COPY --from=builder /app/packages/glyph-renderer/ts ./packages/glyph-renderer/ts
COPY --from=builder /app/packages/glyph-renderer/Cargo.toml ./packages/glyph-renderer/
COPY --from=builder /app/packages/glyph-renderer/Cargo.lock ./packages/glyph-renderer/
COPY --from=builder /app/packages/glyph-renderer/tsconfig.json ./packages/glyph-renderer/

# The API serves several assets straight from `src/` (fonts via
# `resolve(import.meta.dirname, "../../src/fonts")`, the OG cover image) and
# swagger-jsdoc globs `./src/**/*.ts` to build the OpenAPI spec, so `src/` is a
# runtime input here, not just a build input.
COPY --from=builder /app/packages/api/dist ./packages/api/dist
COPY --from=builder /app/packages/api/src ./packages/api/src
COPY --from=builder /app/packages/api/drizzle ./packages/api/drizzle
COPY --from=builder /app/packages/api/schema.graphql ./packages/api/
COPY --from=builder /app/packages/api/mecabUserDict/CustomDictWeightedCombined.dic ./packages/api/mecabUserDict/

# Everything `npm run db:migrate` needs, so migrations can be applied from the
# published image (`docker compose --profile migrate run --rm migrate`) without
# a source checkout, a Node install, or the dev toolchain on the deploy host.
# The migration SQL + meta/_journal.json arrive with `drizzle/` above; this adds
# the runtime migrator and the adopt-baseline guard.
COPY --from=builder /app/packages/api/scripts ./packages/api/scripts

COPY --from=builder /app/packages/lyricova/.next ./packages/lyricova/.next
COPY --from=builder /app/packages/lyricova/public ./packages/lyricova/public
COPY --from=builder /app/packages/lyricova/next.config.mjs ./packages/lyricova/

COPY --from=builder /app/packages/jukebox/.next ./packages/jukebox/.next
COPY --from=builder /app/packages/jukebox/public ./packages/jukebox/public
COPY --from=builder /app/packages/jukebox/scripts ./packages/jukebox/scripts
COPY --from=builder /app/packages/jukebox/next.config.mjs ./packages/jukebox/

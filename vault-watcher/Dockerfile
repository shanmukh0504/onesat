# syntax=docker/dockerfile:1.4

FROM rust:1.89 AS builder

# 1. Install build dependencies
RUN apt-get update && apt-get install -y \
    pkg-config libssl-dev libsqlite3-dev \
    curl clang git jq \
    && cargo install cargo-chef \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

# 2. Set up git credentials for private dependencies
ARG GHPAT
RUN if [ -n "$GHPAT" ]; then \
    git config --global url."https://${GHPAT}@github.com/".insteadOf "https://github.com/"; \
    fi

# 3. Configure cargo for optimal caching
RUN mkdir -p ~/.cargo && \
    echo -e '[net]\ngit-fetch-with-cli = true\n\n[build]\nincremental = true\n\n[profile.release]\nincremental = true\nlto = "thin"' > ~/.cargo/config.toml

# === CARGO CHEF STAGE 1: RECIPE GENERATION ===
FROM builder AS planner
COPY Cargo.toml Cargo.lock ./
RUN mkdir -p src && echo "fn main() {}" > src/main.rs
RUN cargo chef prepare --recipe-path recipe.json

# === CARGO CHEF STAGE 2: DEPENDENCY BUILDING ===
FROM builder AS dependencies
COPY --from=planner /usr/src/app/recipe.json recipe.json

# Build dependencies with persistent cache mounts
ENV CARGO_TARGET_DIR=/usr/src/app/target/vault-watcher
RUN --mount=type=cache,target=/usr/local/cargo/registry/vault-watcher \
    --mount=type=cache,target=/usr/src/app/target/vault-watcher \
    --mount=type=cache,target=/usr/local/cargo/git/vault-watcher \
    cargo chef cook --release --recipe-path recipe.json

# === FINAL BUILD STAGE ===
FROM dependencies AS build

# Install runtime build dependencies
RUN apt-get update && apt-get install -y \
    pkg-config libssl-dev libsqlite3-dev \
    && rm -rf /var/lib/apt/lists/*

COPY . .

# Build binary with standard glibc dynamic linking
RUN --mount=type=cache,target=/usr/local/cargo/registry/vault-watcher \
    --mount=type=cache,target=/usr/src/app/target/vault-watcher \
    --mount=type=cache,target=/usr/local/cargo/git/vault-watcher \
    BINARY_NAME=$(grep '^name = ' Cargo.toml | head -1 | sed 's/name = "\(.*\)"/\1/' | tr '_' '-') && \
    echo "Building binary: $BINARY_NAME" && \
    cargo build --release && \
    cp "/usr/src/app/target/$BINARY_NAME/release/$BINARY_NAME" /usr/src/app/binary && \
    strip /usr/src/app/binary && \
    chmod +x /usr/src/app/binary

# === DISTROLESS RUNTIME ===
FROM gcr.io/distroless/cc-debian12

WORKDIR /app
# Copy the binary
COPY --from=build /usr/src/app/binary /app/binary
# Default command
ENTRYPOINT ["/app/binary"]
#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT_DIR="${ROOT_DIR}/apps/raycast/assets/bin"

VERSION="${1:-$(git -C "${ROOT_DIR}" describe --tags --always --dirty 2>/dev/null || echo "dev")}"
COMMIT="${2:-$(git -C "${ROOT_DIR}" rev-parse --short HEAD 2>/dev/null || echo "unknown")}"
BUILD_TIME="${3:-$(date -u +"%Y-%m-%dT%H:%M:%SZ")}"
LDFLAGS="-X main.Version=${VERSION} -X main.Commit=${COMMIT} -X main.BuildTime=${BUILD_TIME}"

mkdir -p "${OUTPUT_DIR}"

pushd "${ROOT_DIR}" >/dev/null
GOOS=darwin GOARCH=arm64 go build -ldflags "${LDFLAGS}" -o "${OUTPUT_DIR}/media-converter-darwin-arm64" ./main.go
GOOS=darwin GOARCH=amd64 go build -ldflags "${LDFLAGS}" -o "${OUTPUT_DIR}/media-converter-darwin-amd64" ./main.go
popd >/dev/null

chmod +x "${OUTPUT_DIR}/media-converter-darwin-arm64" "${OUTPUT_DIR}/media-converter-darwin-amd64"

echo "Built Raycast embedded binaries in ${OUTPUT_DIR}"

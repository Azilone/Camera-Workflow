# Camera-Workflow

Camera-Workflow is a single monorepo that combines:

- A **Go engine** (`media-converter`) for media preparation and copy-safe workflows.
- A **Raycast UI** (`apps/raycast`) that orchestrates runs and shows live reports.

The Raycast extension is UI-only. All conversion logic lives in Go.

## Repository Structure

- `main.go`, `cmd/`, `internal/`: Go engine.
- `apps/raycast/`: Raycast extension.
- `scripts/build-raycast-binaries.sh`: Builds embedded macOS binaries for Raycast.
- `Makefile`: Unified developer entrypoints.

## Product Naming Conventions

- Prepare (not convert) in user-facing Raycast copy.
- Prepared Library (not output folder).
- Backup Report (not run summary).
- Backup Preparation Run (not generic run).

## Requirements

- Go `1.21+`
- Node.js `18+`
- Raycast (macOS)
- System tools for conversion:
  - `ffmpeg`
  - `ffprobe`
  - `magick` (ImageMagick)

## Quickstart (Monorepo)

```bash
# 1) Run Go tests
make test

# 2) Build embedded binaries for Raycast
make raycast-binaries

# 3) Install Raycast extension dependencies
make raycast-install

# 4) Start extension in Raycast dev mode
make raycast-dev
```

## Go Engine Usage (CLI)

```bash
# Dry-run
./media-converter --dry-run /path/source /path/destination

# Real run
./media-converter /path/source /path/destination

# Copy-only archive mode
./media-converter --copy-only /path/source /path/destination
```

## Raycast Extension

The extension resolves `media-converter` from embedded assets first:

- `apps/raycast/assets/bin/media-converter-darwin-arm64`
- `apps/raycast/assets/bin/media-converter-darwin-amd64`

For development only, PATH fallback can be enabled explicitly with:

```bash
export CAMERA_WORKFLOW_ALLOW_PATH_FALLBACK=1
```

See the extension-specific docs in `apps/raycast/README.md`.

## Release Model

- Canonical repository: `Azilone/Camera-Workflow`
- New releases are published from this monorepo.
- Legacy repositories are archived and redirect to this one.

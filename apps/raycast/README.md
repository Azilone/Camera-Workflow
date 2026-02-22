# Camera Workflow Raycast Extension

Raycast is the UI layer for Camera Workflow.

- UI and guided flow: this extension.
- Conversion engine: Go `media-converter` binary embedded in extension assets.

## Embedded Binary Strategy

The command resolves the converter from `environment.assetsPath/bin`:

- `media-converter-darwin-arm64`
- `media-converter-darwin-amd64`

This removes the runtime requirement for `media-converter` in user PATH.

### Development-only Fallback

Optional fallback to PATH is available only when both are true:

- Raycast command runs in development mode.
- `CAMERA_WORKFLOW_ALLOW_PATH_FALLBACK=1` is set.

## Dependencies

Required system dependencies:

- `ffmpeg`
- `ffprobe`
- `magick`

Install on macOS:

```bash
brew install ffmpeg imagemagick
```

## Commands

- **Prepare Library for Backup**

Single guided flow:

1. Dependency checks.
2. Source selection and source analysis.
3. Destination setup.
4. Preset or custom settings.
5. Run with live output.
6. Backup report and quick actions.

## Local Development

From repository root:

```bash
make raycast-binaries
make raycast-install
make raycast-dev
```

Or directly:

```bash
npm install --prefix apps/raycast
npm run dev --prefix apps/raycast
```

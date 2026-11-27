#!/usr/bin/env bash
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BIN_DIR="$HOME/.local/bin"
ICON_DIR="$HOME/.local/share/icons/hicolor/256x256/apps"
APP_DIR="$HOME/.local/share/applications"

mkdir -p "$BIN_DIR" "$ICON_DIR" "$APP_DIR"
cp "$DIR/guru-music" "$BIN_DIR/guru-music"
chmod +x "$BIN_DIR/guru-music"
cp "$DIR/guru-music.png" "$ICON_DIR/guru-music.png"

sed "s|__EXEC_PATH__|$BIN_DIR/guru-music|g" "$DIR/guru-music.desktop" > "$APP_DIR/guru-music.desktop"
chmod +x "$APP_DIR/guru-music.desktop"

echo "Guru Music installed! Launch it from your application menu or run: $BIN_DIR/guru-music"

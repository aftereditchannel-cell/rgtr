#!/usr/bin/env bash
# ----------------------------------------------------------------------------
# NEXUS HQ — build script for both Windows (EXE) and Android (APK).
#
# Usage:
#   bash scripts/build-all.sh            # builds both
#   bash scripts/build-all.sh win        # only Windows EXE
#   bash scripts/build-all.sh android    # only Android APK
#
# Output:
#   dist-bin/
#     NEXUS-HQ-<version>-Setup.exe
#     NEXUS-HQ-<version>-Portable.exe
#     app.nexushq.mobile-<version>-release.apk
#
# Prerequisites (one-time):
#   * Node.js 20+ and npm
#   * For Windows EXE: build works on Windows, macOS, Linux (no extra tools needed)
#   * For Android APK: JDK 17 + Android SDK (command-line tools + platform 34)
#       - On macOS:  brew install --cask temurin android-sdk
#       - On Ubuntu: sudo apt install -y openjdk-17-jdk && sdkmanager "platforms;android-34" "build-tools;34.0.0"
#       - On Windows: install Android Studio, then open "SDK Manager"
# ----------------------------------------------------------------------------
set -euo pipefail
cd "$(dirname "$0")/.."

TARGET="${1:-all}"
ROOT="$(pwd)"
OUT="$ROOT/dist-bin"
mkdir -p "$OUT"

echo "==> Installing dependencies"
npm install --no-audit --no-fund

echo "==> Building web bundle"
npm run build

build_win() {
  echo "==> Packaging Windows (NSIS installer + portable EXE)"
  npx electron-builder --win nsis portable --x64 --publish never
  # Copy artifacts to dist-bin
  cp release/*.exe "$OUT/" 2>/dev/null || true
  echo "    Windows artifacts are in: $OUT"
}

build_android() {
  echo "==> Syncing Capacitor"
  npx cap sync android
  echo "==> Building release APK"
  (cd android && ./gradlew assembleRelease -x lint -x lintVitalRelease --no-daemon)
  local apk
  apk="$(find android/app/build/outputs/apk/release -name "*.apk" | head -1)"
  if [ -n "$apk" ]; then
    cp "$apk" "$OUT/"
    echo "    Android APK is in: $OUT"
  else
    echo "!! APK not found — check Gradle output above"
    exit 1
  fi
}

case "$TARGET" in
  win) build_win ;;
  android) build_android ;;
  all)
    build_win || echo "  [win] skipped/failed — see logs above"
    build_android || echo "  [android] skipped/failed — see logs above"
    ;;
  *)
    echo "Unknown target: $TARGET (use 'win', 'android', or 'all')"
    exit 1
    ;;
esac

echo
echo "============================================================"
echo " Done. Artifacts (if any) are in: $OUT"
ls -lh "$OUT" 2>/dev/null || true
echo "============================================================"

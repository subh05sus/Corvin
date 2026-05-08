#!/bin/bash
# Wrapper script for debug studio in containers.
# Stubs out xdg-open if missing so the CLI doesn't crash trying to open a browser.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

if ! command -v xdg-open &>/dev/null; then
  mkdir -p "$PROJECT_ROOT/.bin"
  printf '#!/bin/sh\nexit 0\n' > "$PROJECT_ROOT/.bin/xdg-open"
  chmod +x "$PROJECT_ROOT/.bin/xdg-open"
  export PATH="$PROJECT_ROOT/.bin:$PATH"
fi

debug studio

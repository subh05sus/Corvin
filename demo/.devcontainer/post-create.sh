#!/bin/bash
set -e

echo ""
echo "========================================"
echo "  Setting up Corvin Demo"
echo "========================================"
echo ""

# Ensure tmux is installed
if ! command -v tmux &> /dev/null; then
  echo "Installing tmux..."
  sudo apt-get update -qq
  sudo apt-get install -y -qq tmux
  echo "✓ tmux installed"
else
  echo "✓ tmux already installed ($(tmux -V))"
fi

# Install dependencies for Orders Service
echo "Installing Orders Service dependencies..."
cd orders-service
npm install --silent
echo "Building Orders Service..."
npm run build --silent
cd ..

# Install dependencies for Checkout Service
echo "Installing Checkout Service dependencies..."
cd checkout-service
npm install --silent
echo "Building Checkout Service..."
npm run build --silent
cd ..

# Install root dependencies (tsx, chalk, axios)
echo "Installing root dependencies..."
npm install --silent

# Install/update Corvin CLI globally (always pull latest to avoid "upgrade required")
echo "Installing Corvin CLI..."
npm install -g @corvin/cli@latest --silent 2>/dev/null || true

# Stub out xdg-open — the container has no desktop browser, and the
# Corvin CLI crashes with an unhandled error if it can't spawn one.
if ! command -v xdg-open &>/dev/null; then
  echo "Creating xdg-open stub (no desktop browser in container)..."
  sudo tee /usr/local/bin/xdg-open >/dev/null <<'STUB'
#!/bin/sh
exit 0
STUB
  sudo chmod +x /usr/local/bin/xdg-open
  echo "✓ xdg-open stub installed"
fi

# Patch Studio for remote environments (Codespaces, etc.)
# The studio hardcodes ws://127.0.0.1:4466 for the local cluster connection,
# which doesn't work when the browser is remote. This injects a script that
# rewrites the WebSocket URL to go through the forwarded port instead.
STUDIO_HTML="$(npm root -g)/@corvin/cli/studio/package/index.html"
if [ -f "$STUDIO_HTML" ]; then
  echo "Patching Studio for remote port forwarding..."
  sed -i 's|<script type="module"|<script>\
(function(){\
  var O=window.WebSocket;\
  window.WebSocket=function(u,p){\
    if(u\&\&u.indexOf("127.0.0.1:4466")!==-1\&\&location.hostname!=="127.0.0.1"\&\&location.hostname!=="localhost"){\
      var h=location.hostname.replace(/-\\d+\\./,"-4466.");\
      u="wss://"+h;\
    }\
    return p!==void 0?new O(u,p):new O(u);\
  };\
  window.WebSocket.prototype=O.prototype;\
  window.WebSocket.CONNECTING=O.CONNECTING;\
  window.WebSocket.OPEN=O.OPEN;\
  window.WebSocket.CLOSING=O.CLOSING;\
  window.WebSocket.CLOSED=O.CLOSED;\
})();\
</script>\
<script type="module"|' "$STUDIO_HTML"
  echo "✓ Studio patched for remote environments"
fi

# Make port 4466 public so the remote browser can reach the WebSocket server.
# The devcontainer.json "visibility" field is unreliable, so set it explicitly.
echo "Setting port 4466 to public..."
gh codespace ports visibility 4466:public -c "$CODESPACE_NAME" 2>/dev/null || true
echo "✓ Port 4466 set to public"

# Auto-authenticate with shared demo key
echo "Authenticating with shared demo account..."
debug login 1672d6ecbd75eced846e13567319117a3260184391d7eafd 2>/dev/null || true

echo ""
echo "========================================"
echo "  ✅ Demo ready! Run: npm run demo"
echo "========================================"
echo ""

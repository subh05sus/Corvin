#!/bin/bash

# Get project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Cleanup function - kills all demo processes
cleanup() {
  echo ""
  echo "🧹 Cleaning up Corvin demo..."

  # Kill main tmux session (services + menu)
  tmux kill-session -t corvin 2>/dev/null

  # Kill Corvin server (runs in its own tmux session for TTY support)
  tmux kill-session -t corvin-server 2>/dev/null

  # Kill Corvin Studio (runs in its own tmux session)
  tmux kill-session -t corvin-studio 2>/dev/null

  echo "✅ Cleanup complete"
}

# Trap script exit (catches Ctrl+C, normal exit, crashes)
trap cleanup EXIT

# Kill existing sessions if any
tmux kill-session -t corvin 2>/dev/null || true
tmux kill-session -t corvin-server 2>/dev/null || true
tmux kill-session -t corvin-studio 2>/dev/null || true

echo "Starting Corvin Demo..."
echo ""

# Start Corvin server first (needs a TTY, so runs in its own detached tmux session)
echo "🚀 Starting Corvin server..."
tmux new-session -d -s corvin-server 'debug'
sleep 3

# Start Corvin Studio (web UI on port 4173, runs in its own tmux session to stay alive)
lsof -ti:4173 | xargs kill 2>/dev/null || true
tmux kill-session -t corvin-studio 2>/dev/null || true
echo "🎨 Starting Corvin Studio..."
tmux new-session -d -s corvin-studio "bash ${PROJECT_ROOT}/scripts/start-studio.sh"
sleep 2

# Create tmux session with 3 horizontal panes (30/30/40 split)
tmux new-session -d -s corvin -c "$PROJECT_ROOT"

# Configure pane borders to show titles
tmux set-option -t corvin pane-border-status top
tmux set-option -t corvin pane-border-format " #T "

# Re-apply 30/30/40 split on terminal resize
tmux set-hook -t corvin after-resize-window \
  "run-shell 'tmux resize-pane -t corvin:0.0 -y 30% ; tmux resize-pane -t corvin:0.2 -y 40%'"

# Split top 30% from bottom 70%
tmux split-window -v -t corvin:0.0 -p 70 -c "$PROJECT_ROOT"
# Split bottom 70% into 30% and 40% (40/70 ≈ 57%)
tmux split-window -v -t corvin:0.1 -p 57 -c "$PROJECT_ROOT"

# Pane 0 (top, 30%): Orders service with title and header
tmux select-pane -t corvin:0.0 -T "📦 Orders Service (3001)"
tmux send-keys -t corvin:0.0 'clear' C-m
tmux send-keys -t corvin:0.0 'echo "Starting Orders Service..."' C-m
tmux send-keys -t corvin:0.0 'echo ""' C-m
tmux send-keys -t corvin:0.0 'cd orders-service && debug npm run dev' C-m

# Pane 1 (middle, 30%): Checkout service with title and header
tmux select-pane -t corvin:0.1 -T "🛒 Checkout Service (3002)"
tmux send-keys -t corvin:0.1 'clear' C-m
tmux send-keys -t corvin:0.1 'echo "Starting Checkout Service..."' C-m
tmux send-keys -t corvin:0.1 'echo ""' C-m
tmux send-keys -t corvin:0.1 'cd checkout-service && debug npm run dev' C-m

# Pane 2 (bottom, 40%): Interactive menu with title
tmux select-pane -t corvin:0.2 -T "Interactive Menu"
tmux send-keys -t corvin:0.2 "sleep 8 && node ${PROJECT_ROOT}/scripts/interactive-menu.js" C-m

# Focus on the bottom pane (interactive menu)
tmux select-pane -t corvin:0.2

# Attach to the tmux session
tmux attach-session -t corvin

#!/bin/bash

echo "🧹 Manually cleaning up Corvin demo..."

# Kill main tmux session (services + menu)
tmux kill-session -t corvin 2>/dev/null && echo "✓ Killed tmux session"

# Kill Corvin server session
tmux kill-session -t corvin-server 2>/dev/null && echo "✓ Killed Corvin server"

# Kill Corvin Studio session
tmux kill-session -t corvin-studio 2>/dev/null && echo "✓ Killed Corvin Studio"

# Fallback: kill anything on demo ports
lsof -ti:3001 -ti:3002 -ti:4173 | xargs kill 2>/dev/null

echo "✅ Manual cleanup complete"

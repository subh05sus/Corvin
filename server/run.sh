#!/usr/bin/sh

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"

# Use Node.js 18.20.8 (or your preferred version)
nvm use v18.20.8 || nvm use 18 || node --version

# Install dependencies
npm install

npm run db:deploy

# Build the application
npm run build:tsc

# Reload PM2 (if using PM2)
pm2 reload ecosystem.config.js
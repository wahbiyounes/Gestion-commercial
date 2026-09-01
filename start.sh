#!/bin/bash
set -e

# Start backend server in background
cd "$(dirname "$0")/backend"
if [ ! -f data/clients.json ]; then
  npm run seed
fi
node server.js &
BACKEND_PID=$!

# Start frontend server (this will be the exposed port)
cd ../frontend
npm run dev

# Cleanup on exit
trap "kill $BACKEND_PID" EXIT

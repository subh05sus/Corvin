#!/bin/bash

# Colors for output
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo "=========================================="
echo "  Starting Corvin Demo Services"
echo "=========================================="
echo ""

# Store PIDs for cleanup
ORDERS_PID=""
CHECKOUT_PID=""

cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down services...${NC}"

    if [ -n "$ORDERS_PID" ]; then
        kill $ORDERS_PID 2>/dev/null
        echo "  Stopped Orders service"
    fi

    if [ -n "$CHECKOUT_PID" ]; then
        kill $CHECKOUT_PID 2>/dev/null
        echo "  Stopped Checkout service"
    fi

    echo ""
    echo "Goodbye!"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Get script directory and project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

cd "$PROJECT_ROOT"

# Start Orders service
echo -e "${BLUE}Starting Orders service on port 3001...${NC}"
cd orders-service
npx tsx index.ts &
ORDERS_PID=$!
cd ..

# Give it a moment to start
sleep 1

# Start Checkout service
echo -e "${GREEN}Starting Checkout service on port 3002...${NC}"
cd checkout-service
npx tsx index.ts &
CHECKOUT_PID=$!
cd ..

# Wait for services to be ready
sleep 2

echo ""
echo "=========================================="
echo "  Services Running"
echo "=========================================="
echo ""
echo -e "  ${BLUE}Orders Service:${NC}   http://localhost:3001"
echo -e "  ${GREEN}Checkout Service:${NC} http://localhost:3002"
echo ""
echo "=========================================="
echo "  Example Commands"
echo "=========================================="
echo ""
echo "  Health checks:"
echo "    curl http://localhost:3001/health"
echo "    curl http://localhost:3002/health"
echo ""
echo "  Trigger bugs (run in another terminal):"
echo "    npm run demo:bug1  # Contract drift"
echo "    npm run demo:bug2  # Missing EU tax"
echo "    npm run demo:bug3  # Payment timeout"
echo ""
echo "  Press Ctrl+C to stop all services"
echo ""

# Wait for background processes
wait

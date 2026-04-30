#!/bin/bash
set -e

BUILD=false
for arg in "$@"; do
  [[ "$arg" == "--build" ]] && BUILD=true
done

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR/.."

# Build if image missing or --build flag
if [[ "$BUILD" == "true" ]] || ! docker image inspect finally &>/dev/null; then
  echo "Building finally image..."
  docker build -t finally "$PROJECT_DIR"
fi

# If already running, just open browser
if docker ps --format '{{.Names}}' | grep -q '^finally$'; then
  echo "Container 'finally' is already running at http://localhost:8000"
  open http://localhost:8000
  exit 0
fi

# Remove stopped container if present
if docker ps -a --format '{{.Names}}' | grep -q '^finally$'; then
  docker rm finally
fi

docker run -d --name finally \
  -v finally-data:/app/db \
  -p 8000:8000 \
  --env-file "$PROJECT_DIR/.env" \
  finally

echo "Waiting for service to be ready..."
for i in $(seq 1 10); do
  if curl -sf http://localhost:8000/api/health &>/dev/null; then
    echo "Finally is ready at http://localhost:8000"
    open http://localhost:8000
    exit 0
  fi
  sleep 1
done

echo "Warning: service did not respond within 10s — http://localhost:8000"

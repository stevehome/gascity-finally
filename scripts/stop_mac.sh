#!/bin/bash
set -e

docker stop finally 2>/dev/null || true
docker rm finally 2>/dev/null || true
echo "Container 'finally' stopped and removed. Data volume preserved."

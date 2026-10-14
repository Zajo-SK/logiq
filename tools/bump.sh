#!/bin/sh
# Usage: tools/bump.sh 47   – sets one cache-busting version for every script/style in index.html and the service-worker cache name
cd "$(dirname "$0")/.." || exit 1
sed -i '' -E "s/\?v=[0-9]+/?v=$1/g" index.html
sed -i '' -E "s/logiq-v[0-9]+/logiq-v$1/" sw.js
echo "bumped to $1"

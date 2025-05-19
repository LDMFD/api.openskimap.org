#!/bin/sh
set -e

cd /usr/src/app

if [ -z "$ARANGODB_URL" ]; then
    export ARANGODB_URL="http://localhost:8529"
fi

echo "Using ArangoDB URL: $ARANGODB_URL"

export ARANGO_ROOT_PASSWORD=offskimap

npm run import-data \
    ./data/intermediate_ski_areas.geojson \
    ./data/intermediate_lifts.geojson \
    ./data/intermediate_runs.geojson

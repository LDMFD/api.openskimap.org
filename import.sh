#!/bin/bash
set -e

# Ensure we're in the correct directory
MY_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd $MY_DIR

# Set ArangoDB URL if not already set
if [ -z "$ARANGODB_URL" ]; then
    export ARANGODB_URL="http://localhost:8529"
fi

echo "Using ArangoDB URL: $ARANGODB_URL"

# Run the import with the intermediate files
npm run import-data \
    ../openskidata-processor/data/intermediate_ski_areas.geojson \
    ../openskidata-processor/data/intermediate_lifts.geojson \
    ../openskidata-processor/data/intermediate_runs.geojson

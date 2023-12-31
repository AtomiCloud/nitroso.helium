#!/usr/bin/env bash

version="$1"

set -eouf pipefail

if [ -z "$version" ]; then
  echo "Usage: $0 <version>"
  exit 1
fi
echo "⚙️ Generating SDK for Zinc API '$version'"
swagger-typescript-api -p "${ZINC_API}/swagger/v1/swagger.json" -o ./src/lib/zinc --modular --union-enums
echo "✅ Generated SDK for Zinc API '$version'"

# patch the generated code
echo "🔧 Patching generated code..."
sed -i 's/import {/import type {/g' ./src/lib/zinc/Api.ts
sed -i 's/import type { ContentType, HttpClient, RequestParams/import { ContentType, HttpClient, type RequestParams/g' ./src/lib/zinc/Api.ts
sed -i '/credentials: "same-origin",/d; /headers: {},/d; /redirect: "follow",/d; /referrerPolicy: "no-referrer",/d' ./src/lib/zinc/http-client.ts
echo "✅ Patched generated code"

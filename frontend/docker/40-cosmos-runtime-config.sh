#!/bin/sh
set -eu

config_path="/usr/share/nginx/html/runtime-config.js"
api_base_url="${API_BASE_URL:-}"
api_base_url="$(printf '%s' "$api_base_url" | tr -d '\r\n')"

if [ -z "$api_base_url" ]; then
  printf 'window.__COSMOS_CONFIG__ = window.__COSMOS_CONFIG__ || {};\n' > "$config_path"
  exit 0
fi

escaped_url="$(printf '%s' "$api_base_url" | sed 's/\\/\\\\/g; s/"/\\"/g; s/</\\u003c/g; s/>/\\u003e/g')"
printf 'window.__COSMOS_CONFIG__ = { API_BASE_URL: "%s" };\n' "$escaped_url" > "$config_path"

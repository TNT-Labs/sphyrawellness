#!/bin/sh
# CouchDB CORS Configuration Script
# Run this inside the CouchDB container

COUCHDB_USER="admin"
COUCHDB_PASSWORD="Sphyra1998!"
BASE_URL="http://localhost:5984"

echo "Configuring CORS for CouchDB..."

# Enable CORS - httpd
curl -X PUT "${BASE_URL}/_node/_local/_config/httpd/enable_cors" \
  -u "${COUCHDB_USER}:${COUCHDB_PASSWORD}" \
  -H "Content-Type: application/json" \
  -d '"true"'

# Enable CORS - chttpd
curl -X PUT "${BASE_URL}/_node/_local/_config/chttpd/enable_cors" \
  -u "${COUCHDB_USER}:${COUCHDB_PASSWORD}" \
  -H "Content-Type: application/json" \
  -d '"true"'

# Set CORS origins
curl -X PUT "${BASE_URL}/_node/_local/_config/cors/origins" \
  -u "${COUCHDB_USER}:${COUCHDB_PASSWORD}" \
  -H "Content-Type: application/json" \
  -d '"*"'

# Enable credentials
curl -X PUT "${BASE_URL}/_node/_local/_config/cors/credentials" \
  -u "${COUCHDB_USER}:${COUCHDB_PASSWORD}" \
  -H "Content-Type: application/json" \
  -d '"true"'

# Set allowed methods
curl -X PUT "${BASE_URL}/_node/_local/_config/cors/methods" \
  -u "${COUCHDB_USER}:${COUCHDB_PASSWORD}" \
  -H "Content-Type: application/json" \
  -d '"GET, PUT, POST, HEAD, DELETE, OPTIONS"'

# Set allowed headers
curl -X PUT "${BASE_URL}/_node/_local/_config/cors/headers" \
  -u "${COUCHDB_USER}:${COUCHDB_PASSWORD}" \
  -H "Content-Type: application/json" \
  -d '"accept, authorization, content-type, origin, referer, x-requested-with"'

echo ""
echo "CORS configuration complete. Verifying..."
echo ""

# Verify configuration
curl -s "${BASE_URL}/_node/_local/_config/cors" \
  -u "${COUCHDB_USER}:${COUCHDB_PASSWORD}"
echo ""

#!/bin/bash

set -e

# Variables
CERT_BASE_DIR="/skale_node_data/sgx_certs/"
CERT_FILE_NAME="sgx"
KEY_FILE="${CERT_BASE_DIR}${CERT_FILE_NAME}.key"
CSR_FILE="${CERT_BASE_DIR}${CERT_FILE_NAME}.csr"
CERT_FILE="${CERT_BASE_DIR}${CERT_FILE_NAME}.crt"

sudo mkdir -p $CERT_BASE_DIR
sudo chown $(whoami):$(whoami) $CERT_BASE_DIR

CERT_NAME=$(openssl rand -hex 16)

echo "Generating private key and a certificate signing request (CSR)..."
openssl req -new -sha256 -nodes -out $CSR_FILE -newkey rsa:2048 -keyout $KEY_FILE -subj /CN=$CERT_NAME

echo "Sending CSR to the SGX wallet registration service..."
export URL_SGX_WALLET_REGISTRATION="http://127.0.0.1:1027"
RESPONSE=$(curl -s -X POST --data '{ "jsonrpc": "2.0", "id": 1, "method": "signCertificate", "params": { "certificate": "'"$(cat ${CSR_FILE})"'" } }' -H 'content-type:application/json;' $URL_SGX_WALLET_REGISTRATION)
CERT_HASH=$(echo "$RESPONSE" | jq -r '.result.hash')

echo "Getting certificate from the SGX wallet registration server..."
RESPONSE=$(curl -s -X POST --data '{ "jsonrpc": "2.0", "id": 2, "method": "getCertificate", "params": { "hash": "'"$CERT_HASH"'" } }' -H 'content-type:application/json;' $URL_SGX_WALLET_REGISTRATION)

echo "Writing certificate to file..."
CERT=$(echo "$RESPONSE" | jq -r '.result.cert')
echo "$CERT" > $CERT_FILE
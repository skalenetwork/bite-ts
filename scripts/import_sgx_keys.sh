#!/bin/bash

set -e

# Variables
CERT_BASE_DIR="/skale_node_data/sgx_certs/"
CERT_NAME="sgx"
KEY_FILE="${CERT_BASE_DIR}${CERT_NAME}.key"
CERT_FILE="${CERT_BASE_DIR}${CERT_NAME}.crt"

export URL_SGX_WALLET="https://127.0.0.1:1026"

ls $CERT_BASE_DIR
if [ ! -f "$KEY_FILE" ]; then
  echo "Key file not found: $KEY_FILE"
  exit 1
fi

# Import BLS Key Share
curl --cert $CERT_FILE --key $KEY_FILE \
  -X POST \
  --data '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "importBLSKeyShare",
    "params": {
      "keyShareName": "BLS_KEY:SCHAIN_ID:0:NODE_ID:0:DKG_ID:50430369644259773977341056658200603656039028532495",
      "keyShare": "0x2f30f80d02a1e1bcc3ee74d18c4c6dbbe2735aa3368ab816f8450f9651749aab"
    }
  }' \
  -H 'content-type:application/json;' \
  $URL_SGX_WALLET -k

# Import ECDSA Key
curl --cert $CERT_FILE --key $KEY_FILE \
  -X POST \
  --data '{
    "jsonrpc": "2.0",
    "id": 4,
    "method": "importECDSAKey",
    "params": {
      "key": "0xe632f7fde2c90a073ec43eaa90dca7b82476bf28815450a11191484934b9c3f",
      "keyName": "NEK:b00d348cd769ff2cad8fe08fe1e3b91052961eab2b3f7b45e2b509b61618a437"
    }
  }' \
  -H 'content-type:application/json;' \
  $URL_SGX_WALLET -k
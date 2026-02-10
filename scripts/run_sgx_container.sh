set -e

SGX_WALLET_CONTAINER_NAME="sgx-simulator"

: "${1?Pass SGX_WALLET_TAG}"
SGX_WALLET_IMAGE_NAME=skalenetwork/sgxwallet_sim:$1

docker rm -f $SGX_WALLET_CONTAINER_NAME || true
docker pull $SGX_WALLET_IMAGE_NAME
docker run -d -p 1026-1031:1026-1031 --name $SGX_WALLET_CONTAINER_NAME \
  --entrypoint /bin/bash $SGX_WALLET_IMAGE_NAME \
  -c "source /opt/intel/sgxsdk/environment && cd /usr/src/sdk && ./sgxwallet -s -y -d -V"
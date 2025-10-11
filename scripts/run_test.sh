# #!/usr/bin/env bash

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

bash ${SCRIPT_DIR}/endpoint_by_container/run_skaled.sh SKALED_RELEASE=$1

node ${SCRIPT_DIR}/../tests/test.js $ENDPOINT_URL $CHAIN_ID $INSECURE_ETH_PRIVATE_KEY

node ${SCRIPT_DIR}/../tests/test_epoch_validation.js $ENDPOINT_URL $CHAIN_ID $INSECURE_ETH_PRIVATE_KEY
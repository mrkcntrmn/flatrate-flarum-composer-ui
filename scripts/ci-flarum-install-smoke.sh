#!/usr/bin/env bash
# Resolve and install flatrate/flarum-composer-ui into a disposable Flarum tree.
# Pins flarum/core exactly (skeleton version and core version are distinct).
# No production. No secrets. Exit 0 on PASS.
set -euo pipefail

export PATH="/usr/bin:/bin:/usr/local/bin:${PATH:-}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SMOKE_ROOT="${FLARUM_SMOKE_ROOT:-${TMPDIR:-/tmp}/flarum-composer-ui-ci-smoke-$$}"
FLARUM_SKELETON_VERSION="${FLARUM_SKELETON_VERSION:-1.8.19}"
EXPECTED_CORE="${FLARUM_CORE_VERSION:-1.8.19}"

cleanup() {
  if [[ "${KEEP_SMOKE_ROOT:-0}" != "1" ]]; then
    rm -rf "${SMOKE_ROOT}"
  fi
}
trap cleanup EXIT

rm -rf "${SMOKE_ROOT}"
mkdir -p "${SMOKE_ROOT}"

echo "FLARUM_SMOKE_ROOT=${SMOKE_ROOT}"
echo "PACKAGE_ROOT=${ROOT}"
echo "FLARUM_SKELETON_VERSION=${FLARUM_SKELETON_VERSION}"
echo "EXPECTED_CORE=${EXPECTED_CORE}"

# Skeleton provides the disposable app environment; core is constrained separately.
composer create-project \
  "flarum/flarum:${FLARUM_SKELETON_VERSION}" \
  "${SMOKE_ROOT}" \
  --no-interaction \
  --no-install

cd "${SMOKE_ROOT}"
rm -f composer.lock
composer require \
  "flarum/core:${EXPECTED_CORE}" \
  --no-update \
  --no-interaction
composer update \
  --no-interaction \
  --prefer-dist

INSTALLED_CORE="$(
  composer show flarum/core --format=json \
    | php -r '$j=json_decode(stream_get_contents(STDIN), true); $v=$j["versions"][0] ?? ""; echo preg_replace("/^v/", "", (string)$v);'
)"

if [[ "${INSTALLED_CORE}" != "${EXPECTED_CORE}" ]]; then
  echo "FLARUM_CORE_INSTALL_SMOKE=FAIL expected_core=${EXPECTED_CORE} got=${INSTALLED_CORE}" >&2
  exit 1
fi

composer config repositories.flatrate-composer-ui path "${ROOT}"
composer require "flatrate/flarum-composer-ui:*@dev" --no-interaction --prefer-dist

composer show flatrate/flarum-composer-ui >/dev/null

echo "FLARUM_SKELETON_VERSION=${FLARUM_SKELETON_VERSION}"
echo "FLARUM_CORE_VERSION=${INSTALLED_CORE}"
echo "EXTENSION_PACKAGE=flatrate/flarum-composer-ui"
echo "FLARUM_CORE_INSTALL_SMOKE=PASS"
echo "PRODUCTION_INSTALL=false"

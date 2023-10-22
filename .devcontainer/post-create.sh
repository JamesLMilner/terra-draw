#!/usr/bin/env bash

set -eo pipefail

# when in a VS Code or GitHub Codespaces devcontainer
if [ -n "${REMOTE_CONTAINERS}" ] || [ -n "${CODESPACES}" ]; then
	this_dir=$(cd -P -- "$(dirname -- "$(command -v -- "$0")")" && pwd -P)
	workspace_root=$(realpath ${this_dir}/..)

	# perform additional one-time setup just after
	# the devcontainer is created
	npm ci --prefix "${workspace_root}"             # install lib node dependencies
	npm ci --prefix "${workspace_root}/development" # install dev node dependencies
	touch "${workspace_root}/development/.env"      # ensure dev .env file exists

fi

#!/usr/bin/env bash
set -euo pipefail

NAMESPACE=""
SECRET_NAME="feature-toggles"
KEY="FEATURE_EMAIL_NOTIFICATIONS_PRISONS"

usage() {
  cat <<EOF
Usage: $0 -n <namespace> <command> [args...]

Manage the email notifications prison rollout list in a Kubernetes secret.

Commands:
  list                          Show currently enabled prisons
  add <code> [code...]          Add prison code(s) to the list
  remove <code> [code...]       Remove prison code(s) from the list
  replace <code> [code...]      Replace the entire list with the given code(s)
  clear                         Remove all prisons (disable for all)

Options:
  -n <namespace>    Kubernetes namespace (required)

Examples:
  $0 -n hmpps-official-visits-ui-dev list
  $0 -n hmpps-official-visits-ui-dev add MDI BXI
  $0 -n hmpps-official-visits-ui-dev remove MDI
  $0 -n hmpps-official-visits-ui-dev replace MDI BXI LEI
  $0 -n hmpps-official-visits-ui-dev clear
EOF
  exit 1
}

get_current_list() {
  kubectl get secret "$SECRET_NAME" -n "$NAMESPACE" -o jsonpath="{.data.$KEY}" 2>/dev/null | base64 -d 2>/dev/null || echo ""
}

update_secret() {
  local new_value="$1"
  kubectl patch secret "$SECRET_NAME" -n "$NAMESPACE" \
    -p "{\"data\":{\"$KEY\":\"$(echo -n "$new_value" | base64)\"}}"
}

csv_to_array() {
  IFS=',' read -ra arr <<< "$1"
  echo "${arr[@]}"
}

while getopts "n:" opt; do
  case $opt in
    n) NAMESPACE="$OPTARG" ;;
    *) usage ;;
  esac
done
shift $((OPTIND - 1))

if [[ -z "$NAMESPACE" ]] || [[ $# -lt 1 ]]; then
  usage
fi

COMMAND="$1"
shift

case "$COMMAND" in
  list)
    current=$(get_current_list)
    if [[ -z "$current" ]]; then
      echo "Email notifications: disabled for all prisons (empty list)"
    else
      echo "Email notifications enabled for: $current"
    fi
    ;;

  add)
    [[ $# -lt 1 ]] && { echo "Error: 'add' requires at least one prison code"; exit 1; }
    current=$(get_current_list)
    declare -A seen
    result=()
    for code in $(csv_to_array "${current:-}"); do
      if [[ -n "$code" ]] && [[ -z "${seen[$code]:-}" ]]; then
        seen[$code]=1
        result+=("$code")
      fi
    done
    for code in "$@"; do
      code=$(echo "$code" | tr '[:lower:]' '[:upper:]')
      if [[ -z "${seen[$code]:-}" ]]; then
        seen[$code]=1
        result+=("$code")
      else
        echo "Note: $code already in list"
      fi
    done
    new_value=$(IFS=','; echo "${result[*]}")
    update_secret "$new_value"
    echo "Updated: $new_value"
    ;;

  remove)
    [[ $# -lt 1 ]] && { echo "Error: 'remove' requires at least one prison code"; exit 1; }
    current=$(get_current_list)
    declare -A to_remove
    for code in "$@"; do
      to_remove[$(echo "$code" | tr '[:lower:]' '[:upper:]')]=1
    done
    result=()
    for code in $(csv_to_array "${current:-}"); do
      if [[ -n "$code" ]] && [[ -z "${to_remove[$code]:-}" ]]; then
        result+=("$code")
      fi
    done
    new_value=$(IFS=','; echo "${result[*]}")
    update_secret "$new_value"
    if [[ -z "$new_value" ]]; then
      echo "Updated: all prisons removed (notifications disabled)"
    else
      echo "Updated: $new_value"
    fi
    ;;

  replace)
    [[ $# -lt 1 ]] && { echo "Error: 'replace' requires at least one prison code"; exit 1; }
    declare -A seen
    result=()
    for code in "$@"; do
      code=$(echo "$code" | tr '[:lower:]' '[:upper:]')
      if [[ -z "${seen[$code]:-}" ]]; then
        seen[$code]=1
        result+=("$code")
      fi
    done
    new_value=$(IFS=','; echo "${result[*]}")
    update_secret "$new_value"
    echo "Replaced: $new_value"
    ;;

  clear)
    update_secret ""
    echo "Cleared: email notifications disabled for all prisons"
    ;;

  *)
    echo "Unknown command: $COMMAND"
    usage
    ;;
esac

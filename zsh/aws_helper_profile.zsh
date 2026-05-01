#!/usr/bin/env zsh

# Classify the active (or named) AWS profile.
# Echoes one of: sso | sso-legacy | assume-role | iam | unknown
function _aws_profile_type() {
  local p="${1:-${AWS_PROFILE:-default}}"
  # Check for static access keys first — a profile with keys is IAM
  # regardless of any other config it may also carry.
  if aws configure get aws_access_key_id --profile "$p" &>/dev/null; then
    echo iam; return
  fi
  if aws configure get role_arn --profile "$p" &>/dev/null; then
    echo assume-role; return
  fi
  if aws configure get sso_session --profile "$p" &>/dev/null; then
    echo sso; return
  fi
  if aws configure get sso_start_url --profile "$p" &>/dev/null; then
    echo sso-legacy; return
  fi
  echo unknown
}

function aws_unset_creds() {
  local do_sso_logout=0
  if [[ "${1}" == "--sso" ]]; then
    do_sso_logout=1
  fi

  echo "Unsetting all existing AWS_* credential-related environment variables...";
  unset AWS_ACCESS_KEY_ID;
  unset AWS_SECRET_ACCESS_KEY;
  unset AWS_SESSION_TOKEN;
  unset AWS_MFA_EXPIRY;
  unset AWS_SESSION_EXPIRY;
  unset AWS_ROLE;
  unset AWS_PROFILE;
  unset AWS_ASSUMED_ACCESS_KEY_ID
  unset AWS_ASSUMED_SECRET_ACCESS_KEY
  unset AWS_ASSUMED_SESSION_TOKEN
  unset AWS_MFA_ACCESS_KEY_ID
  unset AWS_MFA_SECRET_ACCESS_KEY
  unset AWS_MFA_SESSION_TOKEN
  unset AWS_PREASSUME_ACCESS_KEY_ID
  unset AWS_PREASSUME_SECRET_ACCESS_KEY
  unset AWS_PREASSUME_SESSION_TOKEN
  unset AWS_PREMFA_ACCESS_KEY_ID
  unset AWS_PREMFA_SECRET_ACCESS_KEY
  unset AWS_PREMFA_SESSION_TOKEN
  unset AWS_ROLE_ARN

  if [[ $do_sso_logout -eq 1 ]]; then
    echo "Running 'aws sso logout'...";
    aws sso logout
  fi
}

function aws_check_creds() {
  local caller_identity
  if ! caller_identity=($(aws sts get-caller-identity --output text 2>/dev/null)); then
    echo "Error: unable to verify credentials with AWS" >&2;
    case "$(_aws_profile_type)" in
      sso|sso-legacy)
        echo "Hint: SSO token may have expired. Try: aws sso login --profile ${AWS_PROFILE:-<profile>}" >&2
        ;;
    esac
    return 1;
  fi

  local account_id="${caller_identity[@]:0:1}";
  local arn="${caller_identity[@]:1:1}";
  local user_id="${caller_identity[@]:2:1}";

  if [[ -n "${account_id}" && -n "${arn}" && -n "${user_id}" ]]; then
    echo "Credentials valid for the following Account/User:"
    echo "================================================="
    echo "  AWS Profile: ${AWS_PROFILE}";
    echo " Profile Type: $(_aws_profile_type)";
    echo "   Account ID: ${account_id}";
    echo "          ARN: ${arn}";
    echo "      User ID: ${user_id}";
    local expiry
    expiry=$(aws configure export-credentials --format env 2>/dev/null \
      | awk -F= '/AWS_CREDENTIAL_EXPIRATION/ {print $2}')
    if [[ -n "${expiry}" ]]; then
      echo "       Expiry: ${expiry}";
    elif [[ -n "${AWS_SESSION_EXPIRY}" ]]; then
      echo "       Expiry: ${AWS_SESSION_EXPIRY}";
    elif [[ -n "${AWS_MFA_EXPIRY}" ]]; then
      echo "   MFA Expiry: ${AWS_MFA_EXPIRY}";
    fi
    echo "================================================="
    return 0;
  else
    echo "Unhandled error with 'aws sts get-caller-identity'" >&2;
    return 1;
  fi;
}

function aws_set_creds() {
  aws_unset_creds || return 1

  local profiles
  profiles=(`aws configure list-profiles`)

  echo;

  PS3="Choose an AWS profile: "
  local chosen
  select chosen in "${profiles[@]}"; do
    [ -n "${chosen}" ] && break
    echo "The number you have dialed has not been recognised; please check and try again."
  done

  local ptype
  ptype="$(_aws_profile_type "${chosen}")"

  if [[ "${ptype}" == "sso" || "${ptype}" == "sso-legacy" ]]; then
    echo "Profile [${chosen}] is an SSO profile. Use 'aws_sso_login ${chosen}' instead." >&2
    return 1
  fi

  export AWS_PROFILE="${chosen}"

  # For IAM profiles, export the static keys directly to env vars so they
  # take precedence over any cached SSO credentials the CLI might resolve.
  local key_id secret_key
  key_id=$(aws configure get aws_access_key_id --profile "${chosen}" 2>/dev/null)
  secret_key=$(aws configure get aws_secret_access_key --profile "${chosen}" 2>/dev/null)
  if [[ -n "${key_id}" && -n "${secret_key}" ]]; then
    export AWS_ACCESS_KEY_ID="${key_id}"
    export AWS_SECRET_ACCESS_KEY="${secret_key}"
  fi

  echo;

  if aws_check_creds; then
    return 0
  fi

  if [[ "${ptype}" == "iam" ]]; then
    echo "Credentials check failed — attempting MFA authentication..."
    aws_auth_mfa
    return $?
  fi

  return 1
}

# Log into AWS SSO for the chosen (or current) profile.
# With no argument and no AWS_PROFILE set, presents an interactive picker of SSO profiles.
function aws_sso_login() {
  local profile="${1:-${AWS_PROFILE}}"

  if [[ -z "${profile}" ]]; then
    # Interactive picker filtered to SSO profiles only
    local all_profiles sso_profiles ptype
    all_profiles=(`aws configure list-profiles`)
    sso_profiles=()
    for p in "${all_profiles[@]}"; do
      ptype="$(_aws_profile_type "${p}")"
      if [[ "${ptype}" == "sso" || "${ptype}" == "sso-legacy" ]]; then
        sso_profiles+=("${p}")
      fi
    done

    if [[ ${#sso_profiles[@]} -eq 0 ]]; then
      echo "No SSO profiles found in ~/.aws/config" >&2
      return 1
    fi

    echo;
    PS3="Choose an SSO profile: "
    select profile in "${sso_profiles[@]}"; do
      [ -n "${profile}" ] && break
      echo "The number you have dialed has not been recognised; please check and try again."
    done
    echo;
  fi

  case "$(_aws_profile_type "${profile}")" in
    sso|sso-legacy) ;;
    *)
      echo "Profile [${profile}] is not an SSO profile (type: $(_aws_profile_type "${profile}"))." >&2
      echo "Use 'aws_set_creds' for non-SSO profiles." >&2
      return 1
      ;;
  esac

  aws sso login --profile "${profile}" || return 1
  export AWS_PROFILE="${profile}"
  aws_check_creds
}

# Export resolved credentials from the active (or named) profile to env vars.
# Works for SSO, IAM, and assume-role profiles via 'aws configure export-credentials'.
function aws_export_env() {
  local profile="${1:-${AWS_PROFILE}}"
  if [[ -z "${profile}" ]]; then
    echo "Usage: aws_export_env <profile>" >&2
    return 1
  fi

  local env_block
  if ! env_block=$(aws configure export-credentials --profile "${profile}" --format env 2>&1); then
    echo "Failed to export credentials for [${profile}]: ${env_block}" >&2
    case "$(_aws_profile_type "${profile}")" in
      sso|sso-legacy)
        echo "Hint: try 'aws_sso_login ${profile}' first." >&2
        ;;
    esac
    return 1
  fi

  eval "${env_block}"
  export AWS_PROFILE="${profile}"
  echo "Exported credentials from [${profile}] into the current shell."
}

# Authenticate with an MFA Token Code (IAM-user flow).
function aws_auth_mfa() {
  case "$(_aws_profile_type)" in
    sso|sso-legacy)
      echo "MFA is enforced by your IdP at the SSO portal." >&2
      echo "Run: aws sso login --profile ${AWS_PROFILE}    (or: aws_sso_login)" >&2
      return 1
      ;;
  esac

  local session_tokens
  local caller_identity
  if ! caller_identity=($(aws sts get-caller-identity --output text)); then
    echo "Error: current AWS credential configuration invalid - did you forget to run aws_set_creds?" >&2;
    return 1;
  fi

  if [[ -n "${AWS_SESSION_TOKEN+x}" ]]; then
    echo "Error: already using an STS token, you probably don't want to do MFA authentication at this point - perhaps run aws_unset_creds to reset" >&2;
    return 1;
  fi

  [[ -n "${AWS_ACCESS_KEY_ID+x}" ]] && export AWS_PREMFA_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID}"
  [[ -n "${AWS_SECRET_ACCESS_KEY+x}" ]] && export AWS_PREMFA_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY}"
  [[ -n "${AWS_SESSION_TOKEN+x}" ]] && export AWS_PREMFA_SESSION_TOKEN="${AWS_SESSION_TOKEN}"

  local user_name
  user_name="$(echo ${caller_identity[@]:1:1} | awk -F \/ '{print $2}')"
  local mfa_serial
  if ! mfa_serial="$(aws iam list-mfa-devices --user-name "${user_name}" --query 'MFADevices[*].SerialNumber' --output text)"; then
    echo "Failed to retrieve MFA serial number" >&2;
    return 1;
  fi

  echo -n "MFA Token Code for [${AWS_PROFILE}]: ";
  local token_code
  read -r -s token_code;
  echo

  if ! session_tokens=($(aws sts get-session-token --token-code "${token_code}" --serial-number "${mfa_serial}" --output text)); then
    echo "STS MFA Request Failed" >&2;
    return 1;
  fi;

  export AWS_ACCESS_KEY_ID="${session_tokens[@]:1:1}";
  export AWS_SECRET_ACCESS_KEY="${session_tokens[@]:3:1}";
  export AWS_SESSION_TOKEN="${session_tokens[@]:4:1}";

  export AWS_MFA_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID}";
  export AWS_MFA_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY}";
  export AWS_MFA_SESSION_TOKEN="${AWS_SESSION_TOKEN}";
  export AWS_MFA_EXPIRY="${session_tokens[@]:2:1}";

  if [[ -n "${AWS_ACCESS_KEY_ID}" && -n "${AWS_SECRET_ACCESS_KEY}" && -n "${AWS_SESSION_TOKEN}" ]]; then
    echo "MFA Succeeded. With great power comes great responsibility...";
    return 0;
  else
    echo "MFA Failed" >&2;
    return 1;
  fi;
}

# Assume an IAM role from the current credentials (IAM, MFA, or SSO).
function aws_assume_role(){
  if [ "$#" -lt 1 ]; then
    echo "Usage: aws_assume_role <role-name> [<account-id>]" >&2;
    echo " - where <role-name> is the name of a role in the AWS account that you have credentials for" >&2;
    echo " - where <account-id> is optionally the id of the AWS account containing the role" >&2;
    echo "Alternative usage with ARN: aws_assume_role -arn <role-arn>" >&2;
    return 1;
  fi;

  local session_tokens
  local caller_identity
  if ! caller_identity=($(aws sts get-caller-identity --output text)); then
    echo "Error: current AWS credential configuration invalid - did you forget to run aws_set_creds?" >&2;
    case "$(_aws_profile_type)" in
      sso|sso-legacy)
        echo "Hint: try 'aws_sso_login' first." >&2
        ;;
    esac
    return 1;
  fi;

  local current_aws_account_id="${caller_identity[@]:0:1}";
  local current_principal_arn="${caller_identity[@]:1:1}";
  local current_principal_user_id="${caller_identity[@]:2:1}";

  [[ -n "${AWS_ACCESS_KEY_ID+x}" ]] && export AWS_PREASSUME_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID}"
  [[ -n "${AWS_SECRET_ACCESS_KEY+x}" ]] && export AWS_PREASSUME_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY}"
  [[ -n "${AWS_SESSION_TOKEN+x}" ]] && export AWS_PREASSUME_SESSION_TOKEN="${AWS_SESSION_TOKEN}"

  local role="${1}";
  local role_arn aws_account_id
  if [[ -n "${2}" ]]; then
    if [[ "${1}" == "-arn" ]]; then
      role_arn="${2}";
      aws_account_id="from-arn";
    else
      aws_account_id="${2}";
      role_arn="arn:aws:iam::${aws_account_id}:role/${role}";
    fi;
  else
    aws_account_id="${current_aws_account_id}"
    role_arn="arn:aws:iam::${aws_account_id}:role/${role}";
  fi;

  local current_user
  current_user="$(echo ${current_principal_arn} | cut -d'/' -f 2)";
  if [[ ${current_principal_user_id:0:4} == "AROA" ]]; then
    current_user="${current_user}-$(echo ${current_principal_user_id} | cut -d':' -f 2)"
  fi;
  local session_name
  if [[ ${aws_account_id} == ${current_aws_account_id} ]]; then
    session_name="${current_user}";
  else
    session_name="${current_aws_account_id}-${current_user}";
  fi;

  if ! session_tokens=($(aws sts assume-role \
    --role-arn "${role_arn}" \
    --role-session-name "${session_name}" \
    --query Credentials \
    --output text)); then
    echo "STS Assume Role Request Failed" >&2;
    return 1;
  fi;

  export AWS_ACCESS_KEY_ID="${session_tokens[@]:0:1}";
  export AWS_SECRET_ACCESS_KEY="${session_tokens[@]:2:1}";
  export AWS_SESSION_TOKEN="${session_tokens[@]:3:1}";
  export AWS_SESSION_EXPIRY="${session_tokens[@]:1:1}";

  export AWS_ASSUMED_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID}";
  export AWS_ASSUMED_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY}";
  export AWS_ASSUMED_SESSION_TOKEN="${AWS_SESSION_TOKEN}";

  if [[ -n "${AWS_ACCESS_KEY_ID}" && -n "${AWS_SECRET_ACCESS_KEY}" && -n "${AWS_SESSION_TOKEN}" ]]; then
    export AWS_ROLE="$(echo ${role_arn} | cut -d'/' -f 2)";
    export AWS_ROLE_ARN="${role_arn}";
    echo "Successfully assumed the role with ARN ${role_arn}. With great power comes great responsibility...";
    return 0;
  else
    echo "STS Assume Role Failed" >&2;
    return 1;
  fi;
}

[[ $0 != "$BASH_SOURCE" ]] && sourced=1 || sourced=0
if [[ $sourced == 0 ]]; then
  echo "Usage - aws_helper.sh must be sourced - 'source $0'"
  echo "  Pick a profile (auto-runs 'aws sso login' for SSO profiles): aws_set_creds"
  echo "  Verify the active credentials:                               aws_check_creds"
  echo "  Log into AWS SSO for a profile:                              aws_sso_login [profile]"
  echo "  Export resolved creds (SSO/IAM/assume-role) to env vars:     aws_export_env [profile]"
  echo "  IAM-user MFA flow (not for SSO):                             aws_auth_mfa"
  echo "  Assume an IAM role from current creds:                       aws_assume_role <role> [account-id]"
  echo "  Clear AWS_* env vars (add --sso to also 'aws sso logout'):   aws_unset_creds [--sso]"
fi

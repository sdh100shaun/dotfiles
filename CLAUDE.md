# Repository Guide

Personal zsh dotfiles for macOS (Homebrew-based) with AWS credential helpers, containerised dev tooling, and starship/zplug shell setup.

## Layout

- `setup.zsh` — bootstrap script. Installs Homebrew packages (zsh-completions, starship, zplug, zoxide, fonts), symlinks `~/.zshrc`, appends sourcing lines for the helpers, and copies `git/config` to `~/.gitconfig-shared`.
- `install-font.sh` — optional font installer (Powerline-compatible Meslo).
- `zsh/.zshrc` — interactive shell init. Sources zsh-functions, containerised helpers, and the AWS helper. Note: contains hard-coded paths under `/Volumes/Development/...` that are duplicated and may need consolidation.
- `zsh/zsh-functions` — small generic helpers (`cwd`, `gc`, `passgen`, `setphp`).
- `zsh/containerised.zsh` — wrappers that run `php`, `terraform`, `node`, `npm`, `npx`, `composer`, `pack` inside Docker via `run_with_docker` (provided by the `rawkode/zsh-docker-run` zplug plugin). Disabled when `USE_CONTAINERS` is set.
- `zsh/aws_helper_profile.zsh` — AWS credential helpers (see below).
- `git/config` — shared gitconfig copied to `~/.gitconfig-shared`.

## AWS helper functions (`zsh/aws_helper_profile.zsh`)

Source the file (don't execute it) to get:

- `_aws_profile_type [profile]` — internal classifier; echoes `sso`, `sso-legacy`, `assume-role`, `iam`, or `unknown` based on `~/.aws/config` keys for the profile.
- `aws_unset_creds [--sso]` — clears all `AWS_*` env vars; with `--sso`, also runs `aws sso logout`.
- `aws_check_creds` — calls `aws sts get-caller-identity`, prints account/ARN/user, profile type, and (when available) credential expiry resolved via `aws configure export-credentials`.
- `aws_set_creds` — interactive picker over `aws configure list-profiles`; sets `AWS_PROFILE`. If the chosen profile is SSO and the cached token is missing/expired, automatically runs `aws sso login`.
- `aws_sso_login [profile]` — runs `aws sso login --profile <profile>` (refusing non-SSO profiles), then exports `AWS_PROFILE` and verifies.
- `aws_export_env [profile]` — uses `aws configure export-credentials --format env` to populate `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_SESSION_TOKEN` / `AWS_CREDENTIAL_EXPIRATION` for any profile type (SSO, IAM, assume-role).
- `aws_auth_mfa` — IAM-user MFA flow: `iam list-mfa-devices` + `sts get-session-token`. Refuses to run on SSO profiles with a hint to use `aws_sso_login`.
- `aws_assume_role <role-name> [<account-id>]` or `aws_assume_role -arn <role-arn>` — calls `sts assume-role` from whatever credentials are active (IAM, MFA, or SSO).

Stashed shadow vars: `AWS_PREMFA_*`, `AWS_PREASSUME_*`, `AWS_MFA_*`, `AWS_ASSUMED_*`, `AWS_SESSION_EXPIRY`, `AWS_MFA_EXPIRY`, `AWS_ROLE`, `AWS_ROLE_ARN`.

## Branch policy

Active development branch for AWS-helper improvements: `claude/improve-aws-helpers-Obvmd`.

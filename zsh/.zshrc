# Kiro CLI pre block. Keep at the top of this file.
[[ -f "${HOME}/Library/Application Support/kiro-cli/shell/zshrc.pre.zsh" ]] && builtin source "${HOME}/Library/Application Support/kiro-cli/shell/zshrc.pre.zsh"
#set $PATH
export PATH="/opt/homebrew/bin:$PATH"


if type brew &>/dev/null; then
    FPATH=$(brew --prefix)/share/zsh-completions:$FPATH

    autoload -Uz compinit
    compinit
  fi

export ZPLUG_HOME=/opt/homebrew/opt/zplug
source $ZPLUG_HOME/init.zsh

#run starship
eval "$(starship init zsh)"

if [ -r ~/.zshrc ]; then echo ' ' >> ~/.zshrc; \
  else echo ' ' >> ~/.zprofile; fi
 

# run zoxide
eval "$(zoxide init zsh)"


source /Volumes/Development/tools/dotfiles/zsh/zsh-functions

if [ -z "${USE_CONTAINERS}" ]; then
	source /Volumes/Development/setup/dotfiles/zsh/zsh-functions
	source /Volumes/Development/setup/dotfiles/zsh/containerised.zsh
	zplug load "rawkode/zsh-docker-run"
fi

plugins=(
 dotenv
 git 
 aws
)

source ~/.zshenv

source /Volumes/Development/setup/dotfiles/zsh/aws_helper_profile.zsh
source /Volumes/Development/setup/dotfiles/zsh/aws-helper/ecs_helper.zsh
eval "$(ssh-agent)"

export PATH="/opt/homebrew/opt/gnu-getopt/bin:$PATH"

export OLCS_APP_DIR="/Volumes/Development/projects/Vol/code/OLCS"


# Created by `pipx` on 2024-09-18 07:37:05
export PATH="$PATH:/Users/shaunhare/.local/bin"

 export NVM_DIR="$HOME/.nvm"
  [ -s "/opt/homebrew/opt/nvm/nvm.sh" ] && \. "/opt/homebrew/opt/nvm/nvm.sh"  # This loads nvm
  [ -s "/opt/homebrew/opt/nvm/etc/bash_completion.d/nvm" ] && \. "/opt/homebrew/opt/nvm/etc/bash_completion.d/nvm"  # This loads nvm b
 
export PATH="/opt/homebrew/opt/mysql-client/bin:$PATH"
 # Kiro CLI post block. Keep at the bottom of this file.
[[ -f "${HOME}/Library/Application Support/kiro-cli/shell/zshrc.post.zsh" ]] && builtin source "${HOME}/Library/Application Support/kiro-cli/shell/zshrc.post.zsh"
 
source /Volumes/Development/tools/dotfiles/zsh/zsh-functions
source /Volumes/Development/tools/dotfiles/zsh/containerised.zsh
zplug load "rawkode/zsh-docker-run"
source /Volumes/Development/tools/dotfiles/zsh/aws_helper_profile.zsh

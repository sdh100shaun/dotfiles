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

if [ -r ~/.zshrc ]; then echo 'export GPG_TTY=$(tty)' >> ~/.zshrc; \
  else echo 'export GPG_TTY=$(tty)' >> ~/.zprofile; fi
export GPG_TTY=$(tty)

# run zoxide
eval "$(zoxide init zsh)"


source /Volumes/Development/tools/dotfiles/zsh/zsh-functions


source /Volumes/Development/tools/dotfiles/zsh/zsh-functions
source /Volumes/Development/tools/dotfiles/zsh/containerised.zsh
zplug load "rawkode/zsh-docker-run"

source ~/.zshenv

source /Volumes/Development/tools/dotfiles/zsh/aws_helper_profile.zsh

eval "$(ssh-agent)"
export GPG_TTY=$(tty)
source /Volumes/Development/tools/dotfiles/zsh/zsh-functions
source /Volumes/Development/tools/dotfiles/zsh/containerised.zsh
zplug load "rawkode/zsh-docker-run"
source /Volumes/Development/tools/dotfiles/zsh/aws_helper_profile.zsh

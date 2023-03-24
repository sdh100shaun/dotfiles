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
export GPG_TTY=$(tty)

# run zoxide
eval "$(zoxide init zsh)"

source /Volumes/Development/setup/dotfiles/zsh/zsh-functions
export GPG_TTY=$(tty)
export GPG_TTY=$(tty)
export GPG_TTY=$(tty)
export GPG_TTY=$(tty)
export GPG_TTY=$(tty)
export GPG_TTY=$(tty)
export GPG_TTY=$(tty)
export GPG_TTY=$(tty)
export GPG_TTY=$(tty)
export GPG_TTY=$(tty)
export GPG_TTY=$(tty)

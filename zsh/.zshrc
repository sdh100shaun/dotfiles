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


# If you come from bash you might have to change your $PATH.
# export PATH=$HOME/bin:/usr/local/bin:$PATH

# Path to your oh-my-zsh installation.
export ZSH=$HOME/.oh-my-zsh
fpath=(/usr/local/share/zsh-completions $fpath)
# Set name of the theme to load. Optionally, if you set this to "random"
# it'll load a random theme each time that oh-my-zsh is loaded.
# See https://github.com/robbyrussell/oh-my-zsh/wiki/Themes
ZSH_THEME="agnoster"

# Which plugins would you like to load? (plugins can be found in ~/.oh-my-zsh/plugins/*)
# Custom plugins may be added to ~/.oh-my-zsh/custom/plugins/
# Example format: plugins=(rails git textmate ruby lighthouse)
# Add wisely, as too many plugins slow down shell startup.
plugins=(git)

source $ZSH/oh-my-zsh.sh

# User configuration

# export MANPATH="/usr/local/man:$MANPATH"

# You may need to manually set your language environment
# export LANG=en_US.UTF-8

# Preferred editor for local and remote sessions
# if [[ -n $SSH_CONNECTION ]]; then
#   export EDITOR='vim'
# else
#   export EDITOR='mvim'
# fi

# Compilation flags
# export ARCHFLAGS="-arch x86_64"

# ssh
# export SSH_KEY_PATH="~/.ssh/rsa_id"

# Set personal aliases, overriding those provided by oh-my-zsh libs,
# plugins, and themes. Aliases can be placed here, though oh-my-zsh
# users are encouraged to define aliases within the ZSH_CUSTOM folder.
# For a full list of active aliases, run `alias`.
#
# Example aliases
# alias zshconfig="mate ~/.zshrc"
# alias ohmyzsh="mate ~/.oh-my-zsh"
# ------------------------------------
# Docker alias and function
# ------------------------------------

# Get latest container ID
alias dl="docker ps -l -q"

# Get container process
alias dps="docker ps"

# Get process included stop container
alias dpa="docker ps -a"

# Get images
alias di="docker images"

# Get container IP
alias dip="docker inspect --format '{{ .NetworkSettings.IPAddress }}'"

# Run deamonized container, e.g., $dkd base /bin/echo hello
alias dkd="docker run -d -P"

# Run interactive container, e.g., $dki base /bin/bash
alias dki="docker run -i -t -P"

# Execute interactive container, e.g., $dex base /bin/bash
alias dex="docker exec -i -t"

# Stop all containers
dstop() { docker stop $(docker ps -a -q); }

# Remove all containers
drm() { docker rm $(docker ps -a -q); }

# Stop and Remove all containers
alias drmf='docker stop $(docker ps -a -q) && docker rm $(docker ps -a -q)'

# Remove all images
dri() { docker rmi $(docker images -q); }

#remove all images not tagged

drit() {docker rmi $(docker images | grep "^<none>" | awk "{print $3}")}

# Dockerfile build, e.g., $dbu tcnksm/test
dbu() { docker build -t=$1 .; }

# Show all alias related docker
dalias() { alias | grep 'docker' | sed "s/^\([^=]*\)=\(.*\)/\1 => \2/"| sed "s/['|\']//g" | sort; }

# Bash into running container
dbash() { docker exec -it $(docker ps -aqf "name=$1") bash; }

#Switch to main development environment
2dev() {cd /Volumes/Dev;}
2vol() {cd /Volumes/Dev/Projects/VOL/}
source ~/dotfiles/zsh/balias.zsh

# Add AWS cli to path
export PATH=~/Library/Python/3.6/bin:$PATH

# Add local composer bin path
export PATH=~/.composer/vendor/bin:$PATH

# Add ref for git flow completion
source ~/dotfiles/zsh/git-flow-completion.zsh

# Add database specific zsh aliases
source ~/dotfiles/zsh/mysql-aliases.zsh

#Add link to credetials files - not committed
source ~/dotfiles/credentials/env.zsh
export PATH="/usr/local/opt/curl/bin:$PATH"

# Add composer specific zsh aliases
source ~/dotfiles/zsh/composer-alias.zsh

test -e "${HOME}/.iterm2_shell_integration.zsh" && source "${HOME}/.iterm2_shell_integration.zsh"


#directly integrate David Mckay plugin - attributed to @rawkode (I did not want to install the plugin separately)

function can_be_run_through_docker_compose_service() {
  # Look for a service using the image $1 inside docker-compose.yml
  image_name=''
  if [ -f "docker-compose.yml" ];
  then
    image_name=$(grep -B1 -A0 "image: $1" docker-compose.yml | head -n1 | awk -F ":" '{print $1}' | tr -d '[:space:]')
  fi
}

function docker_run() {
  docker run --rm -it -u $UID -v $PWD:/sandbox -v $HOME:$HOME -e HOME=$HOME -w /sandbox --entrypoint=$3 $1:$2 ${@:4}
}

function docker_compose_run() {
  docker-compose run --rm --entrypoint=$1 ${@:2}
}

function run_with_docker() {
  can_be_run_through_docker_compose_service $1

  if [[ ! -z "${image_name// }" ]];
  then
    docker_compose_run $3 $image_name ${@:4}
  else
    docker_run $1 $2 $3 ${@:4}
  fi
}
# Add php specific zsh aliases
source ~/dotfiles/zsh/php.alias
source ~/dotfiles/zsh/phpcs-alias.zsh

# add general other tools 
source ~/dotfiles/zsh/terraform.zsh
source ~/dotfiles/zsh/macosx.zsh
git-status(){~/dotfiles/git/git-status.sh $1}

export PATH="/usr/local/opt/php@5.6/bin:$PATH"
export PATH="/usr/local/opt/php@5.6/sbin:$PATH"
export PATH="/usr/local/opt/php@7.1/bin:$PATH"
export PATH="/usr/local/opt/php@7.1/sbin:$PATH"
export dev_workspace="/Volumes/Dev/Projects/VOL/OLCS"
export PATH="/usr/local/opt/m4/bin:$PATH"
export PATH="/usr/local/opt/php@7.1/bin/:$PATH"

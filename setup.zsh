#!/bin/zsh

while getopts r:a:f: flag
do
    case "${flag}" in
        r) brew=${OPTARG};;
    esac
done
if [[ $brew = "brew"  ]]
 then
#make sure brew installed at latest
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi

brew install zsh-completions
brew install starship
brew install zplug
brew tap homebrew/cask-fonts
brew install font-inconsolata
brew install zoxide

# override zshrc
 rm ~/.zshrc && ln -s ${PWD}/zsh/.zshrc ~/.zshrc
 echo "source ${PWD}/zsh/zsh-functions" >> ~/.zshrc
 echo "source ${PWD}/zsh/containerised.zsh" >> ~/.zshrc

 echo DOT_FILE_PATH=${PWD} >> ~/.zshenv 

source ~/.zshenv
source $ZPLUG_HOME/init.zsh

 if [[ (( $+commands[zplug] )) ]]
 then 
	echo "zplug installed adding plugins" 
	zplug  install "rawkode/zsh-docker-run"
	echo 'zplug load "rawkode/zsh-docker-run"' >> ~/.zshrc
fi

#set up git settings
cp ${PWD}/git/config ~/.gitconfig-shared



#make sure brew installed at latest
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

brew install zsh-completions
brew install starship
brew install zplug
brew tap homebrew/cask-fonts
brew install font-inconsolata

# override zshrc
 rm ~/.zshrc && ln -s ~/dotfiles/zsh/.zshrc ~/.zshrc
 
#reload
zsh 

if type zplug &> /dev/null; then 
	echo "zplug installed adding plugins" 
	zplug "rawkode/zsh-docker-run"
	zplug load "rawkode/zsh-docker-run"
fi

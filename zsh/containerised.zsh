#!/usr/bin/zsh

# php container 

function php() {
  if [[ -v PHP_VERSION ]] 
  then
   run_with_docker "php" ${PHP_VERSION} "php" $@
  else
   run_with_docker "php" "latest" "php" $@
  fi
}

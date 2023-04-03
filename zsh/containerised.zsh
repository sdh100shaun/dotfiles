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

#terraform container 
function terraform {
   run_with_docker "hashicorp/terraform" "light" terraform $@
} 


#node and npm  containers 
function node() {
  if [[ -v NODE_VERSION ]]
  then
   run_with_docker "node" ${NODE_VERSION} "node" $@
  else
   run_with_docker "node" "latest" "node" $@
  fi
}

function npm() {
    run_with_docker "node" "alpine" "npm" $@ "npm" 
}

# php composer
function composer(){
   run_with_docker "sdh100shaun/vol-composer" "latest" composer $@
}

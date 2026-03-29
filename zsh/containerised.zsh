#!/usr/bin/zsh

# php container 

if [ -z "${USE_CONTAINERS}" ]; then
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
    if [[ -v TF_VERSION ]]
    then
      run_with_docker "hashicorp/terraform" ${TF_VERSION} terraform $@
    else
      run_with_docker "hashicorp/terraform" "light" terraform $@
    fi
  } 


  #node and npm  containers 
  function nodejs() {
    if [[ -v NODE_VERSION ]]
    then
    run_with_docker "node" ${NODE_VERSION} "node" $@
    else
    run_with_docker "node" "latest" "node" $@
    fi
  }

  function npmjs() {
      if [[ -v NODE_VERSION ]]
    then
      run_with_docker "node" ${NODE_VERSION}-"alpine" "npm" $@  
    else
      run_with_docker "node" "alpine" "npm" $@ 
    fi
  }
  function npxjs() {
      if [[ -v NODE_VERSION ]]
    then
      run_with_docker "node" ${NODE_VERSION}-"alpine" "npx" $@ 
    else
      run_with_docker "node" "alpine" "npx" $@
    fi
  }


  # php composer
  function vol-composer(){
    run_with_docker "sdh100shaun/vol-composer" "latest" composer $@
  }

  function composer(){
    run_with_docker "composer" "latest" composer $@
  }
  #java container 


  #function java() {
  #  if [[ -v JAVA_VERSION ]] 
  #  then
  #   run_with_docker "amazoncorretto" ${JAVA_VERSION} "java" $@
  #  else
  #   run_with_docker "amazoncorretto" "latest" "java" $@
  # fi
  #}

  #function mvn() {
  #  run_with_docker "maven" "latest" "mvn" $@
  #  
  #}

  function pack() {
  run_with_docker "buildpacksio/pack" "latest" "pack" $@
  }
fi

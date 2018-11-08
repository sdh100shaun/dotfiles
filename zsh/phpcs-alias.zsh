phpcs () {
  run_with_docker "sdh100shaun/docker-phpcs" "latest" "phpcs" $@
}

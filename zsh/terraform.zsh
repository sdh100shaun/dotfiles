function terraform() {
  run_with_docker "hashicorp/terraform" "latest" "terraform" $@
}

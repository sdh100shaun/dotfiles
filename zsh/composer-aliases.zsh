#composer () {
#    tty=
#    tty -s && tty=--tty
#    docker run \
#        $tty \
#        --interactive \
#        --rm \
#        --volume /etc/passwd:/etc/passwd:ro \
#        --volume /etc/group:/etc/group:ro \
#        --volume $(pwd):/app \
#        -w=/app \
#        --volume $SSH_AUTH_SOCK:/ssh-auth.sock \
#        --env SSH_AUTH_SOCK=/ssh-auth.sock \
#        --volume ~/.ssh:/root/.ssh:ro \
#        docker-composer composer "$@"
#}

#!/bin/bash

# Fetch remote changes and prune deleted tracked branches
git fetch -p

# Checkout the master branch and update it
git checkout master
git pull

# Delete all branches that are merged into master
git branch --merged | grep -v master | xargs -n 1 git branch -d

# Checkout the original branch
git checkout -

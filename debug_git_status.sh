#!/bin/sh
echo "=== GIT STATUS ===" > git_debug_output.txt
git status >> git_debug_output.txt 2>&1
echo "\n=== GIT DIFF (stat) ===" >> git_debug_output.txt
git diff --stat >> git_debug_output.txt 2>&1
echo "\n=== GIT COMMIT ATTEMPT ===" >> git_debug_output.txt
git add -A >> git_debug_output.txt 2>&1
git commit -m "fix: debug commit forced" >> git_debug_output.txt 2>&1
echo "\n=== GIT LOG HEAD ===" >> git_debug_output.txt
git log -1 >> git_debug_output.txt 2>&1

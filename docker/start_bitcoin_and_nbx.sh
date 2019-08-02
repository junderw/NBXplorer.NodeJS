#!/usr/bin/env bash

# Start 2 persistent processes, disown them, and make this process PID=1 sleep forever
# This is because we are going to shut down NBX remotely

# Run regtest app for using regtest-client
/root/run_regtest_app.sh 2>&1 > /dev/null &
disown

# Run NBXplorer
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null && pwd )"
$DIR/start_nbx.sh 2>&1 > /dev/null &
disown

# Run small express server for getting cookie and restarting NBX
node $DIR/stopAndCookie/stopAndCookie.js 2>&1 > /dev/null &
disown

sleep infinity

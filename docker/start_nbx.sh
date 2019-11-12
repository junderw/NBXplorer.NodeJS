#!/usr/bin/env bash

cd /root/NBXplorer

export DOTNET_CLI_TELEMETRY_OPTOUT=1
export NBXPLORER_DATADIR=/datadir
export NBXPLORER_NETWORK=regtest
export NBXPLORER_BIND=0.0.0.0:23828
export NBXPLORER_CHAINS=btc
export NBXPLORER_BTCNODEENDPOINT=127.0.0.1:18444
export NBXPLORER_BTCRPCURL=http://127.0.0.1:18443/
export NBXPLORER_CUSTOMKEYPATHTEMPLATE=1/2/3/*/5

# Run NBXplorer
dotnet run --no-launch-profile --no-build -c Release -p "NBXplorer/NBXplorer.csproj" -- $@

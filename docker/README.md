# Docker Image

## Build

```bash
cd ./docker
docker build -t nbxplorer-client-test-server .
```

## OR Pull from docker hub

```bash
docker pull junderw/nbxplorer-client-test-server
```

## run on localhost then run tests

```bash
# If you built it
docker run -d -p 18271:18271 -p 23828:23828 -p 8080:8080 nbxplorer-client-test-server
# OR, if you pulled from docker hub
docker run -d -p 18271:18271 -p 23828:23828 -p 8080:8080 junderw/nbxplorer-client-test-server

# Install deps
npm install
# Run tests
npm test
```

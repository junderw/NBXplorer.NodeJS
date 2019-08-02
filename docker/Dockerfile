FROM junderw/bitcoinjs-regtest-server
MAINTAINER Jonathan Underwood

WORKDIR /root

RUN mkdir stopAndCookie && \
  cd stopAndCookie && \
  npm init -y && \
  npm install express@^4.17.1 execa@^2.0.3

# Install dotnet

RUN wget -q \
  https://packages.microsoft.com/config/ubuntu/18.04/packages-microsoft-prod.deb \
  -O packages-microsoft-prod.deb && \
  dpkg -i packages-microsoft-prod.deb && \
  apt install -y apt-transport-https && \
  apt update && \
  apt install -y dotnet-sdk-2.2 && \
  rm packages-microsoft-prod.deb && \
  echo "export DOTNET_CLI_TELEMETRY_OPTOUT=1" >> ~/.bashrc

# Install NBXplorer

RUN git clone https://github.com/dgarage/NBXplorer.git && \
  cd NBXplorer/ && \
  DOTNET_CLI_TELEMETRY_OPTOUT=1 dotnet restore && \
  DOTNET_CLI_TELEMETRY_OPTOUT=1 dotnet publish --output /app/ --configuration Release

COPY start_bitcoin_and_nbx.sh start_nbx.sh ./
RUN chmod +x start_bitcoin_and_nbx.sh && \
  chmod +x start_nbx.sh

COPY stopAndCookie.js ./stopAndCookie/

ENTRYPOINT ["/root/start_bitcoin_and_nbx.sh"]

EXPOSE 18271
EXPOSE 23828
EXPOSE 8080
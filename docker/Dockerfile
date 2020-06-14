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
  apt update && \
  apt install -y apt-transport-https && \
  apt install -y dotnet-sdk-3.1 && \
  rm packages-microsoft-prod.deb && \
  echo "export DOTNET_CLI_TELEMETRY_OPTOUT=1" >> ~/.bashrc

# Install NBXplorer

RUN git clone https://github.com/dgarage/NBXplorer.git && \
  cd NBXplorer/ && \
  git checkout b33af19 && \
  DOTNET_CLI_TELEMETRY_OPTOUT=1 dotnet build -c Release NBXplorer/NBXplorer.csproj

COPY start_bitcoin_and_nbx.sh start_nbx.sh ./
RUN chmod +x start_bitcoin_and_nbx.sh && \
  chmod +x start_nbx.sh

COPY stopAndCookie.js ./stopAndCookie/

ENTRYPOINT ["/root/start_bitcoin_and_nbx.sh"]

EXPOSE 18271
EXPOSE 23828
EXPOSE 8080

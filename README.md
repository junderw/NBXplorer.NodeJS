# NBXplorer Client

A NodeJS client for NBXplorer.

```
npm install nbxplorer-client
```

## NBXplorer Version

The following version combinations have been tested and work together.

1. NBXplorer.NodeJS v2.0.0 === NBXplorer v2.0.0.67 (github commit 99ca6e4)

## Usage

**FIRST READ THE NBXplorer DOCs AND UNDERSTAND HOW THE API WORKS**

### derivationScheme vs. derivationSchemeInternal

When using LTC Ltub (old xpub version for LTC) NBXplorer converts to xpub in the
backend. So if using derivationScheme to filter events from getEvents etc. please
use the derivationSchemeInternal.

### HealthCheck

```js
const cli = new NBXClient({
  uri: 'https://nbx.example.com',
  cryptoCode: 'btc',
});
// healthCheck will work without cookieFilePath regardless of noauth state
// It does not require auth no matter what
const healthCheckResponse = await cli.healthCheck();
```

### Bare minimum no-wallet methods

```js
const cli = new NBXClient({
  uri: 'https://nbx.example.com',
  cryptoCode: 'btc',
  cookieFilePath: '/home/user/.nbxplorer/Main/.cookie', // Only if noauth is not active
});
const txData = await cli.getTransactionNoWallet(txid);
const nbxStatus = await cli.getStatus();
// Adding an optional true will return the broadcast response without actually broadcasting
// Good for checking the validity of a tx that you wish to broadcast at a later date.
const broadcastTxResponse = await cli.broadcastTx(txBuffer, true);
// This will actually broadcast
const broadcastTxResponse = await cli.broadcastTx(txBuffer);
await cli.rescanTx([txArg, txArg, txArg]); // See NBX docs
const feeRate = await cli.getFeeRate(blockCount);
const events = await cli.getEvents();
const updatedPsbt = await cli.updatePsbt({ psbt: 'base64 string' })
// updatedPsbt will be the merged PSBT
// creating PSBT will require an HD wallet though
```

### Tracking address

```js
const cli = new NBXClient({
  uri: 'https://nbx.example.com',
  cryptoCode: 'btc',
  address: '14bnuyjuP5US5JKXc1YuVK8XDe7E3Dnanc',
  cookieFilePath: '/home/user/.nbxplorer/Main/.cookie',
});
await cli.track(); // MUST DO ONCE PER LIFETIME OF THE WALLET
```

### Tracking HD (multisig OK)

**SEE API DOCS FOR derivationScheme FORMAT**

```js
const cli = new NBXClient({
  uri: 'https://nbx.example.com',
  cryptoCode: 'btc',
  derivationScheme: 'xpub6DJ5JT2drRS1kTaPGfRrCXdFnG1BCGkzjvStYQYMHFBAumFsMAmxb3ZQBXA1W43zix17okdUoTKSeLkK8vPVUz5cMzFmFBacPJ7EmtX8JUw-[legacy]',
  cookieFilePath: '/home/user/.nbxplorer/Main/.cookie',
});
await cli.track(); // MUST DO ONCE PER LIFETIME OF THE WALLET
```

### Wallet methods (address OR derivationScheme)

```js
const txes = await cli.getTransactions()
const tx = await cli.getTransaction(txid) // must be related to wallet
const utxos = await cli.getUtxos()
```

### Wallet methods (derivationScheme ONLY)

```js
const addressInfo = await cli.getAddress()
const keyInfo = await cli.getExtPubKeyFromScript(scriptPubKeyHex) // must be related to wallet
await cli.scanWallet() // starts a scan of the utxo set (/utxo/scan endpoint)
const status = await cli.getScanStatus() // get status of scan
// createPsbt will throw an error if fee info is not available, use fallbackFeeRate just in case
// if you don't pass disableFingerprintRandomization: true, then rbf, discourageFeeSniping, version, and lockTime
// will be randomized for privacy
const psbtData = await cli.createPsbt({destinations: [{ destination: address }]})
await cli.addMeta(key, value);
const meta = await cli.getMeta(key); // meta is an object with key `key` and value of type value passed to addMeta
await cli.removeMeta(key);
await cli.prune(); // prunes transactions of spent txos.
```

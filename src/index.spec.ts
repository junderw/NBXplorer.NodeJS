import * as assert from 'assert';
import * as bitcoinjs from 'bitcoinjs-lib';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
// import * as qs from 'querystring';
import { RegtestUtils } from 'regtest-client';
import * as rp from 'request-promise-native';
import { NBXClient } from './index';
import { GetTransactionsResponse } from './interfaces';

const network = bitcoinjs.networks.regtest;
const APIURL = process.env.APIURL || 'http://127.0.0.1:23828'; // see ./docker
const APIURL_C = process.env.APIURL_C || 'http://127.0.0.1:18271'; // see ./docker
const APIURL_R = process.env.APIURL_R || 'http://127.0.0.1:8080/1'; // see ./docker
const regtestUtils = new RegtestUtils({ APIURL: APIURL_R, APIPASS: 'satoshi' });
const TEMP_FOLDER = fs.mkdtempSync('/tmp/NBXTest');
const COOKIE_FILE = path.join(TEMP_FOLDER, '.cookie');
const sleep = (ms: number): Promise<void> =>
  new Promise((resolve): any => setTimeout(resolve, ms));
const getCookie = (): Promise<void> =>
  (rp(APIURL_C + '/cookie').then((text: string) => {
    fs.writeFileSync(COOKIE_FILE, text, 'utf8');
  }) as unknown) as Promise<void>;
const resetNBX = async ({ noauth }: { noauth: boolean }): Promise<void> => {
  await rp(APIURL_C + '/resetNBX' + (noauth ? '?noauth=1' : ''));
};
const hasAuth = async (): Promise<boolean> => {
  const cli = new NBXClient({
    uri: APIURL,
    cryptoCode: 'btc',
  });
  return cli.getStatus().then(
    () => false,
    err => {
      if (err.name === 'StatusCodeError' && err.statusCode === 401) {
        return true;
      }
      throw err;
    },
  );
};
const setAuth = async (setTrue: boolean) => {
  // it only resets if needed
  if ((await hasAuth()) === !setTrue) {
    await resetNBX({ noauth: !setTrue });
    // it checks every 100 ms, any error will cause another loop
    while ((await hasAuth().then(v => v, () => !setTrue)) === !setTrue) {
      await sleep(100);
    }
    // if we are setting from noauth to auth, we need new cookie
    if (setTrue) await getCookie();
  }
};
const randomHDKey = (): bitcoinjs.BIP32Interface => {
  const rand = crypto.randomBytes(64);
  return bitcoinjs.bip32.fromSeed(rand, network);
};
const getPathPayment = (
  root: bitcoinjs.BIP32Interface,
  path: string,
): bitcoinjs.Payment => {
  return bitcoinjs.payments.p2pkh({
    pubkey: root.derivePath(path).publicKey,
    network,
  });
};
const sendToPayment = async (payment: bitcoinjs.Payment): Promise<void> => {
  await regtestUtils.faucet(payment.address!, 5e6);
  await sleep(1300);
};

const testInstance = () => {
  const ok1 = new NBXClient({
    uri: 'http://localhost',
    cryptoCode: 'btc',
  });
  expect(ok1).toBeDefined();
  expect(() => {
    // @ts-ignore
    new NBXClient({});
  }).toThrowError(new RegExp('Must contain uri .* and cryptoCode .*'));
  expect(() => {
    // @ts-ignore
    new NBXClient({ uri: 'http://localhost' });
  }).toThrowError(new RegExp('Must contain uri .* and cryptoCode .*'));
  expect(() => {
    // @ts-ignore
    new NBXClient({ cryptoCode: 'btc' });
  }).toThrowError(new RegExp('Must contain uri .* and cryptoCode .*'));
  expect(() => {
    new NBXClient({
      uri: 'http://localhost',
      cryptoCode: 'btc',
      address: 'xxx',
      derivationScheme: 'yyy',
    });
  }).toThrowError(
    new RegExp('Must contain address OR derivationScheme not both'),
  );
  expect(() => {
    new NBXClient({
      uri: 'http://localhost',
      cryptoCode: 'btc',
      derivationScheme:
        '2-of-xpub6DFiVPHPp6RZQAhMufBLqrvtqPeVnfsa9aSKAkhEFjbXb4UQ8RhvoudxuYbCQvCEpS5kztMCqiettWF3bmTv253YmaD95KP7JYURCbM8pA5-tpubDCruHFc1BmwttsyBwemwVGguQsr8TKX3TDvin7zCCzwewbxgYrhPNzTPSayJzGyY9ZoYhcVVUSxEvar18D5cuXJmFjjzh9sZRbytJgFv9Y4',
    });
  }).toThrowError(
    new RegExp('Invalid derivationScheme: All xpubs should be same version'),
  );
  expect(() => {
    new NBXClient({
      uri: 'http://localhost',
      cryptoCode: 'btc',
      derivationScheme:
        'xpub6DFiVPHPp6RZQAhMufBLqrvtqPeVnfsa9aSKAkhEFjbXb4UQ8RhvoudxuYbCQvCEpS5kztMCqiettWF3bmTv253YmaD95KP7JYURCbM8pA5-xpub6CVdP2HfWQ9EFC3P8a8b1oz3v7uW9qprMnKvFof9TZkK9mqzmcKXGvpRckaQtepkx1hFvpZbKTZRdBXEjKfjG1os8o4LJeXpC9SvLj6WUnG',
    });
  }).toThrowError(
    new RegExp(
      'Invalid derivationScheme: Multiple xpubs but no "m-of-" prefix',
    ),
  );
  expect(() => {
    new NBXClient({
      uri: 'http://localhost',
      cryptoCode: 'btc',
      derivationScheme: '-#$&',
    });
  }).toThrowError(new RegExp('Invalid derivationScheme'));
};

const testLtcConvert = () => {
  const client = new NBXClient({
    uri: 'http://localhost',
    cryptoCode: 'ltc',
    derivationScheme:
      'Ltub2YvjqfVhPqTEVZKKj48asg6GzvE4udLzV4Xu5tQFq4b1t9UoRcpG6aJryd6SZ4E1YE6qWwx9AVCojGtMeDmB6wbHRvwnyLHrgeDGFFYihyU',
  });
  const client2 = new NBXClient({
    uri: 'http://localhost',
    cryptoCode: 'ltc',
    derivationScheme:
      'ttub4drVr6TfsehE24VmcuAyWDQzUuCwHcbtaaXmePPv7LPmdfcVRpavMu3uKMr4yyaZAErVth7wVuJ9o7ZYNsWKY7FpfqiMfJZGgzNuPMPKQfv',
  });
  expect(client.derivationSchemeInternal).toEqual(
    'xpub6CVdP2HfWQ9EFC3P8a8b1oz3v7uW9qprMnKvFof9TZkK9mqzmcKXGvpRckaQtepkx1hFvpZbKTZRdBXEjKfjG1os8o4LJeXpC9SvLj6WUnG',
  );
  expect(client2.derivationSchemeInternal).toEqual(
    'tpubDCsFuG7MDg6gWzEEam7gDjKRFF1A9EKuuQvDcMiHoUWCu4WhqqAcRNVFrnfCR9mzjvEAYQ5TrZPUKN1r8BWy9TGACPodzBC3n73L6j8jAuj',
  );
};

const testTrack = async () => {
  await setAuth(true);
  const root = randomHDKey();
  const xpub = root.neutered().toBase58();
  const derivationScheme = xpub + '-[legacy]';
  const cli = new NBXClient({
    uri: APIURL,
    cryptoCode: 'btc',
    derivationScheme,
    cookieFilePath: COOKIE_FILE,
  });
  await assert.doesNotReject(cli.track());
  const result = await cli.getAddress();
  const resultCustom = await cli.getAddress({ feature: 'Custom' });
  const result2 = await cli.getExtPubKeyFromScript(result.scriptPubKey);
  const expected = getPathPayment(root, 'm/0/0').address;
  const expectedCustom = getPathPayment(root, 'm/1/2/3/0/5').address;
  assert.strictEqual(result.address, expected);
  assert.strictEqual(result2.address, expected);
  assert.strictEqual(resultCustom.address, expectedCustom);
};

const testGetTransactions = async () => {
  await setAuth(true);
  const root = randomHDKey();
  const xpub = root.neutered().toBase58();
  const derivationScheme = xpub + '-[legacy]';
  const cliHD = new NBXClient({
    uri: APIURL + '/', // testing if it deletes trailing slash
    cryptoCode: 'btc',
    derivationScheme,
    cookieFilePath: COOKIE_FILE,
  });
  await assert.doesNotReject(cliHD.track());
  const payment = getPathPayment(root, 'm/0/0');
  await sendToPayment(payment);

  let txes1: GetTransactionsResponse;
  let doLoop: boolean;
  do {
    txes1 = await cliHD.getTransactions();
    doLoop = txes1.unconfirmedTransactions.transactions.length === 0;
    if (doLoop) await sleep(300);
  } while (doLoop);

  const txes2 = await cliHD.getTransactions(false);
  expect(
    txes1.unconfirmedTransactions.transactions[0].transaction,
  ).toBeDefined();
  expect(txes2.unconfirmedTransactions.transactions[0].transaction).toBeFalsy();
  const txid = txes1.unconfirmedTransactions.transactions[0].transactionId;
  const singleTx1 = await cliHD.getTransaction(txid);
  const singleTx2 = await cliHD.getTransaction(txid, false);
  expect(singleTx1.transaction).toBeDefined();
  expect(singleTx2.transaction).toBeFalsy();
  const singleTx1b = await cliHD.getTransactionNoWallet(txid);
  const singleTx2b = await cliHD.getTransactionNoWallet(txid, false);
  expect(singleTx1b.transaction).toBeDefined();
  expect(singleTx2b.transaction).toBeFalsy();
  const utxos = await cliHD.getUtxos();
  expect(utxos.unconfirmed.utxOs[0].scriptPubKey).toBe(
    payment.output!.toString('hex'),
  );
};

const testGetTransactionsAddress = async () => {
  await setAuth(true);
  const root = randomHDKey();
  const payment = getPathPayment(root, 'm/0/0');
  const address = payment.address!;
  const cliaddr = new NBXClient({
    uri: APIURL,
    cryptoCode: 'btc',
    address,
    cookieFilePath: COOKIE_FILE,
  });
  await assert.doesNotReject(cliaddr.track());
  await sendToPayment(payment);

  let txes1: GetTransactionsResponse;
  let doLoop: boolean;
  do {
    txes1 = await cliaddr.getTransactions();
    doLoop = txes1.unconfirmedTransactions.transactions.length === 0;
    if (doLoop) await sleep(300);
  } while (doLoop);

  const txes2 = await cliaddr.getTransactions(false);
  expect(
    txes1.unconfirmedTransactions.transactions[0].transaction,
  ).toBeDefined();
  expect(txes2.unconfirmedTransactions.transactions[0].transaction).toBeFalsy();
  const txid = txes1.unconfirmedTransactions.transactions[0].transactionId;
  const singleTx1 = await cliaddr.getTransaction(txid);
  const singleTx2 = await cliaddr.getTransaction(txid, false);
  expect(singleTx1.transaction).toBeDefined();
  expect(singleTx2.transaction).toBeFalsy();
  const singleTx1b = await cliaddr.getTransactionNoWallet(txid);
  const singleTx2b = await cliaddr.getTransactionNoWallet(txid, false);
  expect(singleTx1b.transaction).toBeDefined();
  expect(singleTx2b.transaction).toBeFalsy();
  const utxos = await cliaddr.getUtxos();
  expect(utxos.unconfirmed.utxOs[0].scriptPubKey).toBe(
    payment.output!.toString('hex'),
  );
};

const testNoWalletError = async () => {
  const cli = new NBXClient({
    uri: 'http://localhost',
    cryptoCode: 'btc',
  });
  await expect(cli.track()).rejects.toThrow(
    /^This method needs an address or derivationScheme$/,
  );
  await expect(cli.getTransactions()).rejects.toThrow(
    /^This method needs an address or derivationScheme$/,
  );
  await expect(cli.getTransaction('')).rejects.toThrow(
    /^This method needs an address or derivationScheme$/,
  );
  await expect(cli.getUtxos()).rejects.toThrow(
    /^This method needs an address or derivationScheme$/,
  );
  await expect(cli.prune()).rejects.toThrow(
    /^This method needs a derivationScheme$/,
  );
  await expect(cli.createPsbt({ destinations: [] })).rejects.toThrow(
    /^This method needs a derivationScheme$/,
  );
  await expect(cli.getAddress()).rejects.toThrow(
    /^This method needs a derivationScheme$/,
  );
  await expect(cli.getExtPubKeyFromScript('')).rejects.toThrow(
    /^This method needs a derivationScheme$/,
  );
  await expect(cli.scanWallet()).rejects.toThrow(
    /^This method needs a derivationScheme$/,
  );
  await expect(cli.getScanStatus()).rejects.toThrow(
    /^This method needs a derivationScheme$/,
  );
};

const testMeta = async () => {
  await setAuth(true);
  const root = randomHDKey();
  const xpub = root.neutered().toBase58();
  const derivationScheme = xpub + '-[legacy]';
  const cli = new NBXClient({
    uri: APIURL,
    cryptoCode: 'btc',
    derivationScheme,
    cookieFilePath: COOKIE_FILE,
  });
  await cli.track();
  const key = 'test';
  const value = { a: 1, b: 2, c: 3, d: 'four', e: true };
  await cli.addMeta(key, value);
  const got = await cli.getMeta(key);
  expect(got).toEqual({ [key]: value });
  await cli.removeMeta(key);
  const got2 = await cli.getMeta(key).then(v => v, () => 42);
  expect(got2).toBe(42);
};

const testBroadcast = async () => {
  const key = bitcoinjs.ECPair.makeRandom({ network });
  const payment = bitcoinjs.payments.p2pkh({
    pubkey: key.publicKey,
    network,
  });
  const address = payment.address!;
  const unspent = await regtestUtils.faucet(address, 5e6);
  const txObj = await regtestUtils.fetch(unspent.txId);
  const nonWitnessUtxo = Buffer.from(txObj.txHex, 'hex');
  const tx = new bitcoinjs.Psbt()
    .addInput({
      hash: unspent.txId,
      index: unspent.vout,
    })
    .updateInput(0, {
      nonWitnessUtxo,
    })
    .addOutput({
      script: payment.output!,
      value: 499e4,
    })
    .signInput(0, key)
    .finalizeInput(0)
    .extractTransaction();
  const cli = new NBXClient({
    uri: APIURL,
    cryptoCode: 'btc',
    cookieFilePath: COOKIE_FILE,
  });
  await expect(cli.broadcastTx(tx.toBuffer(), true)).resolves.toBeTruthy();
  // Second broadcast doesn't fail since first did not actually broadcast
  await expect(cli.broadcastTx(tx.toBuffer())).resolves.toBeTruthy();
  await regtestUtils.mine(6);
  await cli.rescanTx([{ transactionId: tx.getId() }]);
};

const testBroadcastLarge = async () => {
  const key = bitcoinjs.ECPair.makeRandom({ network });
  const otherKeys = Array(3)
    .fill(1)
    .map(() => bitcoinjs.ECPair.makeRandom({ network }));
  const paymentOld = bitcoinjs.payments.p2pkh({
    pubkey: key.publicKey,
    network,
  });
  const paymentNew = bitcoinjs.payments.p2sh({
    redeem: bitcoinjs.payments.p2wsh({
      redeem: bitcoinjs.payments.p2ms({
        pubkeys: [key.publicKey].concat(otherKeys.map(k => k.publicKey)).sort(),
        m: 2,
        network,
      }),
      network,
    }),
    network,
  });
  const TOTAL_INPUT = 5e8;
  const OUTPUT_COUNT = 670;
  const EACH_OUTPUT = Math.floor(TOTAL_INPUT / OUTPUT_COUNT - 60);
  const unspent = await regtestUtils.faucet(paymentOld.address!, TOTAL_INPUT);
  const txObj = await regtestUtils.fetch(unspent.txId);
  const nonWitnessUtxo = Buffer.from(txObj.txHex, 'hex');
  const psbt = new bitcoinjs.Psbt()
    .addInput({
      hash: unspent.txId,
      index: unspent.vout,
    })
    .updateInput(0, {
      nonWitnessUtxo,
    });
  for (let i = 0; i < OUTPUT_COUNT; i++) {
    psbt.addOutput({
      script: paymentNew.output!,
      value: EACH_OUTPUT,
    });
  }
  const tx = psbt
    .signInput(0, key)
    .finalizeInput(0)
    .extractTransaction();
  const txid = tx.getId();
  const cli = new NBXClient({
    uri: APIURL,
    cryptoCode: 'btc',
    cookieFilePath: COOKIE_FILE,
  });
  await cli.broadcastTx(tx.toBuffer());
  await regtestUtils.mine(6);
  await cli.rescanTx([{ transactionId: txid }]);

  const psbt2 = new bitcoinjs.Psbt({ maximumFeeRate: 50000000 });
  for (let i = 0; i < OUTPUT_COUNT; i++) {
    psbt2
      .addInput({
        hash: txid,
        index: i,
      })
      .updateInput(i, {
        witnessUtxo: {
          script: paymentNew.output!,
          value: EACH_OUTPUT,
        },
        witnessScript: paymentNew.redeem!.redeem!.output,
        redeemScript: paymentNew.redeem!.output,
      });
  }
  psbt2.addOutput({
    script: paymentNew.output!,
    value: EACH_OUTPUT,
  });
  psbt2.addOutput({
    script: paymentNew.output!,
    value: EACH_OUTPUT * (OUTPUT_COUNT - 5),
  });
  psbt2.signAllInputs(key);
  psbt2.signAllInputs(otherKeys[0]);
  psbt2.finalizeAllInputs();
  const bigTx = psbt2.extractTransaction();
  const bigBuf = bigTx.toBuffer();
  await cli.broadcastTx(bigBuf);
  await regtestUtils.mine(6);
};

const testScanWallet = async () => {
  await setAuth(true);
  const root = randomHDKey();
  const xpub = root.neutered().toBase58();
  const derivationScheme = xpub + '-[legacy]';
  const cliHD = new NBXClient({
    uri: APIURL,
    cryptoCode: 'btc',
    derivationScheme,
    cookieFilePath: COOKIE_FILE,
  });
  await regtestUtils.mine(10);
  await cliHD.track();
  await regtestUtils.mine(10);
  await cliHD.scanWallet({ gapLimit: 4, batchSize: 20 });
  await regtestUtils.mine(10);
  let status: any;
  do {
    status = await cliHD.getScanStatus();
    await sleep(100);
  } while (status.status === 'Pending');
  expect(status.status).toBe('Complete');
  await cliHD.prune();
};

const testGetEvents = async () => {
  await setAuth(true);
  const cli = new NBXClient({
    uri: APIURL,
    cryptoCode: 'btc',
    cookieFilePath: COOKIE_FILE,
  });
  const events = await cli.getEvents();
  expect(events).toBeTruthy();
};

const testPsbt = async () => {
  await setAuth(true);
  const root = randomHDKey();
  const xpub = root.neutered().toBase58();
  const derivationScheme = xpub + '-[legacy]';
  const cliHD = new NBXClient({
    uri: APIURL,
    cryptoCode: 'btc',
    derivationScheme,
    cookieFilePath: COOKIE_FILE,
  });
  await cliHD.track();
  const payment = getPathPayment(root, 'm/0/0');
  const address = payment.address!;
  await regtestUtils.faucet(address, 5e6);
  await sleep(1000);
  await regtestUtils.mine(6);
  await sleep(5000);
  const result = await cliHD.createPsbt({
    destinations: [{ destination: address, amount: 499e4 }],
    feePreference: {
      fallbackFeeRate: 1,
    },
  });
  const psbt = bitcoinjs.Psbt.fromBase64(result.psbt);
  psbt.signAllInputs(root.derivePath('m/0/0') as any);
  await cliHD.updatePsbt({ psbt: psbt.toBase64() });
};

const testGetFeeRate = async () => {
  await setAuth(true);
  const cli = new NBXClient({
    uri: APIURL,
    cryptoCode: 'btc',
    cookieFilePath: COOKIE_FILE,
  });
  // TODO: perhaps if we do this test near the end it will work
  const feeRate = await cli.getFeeRate(3).then(
    v => v,
    err => {
      if (
        err.name === 'StatusCodeError' &&
        err.error &&
        err.error.code === 'fee-estimation-unavailable'
      ) {
        return {
          feeRate: 1,
          blockCount: 3,
        };
      }
      throw err;
    },
  );
  expect(feeRate.blockCount).toBe(3);
  expect(feeRate.feeRate).toBeDefined();
};

const testHealthCheck = async () => {
  await setAuth(true);
  const cli = new NBXClient({
    uri: APIURL,
    cryptoCode: 'btc',
  });
  const result = await cli.healthCheck();
  expect(result.results.NodesHealthCheck.data.BTC).toBe('Ready');
};

const testAuth = async () => {
  await setAuth(true);
  assert.ok(await hasAuth());
  const cli = new NBXClient({
    uri: APIURL,
    cryptoCode: 'btc',
    cookieFilePath: COOKIE_FILE,
  });
  await assert.doesNotReject(cli.getStatus());
  await setAuth(false);
  assert.ok(!(await hasAuth()));
  const cli2 = new NBXClient({
    uri: APIURL,
    cryptoCode: 'btc',
  });
  await assert.doesNotReject(cli2.getStatus());
};

// timeout is long just in case
jest.setTimeout(30 * 1000);
describe('NBXClient', () => {
  beforeAll(async () => {
    if (await hasAuth()) await getCookie();
  });
  it('should access NBX with auth properly', testAuth);
  it('should create an instance with uri and cryptoCode', testInstance);
  it('should convert ltc Ltub and ttub to xpub and tpub', testLtcConvert);
  it('should scan utxos for a wallet', testScanWallet);
  it('should throw errors when wallet is not present', testNoWalletError);
  it('should track derivationScheme and give address', testTrack);
  it('should get transactions from NBX', testGetTransactions);
  it(
    'should get transactions from NBX with address',
    testGetTransactionsAddress,
  );
  it('should get set and remove metadata', testMeta);
  it('should broadcast transactions', testBroadcast);
  it('should broadcast very large transactions', testBroadcastLarge);
  it('should get events for the coin', testGetEvents);
  it('should create and update Psbt', testPsbt);
  it('should get healthCheck result', testHealthCheck);
  it('should get the feeRate from bitcoind', testGetFeeRate);
});

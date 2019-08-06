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
  const cli = new NBXClient({
    uri: APIURL + '/', // testing if it deletes trailing slash
    cryptoCode: 'btc',
    derivationScheme,
    cookieFilePath: COOKIE_FILE,
  });
  await assert.doesNotReject(cli.track());
  const payment = getPathPayment(root, 'm/0/0');
  await sendToPayment(payment);

  let txes1: GetTransactionsResponse;
  let doLoop: boolean;
  do {
    txes1 = await cli.getTransactions();
    doLoop = txes1.unconfirmedTransactions.transactions.length === 0;
    if (doLoop) await sleep(300);
  } while (doLoop);

  const txes2 = await cli.getTransactions(false);
  expect(
    txes1.unconfirmedTransactions.transactions[0].transaction,
  ).toBeDefined();
  expect(txes2.unconfirmedTransactions.transactions[0].transaction).toBeFalsy();
  const txid = txes1.unconfirmedTransactions.transactions[0].transactionId;
  const singleTx1 = await cli.getTransaction(txid);
  const singleTx2 = await cli.getTransaction(txid, false);
  expect(singleTx1.transaction).toBeDefined();
  expect(singleTx2.transaction).toBeFalsy();
  const singleTx1b = await cli.getTransactionNoWallet(txid);
  const singleTx2b = await cli.getTransactionNoWallet(txid, false);
  expect(singleTx1b.transaction).toBeDefined();
  expect(singleTx2b.transaction).toBeFalsy();
  const utxos = await cli.getUtxos();
  expect(utxos.unconfirmed.utxOs[0].scriptPubKey).toBe(
    payment.output!.toString('hex'),
  );
};

const testGetTransactionsAddress = async () => {
  await setAuth(true);
  const root = randomHDKey();
  const payment = getPathPayment(root, 'm/0/0');
  const address = payment.address!;
  const cli = new NBXClient({
    uri: APIURL,
    cryptoCode: 'btc',
    address,
    cookieFilePath: COOKIE_FILE,
  });
  await assert.doesNotReject(cli.track());
  await sendToPayment(payment);

  let txes1: GetTransactionsResponse;
  let doLoop: boolean;
  do {
    txes1 = await cli.getTransactions();
    doLoop = txes1.unconfirmedTransactions.transactions.length === 0;
    if (doLoop) await sleep(300);
  } while (doLoop);

  const txes2 = await cli.getTransactions(false);
  expect(
    txes1.unconfirmedTransactions.transactions[0].transaction,
  ).toBeDefined();
  expect(txes2.unconfirmedTransactions.transactions[0].transaction).toBeFalsy();
  const txid = txes1.unconfirmedTransactions.transactions[0].transactionId;
  const singleTx1 = await cli.getTransaction(txid);
  const singleTx2 = await cli.getTransaction(txid, false);
  expect(singleTx1.transaction).toBeDefined();
  expect(singleTx2.transaction).toBeFalsy();
  const singleTx1b = await cli.getTransactionNoWallet(txid);
  const singleTx2b = await cli.getTransactionNoWallet(txid, false);
  expect(singleTx1b.transaction).toBeDefined();
  expect(singleTx2b.transaction).toBeFalsy();
  const utxos = await cli.getUtxos();
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
  it('should create an instance with uri and cryptoCode', testInstance);
  it('should throw errors when wallet is not present', testNoWalletError);
  it('should track derivationScheme and give address', testTrack);
  it('should get transactions from NBX', testGetTransactions);
  it(
    'should get transactions from NBX with address',
    testGetTransactionsAddress,
  );
  it('should get set and remove metadata', testMeta);
  it('should get the feeRate from bitcoind', testGetFeeRate);

  it('should access NBX with auth properly', testAuth);
});

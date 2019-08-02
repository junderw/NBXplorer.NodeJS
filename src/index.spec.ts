import * as assert from 'assert';
import * as bitcoinjs from 'bitcoinjs-lib';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
// import * as qs from 'querystring';
import * as rp from 'request-promise-native';
import { NBXClient } from './index';

const network = bitcoinjs.networks.regtest;
const APIURL = process.env.APIURL || 'http://127.0.0.1:23828'; // see ./docker
const APIURL_C = process.env.APIURL_C || 'http://127.0.0.1:18271'; // see ./docker
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
  await sleep(800);
};
const hasAuth = async (): Promise<boolean> => {
  const cli = new NBXClient({
    uri: APIURL,
    cryptoCode: 'btc',
  });
  try {
    const data = await cli.getStatus();
    return !data;
  } catch (err) {
    return true;
  }
};
const setAuth = async (setTrue: boolean) => {
  if ((await hasAuth()) === !setTrue) {
    await resetNBX({ noauth: !setTrue });
    if (setTrue) await getCookie();
  }
};
const randomHDKey = (): bitcoinjs.BIP32Interface => {
  const rand = crypto.randomBytes(64);
  return bitcoinjs.bip32.fromSeed(rand, network);
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
  const result2 = await cli.getExtPubKeyFromScript(result.scriptPubKey);
  const expected = bitcoinjs.payments.p2pkh({
    pubkey: root.derivePath('m/0/0').publicKey,
    network,
  }).address;
  assert.strictEqual(result.address, expected);
  assert.strictEqual(result2.address, expected);
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
    await getCookie();
  });
  it('should create an instance with uri and cryptoCode', testInstance);
  it('should track derivationScheme and give address', testTrack);

  it('should access NBX with auth properly', testAuth);
});

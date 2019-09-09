import * as fs from 'fs';
import * as qs from 'querystring';
import * as rp from 'request-promise-native';
import {
  BasicAuth,
  BroadcastTxResponse,
  CreatePsbtArgs,
  CreatePsbtResponse,
  Event,
  GetAddressArgs,
  GetAddressResponse,
  GetEventsArgs,
  GetExtPubKeyFromScriptResponse,
  GetFeeRateResponse,
  GetScanStatusResponse,
  GetStatusResponse,
  GetTransactionNoWalletResponse,
  GetTransactionResponse,
  GetTransactionsResponse,
  GetUtxosResponse,
  NBXClientOpts,
  PruneResponse,
  RescanTxArgs,
  ScanWalletArgs,
  TrackDerivationSchemeArg,
  UpdatePsbtArgs,
  UpdatePsbtResponse,
} from './interfaces';

export class NBXClient {
  uri: string;
  cryptoCode: string;
  derivationScheme?: string;
  address?: string;
  private cookieFilePath?: string;

  constructor(opts: NBXClientOpts) {
    if (!opts.uri || !opts.cryptoCode) {
      throw new Error(
        'Must contain uri (ex. https://nbx.mydomain.com ) and cryptoCode (ex. btc )',
      );
    }
    if (!opts.address === false && !opts.address === !opts.derivationScheme) {
      throw new Error('Must contain address OR derivationScheme not both');
    }
    // make sure it is upper case
    opts.cryptoCode = opts.cryptoCode.toUpperCase();
    // remove trailing slash
    if (opts.uri.slice(-1) === '/') opts.uri = opts.uri.slice(0, -1);

    this.uri = opts.uri;
    this.cryptoCode = opts.cryptoCode;
    if (opts.derivationScheme) this.derivationScheme = opts.derivationScheme;
    if (opts.address) this.address = opts.address;
    if (opts.cookieFilePath) this.cookieFilePath = opts.cookieFilePath;
  }

  private get auth(): BasicAuth | undefined {
    if (this.cookieFilePath === undefined) return;
    const text = fs.readFileSync(this.cookieFilePath, 'utf8');
    const [user, pass] = text.split(':');
    return {
      user,
      pass,
    };
  }

  private get hasWallet(): boolean {
    return !!this.address || !!this.derivationScheme;
  }

  async track(
    trackDerivationSchemeArg?: TrackDerivationSchemeArg,
  ): Promise<void> {
    if (trackDerivationSchemeArg === undefined) {
      this.checkWallet();
    } else {
      try {
        this.checkHDWallet();
      } catch (err) {
        throw new Error(
          'This method needs a derivationScheme when passing trackDerivationSchemeArg',
        );
      }
    }
    const url = this.address
      ? this.uri + `/v1/cryptos/${this.cryptoCode}/addresses/${this.address}`
      : this.uri +
        `/v1/cryptos/${this.cryptoCode}/derivations/${this.derivationScheme}`;
    return makePost(url, false, this.auth, trackDerivationSchemeArg);
  }

  async getTransactions(
    includeTransaction?: boolean,
  ): Promise<GetTransactionsResponse> {
    this.checkWallet();
    const url = this.address
      ? this.uri +
        `/v1/cryptos/${this.cryptoCode}/addresses/${this.address}/transactions`
      : this.uri +
        `/v1/cryptos/${this.cryptoCode}/derivations/${this.derivationScheme}/transactions`;
    const query =
      includeTransaction !== undefined ? { includeTransaction } : undefined;
    return makeGet(url, true, this.auth, query);
  }

  async getTransaction(
    txid: string,
    includeTransaction?: boolean,
  ): Promise<GetTransactionResponse> {
    this.checkWallet();
    const url = this.address
      ? this.uri +
        `/v1/cryptos/${this.cryptoCode}/addresses/${this.address}/transactions/${txid}`
      : this.uri +
        `/v1/cryptos/${this.cryptoCode}/derivations/${this.derivationScheme}/transactions/${txid}`;
    const query =
      includeTransaction !== undefined ? { includeTransaction } : undefined;
    return makeGet(url, true, this.auth, query);
  }

  async getTransactionNoWallet(
    txid: string,
    includeTransaction?: boolean,
  ): Promise<GetTransactionNoWalletResponse> {
    const url =
      this.uri + `/v1/cryptos/${this.cryptoCode}/transactions/${txid}`;
    const query =
      includeTransaction !== undefined ? { includeTransaction } : undefined;
    return makeGet(url, true, this.auth, query);
  }

  async getStatus(): Promise<GetStatusResponse> {
    const url = this.uri + `/v1/cryptos/${this.cryptoCode}/status`;
    return makeGet(url, true, this.auth);
  }

  async getAddress(opts?: GetAddressArgs): Promise<GetAddressResponse> {
    this.checkHDWallet();
    const url =
      this.uri +
      `/v1/cryptos/${this.cryptoCode}/derivations/${this.derivationScheme}/addresses/unused`;
    return makeGet(url, true, this.auth, opts);
  }

  async getExtPubKeyFromScript(
    script: string,
  ): Promise<GetExtPubKeyFromScriptResponse> {
    this.checkHDWallet();
    const url =
      this.uri +
      `/v1/cryptos/${this.cryptoCode}/derivations/${this.derivationScheme}/scripts/${script}`;
    return makeGet(url, true, this.auth);
  }

  async getUtxos(): Promise<GetUtxosResponse> {
    this.checkWallet();
    const url = this.address
      ? this.uri +
        `/v1/cryptos/${this.cryptoCode}/addresses/${this.address}/utxos`
      : this.uri +
        `/v1/cryptos/${this.cryptoCode}/derivations/${this.derivationScheme}/utxos`;
    return makeGet(url, true, this.auth);
  }

  async broadcastTx(tx: Buffer): Promise<BroadcastTxResponse> {
    const url = this.uri + `/v1/cryptos/${this.cryptoCode}/transactions`;
    return makePost<BroadcastTxResponse>(url, true, this.auth, tx).then(res => {
      if (res.success === true) {
        return res;
      }
      throw Object.assign(
        new Error(res.rpcCodeMessage ? res.rpcCodeMessage : ''),
        res,
      );
    });
  }

  async rescanTx(transactions: RescanTxArgs[]): Promise<void> {
    const url = this.uri + `/v1/cryptos/${this.cryptoCode}/rescan`;
    return makePost(url, true, this.auth, { transactions });
  }

  async getFeeRate(blockCount: number): Promise<GetFeeRateResponse> {
    const url = this.uri + `/v1/cryptos/${this.cryptoCode}/fees/${blockCount}`;
    return makeGet(url, true, this.auth);
  }

  async scanWallet(opts?: ScanWalletArgs): Promise<void> {
    this.checkHDWallet();
    const url =
      this.uri +
      `/v1/cryptos/${this.cryptoCode}/derivations/${this.derivationScheme}/utxos/scan`;
    return makePost(url, true, this.auth, undefined, opts);
  }

  async getScanStatus(): Promise<GetScanStatusResponse> {
    this.checkHDWallet();
    const url =
      this.uri +
      `/v1/cryptos/${this.cryptoCode}/derivations/${this.derivationScheme}/utxos/scan`;
    return makeGet(url, true, this.auth);
  }

  async getEvents(opts?: GetEventsArgs): Promise<Event[]> {
    const url = this.uri + `/v1/cryptos/${this.cryptoCode}/events`;
    return makeGet(url, true, this.auth, opts);
  }

  async createPsbt(opts: CreatePsbtArgs): Promise<CreatePsbtResponse> {
    this.checkHDWallet();
    const url =
      this.uri +
      `/v1/cryptos/${this.cryptoCode}/derivations/${this.derivationScheme}/psbt/create`;
    return makePost(url, true, this.auth, opts);
  }

  async updatePsbt(opts: UpdatePsbtArgs): Promise<UpdatePsbtResponse> {
    const url = this.uri + `/v1/cryptos/${this.cryptoCode}/psbt/update`;
    if (opts && !opts.derivationScheme && this.derivationScheme) {
      opts.derivationScheme = this.derivationScheme;
    }
    return makePost(url, true, this.auth, opts);
  }

  async addMeta(key: string, value: any): Promise<void> {
    this.checkHDWallet();
    const url =
      this.uri +
      `/v1/cryptos/${this.cryptoCode}/derivations/${this.derivationScheme}/metadata/${key}`;
    return makePost(url, true, this.auth, { [key]: value });
  }

  async removeMeta(key: string): Promise<void> {
    this.checkHDWallet();
    const url =
      this.uri +
      `/v1/cryptos/${this.cryptoCode}/derivations/${this.derivationScheme}/metadata/${key}`;
    return makePost(url, true, this.auth);
  }

  /**
   * @returns An Object with one key that matches the string `key` argument.
   *   The data in key `key` is the same data passed as the `value` argument in
   *   addMeta.
   */
  async getMeta(key: string): Promise<any> {
    this.checkHDWallet();
    const url =
      this.uri +
      `/v1/cryptos/${this.cryptoCode}/derivations/${this.derivationScheme}/metadata/${key}`;
    return makeGet(url, true, this.auth);
  }

  async prune(): Promise<PruneResponse> {
    this.checkHDWallet();
    const url =
      this.uri +
      `/v1/cryptos/${this.cryptoCode}/derivations/${this.derivationScheme}/prune`;
    return makePost(url, true, this.auth);
  }

  private checkWallet(): void {
    if (!this.hasWallet)
      throw new Error('This method needs an address or derivationScheme');
  }

  private checkHDWallet(): void {
    if (!this.derivationScheme)
      throw new Error('This method needs a derivationScheme');
  }
}

function makeGet<T>(
  uri: string,
  json: boolean,
  auth?: BasicAuth,
  query?: any,
): Promise<T> {
  const opts: any = {
    method: 'GET',
    uri: !query ? uri : uri + '?' + qs.stringify(query),
    auth,
    json,
  };
  return (rp(opts) as unknown) as Promise<T>;
}

function makePost<T>(
  uri: string,
  json: boolean,
  auth?: BasicAuth,
  body?: any,
  query?: any,
): Promise<T> {
  const opts: any = {
    method: 'POST',
    uri: !query ? uri : uri + '?' + qs.stringify(query),
    auth,
    body,
    json,
  };
  return (rp(opts) as unknown) as Promise<T>;
}

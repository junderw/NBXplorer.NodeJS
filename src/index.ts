import * as fs from 'fs';
import * as rp from 'request-promise-native';
import {
  BasicAuth,
  GetTransactionsResponse,
  NBXClientOpts,
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
    if (!opts.address === !opts.derivationScheme) {
      throw new Error(
        'Must contain address OR derivationScheme not both or neither',
      );
    }
    // remove trailing slash
    if (opts.uri.slice(-1) === '/') opts.uri = opts.uri.slice(0, -1);

    this.uri = opts.uri; // Make TypeScript happy
    this.cryptoCode = opts.cryptoCode; // :-D :-D :-D
    Object.assign(this, opts);
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

  track(): Promise<any> {
    const url = this.address
      ? this.uri + `/v1/cryptos/${this.cryptoCode}/addresses/${this.address}`
      : this.uri +
        `/v1/cryptos/${this.cryptoCode}/derivations/${this.derivationScheme}`;
    return makePost(url, false, this.auth);
  }

  getTransactions(): Promise<GetTransactionsResponse> {
    const url = this.address
      ? this.uri +
        `/v1/cryptos/${this.cryptoCode}/addresses/${this.address}/transactions`
      : this.uri +
        `/v1/cryptos/${this.cryptoCode}/derivations/${this.derivationScheme}/transactions`;
    return makeGet(url, true, this.auth);
  }
}

function makeGet(uri: string, json: boolean, auth?: BasicAuth): Promise<any> {
  const opts: any = {
    method: 'GET',
    uri,
    auth,
    json,
  };
  return (rp(opts) as unknown) as Promise<any>;
}

function makePost(uri: string, json: boolean, auth?: BasicAuth): Promise<any> {
  const opts: any = {
    method: 'POST',
    uri,
    auth,
    json,
  };
  return (rp(opts) as unknown) as Promise<any>;
}

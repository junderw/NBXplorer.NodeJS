export interface NBXClientOpts {
  uri: string;
  cryptoCode: string;
  derivationScheme?: string;
  address?: string;
  auth?: BasicAuth;
}

export interface BasicAuth {
  user: string;
  pass: string;
}

export interface GetTransactionsResponse {
  height: number;
  confirmedTransactions: {
    transactions: ConfirmedTransaction[];
  };
  unconfirmedTransactions: {
    transactions: UnconfirmedTransaction[];
  };
  replacedTransactions: {
    transactions: ConfirmedTransaction[];
  };
}

interface TransactionBase {
  confirmations: number;
  transactionId: string;
  outputs: Array<{
    keyPath: string;
    scriptPubKey: string;
    index: number;
    value: number;
  }>;
  inputs: any[]; // TODO: type for inputs
  timestamp: number;
  balanceChange: number;
}

interface ConfirmedTransaction extends TransactionBase {
  blockHash: string;
  height: number;
  transaction: string;
}

interface UnconfirmedTransaction extends TransactionBase {
  blockHash: null;
  height: null;
  transaction: null;
}

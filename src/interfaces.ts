export interface NBXClientOpts {
  uri: string;
  cryptoCode: string;
  derivationScheme?: string;
  address?: string;
  cookieFilePath?: string;
}

export interface BasicAuth {
  user: string;
  pass: string;
}

export interface TrackDerivationSchemeArg {
  derivationOptions?: DerivationOptions[];
  wait?: boolean;
}

export interface DerivationOptions {
  feature?: 'Deposit' | 'Change' | 'Direct' | 'Custom';
  minAddresses?: number | null;
  maxAddresses?: number | null;
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

export interface Output {
  keyPath: string;
  scriptPubKey: string;
  index: number;
  value: number;
}

export interface TransactionBase {
  confirmations: number;
  transactionId: string;
  outputs: Output[];
  inputs: any[]; // TODO: type for inputs
  timestamp: number;
  balanceChange: number;
}

export interface ConfirmedTransaction extends TransactionBase {
  blockHash: string;
  height: number;
  transaction: string;
}

export interface UnconfirmedTransaction extends TransactionBase {
  blockHash: null;
  height: null;
  transaction: null;
}

export type GetTransactionResponse =
  | ConfirmedTransaction
  | UnconfirmedTransaction;

export interface GetTransactionNoWalletResponse {
  confirmations: number | null;
  blockId: string | null;
  transactionHash: string;
  transaction: string | null;
  height: number | null;
  timestamp: number;
}

export interface RescanArg1 {
  blockId: string;
  transactionId: string;
}

export interface RescanArg2 {
  transactionId: string;
}

export interface RescanArg3 {
  blockId: string;
  transaction: string;
}

export type RescanTxArgs = RescanArg1 | RescanArg2 | RescanArg3;

export interface GetStatusResponse {
  bitcoinStatus: {
    blocks: number;
    headers: number;
    verificationProgress: number;
    isSynched: boolean;
    incrementalRelayFee: number;
    minRelayTxFee: number;
    capabilities: {
      canScanTxoutSet: boolean;
      canSupportSegwit: boolean;
    };
  };
  repositoryPingTime: number;
  isFullySynched: boolean;
  chainHeight: number;
  syncHeight: number;
  networkType: string;
  cryptoCode: string;
  supportedCryptoCodes: string[];
  version: string;
}

export interface GetAddressArgs {
  feature?: string;
  skip?: number;
  reserve?: boolean;
}

export interface GetAddressResponse {
  trackedSource: string;
  feature: string;
  derivationStrategy: string;
  keyPath: string;
  scriptPubKey: string;
  address: string;
  redeem: string;
}

export interface GetExtPubKeyFromScriptResponse {
  trackedSource: string;
  feature: string;
  derivationStrategy: string;
  keyPath: string;
  scriptPubKey: string;
  address: string;
}

export interface GetUtxosResponse {
  trackedSource: string;
  derivationStrategy?: string;
  currentHeight: number;
  unconfirmed: UtxoData;
  confirmed: UtxoData;
  hasChanges: boolean;
}

export interface UtxoData {
  utxOs: Utxo[];
  spentOutpoints: string[];
  hasChanges: boolean;
}

export interface Utxo {
  feature: string;
  outpoint: string;
  index: number;
  transactionHash: string;
  scriptPubKey: string;
  value: number;
  keyPath: string;
  timestamp: number;
  confirmations: number;
}

export interface BroadcastTxResponse {
  success: boolean;
  rpcCode: number | null;
  rpcCodeMessage: string | null;
  rpcMessage: string | null;
}

export interface GetFeeRateResponse {
  feeRate: number;
  blockCount: number;
}

export interface ScanWalletArgs {
  batchSize?: number;
  gapLimit?: number;
  from?: number;
}

export interface GetScanStatusResponse {
  error: string | null;
  queuedAt: number;
  status: 'Queued' | 'Pending' | 'Complete' | 'Error';
  progress: {
    startedAt: number;
    completedAt: number | null;
    found: number;
    batchNumber: number;
    remainingBatches: number;
    currentBatchProgress: number;
    remainingSeconds: number;
    overallProgress: number;
    from: number;
    count: number;
    totalSearched: number;
    totalSizeOfUTXOSet: number | null;
    highestKeyIndexFound: {
      change: number | null;
      deposit: number | null;
      direct: number | null;
      custom: number | null;
    };
  };
}

export interface GetEventsArgs {
  lastEventId?: number;
  longPolling?: boolean;
  limit?: number;
}

export type Event = TransactionEvent | BlockEvent;

export interface TransactionEvent {
  eventId: number;
  type: string;
  data: TransactionEventData;
}

export interface BlockEvent {
  eventId: number;
  type: string;
  data: BlockEventData;
}

export interface TransactionEventData {
  blockId: string | null;
  trackedSource: string;
  derivationStrategy: string;
  transactionData: {
    confirmations: number;
    blockId: string | null;
    transactionHash: string;
    transaction: string;
    height: number | null;
    timestamp: number;
  };
  outputs: Output[];
  cryptoCode: string;
}

export interface BlockEventData {
  height: number;
  hash: string;
  previousBlockHash: string;
  cryptoCode: string;
}

export type Destination = SweepAllDestination | AmountDestination;

export interface SweepAllDestination {
  destination: string;
  sweepAll: true;
}

export interface AmountDestination {
  destination: string;
  amount: number;
  substractFees?: boolean;
}

export interface FeePreference {
  explicitFeeRate?: number;
  explicitFee?: number;
  blockTarget?: number;
  fallbackFeeRate?: number;
}

export interface RebaseKeyPath {
  masterFingerprint: string;
  accountKey: string;
  accountKeyPath: string;
}

export interface CreatePsbtArgs {
  seed?: number;
  rbf?: boolean;
  version?: number;
  timeLock?: number;
  explicitChangeAddress?: string;
  destinations: Destination[];
  feePreference?: FeePreference;
  reserveChangeAddress?: boolean;
  minConfirmations?: number;
  excludeOutpoints?: string[];
  includeOnlyOutpoints?: string[];
  rebaseKeyPaths?: RebaseKeyPath[];
}

export interface CreatePsbtResponse {
  psbt: string;
  changeAddress: string;
}

export interface UpdatePsbtArgs {
  psbt: string;
  derivationScheme?: string;
  rebaseKeyPaths?: RebaseKeyPath[];
}

export interface UpdatePsbtResponse {
  psbt: string;
}

export interface PruneResponse {
  totalPruned: number;
}

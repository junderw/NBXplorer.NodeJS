const bs58check = require('bs58check');

const MAINNET_XPUB = Buffer.from('0488b21e', 'hex');
const TESTNET_TPUB = Buffer.from('043587cf', 'hex');
const MAINNET_LTUB = Buffer.from('019da462', 'hex');
const TESTNET_TTUB = Buffer.from('0436f6e1', 'hex');

type LtcType = 'main' | 'test' | 'notltc';

const toXpub = (notXpub: string, version: Buffer = MAINNET_XPUB): string =>
  bs58check.encode(
    Buffer.concat([version, bs58check.decode(notXpub).slice(4)]),
  );

const getDerivationSchemeMatch = (scheme: string): RegExpMatchArray => {
  // [a-ce-g] = character group abcefg; (x) = grouping of x; (?:x) non-capturing grouping of x;
  // + = one or more; * = zero or more; \d = number;
  const b58Chars = `[1-9A-HJ-NP-Za-km-z]`;
  const prefixGroup = `((?:\\d+-of-)?)`; // ex. "12-of-" "2-of-"
  const xpubsGroup = `(${b58Chars}+(?:-${b58Chars}+)*)`; // ex. "xpub" "xpub1-xpub2" "xpub1-xpub2-xpub3" ...
  const suffixGroup = `((?:-\\[[^\\]]+\\])*)`; // ex. "-[p2sh]" "-[legacy]" "-[p2sh]-[keeporder]"
  const dSRegex = new RegExp(`^${prefixGroup}${xpubsGroup}${suffixGroup}$`);

  const match = scheme.match(dSRegex);
  if (!match) throw new Error('Invalid derivationScheme');
  return match;
};

const derivationSchemeLTCType = (xpubs: string[]): LtcType => {
  const xpubVersions: Buffer[] = xpubs.map(xpub =>
    bs58check.decode(xpub).slice(0, 4),
  );

  if (xpubVersions.every(version => version.equals(MAINNET_LTUB))) {
    return 'main';
  } else if (xpubVersions.every(version => version.equals(TESTNET_TTUB))) {
    return 'test';
  } else {
    return 'notltc';
  }
};

const derivationSchemeAllSameXpubType = (xpubs: string[]): boolean => {
  const xpubVersions: Buffer[] = xpubs.map(xpub => bs58check.decode(xpub));
  return xpubVersions.every(version => {
    return (
      version.length === 78 &&
      version.slice(0, 4).equals(xpubVersions[0].slice(0, 4))
    );
  });
};

const derivationSchemeConvertXpubs = (
  scheme: string,
  version: Buffer = MAINNET_XPUB,
): string => {
  const [, prefix, xpubs, suffix] = getDerivationSchemeMatch(scheme);
  const newXpubs = xpubs
    .split('-')
    .map(xpub => toXpub(xpub, version))
    .join('-');

  return `${prefix}${newXpubs}${suffix}`;
};

export const derivationSchemeInternalConvert = (scheme: string): string => {
  const [, prefix, xpubsStr] = getDerivationSchemeMatch(scheme);
  const xpubs = xpubsStr.split('-');
  if (xpubs.length > 1 && prefix === '')
    throw new Error(
      'Invalid derivationScheme: Multiple xpubs but no "m-of-" prefix',
    );
  if (!derivationSchemeAllSameXpubType(xpubs))
    throw new Error(
      'Invalid derivationScheme: All xpubs should be same version',
    );
  const ltcType = derivationSchemeLTCType(xpubs);
  switch (ltcType) {
    case 'main':
      return derivationSchemeConvertXpubs(scheme, MAINNET_XPUB);
    case 'test':
      return derivationSchemeConvertXpubs(scheme, TESTNET_TPUB);
    case 'notltc':
    default:
      return scheme;
  }
};

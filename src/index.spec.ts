import { NBXClient } from './index';

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

describe('NBXClient', () => {
  it('should create an instance with uri and cryptoCode', testInstance);
});

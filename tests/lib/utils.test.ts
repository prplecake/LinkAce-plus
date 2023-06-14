import {validProto} from '../../src/lib/utils';


describe('testing validProto', () => {
  test('https is valid proto', () => {
    expect(validProto('https://example.com')).toBe(true);
  });
  test('http is valid proto', () => {
    expect(validProto('http://example.com')).toBe(true);
  });
  test('ftp is valid proto', () => {
    expect(validProto('ftp://example.com')).toBe(true);
  });
  test('undefined returns false', () => {
    const undef = undefined;
    expect(validProto(undef)).toBe(false);
  });
  test('null returns false', () => {
    expect(validProto(null!)).toBe(false);
  });
});
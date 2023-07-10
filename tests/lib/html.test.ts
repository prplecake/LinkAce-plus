import {byId} from '../../src/functions/html';

describe('testing byId', () => {
  test('success return is not null', () => {
    document.body.innerHTML = `
      <div id="root"></div>    
    `;
    expect(byId('root')).toBeTruthy();
  });
  test('failure return is undefined', () => {
    document.body.innerHTML = `
      <div id="root"></div>    
    `;
    expect(byId('rootbeer')).toBeNull();
  });
});
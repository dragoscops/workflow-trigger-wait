import {hello} from './index';

describe('hello', () => {
  it('hello("World") to return "Hello World!"', function () {
    expect(hello('World')).toEqual('Hello, World!');
  });
});

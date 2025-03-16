import { romaToHira } from './kanaUtils';

describe('romaToHira', () => {
  it('processes prolonged vowels', () => {
    expect(romaToHira('o-')).toBe('おー');
    expect(romaToHira('ō')).toBe('おー');
  });
});
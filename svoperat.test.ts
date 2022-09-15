import { Lexer, OpSym } from './svoperat';

describe('parser', () => {
  test('gensym', () => {
    let sym = new OpSym('test');
    expect(sym).toEqual(new OpSym('test'));
  })
  test('basic', () => {
    const code = '2.+(3)';
    let lex = new Lexer(code);
    expect(lex.tokenize()).toEqual([2, '.', new OpSym('+'), '(', 3, ')']);
  })
})

import { Lexer, OpSym, Parser, SendExpression } from './svoperat';

describe('parser', () => {
  test('gensym', () => {
    let sym = new OpSym('test');
    expect(sym).toEqual(new OpSym('test'));
  })
  test('tokenize unit message', () => {
    const code = '2.+(3)';
    let lex = new Lexer(code);
    expect(lex.tokenize()).toEqual([2, '.', new OpSym('+'), '(', 3, ')']);
  })
  test('tokenize map message', () => {
    const code = '.shift{ :by(5) :direction(left) }'
    let lex = new Lexer(code);
    expect(lex.tokenize()).toEqual(['.', new OpSym('shift'), '{', new OpSym('by'), ':', 5, new OpSym('direction'), ':', new OpSym('left'), '}']);
  })
  test('tokenize variables', () => {
    const code = '~test.new{:gt(%it)}'
    let lex = new Lexer(code);
    expect(lex.tokenize()).toEqual(['~', new OpSym('test'), '.', new OpSym('new'), '{', ':', new OpSym('gt'), '(', '%', new OpSym('it'), ')', '}']);
  })
  test('parse unit message', () => {
    const code = '2.+(3)';
    let parser = new Parser(code);

    let expr = parser.expr();
    expect(expr).toEqual(new SendExpression({ receiver: 2, message: new OpSym('+'), arg: 3 })); // [2, '.', new OpSym('+'), '(', 3, ')']);
  })
  test('parse map message', () => {
  })
  test('parse variables', () => {
  })
  test('parse chained messages', () => {
  })
  test('tokenize list', () => {
  })
  test('parse list', () => {
  })
  test('parse @ arg', () => {
  })
  test('', () => {
  })
})

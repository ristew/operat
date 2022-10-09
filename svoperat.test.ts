import { ApplyRef, Arg, ClassRef, InterfaceRef, Lexer, OpSym, Parser, SendExpression, VauRef } from './svoperat';

describe('parser', () => {
  test('gensym', () => {
    let sym = new OpSym('test');
    expect(sym).toEqual(new OpSym('test'));
  })
  test('tokenize unit message', () => {
    const code = '2:+(3)';
    let lex = new Lexer(code);
    expect(lex.tokenize()).toEqual(['2', ':', '+', '(', '3', ')']);
  })
  test('tokenize map message', () => {
    const code = ':shift{ :by(5), :direction(left) }'
    let lex = new Lexer(code);
    expect(lex.tokenize()).toEqual([':', 'shift', '{', ':', 'by', '(', '5', ')', ',', ':', 'direction', '(', 'left', ')', '}']);
  })
  test('tokenize variables', () => {
    const code = '~test:new{:gt(@)}'
    let lex = new Lexer(code);
    expect(lex.tokenize()).toEqual(['~', 'test', ':', 'new', '{', ':', 'gt', '(', '@', ')', '}']);
  })
  test('parse unit message', () => {
    const code = '2:+(3)';
    let parser = new Parser(code);

    let expr = parser.expr();
    expect(expr).toEqual(new SendExpression({ receiver: 2, message: new OpSym('+'), arg: 3 })); // [2, '.', new OpSym('+'), '(', 3, ')']);
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
  test('string', () => {
    expect('"hello world"'.parse()).toEqual('hello world')
  })
  test('number', () => {
    expect('4.2'.parse()).toEqual(4.2)
  })
  test('symbol', () => {
    expect('to-string'.parse()).toEqual(new OpSym('to-string'))
  })
  test('arg', () => {
    expect('@'.parse()).toEqual(Arg)
  })
  test('class', () => {
    expect('~http-request'.parse()).toEqual(new ClassRef(new OpSym('http-request')))
  })
  test('interface', () => {
    expect('!container'.parse()).toEqual(new InterfaceRef(new OpSym('container')))
  })
  test('boolean', () => {
    expect('#true'.parse()).toEqual(true)
  })
  test('apply', () => {
    expect(':test'.parse()).toEqual(new ApplyRef(new OpSym('test')))
  })
  test('vau', () => {
    expect('$test'.parse()).toEqual(new VauRef(new OpSym('test')))
  })
  test('list', () => {
    expect('[1 2 3]'.parse()).toEqual([1, 2, 3])
  })
  test('message', () => {
    expect('5:sqrt'.parse()).toEqual(new SendExpression({ receiver: 5, message: new ApplyRef(new OpSym('sqrt')) }))
  })
  test('map', () => {})
  test('value', () => {})
  test('list', () => {})
  test('', () => {})
  test('', () => {})
  test('', () => {})
  test('', () => {})
})


/*
4.2
"hello world"
#true
symbol
:message("value")
:message{:field(2)}
:message[1 2 3]
:nested{:map{:key(5)}}
:nested[:map{:key(1)}, :list[2 3]]
!type
~class
:set{:arg(!self)}
2:sqrt
:point:set{:x(5:sqrt) :y(7:sqrt)}
$do(@:transpose(:x:sqrt))
 */

import * as lomp from './lomp';

describe('parser', () => {
  const testProg = `
($log (+ 2 3))
`;
  function toks() {
    return testProg.tokenize();
  }

  test('basic lex', () => {
    let exp = ['(', '$log', '(', '+', '2', '3', ')', ')'];
    // console.log(toks)
    // console.log(exp)
    expect(testProg.tokenize()).toEqual(exp);
  });


  test('basic parse', () => {
    const parser = new lomp.Parser({ toks: toks() });
    const s = parser.nextForm();
    let exp = [lomp.OpSymbol.vau('log'), [lomp.OpSymbol.standard('+'), 2, 3]];
    // console.log(s, exp, equals(exp, s));
    expect(s).toEqual(exp);
  });

  test('broken parse', () => {
    const parser = new lomp.Parser({ toks: lomp.Tokenizer.tokenize('($log (+ 1 2)') });
    expect(() => {
      const s = parser.nextForm();
      console.log(s);
    }).toThrow();
  });

  test('basic program', () => {
    const prog = `
($log (+ 2 3))
($log (* 4 (+ 7 8)))
`;
    expect(prog.parse()).toEqual(
      [
        lomp.OpSymbol.vau('progn'),
        [lomp.OpSymbol.vau('log'), [lomp.OpSymbol.standard('+'), 2, 3]],
        [lomp.OpSymbol.vau('log'), [lomp.OpSymbol.standard('*'), 4, [lomp.OpSymbol.standard('+'), 7, 8]]],
      ],
    );
  });

  test('basic map', () => {
    const parser = lomp.Parser.fromProgram(`
($log { x: 5 y: (+ 3 4) })
`);
    expect(parser.nextForm()).toEqual(
      [
        lomp.OpSymbol.vau('log'),
        {
          x: 5,
          y: [lomp.OpSymbol.standard('+'), 3, 4]
        }
      ],
    );
  });

  test('basic eval', () => {
    expect('(+ 2 3)'.parse().seval(lomp.Env.baseEnv())).toBe(5);
  })
})

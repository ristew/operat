import { Parser, Symbol, Tokenizer } from './lomp';

describe('parser', () => {
  const testProg = `
($log (+ 2 3))
`;
  function toks() {
    const tkn = new Tokenizer({ program: testProg });
    return tkn.tokenize();
  }

  test('basic lex', () => {
    let exp = ['(', '$log', '(', '+', '2', '3', ')', ')'];
    // console.log(toks)
    // console.log(exp)
    expect(toks()).toEqual(exp);
  });


  test('basic parse', () => {
    const parser = new Parser({ toks: toks() });
    const s = parser.nextForm();
    let exp = [Symbol.vau('log'), [Symbol.standard('+'), 2, 3]];
    // console.log(s, exp, equals(exp, s));
    expect(s).toEqual(exp);
  });

  test('broken parse', () => {
    const parser = new Parser({ toks: Tokenizer.tokenize('($log (+ 1 2)') });
    expect(() => {
      const s = parser.nextForm();
      console.log(s);
    }).toThrow();
  });

  test('basic program', () => {
    const parser = Parser.fromProgram(`
($log (+ 2 3))
($log (* 4 (+ 7 8)))
`);
    expect(parser.program()).toEqual(
      [
        Symbol.vau('progn'),
        [Symbol.vau('log'), [Symbol.standard('+'), 2, 3]],
        [Symbol.vau('log'), [Symbol.standard('*'), 4, [Symbol.standard('+'), 7, 8]]],
      ],
    );
  });

  test('basic map', () => {
    const parser = Parser.fromProgram(`
($log { x 5 y (+ 3 4) })
`);
    expect(parser.nextForm()).toEqual(
      [
        Symbol.vau('log'),
        {
          x: 5,
          y: [Symbol.standard('+'), 3, 4]
        }
      ],
    );
  });
})

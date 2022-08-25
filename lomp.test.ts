import { Parser, Symbol, Tokenizer } from './lomp';
import { equals } from 'ramda';

describe('parser', () => {
  const testProg = `
($log (+ 2 3))
`;
  function toks() {
    const tkn = new Tokenizer({ program: testProg });
    return tkn.tokenize();
  }

  function parser() {

  }
  test('basic lex', () => {
    let exp = ['(', '$log', '(', '+', '2', '3', ')', ')'];
    // console.log(toks)
    // console.log(exp)
    expect(toks()).toEqual(exp);
  })


  test('basic parse', () => {
    const parser = new Parser({ toks: toks() });
    const s = parser.nextForm();
    let exp = [Symbol.vau('log'), [Symbol.standard('+'), 2, 3]];
    // console.log(s, exp, equals(exp, s));
    expect(s).toEqual(exp);
  })

  test('broken parse', () => {
    const parser = new Parser({ toks: Tokenizer.tokenize('($log (+ 1 2)') });
    expect(() => {
      const s = parser.nextForm();
      console.log(s);
    }).toThrow();
  })

  test('parse program', () => {
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
    )
  })
})

// env.save(this.classes.method._new({
//     receiver: this.types.point,
//     message: 'move',
//     args: {
//         x: this.types.number,
//         y: this.types.number,
//     },
//     do: this.code(
//         this.s(this.sym.inc_by, this.slot.x, this.arg.x),
//         this.s(this.sym.inc_by, this.slot.y, this.arg.y)
//     ),
// }));

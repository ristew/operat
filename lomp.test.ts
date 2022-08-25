import { Parser, Tokenizer } from './lomp';
import { equals } from 'ramda';

describe('lexer', () => {
  test('basic lex', () => {
    const testProg = `
($log (+ 2 3))
`;
    const tkn = new Tokenizer({ program: testProg });
    const toks = tkn.tokenize();
    let exp = ['(', '$log', '(', '+', '2', '3', ')', ')'];
    // console.log(toks)
    // console.log(exp)
    expect(toks).toEqual(exp);
  })


  test('basic parse', () => {
    const testProg = `
($log (+ 2 3))
`;
    const tkn = new Tokenizer({ program: testProg });
    const toks = tkn.tokenize();
    const parser = new Parser({ toks });
    const s = parser.nextForm();
    let exp = ['$log', ['+', 2, 3]];
    console.log(s, exp, equals(exp, s));
    expect(s).toEqual(exp);
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

import * as lomp from './lomp';

describe('parser', () => {
  const testProg = `
($log (+ 2 3))
`;
  function toks() {
    return testProg.tokenize();
  }

  test('basic lex', () => {
    let exp = ['(', lomp.OpSymbol.from_string('$log'), '(', lomp.OpSymbol.from_string('+'), 2, 3, ')', ')'];
    // console.log(toks)
    // console.log(exp)
    expect(testProg.tokenize()).toEqual(exp);
  });


  test('basic parse', () => {
    const parser = new lomp.Parser({ toks: toks() });
    const s = parser.next_form();
    let exp = new lomp.SExp([lomp.OpSymbol.vau('log'), new lomp.SExp([lomp.OpSymbol.standard('+'), 2, 3])]);
    // console.log(s, exp, equals(exp, s));
    expect(s).toEqual(exp);
  });

  test('broken parse', () => {
    const parser = new lomp.Parser({ toks: lomp.Tokenizer.tokenize('($log (+ 1 2)') });
    expect(() => {
      const s = parser.next_form();
      console.log(s);
    }).toThrow();
  });

  test('basic program', () => {
    const prog = `
($log (+ 2 3))
($log (* 4 (+ 7 8)))
`;
    expect(prog.parse()).toEqual(
      new lomp.SExp([
        lomp.OpSymbol.vau('progn'),
        new lomp.SExp([lomp.OpSymbol.vau('log'), new lomp.SExp([lomp.OpSymbol.standard('+'), 2, 3])]),
        new lomp.SExp([lomp.OpSymbol.vau('log'), new lomp.SExp([lomp.OpSymbol.standard('*'), 4, new lomp.SExp([lomp.OpSymbol.standard('+'), 7, 8])])]),
      ]),
    );
  });

  test('basic map', () => {
    const parser = lomp.Parser._from_program(`
($log { x: 5 y: (+ 3 4) })
`);
    expect(parser.next_form()).toEqual(
      new lomp.SExp([
        lomp.OpSymbol.vau('log'),
        new lomp.SMap({
          x: 5,
          y: new lomp.SExp([lomp.OpSymbol.standard('+'), 3, 4])
        })
      ]),
    );
  });

  test('basic string', () => {
    expect('($log "test string")'.parse()).toEqual(
      new lomp.SExp([
        lomp.OpSymbol.vau('log'),
        "test string",
      ])
    )
  });
});

describe('expressions', () => {
  test('basic eval', () => {
    expect('(+ 2 3)'.parse().evl(lomp.Env.base_env())).toBe(5);
  });

  test('deeper math', () => {
    expect('(* 7 (+ (/ 12 4) 3))'.parse().evl(lomp.Env.base_env())).toBe(42);
  });

  test('basic conditional', () => {
    expect('($if (= (* 3 4) 12) 42 -1)'.parse().evl(lomp.Env.base_env())).toBe(42);
  });

  test('basic conditional false', () => {
    expect('($if (> (* 9 9) 99) 1 2)'.parse().evl(lomp.Env.base_env())).toBe(2);
  })
})

const SC = `
(new ~class {
  name: delay-queue
  inherits: ~queue
  vars: {
    delay: (new ~slot-def {
      type: !number
      default: 1000
      doc: "ms amount to wait before pull return"
    })
  }
  methods: {
    pull: ($method (
      (wait .delay)
      (pull @super)
    ))
  }
})
`

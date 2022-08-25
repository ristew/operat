export class Tokenizer {
  program: string = '';

  constructor({ program }) {
    this.program = program;
  }

  spaceOut(c) {
    this.program = this.program.replaceAll(c, ` ${c} `);
    return this;
  }

  tokenize() {
    '()[]{}'.split('').forEach(c => this.spaceOut(c));
    return this.program.split(' ')
      .map(tok => tok.trim())
      .filter(tok => tok.length > 0);
  }

  static tokenize(program: string) {
    let tt = new Tokenizer({ program });
    return tt.tokenize();
  }
}

export enum SymbolKind {
  Standard,
  Vau,

}

export class Symbol {
  name: string = '';
  kind: SymbolKind = SymbolKind.Standard;

  constructor({ name, kind }) {
    this.name = name;
    this.kind = kind;
  }

  static standard(name) {
    return new Symbol({ name, kind: SymbolKind.Standard });
  }

  static vau(name) {
    return new Symbol({ name, kind: SymbolKind.Vau });
  }
}


export class Parser {
  toks: [string];

  constructor({ toks }) {
    this.toks = toks;
  }

  peek() {
    return this.toks.length > 0 ? this.toks[0] : null;
  }

  chomp() {
    let tok = this.peek();
    this.toks.splice(0, 1);
    return tok;
  }

  nextForm(): any {
    const head = this.chomp();
    if (head === null) {
      return null;
    }
    const n = +head;
    if (!isNaN(n)) {
      return n;
    } else if (head === '(') {
      let cur = this.peek();
      let form = [];
      while (cur !== ')') {
        if (cur === null) {
          throw new Error('Unclosed paren');
        }
        form.push(this.nextForm());
        cur = this.peek();
      }
      this.chomp();
      return form;
    } else {
      if (head[0] === '$') {
        return Symbol.vau(head.slice(1));
      } else {
        return Symbol.standard(head);
      }
    }
  }

  program() {
    const prog = [Symbol.vau('progn')];
    while (true) {
      const form = this.nextForm();
      if (form === null) {
        break;
      } else {
        prog.push(form);
      }
    }
    return prog;
  }

  static fromProgram(program: string) {
    return new Parser({
      toks: Tokenizer.tokenize(program)
    })
  }
}

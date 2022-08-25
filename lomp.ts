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
    const n = +head;
    if (!isNaN(n)) {
      return n;
    } else if (['(', '[', '{'].includes(head)) {

    }
  }
}

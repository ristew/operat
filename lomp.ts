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
    '()[]{}:'.split('').forEach(c => this.spaceOut(c));
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

export class OpSymbol implements Expr {
  name: string = '';
  kind: SymbolKind = SymbolKind.Standard;

  constructor({ name, kind }) {
    this.name = name;
    this.kind = kind;
  }

  static standard(name: string) {
    return new OpSymbol({ name, kind: SymbolKind.Standard });
  }

  static vau(name: string) {
    return new OpSymbol({ name, kind: SymbolKind.Vau });
  }

  static fromString(val: string) {
    if (val[0] === '$') {
      return OpSymbol.vau(val.slice(1));
    } else {
      return OpSymbol.standard(val);
    }
  }

  key() {
    return this.name;
  }

  seval(env) {}

  isVau() {
    return this.kind === SymbolKind.Vau;
  }

  isStandard() {
    return this.kind === SymbolKind.Standard;
  }
}

interface Expr {
  seval(env: Env);
}

export class SExp implements Expr {
  op: OpSymbol;
  args: [Expr]

  seval(env: Env) {

  }
}

export class SMap extends Object implements Expr {
  constructor() {
    super();
  }

  seval(env) {
    return this;
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

  keySep() {
    let c = this.chomp();
    if (c !== ':') {
      throw new Error('expected :, found ' + c);
    }
  }

  nextForm(): Expr {
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
          throw new Error('Unclosed (');
        }
        form.push(this.nextForm());
        cur = this.peek();
      }
      this.chomp();
      return form;
    } else if (head === '{') {
      let cur = this.peek();
      let form = new SMap();
      while (cur !== '}') {
        if (cur === null) {
          throw new Error('Unclosed {');
        }
        let sym = this.nextForm() as OpSymbol;
        this.keySep();
        let val = this.nextForm();
        form[sym.key()] = val;
        cur = this.peek();
      }
      this.chomp();
      return form;
    } else {
      return OpSymbol.fromString(head);
    }
  }

  program(): Expr {
    const prog: [Expr] = [OpSymbol.vau('progn')];
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

declare global {
  export interface String {
    tokenize();
    parse(): Expr;
  }
}

String.prototype.tokenize = function() {
  return (new Tokenizer({ program: this })).tokenize();
}

String.prototype.parse = function() {
  return (new Parser({ toks: this.tokenize() })).program();
}

declare global {
  export interface Number {
    seval(env);
  }
}

Number.prototype.seval = function(env) {
  return this;
}


declare global {
  export interface Array<T> {
    seval(env);
  }
}

Array.prototype.seval = function(env: Env) {
  // sexp reduce
  const op = this[0];
  let args = this.slice(1);
  if (op.isStandard()) {
    args = args.map(a => a.eval(env));
  }
  const method = env.lookup(op);
}

export class Role {

}

export class GenericFunction {
  roles: [Role];
  methods: {};

  getRoles() {

  }
  lookup(args) {
    // find most specific method
    //
  }
}

export class Env {
  genericFunctions: {};
  vaus: {};
  constructor({ genericFunctions = {}, vaus = {} } = {}) {
    this.genericFunctions = genericFunctions;
    this.vaus = vaus;
  }

  lookup(sym: OpSymbol, args = []) {
    if (sym.isStandard()) {
      let gf = this.genericFunctions[sym.key()];
      // gf.roles.map(role => )
    } else if (sym.isVau()) {
      return this.vaus[sym.key()];
    }
  }

  static baseEnv() {
    return new Env({
      vaus: {
        progn: {}
      }
    });
  }
}

function objectify(o, env) {
  return new Proxy(o, {
    get(target, p: string) {
      if (p[0] === '_' || p[0] === '$') {
        return env.lookup(OpSymbol.fromString(p));
      } else {
        return target[p];
      }
    }
  })
}

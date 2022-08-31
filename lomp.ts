export class Tokenizer {
  _program: string = '';

  constructor({ program }) {
    this._program = program;
  }

  space_out(c) {
    this._program = this._program.replaceAll(c, ` ${c} `);
    return this;
  }

  tokenize() {
    '()[]{}:'.split('').forEach(c => this.space_out(c));
    return this._program.split(' ')
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
  _name: string = '';
  _kind: SymbolKind = SymbolKind.Standard;

  constructor({ name, kind }) {
    this._name = name;
    this._kind = kind;
  }

  static standard(name: string) {
    return new OpSymbol({ name, kind: SymbolKind.Standard });
  }

  static vau(name: string) {
    return new OpSymbol({ name, kind: SymbolKind.Vau });
  }

  static from_string(val: string) {
    if (val[0] === '$') {
      return OpSymbol.vau(val.slice(1));
    } else {
      return OpSymbol.standard(val);
    }
  }

  key() {
    return this._name;
  }

  evl(env) {}

  is_vau() {
    return this._kind === SymbolKind.Vau;
  }

  is_standard() {
    return this._kind === SymbolKind.Standard;
  }
}

interface Expr {
  evl(env: Env);
}

export class SExp implements Expr {
  _op: OpSymbol;
  _args: [Expr]

  evl(env: Env) {

  }
}

export class SMap extends Object implements Expr {
  constructor() {
    super();
  }

  evl(env) {
    return this;
  }
}

export class Parser {
  _toks: [string];

  constructor({ toks }) {
    this._toks = toks;
  }

  peek(): string {
    return this._toks.length > 0 ? this._toks[0] : null;
  }

  chomp() {
    let tok = this.peek();
    this._toks.splice(0, 1);
    return tok;
  }

  key_sep() {
    let c = this.chomp();
    if (c !== ':') {
      throw new Error('expected :, found ' + c);
    }
  }

  next_form(): Expr {
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
        form.push(this.next_form());
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
        let sym = this.next_form() as OpSymbol;
        this.key_sep();
        let val = this.next_form();
        form[sym.key()] = val;
        cur = this.peek();
      }
      this.chomp();
      return form;
    } else {
      return OpSymbol.from_string(head);
    }
  }

  program(): Expr {
    const prog: [Expr] = [OpSymbol.vau('progn')];
    while (true) {
      const form = this.next_form();
      if (form === null) {
        break;
      } else {
        prog.push(form);
      }
    }
    return prog;
  }

  static _from_program(program: string) {
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
    evl(env);
  }
}

Number.prototype.evl = function(env) {
  return this;
}


declare global {
  export interface Array<T> {
    evl(env);
  }
}

Array.prototype.evl = function(env: Env) {
  // sexp reduce
  const op = this[0];
  let args = this.slice(1);
  if (op.is_standard()) {
    args = args.map(a => a._eval(env));
  }
  const method = env.lookup(op);
}

export class Role {

}

export class Env {
  _generic_functions: {};
  _vaus: {};
  constructor({ genericFunctions = {}, vaus = {} } = {}) {
    this._generic_functions = genericFunctions;
    this._vaus = vaus;
  }

  lookup(sym: OpSymbol, args = []) {
    if (sym.is_standard()) {
      let gf = this._generic_functions[sym.key()];
      // gf.roles.map(role => )
    } else if (sym.is_vau()) {
      return this._vaus[sym.key()];
    }
  }

  static base_env() {
    return new Env({
      vaus: {
        progn: {}
      }
    });
  }
}

function objectify(o, env: Env) {
  return new Proxy(o, {
    get(target, p: string) {
      if (p[0] === '_' || p[0] === '$') {
        return env.lookup(OpSymbol.from_string(p));
      } else {
        return target[p];
      }
    }
  })
}

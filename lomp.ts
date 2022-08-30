export class Tokenizer {
  program: string = '';

  constructor({ program }) {
    this.program = program;
  }

  _space_out(c) {
    this.program = this.program.replaceAll(c, ` ${c} `);
    return this;
  }

  _tokenize() {
    '()[]{}:'.split('').forEach(c => this._space_out(c));
    return this.program.split(' ')
      .map(tok => tok.trim())
      .filter(tok => tok.length > 0);
  }

  static _tokenize(program: string) {
    let tt = new Tokenizer({ program });
    return tt._tokenize();
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

  static _standard(name: string) {
    return new OpSymbol({ name, kind: SymbolKind.Standard });
  }

  static _vau(name: string) {
    return new OpSymbol({ name, kind: SymbolKind.Vau });
  }

  static _from_string(val: string) {
    if (val[0] === '$') {
      return OpSymbol._vau(val.slice(1));
    } else {
      return OpSymbol._standard(val);
    }
  }

  _key() {
    return this.name;
  }

  _eval(env) {}

  _is_vau() {
    return this.kind === SymbolKind.Vau;
  }

  _is_standard() {
    return this.kind === SymbolKind.Standard;
  }
}

interface Expr {
  _eval(env: Env);
}

export class SExp implements Expr {
  op: OpSymbol;
  args: [Expr]

  _eval(env: Env) {

  }
}

export class SMap extends Object implements Expr {
  constructor() {
    super();
  }

  _eval(env) {
    return this;
  }
}

export class Parser {
  toks: [string];

  constructor({ toks }) {
    this.toks = toks;
  }

  _peek() {
    return this.toks.length > 0 ? this.toks[0] : null;
  }

  _chomp() {
    let tok = this._peek();
    this.toks.splice(0, 1);
    return tok;
  }

  _key_sep() {
    let c = this._chomp();
    if (c !== ':') {
      throw new Error('expected :, found ' + c);
    }
  }

  _next_form(): Expr {
    const head = this._chomp();
    if (head === null) {
      return null;
    }
    const n = +head;
    if (!isNaN(n)) {
      return n;
    } else if (head === '(') {
      let cur = this._peek();
      let form = [];
      while (cur !== ')') {
        if (cur === null) {
          throw new Error('Unclosed (');
        }
        form.push(this._next_form());
        cur = this._peek();
      }
      this._chomp();
      return form;
    } else if (head === '{') {
      let cur = this._peek();
      let form = new SMap();
      while (cur !== '}') {
        if (cur === null) {
          throw new Error('Unclosed {');
        }
        let sym = this._next_form() as OpSymbol;
        this._key_sep();
        let val = this._next_form();
        form[sym._key()] = val;
        cur = this._peek();
      }
      this._chomp();
      return form;
    } else {
      return OpSymbol._from_string(head);
    }
  }

  _program(): Expr {
    const prog: [Expr] = [OpSymbol._vau('progn')];
    while (true) {
      const form = this._next_form();
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
      toks: Tokenizer._tokenize(program)
    })
  }
}

declare global {
  export interface String {
    _tokenize();
    _parse(): Expr;
  }
}

String.prototype._tokenize = function() {
  return (new Tokenizer({ program: this }))._tokenize();
}

String.prototype._parse = function() {
  return (new Parser({ toks: this.tokenize() }))._program();
}

declare global {
  export interface Number {
    _eval(env);
  }
}

Number.prototype._eval = function(env) {
  return this;
}


declare global {
  export interface Array<T> {
    _eval(env);
  }
}

Array.prototype._eval = function(env: Env) {
  // sexp reduce
  const op = this[0];
  let args = this.slice(1);
  if (op._is_standard()) {
    args = args.map(a => a._eval(env));
  }
  const method = env._lookup(op);
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

  _lookup(sym: OpSymbol, args = []) {
    if (sym._is_standard()) {
      let gf = this.genericFunctions[sym._key()];
      // gf.roles.map(role => )
    } else if (sym._is_vau()) {
      return this.vaus[sym._key()];
    }
  }

  static _base_env() {
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
        return env._lookup(OpSymbol._from_string(p));
      } else {
        return target[p];
      }
    }
  })
}

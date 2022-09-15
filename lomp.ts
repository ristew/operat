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
    let toks = [];
    for (let i = 0; i < this._program.length; i++) {
      let c = this._program[i];
      if ('(){}[]:'.includes(c)) {
        toks.push(c);
      } else if (c === ';') {
        while (this._program[i] !== '\n') {
          i++;
        }
      } else if (' \n\t'.includes(c)) {
      } else if (c === '"') {
        let str = '';
        i++;
        while (this._program[i] !== '"') {
          str += this._program[i];
          i++;
        }
        toks.push(str);
      } else {
        let sym = '';
        while (this._program[i] && /[^ \n\t()\{\}\[\]\:;"]/.test(this._program[i])) {
          sym += this._program[i];
          i++;
        }
        i--;
        let float = Number.parseFloat(sym);
        if (!isNaN(float)) {
          toks.push(float);
        } else if (sym === 'true' || sym === 'false') {
          toks.push(JSON.parse(sym))
        } else {
          toks.push(OpSymbol.from_string(sym));
        }
      }
    }
    return toks;
  }

  static tokenize(program: string) {
    let tt = new Tokenizer({ program });
    return tt.tokenize();
  }
}

export enum SymbolKind {
  Class,
  Interface,
  Arg,
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

  evl(env) { return this; }

  is_vau() {
    return this._kind === SymbolKind.Vau;
  }

  is_standard() {
    return this._kind === SymbolKind.Standard;
  }

  json() {
    return this.key();
  }
}

interface Expr {
  evl(env: Env);
  json();
}

interface It<Inner> {
  it: Inner;
}

export class SExp implements Expr {
  _receiver: Expr;
  _op: OpSymbol;
  _args: SMap;

  constructor({ receiver, op, args }) {
    this._receiver = receiver;
    this._op = op;
    this._args = args;
  }

  // combiner
  evl(ctx: It<Env>) {
    let env = ctx.it;
    // sexp reduce
    let receiver = this._receiver.evl(env);
    let passed = this._args.clone();
    for (let [key, val] of Object.entries(passed)) {
      passed[key] = val.evl(ctx);
    }
    // receiver._env = env;
    const key = this._op.key();
    if (!(key in Object.getPrototypeOf(receiver))) {
      throw new Error(`invalid method ${key} on receiver ${objectName(receiver)}`)
    }
    return receiver[this._op.key()](...passed);
  }

  json() {
    return [this._op, ...this._args];
  }
}

export class SMap extends Object implements Expr {
  constructor(map = {}) {
    super();
    for (let [key, val] of Object.entries(map)) {
      this[key] = val;
    }
  }

  evl(env) {
    return this;
  }

  json() {
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
      let form: Expr[] = [];
      while (cur !== ')') {
        if (cur === null) {
          throw new Error('Unclosed (');
        }
        form.push(this.next_form());
        cur = this.peek();
      }
      this.chomp();
      return new SExp(form);
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
      return head;
    }
  }

  program(): Expr {
    const prog: Expr[] = [OpSymbol.vau('progn')];
    while (true) {
      const form = this.next_form();
      if (form === null) {
        break;
      } else {
        prog.push(form);
      }
    }
    if (prog.length === 2) {
      return prog[1];
    } else {
      return new SExp(prog);
    }
  }

  static _from_program(program: string) {
    return new Parser({
      toks: Tokenizer.tokenize(program)
    })
  }
}

function objectName(o) {
  if ('name' in Object.getPrototypeOf(o)) {
    return o.name();
  } else {
    return 'anon';
  }
}

declare global {
  export interface String {
    tokenize();
    parse(): Expr;
    evl(env);
    json();
  }
}

String.prototype.tokenize = function() {
  return (new Tokenizer({ program: this })).tokenize();
}

String.prototype.parse = function() {
  return (new Parser({ toks: this.tokenize() })).program();
}

String.prototype.evl = function(env) {
  return this;
}

String.prototype.json = function() {
  return JSON.stringify(this);
}

declare global {
  export interface Number {
    name();
    evl(env);
    json();
    '+'(n: number): number;
    '-'(n: number): number;
    '*'(n: number): number;
    '/'(n: number): number;
    '='(n: number): boolean;
    '>'(n: number): boolean;
  }
}

Number.prototype.name = function() {
  return `number/${this}`;
}

Number.prototype.evl = function(env) {
  return this;
}

Number.prototype.json = function() {
  return this;
}

Number.prototype['+'] = function(n) {
  return this + n;
}

Number.prototype['-'] = function(n) {
  return this - n;
}

Number.prototype['*'] = function(n) {
  return this * n;
}

Number.prototype['/'] = function(n) {
  return this / n;
}

Number.prototype['='] = function(n) {
  return this === n;
}

Number.prototype['>'] = function(n) {
  return this > n;
}





declare global {
  export interface Array<T> {
    evl(env);
  }
}

Array.prototype.evl = function(env: Env) {
}

declare global {
  export interface Boolean {
    evl(env);
    name(): string;
    'if'(then, elss);
  }
}

Boolean.prototype.name = function() {
  return this.toString();
}

Boolean.prototype['if'] = function(then, elss) {
  return this ? then.evl() : elss.evl();
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


export class SClass {
}

enum OpSymKind {
  Standard = 1,
  Vau = 2,
  Interface = 3,
  Class = 4,
  Message = 5,
}

let symPool = {};
let symCtr = 1;


export class OpSym {
  _gen_id: number;

  constructor(name: string) {
    if (symPool[name]) {
      this._gen_id = symPool[name];
    } else {
      let genId = symCtr++;
      // idk map both ways? fuck it
      symPool[genId] = name;
      symPool[name] = genId;
      this._gen_id = genId;
    }
  }

  toString() {
    return symPool[this._gen_id];
  }
}

function baseExtend(proto, methods) {
  for (let [key, val] of Object.entries(methods)) {
    proto.prototype[key] = val;
  }
}

baseExtend(Number, {
  eq(n) { return this === n },
});

export class Lexer {
  _text: string;
  _pos: number;

  constructor(text) {
    this._text = text;
    this._pos = 0;
  }

  char() {
    return this._text[this._pos];
  }

  nc() {
    this._pos++;
  }

  uc() {
    this._pos--;
  }

  nextTok() {
    let c = this.char();
    this.nc();
    if ('()[]{}:.!@~$%'.includes(c)) {
      return c;
    }
    if (' \n\t'.includes(c)) {
      return null;
    }
    if (c === '"') {
      let str = '';
      while (this.char() !== '"') {
        str += this.char();
        this.nc();
      }
      // last "
      this.nc();
      return str;
    }
    let sym = '';

    while (c && /[^ \n\t()\{\}\[\]\:;\."]/.test(c)) {
      sym += c;
      c = this.char();
      this.nc();
    }
    this.uc();
    if (sym.length === 0) {
      return null;
    }
    let float = Number.parseFloat(sym);
    if (!isNaN(float)) {
      return float;
    } else if (sym === 'true' || sym === 'false') {
      return JSON.parse(sym);
    } else {
      return new OpSym(sym);
    }
  }

  tokenize() {
    let toks = [];
    while (this.char()) {
      toks.push(this.nextTok());
    }
    return toks.filter(tok => tok !== null);
  }
}

export class Parser {
  _toks: any[];
  _pos: number;
  constructor(text) {
    this._toks = (new Lexer(text)).tokenize();
    this._pos = 0;
  }

  expr() {

  }
}

export interface Expression {

}

export class SendExpression {
  _receiver: Expression;
  _message: OpSym;
  _arg: any;

  constructor({ receiver, message, arg }) {
    this._receiver = receiver;
    this._message = message;
    this._arg = arg;
  }
}
import { classDef } from './objet.js';

export const Lexer = classDef([], {
  source: {
    type: 'string',
    doc: 'program source to be lexed',
  },
  fromSource: {
    static: true,
    type: 'function',
    args: { 's': { type: 'string' } },
    returns: 'self',
    fn(s) {
      return this.instantiate({ source: s });
    },
  },
  idx: {
    type: 'number',
    default: 0,
    doc: 'current index into the source',
  },
  lineNumber: {
    type: 'number',
    default: 0,
    doc: 'current line number',
  },
  peek: {
    type: 'function',
    returns: ['?', 'string'],
    fn() {
      if (!this.ended()) {
        return this.source[this.idx];
      } else {
        return null;
      }
    },
  },
  chomp: {
    type: 'method',
    returns: ['?', 'string'],
    fn() {
      if (this.peek() === '\n') {
        this.lineNumber += 1;
      }
      this.idx += 1;
      return this.peek();;
    }
  },
  undo: {
    type: 'method',
    fn() {
      if (this.peek === '\n') {
        this.lineNumber--;
      }
      this.idx--;
      return this.source[this.idx];
    }
  },
  ended: {
    type: 'function',
    fn() {
      return this.idx >= this.source.length;
    }
  },
  readToken: {
    type: 'method',
    returns: ['?', ['or', 'string', ['list', 'any'], 'number', 'bool']],
    fn() {
      let c = this.peek();
      while (' \n\t;'.includes(c)) {
        if (c === ';') {
            let comment = '';
            while (c !== '\n') {
            comment += c;
            c = this.chomp();
            }
        } else {
            c = this.chomp();
        }
      }
      if (this.ended()) {
        return null;
      }
      if ('(){}:'.includes(c)) {
        this.chomp();
        return c;
      } else if (c === '"') {
        let str = '';
        c = this.chomp();
        while (c !== '"') {
          str += c;
          c = this.chomp();
        }
        this.chomp();
        return ['str', str];
      } else {
        let sym = '';
        while (c && /[^ \n\t(){}:;"]/.test(c)) {
          sym += c;
          c = this.chomp();
        }
        let float = Number.parseFloat(sym);
        if (!isNaN(float)) {
          return float;
        } else if (sym === 'true' || sym === 'false') {
          return JSON.parse(sym);
        } else {
          return sym;
        }
      }
    },
  },
  readToEnd: {
    type: 'method',
    returns: ['list', 'any'],
    fn() {
      let toks = [];
      let tok = this.readToken();
      while (tok !== null) {
        toks.push(tok);
        tok = this.readToken();
      }
      return toks;
    }
  }
});

export const Parser = classDef([], {
  fromSource: {
    static: true,
    type: 'function',
    args: [{ name: 's', type: 'string' }],
    returns: 'self',
    fn(s) {
      let lex = Lexer.fromSource(s);
      let toks = lex.readToEnd();
      return this.instantiate({ tokens: toks });
    },
  },
  tokens: {
    type: ['list', 'string'],
  },
  parseExpr: {
    type: 'method',
    fn() {
      if (this.tokens.length == 0) {
        throw new Error('unexpected EOF');
      }
      let token = this.tokens.shift();
      if (token === '(') {
        let sexp = [];
        while (this.tokens[0] !== ')') {
          sexp.push(this.parseExpr(this.tokens));
        }
        this.tokens.shift();
        return sexp;
      } else if (token === ')') {
        throw new Error('unexpected )');
      } else if (token === '{') {
        let map = {};
        while (this.tokens[0] !== '}') {
          const name = this.parseExpr(this.tokens);
          const sep = this.parseExpr(this.tokens);
          const val = this.parseExpr(this.tokens);
          if (sep !== ':') {
            // raise hell
            throw new Error('invalid map sep ' + sep);
          }
          map[name] = val;
        }
        this.tokens.shift();
        return map;
      } else if (token === '}') {
        throw new Error('unexpected }');
      } else {
        return token;
      }
    }
  },
  parse: {
    type: 'method',
    fn() {
      let prog = [];
      while (this.tokens.length > 0) {
        prog.push(this.parseExpr());
      }
      return prog;
    }
  },
});

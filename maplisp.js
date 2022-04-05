/**
 * Okay, so operat v0 is toast. Vau calculus is proven, but I've decided to try
 * to extend Lisp with homoiconic maps in code. Also, base things earlier on the
 * object system, and just keep things tidier. This time it might count!
 */

import { readFileSync } from 'fs';
import { classDef } from './objet.js';

const Env = classDef([], {
  parent: {
    type: ['maybe', 'self'],
    default: null,
  },

  scope: {
    type: 'map',
    default: {},
  },

  define: {
    type: 'method',
    args: [{ name: 'name', type: 'string' }, { name: 'value', type: 'any' }],
    fn(name, value) {
      this.scope[name] = value;
    }
  },

  lookup: {
    type: 'function',
    args: [{ name: 'name', type: 'string' }],
    returns: ['maybe', 'any'],
    fn(name) {
      if (name in this.scope) {
        return this.scope[name];
      } else if (this.parent !== null) {
        return this.parent.lookup(name);
      } else {
        return null;
      }
    }
  },
});

let env = Env.instantiate();
env.define('Env', Env);

env.define('Object', classDef([], {

}));



env.define('Lexer', classDef([], {
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
    returns: 'string',
    fn() {
      return this.source[this.idx];
    },
  },
  chomp: {
    type: 'method',
    returns: 'string',
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
      if (this.ended()) {
        return null;
      }
      let c = this.peek();
      if (c === ';') {
        let comment = '';
        while (c !== '\n') {
          comment += c;
          c = this.chomp();
        }
      }
      while (' \n\t'.includes(c)) {
        c = this.chomp();
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
}))

env.define('Parser', classDef([], {
  fromSource: {
    static: true,
    type: 'function',
    args: [{ name: 's', type: 'string' }],
    returns: 'self',
    fn(s) {
      let lex = env.lookup('Lexer').fromSource(s);
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
}));

let prog = readFileSync('./mapcore.operat').toString();

const p = env.lookup('Parser').fromSource(prog);
console.log(JSON.stringify(p.parse(), null, 2));

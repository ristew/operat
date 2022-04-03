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

env.define('Parser', classDef([], {
  fromSource: {
    static: true,
    type: 'function',
    args: [{ name: 's', type: 'string' }],
    returns: 'self',
    fn(s) {
      let toks = [];
      for (let i = 0; i < s.length; i++) {
        let c = s[i];
        if ('(){}:'.includes(c)) {
          toks.push(c);
        } else if (c === ';') {
          while (s[i] !== '\n') {
            i++;
          }
        } else if (' \n\t'.includes(c)) {
        } else if (c === '"') {
          let str = '';
          i++;
          while (s[i] !== '"') {
            str += s[i];
            i++;
          }
          toks.push(new OpStr(str));
        } else {
          let sym = '';
          while (s[i] && /[^ \n\t(){}:;"]/.test(s[i])) {
            sym += s[i];
            i++;
          }
          i--;
          let float = Number.parseFloat(sym);
          if (!isNaN(float)) {
            toks.push(float);
          } else if (sym === 'true' || sym === 'false') {
            toks.push(JSON.parse(sym))
          } else {
            toks.push(sym);
          }
        }
      }
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

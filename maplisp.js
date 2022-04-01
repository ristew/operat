/**
 * Okay, so operat v0 is toast. Vau calculus is proven, but I've decided to try
 * to extend Lisp with homoiconic maps in code. Also, base things earlier on the
 * object system, and just keep things tidier. This time it might count!
 *
 * Tokenize
 *
 */

import { readFileSync } from 'fs';
import { classDef } from './objet.js';

const base = {
  tokenize(s) {
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
    return toks;
  },

  readTokens(toks) {
    if (toks.length == 0) {
      throw new Error('unexpected EOF');
    }
    let token = toks.shift();
    if (token === '(') {
      let sexp = [];
      while (toks[0] !== ')') {
        sexp.push(readTokens(toks));
      }
      toks.shift();
      return sexp;
    } else if (token === ')') {
      throw new Error('unexpected )');
    } else if (token === '{') {
      let map = {};
      while (toks[0] !== '}') {
        const name = readTokens(toks);
        const sep = readTokens(toks);
        const val = readTokens(toks);
        if (sep !== ':') {
          // raise hell
          throw new Error('invalid map sep ' + sep);
        }
        map[name] = val;
      }
      toks.shift();
      return map;
    } else if (token === '}') {
      throw new Error('unexpected }');
    } else {
      return token;
    }
  }
};

let prog = readFileSync('./mapcore.operat').toString();

console.log(prog);
console.log(readTokens(tokenize(prog)));

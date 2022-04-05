/**
 * Okay, so operat v0 is toast. Vau calculus is proven, but I've decided to try
 * to extend Lisp with homoiconic maps in code. Also, base things earlier on the
 * object system, and just keep things tidier. This time it might count!
 */

import { readFileSync } from 'fs';
import { classDef } from './objet.js';
import { Lexer, Parser } from './read.js';

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
      if (typeof value === 'function') {
        value = value.bind(this);
      }
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

const Object = classDef([], {
  jsproto: {
    static: true,
    type: 'any',
    doc: 'Javascript prototype to set __proto__ to, like Array.prototype',
  },
})

const List = classDef([Object], {
  jsproto: Array.prototype,

})

let env = Env.instantiate();
env.define('Env', Env);
env.define('Lexer', Lexer);
env.define('Parser', Parser);
env.define('log', (...s) => console.log(...s));
env.define('eval', function (form) {

})

let prog = readFileSync('./mapcore.operat').toString();

const p = env.lookup('Parser').fromSource(prog);
env.lookup('log')(JSON.stringify(p.parse(), null, 2));

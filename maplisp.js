/**
 * Okay, so operat v0 is toast. Vau calculus is proven, but I've decided to try
 * to extend Lisp with homoiconic maps in code. Also, base things earlier on the
 * object system, and just keep things tidier. This time it might count!
 */

import { readFileSync } from 'fs';
import { bootObjet } from './objet.js';
import { Lexer, Parser, sourceToParser } from './read.js';

let env = bootObjet();
env.define('Lexer', Lexer);
env.define('Parser', Parser);
env.define('log', (...s) => console.log(...s));
env.define('classOf', (t) => {
  if (typeof t === 'number') {

  } else if (typeof t === 'string') {

  } else if (Array.isArray(t)) {

  }
})
env.define('eval', function (form) {

})

let prog = readFileSync('./mapcore.operat').toString();

const p = sourceToParser(prog);
env.lookup('log')(JSON.stringify(p.parse(), null, 2));

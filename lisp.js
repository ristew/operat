/**
 * bootstrap a lisp to javascript compiler that works on Function
 * in some ways it is tied to the semantics of javascript
 * - cons are actually lists, no dotted pairs
 * - has to handle exceptions
 * - numeric type equivalence
 * - dicts a plenty
 * trying to make fexprs work a la kernel
 * applicatives are normal, operatives start with $
 */
import util from 'util';
import { readFileSync } from 'fs';

let shouldDebug = false;
class Symbol {
  constructor(s) {
    this.name = s;
  }
  [util.inspect.custom](depth, opts) {
    return '`' + this.name + '`';
  }


}

class Applicative {
  constructor(fn) {
    this.fn = fn;
  }
}

const newenv = () => ({
  cons(a, b) {
    this.$debug('cons', a, b);
    if (Array.isArray(b)) {
      return [a, ...b];
    } else {
      return [a, b];
    }
  },

  '*': (a, b) => a * b,
  '/': (a, b) => a / b,
  '+': (a, b) => a + b,
  '-': (a, b) => a - b,

  car(l) {
    return l[0];
  },

  $car(l) {
    return l[0];
  },

  cdr(l) {
    return l.slice(1);
  },

  $cdr(l) {
    return l.slice(1);
  },

  compile(form, env) {

  },

  $log(...args) {
    console.log.apply(this, args);
  },

  $debug(...args) {
    if (shouldDebug) {
      this.$log.apply(this, args);
    }
  },

  wrap(combiner) {
    return new Applicative(combiner);
  },

  childenv() {
    let env = newenv();
    env.parentEnv = this;
    return env;
  },

  eq(a, b) {
    if (this.numberp(a)) {
      return a === b
    } else if (this.symbolp(a) && this.symbolp(b)) {
      return a.name === b.name;
    } else if (Array.isArray(a) && Array.isArray(b)) {
      return a.length === 0 && b.length === 0;
    } else {
      return false;
    }
  },

  caris(form, name) {
    return this.eq(this.car(form), new Symbol(name));
  },

  $progn(...args) {
    let res;
    for (let statement of args) {
      res = this.$eval(statement);
    }
    return res;
  },

  parentEnv: null,

  $define(symbol, value) {
    let val = this.$eval(value);
    this.$debug('define', symbol, val);
    this[symbol.name] = val;
  },

  $if(cond, then, elsse) {
    if (this.$eval(cond)) {
      return this.$eval(then);
    } else {
      return this.$eval(elsse);
    }
  },

  concat(...args) {
    return args.join('');
  },

  $vau(args, body) {
    this.$debug('vau', args, body);
    return (...passedArgs) => {
      let i = 0;
      let lambdaEnv = this.childenv();
      for (let argName of args) {
        lambdaEnv[argName.name] = passedArgs[i];
        this.$debug('vauarg', argName, lambdaEnv[argName.name]);
        i++;
      }
      return lambdaEnv.$eval(body);
    };
  },

  $qt(s) {
    return s;
  },

  list(...args) {
    return args;
  },

  eval(form) {
    return this.$eval(form);
  },

  $eval(form) {
    this.$debug('$eval', form);
    if (Array.isArray(form)) {
      this.$debug('call', this.$car(form));
      return this.$combine(this.$eval(this.$car(form)), this.$cdr(form))
    } else if (this.symbolp(form)) {
      return this.findSymbol(form);
    } else {
      return form;
    }
  },

  $combine(c, ops) {
    if (this.operativep(c)) {
      this.$debug('combine operative', c, ops);
      return c.apply(this, ops);
    } else if (this.applicativep(c)) {
      this.$debug('combine applicative', c);
      return this.$combine(this.$unwrap(c), this.$mapeval(ops));
    } else {
      throw new Error(`cannot combine ${c}`);
    }
  },

  $unwrap(c) {
    if (c instanceof Applicative) {
      return c.fn;
    } else {
      return (...args) => c.apply(this, (args));
    }
  },

  operativep: c => c instanceof Function && (!c.name || c.name[0] === '$'),
  applicativep: c => c instanceof Applicative || (c instanceof Function && c.name[0] !== '$'),

  findSymbol(symbol) {
    this.$debug('findSymbol', symbol);
    if (this.hasOwnProperty(symbol.name)) {
      return this[symbol.name];
    } else if (this.parentEnv) {
      this.$debug('find up', symbol);
      return this.parentEnv.findSymbol(symbol);
    } else {
      throw new Error(`undefined symbol ${symbol.name}`);
    }
  },

  $parse(s) {
    this.toks = this.tokenize(s);
    let p = [];
    while (this.toks.length > 0) {
      p.push(this.read_tokens());
    }
    return p;
  },

  read_tokens() {
    if (this.toks.length == 0) {
      throw new Error('unexpected EOF');
    }
    let token = this.toks.shift();
    if (token === '(') {
      let sexp = [];
      while (this.toks[0] !== ')') {
        sexp.push(this.read_tokens(this.toks));
      }
      this.toks.shift();
      return sexp;
    } else if (token === ')') {
      throw new Error('unexpected )');
    } else {
      return this.atom(token);
    }
  },

  $call(name, ...args) {
    return this.$eval([new Symbol(name), ...args]);
  },

  mapcar(l, fn) {
    this.$debug(l, fn);
    return l.map(e => this.$call('apply', fn, l));
  },

  $mapeval(l) {
    this.$debug('$mapeval', l);
    return l.map(e => this.$eval(e));
  },

  apply(fn, args) {
    let fnenv = this.childenv();
    return fn.apply(fnenv, args);
  },

  atom(s) {
    let float = Number.parseFloat(s);
    if (!isNaN(float)) {
      return float;
    }
    return new Symbol(s);
  },

  numberp: s => typeof s === 'number',

  symbolp(s) {
    return s instanceof Symbol;
  },

  functionp(f) {
    return typeof f === 'function';
  },

  tokenize(s) {
    return s
      .replace(/;.*\n/g, '')
      .replace(/\n/g, '')
      .replace(/\(/g, ' (  ')
      .replace(/\)/g, ' ) ')
      .split(' ')
      .filter(t => t.length > 0);
  }
});


const example = readFileSync('./compiler.jsser').toString();

let env = newenv();

env.$log(env.$parse(example));
try {
  env.$log('eval to', env.$progn.apply(env, env.$parse(example)));
} catch (e) {
  console.log(e);
}

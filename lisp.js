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
import * as readline from 'readline';
import process from 'process';
import { readFileSync } from 'fs';

class Symbol {
  constructor(s) {
    this.name = s;
  }
  [util.inspect.custom](depth, opts) {
    return '`' + this.name + '`';
  }

  toString() {
    return '`' + this.name + '`';
  }

}

const newenv = () => ({
  shouldDebug: false,
  debug() {
    this.shouldDebug = !this.shouldDebug;
  },
  cons(a, b) {
    this.$debug('cons', a, b);
    if (Array.isArray(b)) {
      return [a, ...b];
    } else {
      return [a, b];
    }
  },

  $applicative: function(fn) {
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
    console.log(...args);
  },

  log(...args) {
    this.$log(...args);
  },

  $debug(...args) {
    if (this.shouldDebug) {
      this.$log.apply(this, args);
    }
  },

  wrap(fn) {
    return this.$wrap(fn);
  },

  $wrap(fn) {
    if (typeof fn !== 'function') {
      throw new Error(`attempted to wrap a non-fn ${fn}`);
    }
    this.$debug('wrap', fn);
    return function(...args) {
      this.$debug('call wrapped fn', fn, args);
      return fn.apply(this, this.$mapeval(args));
    };
  },

  level: 0,

  hygenic: false,

  $childenv() {
    let base = this;
    let env = new Proxy({
      parent: base,
      level: base.level + 1,
    }, {
      get(obj, p) {
        if (p in obj) {
          return obj[p];
        } else if (obj.parent) {
          let lookup = obj.parent[p];
          if (lookup instanceof Function) {
            lookup.bind(env);
          }
          return lookup;
        } else {
          throw new Error(`undefined ${p}`);
        }
      },

      set(obj, p, val) {
        obj[p] = val;
        return true;
      }
    });
    return env;
  },

  eq(a, b) {
    return this.$eq(a, b);
  },

  gt(a, b) {
    return a > b;
  },

  lt(a, b) {
    return a < b;
  },

  $eq(a, b) {
    if (this.$numberp(a)) {
      return a === b
    } else if (this.$symbolp(a) && this.$symbolp(b)) {
      return a.name === b.name;
    } else if (this.$listp(a) && this.$listp(b)) {
      return a.length === 0 && b.length === 0;
    } else {
      return false;
    }
  },

  $caris(form, name) {
    return this.$listp(form) && this.$eq(this.$car(form), new Symbol(name));
  },

  $progn(...args) {
    let res;
    for (let statement of args) {
      res = this.$eval(statement);
    }
    return res;
  },

  $set(symbol, value) {
    if (this.parent && !this.hygenic) {
      this.parent.$set(symbol, value);
    } else {
      this[symbol.name] = value;
    }
    this.$debug('$set', symbol, value, this);
    return value;
  },

  $define(symbol, value) {
    let val = this.$eval(value);
    this.$debug('define', symbol, val);
    if (typeof val === 'undefined') {
      throw new Error(`attempt to define ${symbol} to undefined!`);
    }
    return this.$set(symbol, val);
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
      this.$debug('call vau', args, passedArgs);
      let lambdaEnv = this.$childenv();
      for (let i = 0; i < args.length; i++) {
        let argName = args[i];
        if (argName.name.indexOf('...') === 0) {
          let spreadName = argName.name.slice(3);
          lambdaEnv[spreadName] = passedArgs.slice(i);
          this.$debug('vauarg spread', spreadName, lambdaEnv[spreadName]);
          break;
        }
        lambdaEnv[argName.name] = passedArgs[i];
        this.$debug('vauarg', argName, lambdaEnv[argName.name]);
      }
      return lambdaEnv.$eval(body);
    };
  },

  $qt(s) {
    return s;
  },

  eval(...form) {
    return this.$eval(...form);
  },

  $wrapapplicatives() {
    for (let fname in this) {
      const fn = this[fname];
      if (typeof fn === 'function' && /[\w\*\/\+\-]/.test(fn.name[0])) {
        this[fname] = this.$wrap(fn);
      }
    }
  },

  $eval(...form) {
    if (form.length === 1) {
      form = form[0];
    }
    this.$debug('$eval', form);
    if (Array.isArray(form)) {
      this.$debug('call', this.$car(form));
      return this.$combine(this.$eval(this.$car(form)), this.$cdr(form))
    } else if (this.$symbolp(form)) {
      if (form.name[0] === "'") {
        return new Symbol(form.name.slice(1));
      }
      let sym = this[form.name];
      if (typeof sym === 'undefined') {
        this.$debug('undefined', this);
        throw new Error(`undefined ${form}`);
      }
      this.$debug('symbol', form, this[form.name]);
      return this[form.name];
    } else {
      return form;
    }
  },

  $combine(c, ops) {
    this.$debug('combine', c, ops);
    if (c instanceof Function) {
      return c.apply(this, ops);
    } else {
      throw new Error(`cannot combine ${JSON.stringify(c)}, ${JSON.stringify(ops)}`);
    }
  },

  list(...l) {
    return l;
  },

  exit() {
    process.exit(0);
  },

  $parse(s) {
    this.toks = this.$tokenize(s);
    let p = [];
    while (this.toks.length > 0) {
      p.push(this.$read_tokens());
    }
    return p.length === 1 ? p[0] : p;
  },

  $read_tokens() {
    if (this.toks.length == 0) {
      throw new Error('unexpected EOF');
    }
    let token = this.toks.shift();
    if (token === '(') {
      let sexp = [];
      while (this.toks[0] !== ')') {
        sexp.push(this.$read_tokens(this.toks));
      }
      this.toks.shift();
      return sexp;
    } else if (token === ')') {
      throw new Error('unexpected )');
    } else {
      return this.$atom(token);
    }
  },

  $call(name, ...args) {
    return this.$eval([new Symbol(name), ...args]);
  },

  mapcar(l, fn) {
    return this.$mapcar(l, fn);
  },

  $mapcar(l, fn) {
    this.$debug('mapcar', l, fn);
    return l.map(e => this.$combine(fn, [e]));
  },

  $mapeval(l) {
    this.$debug('$mapeval', l);
    return l.map(e => this.$eval(e));
  },

  apply(fn, args) {
    let fnenv = this.$childenv(true);
    return fn.apply(fnenv, args);
  },

  $atom(s) {
    let float = Number.parseFloat(s);
    if (!isNaN(float)) {
      return float;
    }
    return new Symbol(s);
  },

  $numberp: s => typeof s === 'number',

  $symbolp(s) {
    return s instanceof Symbol;
  },

  $listp(s) {
    return Array.isArray(s);
  },

  $functionp(f) {
    return typeof f === 'function';
  },

  $tokenize(s) {
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

export let env = newenv();
env["'"] = function $qtlit(...args) {
  return args;
};

env["`"] = function $qslit(...args) {
  let res = this.$mapcar(args, arg => {
    if (this.$caris(arg, ',')) {
      return this.$eval(this.$car(this.$cdr(arg)));
    } else {
      return arg;
    }
  });

  this.$debug('quasiquote', res);
  return res;
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

let replEnv = env.$childenv(true);

try {
  env.$log('loading lisp base');
  env.$progn.apply(env, env.$parse(example));
} catch (e) {
  console.log(e);
  repl();
}

async function repl() {
  rl.question('%% ', answer => {
    try {
      replEnv.$log(replEnv.$eval(replEnv.$parse(answer)));
      repl();
    } catch (e) {
      replEnv.$log(e);
      repl();
    }
  })
}

repl();

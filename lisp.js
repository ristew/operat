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
    return this.$cons(a, b);
  },

  $cons(a, b) {
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
  '+comp': function(a, b) {
    return `this.$eval(${this.$compile(a)}) + this.$eval(${this.$compile(b)})`;
  },
  '-comp': function(a, b) {
    return `this.$eval(${this.$compile(a)}) - this.$eval(${this.$compile(b)})`;
  },
  '*comp': function(a, b) {
    return `this.$eval(${this.$compile(a)}) * this.$eval(${this.$compile(b)})`;
  },
  '/comp': function(a, b) {
    return `this.$eval(${this.$compile(a)}) / this.$eval(${this.$compile(b)})`;
  },

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

  $log(...args) {
    let printed = args.map(a => this.$print(a));
    console.log(...printed);
  },

  log(...args) {
    this.$log(...args);
  },

  $debug(...args) {
    if (this.shouldDebug) {
      this.$log.apply(this, args);
    }
  },

  $map(...bindings) {
    let m = {};
    for (let binding of bindings) {
      let name = binding[0];
      let value = binding[1];
      m[name] = this.$eval(value);
    }
    return m;
  },

  $get(map, key) {
    return map[key];
  },

  $set(map, key, val) {
    return this.$eval(map)[key] = val;
  },

  $mapp(m) {
    return typeof m === 'object';
  },

  $printlist(os){
    return os.map(e => this.$print(e)).join(' ');
  },

  $print(o, pp = false) {
    if (o instanceof Error) {
      return o.stack;
    } else if (this.$symbolp(o)) {
      return o.name;
    } else if (this.$numberp(o)) {
      return o;
    } else if (this.$stringp(o)) {
      return `"${o}"`;
    } else if (this.$listp(o)) {
      return `(${this.$printlist(o)})`;
    } else if (this.$functionp(o)) {
      return o;
      if (o.name) {
        return `$function ${o.name}`;
      } else {
        return `$vau`;
      }
    } else if (this.$mapp(o)) {
      return `\n(map ${this.$printlist(Object.entries(o).map(([key, val]) => [new Symbol(key), val]))})\n`
    } else if (this.$booleanp(o)) {
      return o;
    }
  },

  $booleanp(b) {
    return typeof b === 'boolean';
  },

  $stringp(s) {
    return typeof s === 'string';
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
        if (p instanceof Symbol) {
          p = p.name;
        }
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
        if (p instanceof Symbol) {
          p = p.name;
        }
        if (typeof p !== 'string') {
          throw new Error(`set non-string in env ${p}`)
        }
        obj[p] = val;
        return true;
      }
    });
    this.$debug('childenv', env.level);
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

  $symbol(s) {
    return new Symbol(s);
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

  nativefib(n) {
    //   ($if (lt n 2) 1 (+ (fib (- n 1)) (fib (- n 2))))
    return (n < 2) ? (1) : (this.nativefib(n - 1) + this.nativefib(n - 2));
  },

  compiledfib: new Function('n', `
    return (n < 2) ? (1) : (this.nativefib(n - 1) + this.nativefib(n - 2));
`),

  $set(symbol, value) {
    if (this.parent && !this.hygenic) {
      this.$debug('$set up', symbol, '=', value, this.hygenic, this.level);
      this.parent.$set(symbol, value);
    } else {
      this.$debug('$set', symbol, value, this.hygenic, this.level);
      this[symbol.name] = value;
    }
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
    // ($if ($eval cond) ($eval then) ($eval else))
    if (this.$eval(cond)) {
      return this.$eval(then);
    } else {
      return this.$eval(elsse);
    }
  },

  $compileargs(args) {
    return args.map(arg => this.$caris(arg, 'rest') ?
                    '...' + this.$car(this.$cdr(arg)).name : arg.name);
  },

  $join(l, s) {
    return l.join(s);
  },

  $mapcompile(l) {
    return l.map(e => this.$compile(e));
  },

  $repr(form) {
    if (this.$symbolp(form)) {
      return `this.$symbol(${this.$repr(form.name)})`;
    } else if (this.$listp(form)) {
      return `[${form.map(e => this.$repr(e)).join(', ')}]`
    } else if (this.$stringp(form)) {
      return `'${form.replace(/'/g, "\\'")}'`;
    } else {
      return form.toString();
    }
  },

  $compilebase(form) {
    if (this.$listp(form) && form.length > 0) {
      let op = this.$car(form);
      let comp = this[op.name + 'comp'];
      if (comp) {
        this.$log('have compilation', form, comp);
        return comp.apply(this, this.$cdr(form));
      }
    } else if (this.$symbolp(form)) {
      return `this['${form.name}']`;
    }
    return this.$repr(form);
  },

  $compile(form) {
    let code = this.$compilebase(form);
    this.$log('$compile', form, code);
    return code;
  },

  $trycompile(form) {
    try {
      let compiled = this.$compile(form);
      this.$log('compiled', form, compiled);
      return compiled;
    } catch (e) {
      this.$log('not compiled', form, e);
      return null;
    }
  },

  $ifcomp(cond, then, elsse) {
    return `${this.$compile(cond)} ? this.$eval(${this.$compile(then)}) : this.$eval(${this.$compile(elsse)})`;
  },
  ltcomp(a, b) {
    return `${this.$compile(a)} < ${this.$compile(b)}`;
  },
  $vaucomp(args, body, hygenic = true) {
    let target = this.$compile(body);
    this.$log('target', JSON.stringify(target))
    const vauCode = `this.hygenic = ${hygenic};
${args.map(arg => `this['${arg.name}'] = ${arg.name};\n`).join('')}

return this.$eval(${target});`;
    const vauArgs = this.$compileargs(args);
    this.$log('compilevau', body, vauCode, args, vauArgs);
    vauArgs.push(vauCode);
    return new Function(...vauArgs);
  },
  $uvaucomp(args, body) {
    return this.$vaucomp(args, body, false);
  },
  $carcomp(l) {
    return `${this.$compile(l)}[0]`
  },
  $cdrcomp(l) {
    return `${this.$compile(l)}.slice(1)`;
  },
  list(...args) {
    return args;
  },

  concat(...args) {
    return args.join('');
  },

  $uvau(args, body) {
    return this.$vau(args, body, false);
  },

  $vau(args, body, hygenic = true) {
    let target = this.$vaucomp(args, body, hygenic);
    this.$log('vau', args, body, target);
    let closure = this;
    return (...passedArgs) => {
      this.$debug('call vau', args, passedArgs);
      let lambdaEnv = closure.$childenv();
      lambdaEnv.hygenic = hygenic;
      let res = target.apply(lambdaEnv, passedArgs);
      return res;
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
      if (typeof fn === 'function' &&
          /[\w\*\/\+\-]/.test(fn.name[0])) {
        if (fn.name.slice(-4) === 'comp') {
          this[fname]
        } else {
          this[fname] = this.$wrap(fn);
        }
      }
    }
  },

  stack: [],
  $eval(...form) {
    if (form.length === 1) {
      form = form[0];
    }
    if (Array.isArray(form)) {
      let operator = this.$eval(this.$car(form));
      let args = this.$cdr(form);

      this.stack.push([operator, ...args])
      let res = this.$combine(this.$eval(this.$car(form)), this.$cdr(form))
      this.stack.pop();
      this.$debug('eval', operator, ...args, '=', res)
      return res;
    } else if (this.$symbolp(form)) {
      if (form.name[0] === "'") {
        return new Symbol(form.name.slice(1));
      }
      let sym = this[form.name];
      if (typeof sym === 'undefined') {
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

  $parseToplevel(s) {
    let toks = this.$tokenize(s);
    let p = [];
    while (toks.length > 0) {
      p.push(this.$readTokens(toks));
    }
    return p;
  },

  $readTokens(toks) {
    if (toks.length == 0) {
      throw new Error('unexpected EOF');
    }
    let token = toks.shift();
    if (token === '(') {
      let sexp = [];
      while (toks[0] !== ')') {
        sexp.push(this.$readTokens(toks));
      }
      toks.shift();
      return sexp;
    } else if (token === ')') {
      throw new Error('unexpected )');
    } else {
      return token;
    }
  },

  $call(name, ...args) {
    return this.$eval([new Symbol(name), ...args]);
  },

  mapcar(l, fn) {
    return this.$mapcar(l, fn);
  },

  $mapcar(l, fn) {
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
    let toks = [];
    for (let i = 0; i < s.length; i++) {
      let c = s[i];
      if ('()'.includes(c)) {
        toks.push(c);
      } else if (c === ';') {
        while (s[i] !== '\n') {
          i++;
        }
      } else if (' \n\t'.includes(c)) {
      } else if (c === '"') {
        i++;
        let str = '';
        while (s[i] !== '"') {
          str += s[i];
        }
        toks.push(str);
      } else {
        let sym = '';
        while (s[i] && /[^ \n\t();"]/.test(s[i])) {
          sym += s[i];
          i++;
        }
        i--;
        let float = Number.parseFloat(sym);
        if (!isNaN(float)) {
          toks.push(float);
        } else {
          toks.push(new Symbol(sym));
        }
      }
    }
    return toks;
  },

  recover: true,

  $tryrecover(e, fn) {
    this.$log(e);
    if (this.recover) {
      fn();
    } else {
      process.exit(0);
    }
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
  env.$progn.apply(env, env.$parseToplevel(example));
} catch (e) {
  env.$tryrecover(e, repl);
}

async function repl() {
  rl.question('%% ', answer => {
    try {
      replEnv.$log(replEnv.$eval(replEnv.$parseToplevel(answer)[0]));
      repl();
    } catch (e) {
      env.$tryrecover(e, repl);
    }
  })
}

repl();

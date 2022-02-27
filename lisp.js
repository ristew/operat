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
    return $cons(a, b);
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

  $compilebase(form) {
    if (this.$listp(form) && form.length > 0) {
      let op = this.$car(form);
      let comp = this.compilations[op.name];
      if (comp) {
        this.$log('have compilation', form);
        return comp.apply(this, this.$cdr(form));
      } else {
        return `this.$eval(${this.$mapcompile(form)})`;
        // return `${this.$compile(op)}.(${this.$cdr(form).map(arg => this.$compile(arg))})`;
      }
    } else if (this.$symbolp(form)) {
      if (form.name[0] === "'") {
        return `'${form.name.slice(1)}'`;
      } else {
        return `this['${form.name}']`;
      }
    } else {
      return form;
    }
  },

  $compile(form) {
    let code = this.$compilebase(form);
    this.$log('$compile', form, code);
    return code;
  },

  compilations: {
    $if(cond, then, elsse) {
      return `${this.$compile(cond)} ? ${this.$compile(then)} : ${this.$compile(elsse)}`;
    },
    lt(a, b) {
      return `${this.$compile(a)} < ${this.$compile(b)}`;
    },
    $vau(args, body, hygenic = true) {
      let target = this.$compile(body);
      const vauCode = `
let lambdaEnv = this.childenv();
lambdaEnv.hygenic = ${hygenic};
${args.map(arg => `lambdaEnv['${arg.name}'] = ${arg.name};\n`)}
${target};`;
      const vauArgs = this.$compileargs(args);
      this.$log('compilevau', body, vauCode, args, vauArgs);
      vauArgs.push(vauCode);
      return new Function(...vauArgs);
    },
    $uvau(args, body) {
      return this.compilations.$vau(args, body, false);
    },
    $car(l) {
      return `${this.$compile(l)}[0]`
    },
    $cdr(l) {
      return `${this.$compile(l)}.slice(1)`;
    },
    list(...args) {
      return this.$compile(args);
    },
    $wrap(fn) {
      let cfn = this.$compile(fn);
      return `function(...args) {
        this.$debug('call wrapped fn', ${fn}, args);
        return ${cfn}.apply(this, this.$mapeval(args));
      }`;
  },
  },

  concat(...args) {
    return args.join('');
  },

  // $uvau(args, body) {
  //   return this.$vau(args, body, false);
  // },

  // $vau(args, body, hygenic = true) {
  //   let target = body;
  //   this.$debug('vau', args, body);
  //   if (this.$compile) {
  //     target = `new Function(${this.$compileargs(args).join(',')}, \`${this.$compile(body)}\``;
  //     this.$log('compiled to', target);
  //   }
  //   let closure = this;
  //   return (...passedArgs) => {
  //     this.$debug('call vau', args, passedArgs);
  //     let lambdaEnv = closure.$childenv();
  //     lambdaEnv.hygenic = hygenic;
  //     for (let i = 0; i < args.length; i++) {
  //       let arg = args[i];
  //       if (this.$caris(arg, 'rest')) {
  //         this.$log('rest', arg);
  //         let spread = this.$listp(arg) ? arg[1] : arg;
  //         const remaining = args.length - i - 1;
  //         lambdaEnv[spread.name] = passedArgs.slice(i, passedArgs.length - remaining);
  //         if (remaining === 1) {
  //           i++;
  //           lambdaEnv[args[i].name] = passedArgs[passedArgs.length - 1];
  //         } else if (remaining > 1) {
  //           throw new Error(`more than one remaining for spread ${args}`);
  //         }
  //         this.$debug('vauarg spread', spread.name, lambdaEnv[spread.name]);
  //       } else {
  //         lambdaEnv[arg.name] = passedArgs[i];
  //         this.$debug('vauarg', arg, lambdaEnv[arg.name]);
  //       }
  //     }
  //     this.$debug(lambdaEnv);
  //     let res = lambdaEnv.$eval(target);
  //     return res;
  //   };
  // },

  $qt(s) {
    return s;
  },

  // eval(...form) {
  //   return this.$eval(...form);
  // },

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
      console.log(this);
      let operator = this.$eval(this.$car(form));
      let args = this.$cdr(form);

      return this.$combine(this.$eval(this.$car(form)), this.$cdr(form))
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

  recover: false,

  $tryrecover(fn) {
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
  console.log(e);
  env.$tryrecover();
}

async function repl() {
  rl.question('%% ', answer => {
    try {
      replEnv.$log(replEnv.$eval(replEnv.$parseToplevel(answer)[0]));
      repl();
    } catch (e) {
      replEnv.$log(e);
      env.$tryrecover();
    }
  })
}

repl();

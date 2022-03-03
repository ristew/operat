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
import process from 'process';

export class OpSymbol {
  constructor(s) {
    this.name = s;
  }
  [util.inspect.custom](depth, opts) {
    return '`' + this.name + '`';
  }

  toString() {
    return this.name;
  }
}

export function q(s) {
  return new OpSymbol(s);
}

export const newenv = () => ({
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
    return `${this.$compile(a)} + ${this.$compile(b)}`;
  },
  '-comp': function(a, b) {
    return `${this.$compile(a)} - ${this.$compile(b)}`;
  },
  '*comp': function(a, b) {
    return `${this.$compile(a)} * ${this.$compile(b)}`;
  },
  '/comp': function(a, b) {
    return `${this.$compile(a)} / ${this.$compile(b)}`;
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

  shoulddebug: {},
  debug(item) {
    this.shoulddebug[item] = true;
  },

  cleardebug() {
    this.shoulddebug = {};
  },

  $debug(subject, ...args) {
    if (this.shoulddebug[subject]) {
      this.$log.apply(this, [subject, ...args]);
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

  get(map, key) {
    return map[key];
  },

  $mset(map, key, val) {
    return this.$eval(map)[key] = val;
  },

  $mapp(m) {
    return m && typeof m === 'object';
  },

  $printlist(os){
    return os.map(e => this.$print(e)).join(' ');
  },

  $vaup(fn) {
    return !fn.wrapped;
  },

  $print(o) {
    if (o instanceof Error) {
      return o.stack;
    } else if (this.$symbolp(o)) {
      return o.name;
    } else if (this.$numberp(o)) {
      return o;
    } else if (this.$stringp(o)) {
      return `${o}`;
    } else if (this.$listp(o)) {
      return `(${this.$printlist(o)})`;
    } else if (this.$functionp(o)) {
      let name = this.$name(o);
      return `(${this.$vaup(o) ? '$vau' : '$lambda'} ${name})`;
    } else if (this.$mapp(o)) {
      return `\n(map ${this.$printlist(Object.entries(o).map(([key, val]) => [new OpSymbol(key), val]))})\n`
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

  wrap(fn, name) {
    return this.$wrap(fn, name);
  },

  $wrap(fn, name) {
    if (typeof fn !== 'function') {
      throw new Error(`attempted to wrap a non-fn ${fn}`);
    }
    this.$debug('wrap', fn, name);
    // don't set for name on function
    let [resfn] = [function(...args) {
      return fn.apply(this, this.$mapeval(args));
    }];
    // 10% slower?
    // let resfn = new Proxy(fn, {
    //   apply(target, thisArg, args) {
    //     return target.apply(thisArg, thisArg.$mapeval(args));
    //   }
    // });
    resfn.vauname = name;
    resfn.wrapped = true;
    resfn.wrapfn = fn;
    return resfn;
  },

  level: 0,

  hygenic: false,

  // lexical scoping is this easy (without closures)
  $childenv() {
    let base = this;
    return new Proxy({
      parent: base,
      level: base.level + 1,
    }, {
      get(obj, p) {
        if (p in obj) {
          return obj[p];
        } else if (obj.parent) {
          let lookup = obj.parent[p];
          // TODO: debate the merits of lexical hoisting? whatever this is
          // great for deeply nested recursive lookups, 3x faster for (fib 24)
          obj[p] = lookup;
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
  },

  gt(a, b) {
    return a > b;
  },

  lt(a, b) {
    return a < b;
  },

  eq(a, b) {
    return this.$eq(a, b);
  },

  $eq(a, b) {
    if (this.$symbolp(a) && this.$symbolp(b)) {
      return a.name === b.name;
    } else if (this.$listp(a) && this.$listp(b)) {
      return a.length === 0 && b.length === 0;
    } else {
      return a == b;
    }
  },

  is(arg) {
    return !this.nil.wrapfn.apply(this, [arg]);
  },

  nil(arg) {
    if (this.$listp(arg)) {
      return arg.length === 0;
    } else {
      return !arg;
    }
  },

  $symextend(...args) {
    return this.$symbol(args.join(''));
  },

  $symbol(s) {
    return new OpSymbol(s);
  },

  $caris(form, name) {
    return this.$listp(form) && this.$eq(this.$car(form), new OpSymbol(name));
  },

  $progn(...args) {
    this.$debug('progn', args);
    let res;
    for (let statement of args) {
      res = this.$eval(statement);
    }
    return res;
  },

  nativefib(n) {
    return (n < 2) ? (1) : (this.nativefib(n - 1) + this.nativefib(n - 2));
  },

  $set(symbol, value) {
    if (this.parent && !this.hygenic) {
      this.$debug('set', 'up', symbol, '=', value, this.hygenic, this.level);
      this.parent.$set(symbol, value);
    } else {
      this.$debug('set', symbol, value, this.hygenic, this.level);
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
    this.$debug('if', cond, then, elsse);
    if (this.$eval(cond)) {
      return this.$eval(then);
    } else {
      return this.$eval(elsse);
    }
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

  $logtime(form) {
    let time = +new Date();
    let res =this.$eval(form);
    this.$log(form, res, (+new Date() - time) / 1000);
    return res;
  },

  $compref(s) {
    return `this['${s.name.replace(/'/g, "\\'")}']`;
  },

  $compile(form) {
    this.$debug('compile', form);
    if (this.$listp(form) && form.length > 0) {
      let op = this.$car(form);
      let comp = this[op.name + 'comp'];
      if (comp) {
        return comp.apply(this, this.$cdr(form));
      } else if (op.name && !op.name.includes('$')) {
        this.$debug('compile', 'wrap', op);
        return `${this.$compref(op)}.wrapfn.apply(this, [${this.$mapcompile(this.$cdr(form))}])`
      } else if (op.name.includes('$')) {
        return `${this.$compref(op)}.apply(this, ${this.$repr(this.$cdr(form))})`
      }
    } else if (this.$symbolp(form)) {
      return this.$compref(form);
    } else if (this.$numberp(form)) {
      return form;
    }
    return `this.$eval(${this.$repr(form)})`;
  },

  compile(form) {
    return this.$compile(form);
  },

  $trycompile(form) {
    try {
      let compiled = this.$compile(form);
      this.$debug('$compile', form, compiled);
      return compiled;
    } catch (e) {
      this.$debug('not compiled', form, e);
      return null;
    }
  },

  $ifcomp(cond, then, elsse) {
    return `${this.$compile(cond)} ? ${this.$compile(then)} : ${this.$compile(elsse)}`;
  },
  ltcomp(a, b) {
    return `${this.$compile(a)} < ${this.$compile(b)}`;
  },
  gtcomp(a, b) {
    return `${this.$compile(a)} > ${this.$compile(b)}`;
  },
  eqcomp(a, b) {
    return `${this.$compile(a)} === ${this.$compile(b)}`;
  },
  $carcomp(l) {
    return `${this.$compile(l)}[0]`
  },
  $cdrcomp(l) {
    return `${this.$compile(l)}.slice(1)`;
  },
  '~comp'(...args) {
    return `${this.$compile(args[0])}(${this.$mapcompile(args.slice(1)).join(', ')})`;
  },
  '~'(...args) {
    return [args[0], this.$mapeval(args.slice(1))];
  },


  concat(...args) {
    return args.join('');
  },

  $compileargs(args) {
    return args.map(arg => this.$caris(arg, 'rest') ?
                    '...' + this.$car(this.$cdr(arg)).name : arg.name);
  },

  $argname(arg) {
    if (this.$symbolp(arg)) {
      return arg;
    } else if (this.$caris(arg, 'rest')) {
      return this.$car(this.$cdr(arg));
    }
  },

  $vaucomp(args, body) {
    let target = this.$compile(body);
    const vauCode = `${args.map(arg => {
let argname = this.$argname(arg);
return `\nthis['${argname}'] = ${argname};\n`;
}).join('')}
return ${target};`;
    const vauArgs = this.$compileargs(args);
    vauArgs.push(vauCode);
    this.$debug('vaucomp', body, vauArgs);
    return new Function(...vauArgs);
  },
  $uvaucomp(args, body) {
    return this.$vaucomp(args, body, false);
  },
  $uvau(args, body, name = null) {
    return this.$vau(args, body, name, false);
  },

  $pullarg(name, args) {
    this.$log('pullarg', name, args);

    for (let i = 0; i < args.length; i++) {
      let arg = args[i];
      if (this.$caris(arg, name)) {
        args.splice(i, 1);
        return this.$cdr(arg);
      }
    }
    return [];
  },

  $vau(args, body, name = null, hygenic = true) {
    let [doc] = this.$pullarg('doc', args);
    this.$log('doc', doc);
    let target = this.$vaucomp(args, body, hygenic);
    this.$debug('vau', name, args, body, target);
    let [resfn] = [function(...passedArgs) {
      let lambdaEnv = this.$childenv();
      lambdaEnv.hygenic = hygenic;
      // this.$pushstack([name, ...passedArgs])
      let res = target.apply(lambdaEnv, passedArgs);
      // this.stack.pop();
      return res;
    }];
    resfn.vauname = name;
    resfn.args = args;
    resfn.body = body;
    resfn.hygenic = hygenic;
    if (doc) {
      resfn.doc = doc;
    }
    return resfn;
  },

  // naming functions with Object.defineProperty makes them slower
  // see https://humanwhocodes.com/blog/2015/11/performance-implication-object-defineproperty/
  $name(fn) {
    if (fn.name) {
      return fn.name;
    } else if (fn.vauname) {
      return fn.vauname;
    } else {
      return 'none';
    }
  },

  run(code) {
    this.$debug('run', code);
    return this.$progn.apply(this, this.$parseToplevel(code));
  },

  jsrun(code) {
    this.$debug('jsrun', code);
    let body = code.indexOf("return") === -1 ? `return ${code}` : code;
    return new Function('', body).apply(this, []);
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
          this[fname];
        } else {
          this[fname] = this.$wrap(fn, fname);
        }
      }
    }
  },

  stack: [],
  $pushstack(f) {
    this.stack.push(f);
  },
  $stack() {
    return this.stack.slice().reverse();
  },
  $eval(...form) {
    if (form.length === 1) {
      form = form[0];
    }
    // this.$log('eval', form);
    if (Array.isArray(form)) {
      let operator = this.$eval(this.$car(form));
      let args = this.$cdr(form);

      // this.$pushstack([this.$name(operator) || 'anonymous', ...args])
      let res = this.$combine(operator, args)
      // this.stack.pop();
      // this.$debug('eval', operator, ...args, '=', res)
      return res;
    } else if (this.$symbolp(form)) {
      if (form.name[0] === "'") {
        return new OpSymbol(form.name.slice(1));
      }
      let sym = this[form.name];
      if (typeof sym === 'undefined') {
        throw new Error(`undefined ${form}`);
      }
      // this.$debug('symbol', form, this[form.name]);
      return this[form.name];
    } else {
      return form;
    }
  },

  $combine(c, ops) {
    // this.$debug('combine', c, ops);
    if (c instanceof Function) {
      return c.apply(this, ops);
    } else {
      throw new Error(`cannot combine ${JSON.stringify(c)}, ${JSON.stringify(ops)}`);
    }
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
    return this.$eval([new OpSymbol(name), ...args]);
  },

  mapcar(l, fn) {
    // this.$debug('mapcar', l, fn);
    return this.$mapcar(l, fn);
  },

  $mapcar(l, fn) {
    return l.map(e => this.$combine(fn, [e]));
  },

  $mapeval(l) {
    // this.$debug('$mapeval', l);
    return l.map(e => this.$eval(e));
  },

  apply(fn, args) {
    // this.$debug('apply', fn, args);
    return fn.apply(this, args);
  },

  $numberp: s => typeof s === 'number',

  $symbolp(s) {
    return s instanceof OpSymbol;
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
        let str = '';
        i++;
        while (s[i] !== '"') {
          str += s[i];
          i++;
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
        } else if (sym === 'true' || sym === 'false') {
          toks.push(JSON.parse(sym))
        } else {
          toks.push(new OpSymbol(sym));
        }
      }
    }
    return toks;
  },

  recover: true,

  $tryrecover(e, fn) {
    this.$log(e);
    this.$log(this.$stack());
    if (this.recover) {
      fn();
    } else {
      process.exit(0);
    }
  }
});

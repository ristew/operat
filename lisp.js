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
import { classDef } from './objet.js'

const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;

export class OpStr {
  constructor(s) {
    this.str = s;
  }

  toString() {
    return this.str;
  }
}

export function isvau(fname) {
  return fname.length > 0 && /[\$~]/.test(fname[0]);
}


export function newenv() {
  let env = {
    class($supers, $slotDefs) {
      return classDef(this.mapeval($supers), $slotDefs);
    },
    defclass($name, $supers, ...$slotDefs) {
      this.define($name, this.class($supers, $slotDefs));
    },
    make(klass, ...$inits) {
      return klass.instantiate(...$inits);
    },

    getclass(o) {
      if (o.proto) {
        return o.proto;
      } else if (typeof o === 'number') {
        return
      }
    },

    cons(a, b) {
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

    cdr(l) {
      return l.slice(1);
    },

    log(...args) {
      let printed = args.map(a => this.print.$(a));
      console.log(...printed);
    },

    typeof(o) {
      return typeof o;
    },

    printlist(os) {
      return os.map(e => this.print.$(e)).join(' ');
    },

    $dbg(...args) {
      let res = this.$eval(...args);
      this.$log(args, res);
      return res;
    },

    $print(o) {
      if (o instanceof Error) {
        return o.stack;
      } else if (this.$symbolp._(o)) {
        return o;
      } else if (this.$numberp._(o)) {
        return o;
      } else if (this.$stringp._(o)) {
        if (o.str.includes(' ')) {
          return `"${o.str}"`;
        } else {
          return `${o.str}`;
        }
      } else if (this.$listp._(o)) {
        return `(${this.$printlist._(o)})`;
      } else if (this.$functionp._(o)) {
        let name = this.$name._(o);
        return `(${this.$vaup._(o) ? '$vau' : '$lambda'} ${name})`;
      } else if (this.$objp._(o)) {
        return `\n(obj ${this.$printlist._(Object.entries(o))})\n`
      } else if (this.$booleanp._(o)) {
        return o;
      }
    },

    $booleanp(b) {
      return typeof b === 'boolean';
    },

    $stringp(s) {
      return s instanceof OpStr;
    },

    _fn(fn, name, args = [], hygenic = true) {
      // this.$log('fn', fn, name, wrap, hygenic);
      let pfn = new Proxy(fn, {
        apply(target, thisArg, args) {
          let lambdaEnv = thisArg.$childenv._(thisArg);
          lambdaEnv.hygenic = hygenic;
          function wrapArgs() {
            return args.map((arg, i) => {
              let argDef = args[i];
              return argDef.vau ? arg : lambdaEnv.$eval._(arg);
            });
          }
          let wargs = wrapArgs(args);
          lambdaEnv.$pushstack._([name, ...wargs]);
          let res = target.apply(lambdaEnv, wargs);
          lambdaEnv.$popstack._();
          return res;
        },
      });
      pfn.fname = name?.toString();
      pfn.args = args;
      pfn._ = fn.bind(this);
      return pfn;
    },

    $let(defs, body) {
      this.$debug('let', defs, body);
      let childenv = this.$childenv(this);
      childenv.hygenic = true;
      for (let def of defs) {
        childenv[def[0]] = childenv.$eval(def[1]);
      }
      return childenv.$eval(body);
    },

    wrap(fn, name, args) {
      if (typeof fn !== 'function') {
        throw new Error(`attempted to wrap a non-fn ${fn}`);
      }
      this.$debug('wrap', fn, name, args);
      let resfn = this._fn(fn, name, args, fn.hygenic);
      return resfn;
    },

    level: 0,

    hygenic: false,

    functionclass() {
      return this.defclass('function', {
        constructor(fn) {
          this.fn = fn;
        },

        apply(thisArg, args) {
          return this.fn.apply(thisArg, args);
        },
      }, [])
    },

    // lexical scoping is this easy (without closures)
    $childenv(base = this) {
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
      if (this.$stringp(a) && this.$stringp(b)) {
        return a.str === b.str;
      } else if (this.$listp(a) && this.$listp(b)) {
        return a.length === 0 && b.length === 0;
      } else {
        return a == b;
      }
    },

    is(arg) {
      return !this.nil._(arg);
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

    $caris(form, name) {
      return this.$listp(form) && this.$eq(this.$car(form), name);
    },

    _nativefib(n) {
      return (n < 2) ? (n) : (this._nativefib(n - 1) + this._nativefib(n - 2));
    },

    set($symbol, value) {
      if (this.parent && !this.hygenic) {
        this.$debug('set', 'up', symbol, '=', value, this.hygenic, this.level);
        this.parent.set._(symbol, value);
      } else {
        this.$debug('set', symbol, value, this.hygenic, this.level);
        this[symbol] = value;
      }
      return value;
    },

    define(symbol, value) {
      let val = this.$eval(value);
      // this.$log('define', symbol, val);
      if (typeof val === 'undefined') {
        throw new Error(`attempt to define ${symbol} to undefined!`);
      }
      return this.set(symbol, val);
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

    $repr(form, bracket = true) {
      if (this.$symbolp(form)) {
        return form;
      } else if (this.$listp(form)) {
        const [ob, eb] = bracket ? ['[', ']'] : ['', ''];
        return `${ob}${form.map(e => this.$repr(e)).join(', ')}${eb}`
      } else if (this.$stringp(form)) {
        return `'${form.str.replace(/'/g, "\\'")}'`;
      } else {
        return form.toString();
      }
    },

    $logtime(form) {
      let time = +new Date();
      let res = this.$eval(form);
      this.$log(form, res, (+new Date() - time) / 1000);
      return res;
    },

    $jsident(s) {
      return /^[a-zA-Z$_\d]+$/.test(s);
    },

    $compref(s) {
      let n = s.toString();
      if (this.$jsident._(n)) {
        return `this.${n}`;
      } else {
        return `this['${n.replace(/'/g, "\\'")}']`;
      }
    },

    $compile(form, trace = true) {
      this.$debug('compile', form);
      if (this.$listp(form) && form.length > 0) {
        let op = this.$car(form);
        let comp = this[op]?.comp || this.nativecomps[op + 'comp'];
        if (comp) {
          return comp.apply(this, this.$cdr(form));
        } else if (op) {
          if (!isvau(op)) {
            // this.$log('compile', 'wrap', op);
            if (trace) {
              return `${this.$compref(op)}('$', ${this.$mapcompile(this.$cdr(form))})`
            } else {
              return `${this.$compref(op)}(${this.$mapcompile(this.$cdr(form))})`
            }
          } else {
            return `${this.$compref(op)}(${this.$repr(this.$cdr(form), false)})`
          }
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

    nativecomps: {
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
        return `${this.$compile(args[0])}.apply(this, [${this.$mapcompile(args.slice(1)).join(', ')}])`;
        //return `[${this.$repr(args[0])}, ${this.$mapcompile(args)}]`;
      },
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
    },
    '~'(...args) {
      return this.$eval([args[0], ...this.$mapeval(args.slice(1))]);
    },

    concat(...args) {
      return args.join('');
    },

    $compileargs(args) {
      return args.map(arg => this.$caris(arg, 'rest') ?
        '...' + this.$car(this.$cdr(arg)) : arg);
    },

    $argname(arg) {
      if (this.$symbolp._(arg)) {
        return arg;
      } else if (this.$caris._(arg, 'rest')) {
        return this.$car._(this.$cdr._(arg));
      }
    },

    $uvau(args, body, name = null) {
      return this.$vau._(args, body, name, false);
    },

    $pullarg(name, args) {
      this.$debug('pullarg', name, args);

      for (let i = 0; i < args.length; i++) {
        let arg = args[i];
        if (this.$caris(arg, name)) {
          args.splice(i, 1);
          return this.$cdr(arg);
        }
      }
      return [];
    },
    $transvau(args, body, asink = false) {
      // this.$log('transvau', args, body);
      let target = this.$compile._(body);
      function transvaudebug(ag) {
        if (false) {
          return `console.log('set ${ag} = ', this['${ag}'])\n`;
        }
        return '';
      }
      const vauCode = `${args.map(arg => {
        let argname = this.$argname._(arg);
        return `\nthis['${argname}'] = ${argname};\n${transvaudebug(argname)}`;
      }).join('')}
return ${target}`;
      const vauArgs = this.$compileargs._(args);
      vauArgs.push(vauCode);
      this.$log('transvau', body, vauArgs);
      if (asink) {
        return new AsyncFunction(...vauArgs);
      } else {
        return new Function(...vauArgs);
      }
    },

    $vau(args, body, name = null, hygenic = true) {
      let [doc] = this.$pullarg._('doc', args);
      this.$debug('vau', name, args, body);
      let target = this.$transvau._(args, body);
      let resfn = this._fn(target, name, false, hygenic);
      resfn.args = args;
      resfn.body = body;
      if (doc) {
        resfn.doc = doc;
      }
      return resfn;
    },

    $name(fn) {
      return fn.fname || 'anonymous';
    },

    $progn(...args) {
      let res;
      for (let statement of args) {
        res = this.eval(statement);
      }
      this.$debug('progn', args, res);
      return res;
    },

    run(code) {
      return this.$run(code);
    },

    $run(code) {
      this.$debug('run', code);
      return this.$progn(...this.$parseToplevel(code));
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

    _fnargs($fn) {
      return [...new Array($fn.length)].map(_ => ({}));
    },

    $boot() {
      for (let fname in this) {
        const fn = this[fname];
        if (typeof fn === 'function' && fname[0] !== '_') {
          console.log('boot', fname, fn.length, this._fnargs(fn));
          const args = this._fnargs(fn);
          this[fname] = this._fn(fn, fname, args, false);
          if (this.nativecomps[fname]) {
            this[fname].comp = this.nativecomps[fname];
          }
        }
      }
    },

    stack: [],
    $pushstack(f) {
      this.stack.push(f);
    },
    $popstack() {
      this.stack.pop();
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
        let operator = this.$eval._(this.$car._(form));
        let args = this.$cdr._(form);

        // this.$pushstack([this.$name(operator) || 'anonymous', ...args])
        let res = this.$combine(operator, args)
        // this.stack.pop();
        // this.$debug('eval', operator, ...args, '=', res)
        return res;
      } else if (this.$symbolp._(form)) {
        let sym = this[form];
        if (typeof sym === 'undefined') {
          throw new Error(`undefined ${form}`);
        }
        // this.$debug('symbol', form, this[form.name]);
        return this[form];
      } else {
        return form;
      }
    },

    $combine(c, ops) {
      // this.$debug('combine', c, ops);
      return c.apply(this, ops);
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
      } else if (token === '{') {
        let map = {};
        while (toks[0] !== '}') {
          const name = this.$readTokens(toks);
          const val = this.$readTokens(toks);
          // const sep = this.$readTokens(toks);
          // if (sep !== ':') {
          //   // raise hell
          //   throw new Error('invalid map sep ' + sep);
          // }
          map[name] = val;
        }
        toks.shift();
        return map;
      } else if (token === '}') {
        throw new Error('unexpected }');
      } else {
        return token;
      }
    },

    $call(name, ...args) {
      return this.$eval._([name, ...args]);
    },

    map(l, fn) {
      // this.$debug('mapcar', l, fn);
      return this.$map._(l, fn);
    },

    $map(l, fn) {
      return (l || []).map(e => fn.apply(this, [e]));
    },

    $mapeval(l) {
      // this.$debug('$mapeval', l);
      return this.$map._(l, this.$eval._);
    },

    apply(fn, args) {
      // this.$debug('apply', fn, args);
      return fn.apply(this, args);
    },

    $numberp: s => typeof s === 'number',

    $symbolp(s) {
      return typeof s === 'string';
    },

    $listp(s) {
      return Array.isArray(s);
    },

    list(...args) {
      return args;
    },

    $(...args) {
      return args;
    },

    $functionp(f) {
      return typeof f === 'function';
    },

    str($s) {
      return s;
    },

    $tokenize(s) {
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
          console.log('str', str);
          toks.push(['$str', str]);
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

    recover: false,

    $tryrecover(e, fn) {
      console.log(e);
      let stack = this.$stack._();
      console.log(stack.map(f => this.$print._(f)).join('\n'));
      this.$popstack._();
      if (this.recover) {
        fn();
      } else {
        throw new Error('die: ' + e);
      }
    }
  };
  env.$boot();
  return env;
}

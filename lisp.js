/**
 * bootstrap a lisp to javascript compiler that works on Function
 * in some ways it is tied to the semantics of javascript
 * - cons are actually lists, no dotted pairs
 * - has to handle exceptions
 * - numeric type equivalence
 * - dicts a plenty
 */

let ufn = Function('l', 'return this.car(l) * 2;');
let shouldDebug = false;
const newenv = () => ({
  cons(a, b) {
    this.debug('cons', a, b);
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

  define(symbol, value) {
    this[symbol] = value;
  },

  compile(form) {

  },

  log() {
    let msg = [];
    for (var i = 0; i < arguments.length; i++) {
      msg.push(arguments[i]);
    }
    console.log.apply(this, msg);
  },

  debug() {
    if (shouldDebug) {
      this.log.apply(this, arguments);
    }
  },

  eq: (a, b) => a === b,

  parentEnv: null,

  eval(form) {
    this.debug('eval', form);
    if (this.parentEnv) {
      this.debug('child');
    }
    if (Array.isArray(form)) {
      if (this.eq(this.car(form), 'define')) {
        const [_, name, value] = form;
        return this[name] = this.eval(value);
      } else if (this.eq(this.car(form), 'if')) {
        const [_, cond, then, elsse] = form;
        this.debug('if', cond, then, elsse);
        if (this.eval(cond)) {
          return this.eval(then);
        } else {
          return this.eval(elsse);
        }
      } else if (this.eq(this.car(form), 'lambda')) {
        const [_, args, body] = form;
        this.debug('lambda', args);
        return (...passedArgs) => {
          this.debug('lamba call', body);
          let i = 0;
          let lambdaEnv = newenv();
          lambdaEnv.parentEnv = this;
          for (let argName of args) {
            lambdaEnv[argName] = this.eval(passedArgs[i]);
            i++;
          }
          return lambdaEnv.eval(body);
        }
      } else if (this.eq(this.car(form), 'progn')) {
        let res;
        for (let statement of this.cdr(form)) {
          this.debug('progn', statement);
          res = this.eval(statement);
        }
        return res;
      } else {
        let fn = this.findSymbol(this.car(form));
        this.debug('fn', fn);
        return fn.apply(this, this.cdr(form).map(e => this.eval(e)));
      }
    } else if (this.numberp(form)) {
      return form;
    } else {
      return this.findSymbol(form);
    }
  },

  findSymbol(symbol) {
    if (this.hasOwnProperty(symbol)) {
      return this[symbol];
    } else if (this.parentEnv) {
      this.debug('find up', symbol);
      return this.parentEnv.findSymbol(symbol);
    } else {
      throw new Error(`undefined symbol ${symbol}`);
    }
  },

  parse(s) {
    return this.read_tokens(this.tokenize(s));
  },

  read_tokens(toks) {
    if (toks.length == 0) {
      throw new Error('unexpected EOF');
    }
    let token = toks.shift();
    if (token === '(') {
      let sexp = [];
      while (toks[0] !== ')') {
        sexp.push(this.read_tokens(toks));
      }
      toks.shift();
      return sexp;
    } else if (token === ')') {
      throw new Error('unexpected )');
    } else {
      return this.atom(token);
    }
  },

  atom(s) {
    let float = Number.parseFloat(s);
    if (!isNaN(float)) {
      return float;
    }
    return s;
  },

  numberp: s => typeof s === 'number',

  tokenize(s) {
    return s.replace(/\n/g, '').replace(/\(/g, ' (  ').replace(/\)/g, ' ) ').split(' ').filter(t => t.length > 0);
  }
});

const example = `
(progn
    (define fact (lambda (n)
      (if (eq n 0)
        1
        (* n (fact (- n 1))))))
    (fact 100)
)
`;

let env = newenv();

env.log(env.parse(example));
env.log('eval to', env.eval(env.parse(example)));

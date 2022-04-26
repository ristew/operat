function atom(v) {
  return [v, '.'];
}
const Env = {
  classOf(obj) {
    if ('class' in obj) {
      return this.lookup(obj.class);
    } else if (Array.isArray(obj)) {
      return this.lookup('List');
    } else {
      throw new Error('no class for ', JSON.stringify(obj));
    }
  },
  classes: {},
  lookup(name) {
    return this.classes[name];
  },
  eval(form) {
    let receiver = form[0];
    let msg = form.slice(1);
    return this.send(this.eval(receiver), receiver?.indexOf('$') === 0 ? msg : this.eval(msg));
  },
  send(receiver, message) {
    if (message === '.') {
      return receiver;
    } else {
      return this.classOf(receiver).dispatch(message);
    }
  }
}
let Object = {
  dispatch()
}
let base = [
  'Object', 'method', {
    $name: atom('classOf'),
    jsdo: `classOf(this)`,
  },
  'Boolean', 'method', {
    $name: atom('then'),
    vau: atom(true),
    jsdo: `this === true ? send(arg, ['eval', '.']) : null`,
  }, '.',
];


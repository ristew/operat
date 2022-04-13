function genid() {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

function slotDefIsFn(def) {
  return ['method', 'function'].includes(def.type);
}

function proxyClass(clss) {
  return new Proxy(clss, {
    get(target, p, receiver) {
      if (p in target) {
        return target[p];
      } else if (p in target.methods) {
        let method = target.methods[p];
        target[p] = new Proxy(method.fn, {
          apply(fnTarget, thisArg, args) {
            return fnTarget.apply(receiver, args);
          }
        }); // or method.fn.bind(receiver), which is better?
        return target[p];
      }
    },
  })
}

function delegate(object, methodName, args) {
  method = findMethod(object.class, methodName);
}

function combineMethod(oldMethod, newMethod) {
}

function findMethod(classObject, methodName) {
  let method = null;
  if (methodName in classObject.methods) {
    method = classObject.methods[methodName];
  }
  return classObject.supers.reduce((prev, cur) => combineMethod(prev, findMethod(cur, methodName)), method);
}


function instantiate({ supers, slots }) {
  let proto = {
    addSlot(name, slotDef) {
      // check if a slot is being shadowed
      let cur = this[name];
      if (cur) {
        this[name] = { ...cur, ...slotDef };
      } else if (slotDef.static) {
        if (slotDefIsFn(slotDef)) {
          this[name] = this.wrapFn(slotDef);
        }
      } else {
        this.slots.push(name);
        this[name] = slotDef;
      }
    },

    mergeSuper(sup) {
      for (let slot of sup.slots) {
        this.addSlot(slot, sup[slot]);
      }
    },

    instantiate(passedVals = {}) {
      let o = {
        meta: this,
        id: genid(),
      };
      for (let slot of this.slots.filter(s => s !== 'methods')) {
        let def = this[slot];
        if (passedVals[slot]) {
          o[slot] = passedVals[slot];
        } else if (!def.optional && !('default' in def) && !slotDefIsFn(def)) {
          throw new Error('Missing value in instantiation: ' + slot);
        }
      }
      let jsproto = this.find('jsproto');
      if (jsproto) {
        o.__proto__ = jsproto;
      }
      return new Proxy(o, {
        get(target, p, receiver) {
          if (!(p in target)) {
            let found = target.meta.find(p, receiver);
            if (found === undefined) {
              throw new Error("couldn't find " + p);
            } else if (found !== null) {
              target[p] = found;
            }
            // Be fussy on undefined?
          }
          return target[p];
        }
      });
    },

    find(name, target = this) {
      if (name in this) {
        let slotDef = this[name];
        if ('default' in slotDef) {
          return slotDef.default;
        } else if (typeof slotDef === 'function') {
          return slotDef;
        } else {
          console.log(slotDef);
          throw new Error('found something wrong');
        }
      } else if (name in this.methods) {
        this[name] = this.wrapFn(this.methods[name], target);
        return this[name];
      } else {
        for (let sup of proto.supers) {
          let found = sup.find(name, target);
          if (found) {
            return found;
          }
        }
      }
      return null;
    },
    call(method, ...args) {
      let mfn = this.find(method).bind(this);
    },
    slots: [],
    supers: [...supers.slice().reverse(), StandardClass],
    type: 'object',
  };
  // linearize!
  for (let sup of proto.supers) {
    proto.mergeSuper(sup);
  }
  for (let [slotName, slotDef] of Object.entries(slots)) {
    proto.addSlot(slotName, slotDef);
  }

  return proto;
}

/*
 * addSlot
 * mergeSuper
 * instantiate
 * findMethod
 */
export const StandardClass = {
  // fake metaclass
  slots: [],
  find: function() {
    return null;
  },
  methods: {
    instantiate: {
      fn({ supers, slots }) {
        instantiate({ supers, slots })
      }
    },

  },
}

export function classDef($supers, $slots) {
  return StandardClass.instantiate({ supers: $supers, slots: $slots });
}

export const Env = classDef([], {
  parent: {
    default: null,
  },

  scope: {
    default: {},
  },

  methods: {
    class: {
      type: 'method',
      args: { $name: 'Symbol', $supers: 'List', $slots: 'Map' },
      fn($name, $supers, $slots) {
        this[$name] = StandardClass.instantiate({ supers: $supers, slots: $slots });
        return this[$name];
      },
    },

    define: {
      type: 'method',
      args: { name: 'symbol', value: 'any' },
      fn(name, value) {
        if (typeof value === 'function') {
          value = value.bind(this);
        }
        this.scope[name] = value;
        return value;
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
  }
});

export function bootObjet() {
  let env = Env.instantiate();
  env.define('Env', Env);
  env.define('StandardClass', StandardClass);
  env.define('defclass', classDef);
  env.class('Arg', [], {
    name: 'Symbol',
    type: 'Any', // ??
    default: 'Any',
  });
  env.define('Generic', classDef([], {
    name: 'Symbol',
    args: 'Args',
    methods: [],
  }))
  env.define('generics', {});
  env.define('defgeneric', function($name, $args) {
    let generic = this.lookup('Generic').instantiate({ name: $name, args: $args });
    env.lookup('generics')[$name] = generic;
    return generic;
  })
  env.define('Method', classDef([], {
    env: 'Env',
    args: 'Args',
    // TODO: qualifiers like before and after
    classes: 'List',
    body: 'Function',
    generic: 'Generic',
  }));

  env.define('methods', {});
  env.define('defmethod', function($name, $args, $body) {
    let generic = this.lookup('generics')[$name];
    let method = this.lookup('Method').instantiate({
      env: this,
      args: $args,
      body: $body, // compile??
      classes: [],
      generic,
    });
    env.lookup('methods')[$name] = method;
  });

  return env;
}

function genid() {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

function slotDefIsFn(def) {
  return ['method', 'function'].includes(def.type);
}

export const StandardClass = {
  slots: [],
  instantiate: function({ supers, slots }) {
    let proto = {
      wrapFn(def, bind = this) {
//        let fn = def.fn.bind(bind);
        let fn = new Proxy(def.fn, {
          apply(target, thisArg, args) {
            return target.apply(bind, args);
          }
        });
        for (let prop in def) {
          if (prop !== 'fn') {
            fn[prop] = def[prop];
          }
        }
        return fn;
      },
      addSlot(name, slotDef) {
        // console.log('addSlot', name, slotDef);
        // check if a slot is being shadowed
        let cur = this[name];
        if (cur) {
          // console.log('shadowed', name);
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
        // console.log(this, sup);
        for (let slot of sup.slots) {
          this.addSlot(slot, sup[slot]);
        }
      },

      instantiate(passedVals = {}) {
        let o = {
          meta: this,
          id: genid(),
        };
        for (let slot of this.slots) {
          let def = this[slot];
          if (passedVals[slot]) {
            o[slot] = passedVals[slot];
          } else if (!def.optional && !('default' in def) && !slotDefIsFn(def)) {
            throw new Error('Missing value in instantiation: ' + slot);
          }
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
          } else if (slotDefIsFn(slotDef)) {
            return this.wrapFn(slotDef, target);
          } else {
            throw new Error('found something wrong');
          }
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
}

export function classDef($supers, $slots) {
  return StandardClass.instantiate({ supers: $supers, slots: $slots });
}

export const Env = classDef([], {
  parent: {
    type: ['maybe', 'self'],
    default: null,
  },

  scope: {
    type: 'map',
    default: {},
  },

  define: {
    type: 'method',
    args: { name: 'string', value: 'any' },
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
});

export function bootObjet() {
  let env = Env.instantiate();
  env.define('Env', Env);
  env.define('StandardClass', StandardClass);
  env.define('defclass', classDef);
  env.define('Arg', classDef([], {
    name: 'Symbol',
    type: 'Any', // ??
    default: 'Any',
  }));
  env.define('Generic', classDef([], {
    name: 'Symbol',
    args: 'Args',
    methods: [],
  }))
  env.define('defgeneric', function($name, $args) {
    return this.Generic.instantiate({ name: $name, args: $args })
  })
  env.define('Method', classDef([], {
    env: 'Env',
    args: 'Args',
    // TODO: qualifiers like before and after
    classes: 'List',
    body: 'Function',
    generic: 'Generic',
  }));

  env.define('defmethod', function($name, $args, $body) {
    return this.Method.instantiate(this, $args)
  })

  return env;
}

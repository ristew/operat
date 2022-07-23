import * as R from 'ramda';
import coreJs from 'core-js';
structuredClone = coreJs.structuredClone;

// without, a strange error:
// TypeError: Invalid property descriptor. Cannot both specify accessors and a value or writable attribute, #<Object>
console.log('starting...');

export const Class = {
    name: 'Class',
    vars: {
        name: '',
        vars: {},
        methods: {},
    },
    methods: {
        create(props={}) {
            let inst = props;
            Object.keys(this.vars)
                  .filter(v => !inst.hasOwnProperty(v))
                  .forEach(v => {
                      if (this.vars[v] !== null) {
                          inst[v] = this.vars[v].clone();
                      } else {
                          inst[v] = null;
                      }
                  });
            // class.methods is objects proto
            inst.__proto__ = this.methods;
            inst.dontClone('class');
            inst.class = this;
            return inst;
        },

        // do inheritance
        subclass(props={}) {
            let m = this.class.create(props);
            m.vars = { ...this.vars, ...m.vars };
            m.methods = { ...this.methods, ...m.methods };
            m.superclass = this;
            m.methods.__proto__ = this.methods;
            return m;
        },
        format() {
            return `Class ${this.name}{ vars: ${this.vars.properties().format()}, methods: ${this.methods.properties().format()}}`
        },
        eval() {
            return this;
        },
    }
};
export const BaseObject = {
    name: 'Object',
    vars: {},
    methods: {
        dontClone(property) {
            this._noclone ||= [];
            if (!this._noclone.includes(property)) {
                this._noclone.push(property);
            }
        },
        clone() {
            // rather hackish
            if (typeof this === 'string') {
                return this + '';
            }
            const noclone = this._noclone || [];
            const take = Object.keys(this).filter(k => !noclone.includes(k));
            let c = { ...R.pick(noclone, this), ...take.reduce((o, k) => {
                // console.log('Object clone', k, this[k]);
                o[k] = this[k].clone();
                return o;
            }, {}) };
            c.__proto__ = this.__proto__;
            return c;
        },
        format() {
            return this.toString();
        },

        display() {
            console.log(this.format());
        },

        properties() {
            return Object.keys(this);
        },

        value() {
            return this;
        },

        eval(env) {
            let ret = {};
            for (let [k, v] in Object.entries(this)) {
                // ['eval', k, v].display();
                if (this.hasOwnProperty(k)) {
                    ret[k] = v.eval(env);
                }
            }
            return ret;
        }
    }
}
// jack in
export function extendProto(proto, cls) {
    for (let name in cls.methods) {
        proto[name] = cls.methods[name];
    }
}
export function metawire(o, cls=Class) {
    o.__proto__ = cls.methods;
    o.class = cls;
}
extendProto(Object.prototype, BaseObject);
metawire(Class);
metawire(BaseObject);
const BaseArray = Class.create({
    name: 'Array',
    vars: {},
    methods: {
        clone() {
            return this.map(i => i.clone());
        },
        format() {
            return `[${this.join(' ')}]`;
        },
        eval(env) {
            // console.log('arr eval', this);
            const receiver = this[0].eval(env);
            const message = this[1];
            return receiver[message](...this.slice(2));
        }
    }
});
extendProto(Array.prototype, BaseArray);
const BaseString = Class.create({
    name: 'String',
    vars: {},
    methods: {
        clone() {
            return this + '';
        },
        eval() {
            return this;
        }
    }
});
extendProto(String.prototype, BaseString);
export const BaseNumber = Class.create({
    name: 'Number',
    vars: {},
    methods: {
        display() {
            console.log(this.toString());
        },
        clone() {
            return this;
        },
        eval() {
            return this;
        },
        '+'(n) {
            return this + n;
        }
    }
});
extendProto(Number.prototype, BaseNumber);

export const BaseFunction = Class.create({
    name: 'Function',
    methods: {
        clone() {
            return this;
        },
        eval() {
            return this;
        }
    }
})
extendProto(Function.prototype, BaseFunction);

export function q(sym) {
    return Reference.create({ sym })
};

export const Env = [Class, 'create', {
    name: 'Env',
    vars: {
        scope: {},
        parent: null,
    },
    methods: {
        lookup(name) {
            if (name in this) {
                return this[name];
            } else if (this.parent !== null) {
                return this.parent.lookup(name);
            } else {
                return undefined;
            }
        },
        define(name, value) {
            this[name] = value;
            return value;
        },
        defclass(obj, meta = Class) {
            return this.define(obj.name, [meta, 'create', obj].eval());
        },
        child() {
            return this.class.create({ parent: this });
        }
    }
}].eval();

export const BaseEnv = Env.create();
BaseEnv.define('Env', Env);

export const Reference = BaseEnv.defclass({
    name: 'Reference',
    vars: {
        sym: 'nil',
    },
    methods: {
        eval(env) {
            return env.lookup(this.sym);
        }
    }
});

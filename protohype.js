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
            m.superclass = this;
            m.methods.__proto__ = this.methods;
            return m;
        },

        // add on a method
        extendMethod(name, fn) {
            if (!this.methods.hasOwnProperty(name)) {
                this.methods[name] = fn;
            } else {
                throw new Error(`Attempt to extend already defined method: ${name}`);
            }
        },

        extend(body) {
            console.log('class extend');
            Object.entries(body.methods).map(([name, fn]) => this.extendMethod(name, fn));
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
    proto: Object.prototype,
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

        log(msg) {
            console.log(msg, this);
            return this;
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
                [k, v].log('eval');
                if (this.hasOwnProperty(k)) {
                    ret[k] = v.eval(env);
                }
            }
            return ret;
        },

        compile() {
            return `{${Object.entries(this).map(([k, v]) => `${k}: ${v.compile()}`)}}`;
        }
    }
}
metawire(Class);
// jack in
export function extendProto(proto, cls) {
    for (let name in cls.methods) {
        proto[name] = cls.methods[name];
    }
}
const Primitive = metawire({
    name: 'Primitive',
    superclass: Class,
    vars: {
        proto: null,
    },
    methods: {
        extend(body) {
            Object.entries(body.methods).map(([name, fn]) => this.extendMethod(name, fn));
            Object.entries(body.methods).map(([name, fn]) => this.proto[name] = fn );
        },
        jack() {
            for (let [k, v] of Object.entries(this.methods)) {
                if (v !== null && !this.proto.hasOwnProperty(k)) {
                    this.proto[k] = v;
                }
            }
            return this;
        }
    },
    wrap(obj) {
        const p = this.create(obj);
        extendProto(p.proto, p);
        return p;
    }
})
metawire(BaseObject, Primitive);
BaseObject.jack();
export function metawire(o, cls=Class) {
    Object.setPrototypeOf(o, cls.methods);
    o.class = cls;
    if (o.superclass) {
        Object.setPrototypeOf(o.methods, o.superclass.methods);
    }
    return o;
}
const BaseArray = Primitive.create({
    name: 'Array',
    proto: Array.prototype,
    methods: {
        clone() {
            return this.map(i => i.clone());
        },
        format() {
            return `[${this.join(' ')}]`;
        },
        log(msg) {
            console.log(msg, ...this);
            return this;
        },
        eval(env) {
            // console.log('arr eval', this);
            const receiver = this[0].eval(env);
            const message = this[1];
            return receiver[message](...this.slice(2));
        },
        compile() {
            return JSCode.from(`${this[0].compile()}.${this[1]}(${this.slice(2).map(a => a.compile()).join(', ')})`);
        }
    }
}).jack();
const BaseString = Primitive.create({
    name: 'String',
    proto: String.prototype,
    methods: {
        clone() {
            return this + '';
        },
        eval() {
            return this;
        },
        sym() {
            return Sym.create({ sym: this });
        },
        compile() {
            return JSCode.from(`'${this}'`);
        },
    }
}).jack();
export const BaseNumber = Primitive.create({
    name: 'Number',
    proto: Number.prototype,
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
        },
        compile() {
            return JSCode.from(this.toString());
        },

    }
}).jack();

export const BaseFunction = Primitive.create({
    name: 'Function',
    proto: Function.prototype,
    methods: {
        clone() {
            return this;
        },
        eval() {
            return this;
        },
        compile() {
            throw new Error('cannot compile function');
        },
    }
}).jack();

export const Env = Class.create({
    name: 'Env',
    vars: {
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
            return this.define(obj.name.toString(), [meta, 'create', obj].eval());
        },
        child() {
            return this.class.create({ parent: this });
        }
    }
});

export const BaseEnv = Env.create();
BaseEnv.define('Env', Env);
BaseEnv.define('Number', BaseNumber);
BaseEnv.define('Function', BaseFunction);
BaseEnv.define('String', BaseString);
BaseEnv.define('Array', BaseArray);
BaseEnv.define('Object', BaseObject);

export const JSCode = BaseEnv.defclass({
    name: 'JSCode',
    vars: {
        code: '',
    },
    methods: {
        wrap() {
            return new Function('env', this.code);
        },
        format() {
            let backtick = '`';
            return `${backtick}${this}${backtick}`;
        },
        toString() {
            return this.code;
        }
    },
    from(code) {
        return this.create({ code });
    }
});


export const Sym = BaseEnv.defclass({
    name: 'Sym',
    vars: {
        sym: 'nil',
    },
    methods: {
        toString() {
            return this.sym;
        },
        compile() {
            return JSCode.from(`env.${this.sym}`);
        },
    }
});

Sym.extend({
    methods: {
        eval(env) {
            return env(this.sym);
        },
    }
})

export function q(sym) {
    return Sym.create({ sym })
};

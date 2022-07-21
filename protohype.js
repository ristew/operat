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
            // a bag of slots
            // const inst = { ...this.vars.clone(), ...props };
            let inst = {};
            for (let [k, v] of Object.entries(props)) {
                if (v !== null && v.hasOwnProperty('class')) {
                    console.log('inst', k, v);
                    inst[k] = v.value();
                } else {
                    inst[k] = v;
                }
            }
            Object.keys(this.vars)
                  .filter(v => !inst.hasOwnProperty(v))
                  .forEach(v => inst[v] = this.vars[v].clone());
            // class.methods is objects proto
            inst.__proto__ = this.methods;
            inst.dontClone('class');
            inst.class = this;
            return inst;
        },

        // do inheritance
        subclass(props={}) {
            console.log('subclass', props);
            let m = this.class.create(props);
            console.log('class created', m)
            m.vars = { ...this.vars, ...m.vars };
            m.methods = { ...this.methods, ...m.methods };
            m.superclass = this;
            m.methods.__proto__ = this.methods;
            return m;
        },
        format() {
            return `Class ${this.name}{ vars: ${this.vars.properties().format()}, methods: ${this.methods.properties().format()}}`
        }
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
        }
    }
});
extendProto(Number.prototype, BaseNumber);

export const LazyClass = Class.subclass({
    name: 'LazyClass',
    methods: {
        lambda(fn) {
            return this.create({
                fn
            });
        }
    }
});

export const Lazy = LazyClass.create({
    vars: {
        fn: null,
    },
    methods: {
        value() {
            return this.fn();
        }
    }
});

console.log(Lazy)

export const Interface = Class.create({
    vars: {
        super: null,
        methods: {}, // aka generic functions
    },
    methods: {

    }
});

// typing of a method, args -> ret
export const MethodDef = Class.create({
    vars: {
        args: [],
        ret: null,
    }
});

export const Arg = Class.create({
    vars: {
        name: '',
        type: null,
    }
});

export const Expression = Interface.create({
    super: null,
    methods: {
        eval: MethodDef.create({
            args: [Arg.create({
                name: 'value',
                type: Lazy.lambda(??),
            })],
            ret: () => Expression,
        })
    }
})

// follow interpreter pattern? build up OO AST?
export const SendExpression = Class.create({
    name: 'SendExpression',
    vars: {
        receiver: null,
        message: '',
        args: [],
    },
    methods: {
        eval(passed) {

        }
    }
})

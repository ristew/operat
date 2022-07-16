import * as R from 'ramda';
import coreJs from 'core-js';
structuredClone = coreJs.structuredClone;

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
            const inst = { ...this.vars.clone(), ...props };
            // class.methods is objects proto
            inst.__proto__ = this.methods;
            inst.dontClone('class');
            inst.class = this;
            return inst;
        },


        subclass(props={}) {
            let m = this.class.create(props);
            m.vars = { ...this.vars, ...m.vars };
            m.superclass = this;
            m.methods.__proto__ = this.methods;
            return m;
        },
        format() {
            return `${this.name}{ vars: ${this.vars.properties().format()}, methods: ${this.methods.properties().format()}}`
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
        }

    }
}
const BaseArray = {
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
}
const BaseString = {
    name: 'String',
    vars: {},
    methods: {
        clone() {
            return structuredClone(this);
        }
    }
}
export const BaseNumber = {
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
}
export function extendProto(proto, cls) {
    for (let name in cls.methods) {
        proto[name] = cls.methods[name];
    }
}
extendProto(Object.prototype, BaseObject);
extendProto(Array.prototype, BaseArray);
extendProto(String.prototype, BaseString);
export function metawire(o, cls=Class) {
    o.__proto__ = cls.methods;
    o.class = cls;
}
metawire(Class);
metawire(BaseObject);
extendProto(Number.prototype, BaseNumber);

const context = {
    'add-method-ref'(methodName, ref) {
        let m = this.methods[methodName];
        m.refs.push(ref);
    },
    'save-native-method'(methodName, fn) {
        let oldm = this.methods[methodName];
        fn.refs = [];
        this.methods[methodName] = fn;
        oldm?.refs.map(ref => ref[methodName] = fn.bind(ref));
    },
    methods: {
    },
};
context.save_native_method('dist', function() { return Math.sqrt(this.x ** 2 + this.y ** 2); });

const Base = new Proxy({}, {
    get(target, p, recv) {
        if (p in target) {
            return target[p];
        } else if (p in context.methods) {
            context.methods[p];
            context.add_method_ref(p, recv);
            target[p] = context.methods[p].bind(recv);
            return target[p];
        }
    }
})

function make(o) {
    let obj = Object.create(Base);
    for (let [key, val] of Object.entries(o)) {
        obj[key] = val;
    }
    return obj;
}

let test = make({ x: 3, y: 4 });
console.log(test.dist())
context['#save-native-method']('cartesianDist', function () { return this.x + this.y; });
console.log(test.cartesianDist());

const oClass = {
  constructor({ name }) {
    this.name = name;
    this.methods = {};
  },
  id() { return this.name; },
  instantiate(props) {
  }
}

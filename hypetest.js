import { BaseEnv, Class, q } from './protohype.js';

const Point = Class.create({
    vars: {
        x: 0.0,
        y: 0.0,
    },
    methods: {
        move(x, y) {
            this.x += x;
            this.y += y;
        },
        format() {
            return `${this.x}, ${this.y}`;
        },
    },
});

let p = Point.create();
p.move(3, 4);
p.display();

let o = Point.create({ y: 5 });
o.display();

const PrintyPoint = Point.subclass({
    vars: {
        name: 'Point'
    },
    methods: {
        format() {
            return `<${this.name} ${this.x}, ${this.y}>`;
        }
    }
})

let s = PrintyPoint.create({ x: 12, y: 53 });
s.display();

const Set = Class.create({
  name: 'Set',
    vars: {
        inner: [],
    },
    methods: {
        insert(n) {
            if (!this.contains(n)) {
                this.inner.push(n);
            }
        },
        contains(n) {
            return this.inner.includes(n);
        },
        isEmpty() {
            return this.inner.length === 0;
        },
        union(other) {
            let u = other.clone();
            this.inner.forEach(n => u.insert(n));
            return u;
        },
        format() {
            return `Set{${this.inner.join(' ')}}`;
        }
    }
})

let set = Set.create();
set.insert(1);
set.insert(3);
set.insert(5);
set.insert(7);
let set2 = Set.create();
set2.insert(3);
set2.insert(6);
set2.insert(9);
set.display();
set2.display();
set.union(set2).display();
(42).display();
[1, 2, 3].display();
Set.display();


console.log([2, '+', 3].eval());
BaseEnv.defclass({
    name: 'Sent'.sym(),
    vars: {
        log: [],
    },
    methods: {
        add(msg) {
            msg.display();
            this.log.push(msg);
        },
        msgCount() {
            return this.log.length;
        }
    }
});

const senty = BaseEnv.Sent.create();
senty.add('test evald class');
senty.add('very useful');
senty.add(senty.msgCount());

BaseEnv.Number.extend('cube', function() { return this ** 3; });
(7).cube().display();

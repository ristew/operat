function Class({ superclass = Class, methods, vars } = {}) {
  this.superclass = superclass;
  this.methods = methods;
  this.vars = vars;
}

Class.prototype.create = function create(props = {}) {
}

let BaseClass = new Class({
  methods: {
    create(props = {}) {
      let o = { class: this, ...props };
      o.__proto__ = this.methods;
      for (let vn in this.vars) {
        if (!vn in o) {
          o[vn] = this.vars[vn];
        }
      }
      return o;
    }
  }
});

let Rect = BaseClass.create({
  vars: {
    base: null,
    corner: null,
  },
  methods: {
  }
})

let Point = BaseClass.create({
  vars: {
    x: 0,
    y: 0,
  },
  methods: {
    rect(corner) {
      return new Rect({
        base: this,
        corner
      });
    }
  }
})

let p = Point.create({ x: 3, y: 4 });
let r = p.rect(Point.create({ x: 2, y: 2 }));
console.log(r);

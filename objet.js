
export function classDef(supers, slots) {
  let proto = {
    wrapFn(fn) {
      return new Proxy(fn, {
        apply(target, thisArg, args) {
          // console.log(target.def.name);
          let res = target.apply(thisArg, args);
          return res;
        }
      })
    },
    addSlot(slotDef) {
      if (typeof slotDef === 'function') {
        slotDef = { name: slotDef.name, type: 'method', default: slotDef };
      }
      let name = slotDef.name;
      // check if a slot is being shadowed
      let cur = this[name];
      if (cur) {
        // console.log('shadowed', name);
        slotDef = { ...cur, ...slotDef };
      } else {
        this.slots.push(name);
      }
      this[name] = slotDef;
    },

    mergeSuper(sup) {
      for (let slot of sup.slots) {
        this.addSlot(sup[slot]);
      }
    },

    instantiate(passedVals = {}) {
      let o = { meta: this };
      for (let slot of this.slots) {
        let def = this[slot];
        if (passedVals[slot]) {
          o[slot] = passedVals[slot];
        } else if (def.hasOwnProperty('default')) {
          o[slot] = def.default;
        } else if (['method', 'function'].includes(def.type)) {
          o[slot] = this.wrapFn(def[def.name]);
          o[slot].def = def;
        } else if (def.optional) {
          o[slot] = null;
        } else {
          throw new Error('Missing value in instantiation: ' + slot);
        }
      }
      return new Proxy(o, {
        get(target, p) {
          return target[p];
        },
      });
    },
    slots: [],
    type: 'class',
  };
  for (let sup of supers.slice().reverse()) {
    proto.mergeSuper(sup);
  }
  for (let slot of slots) {
    proto.addSlot(slot);
  }

  return proto;
}

// toy example
function testObject() {
  const Shape = classDef([], [
    { name: 'area', type: 'function', args: [], returns: 'number', virtual: true },
  ]);

  /*
   * (class Circle (Shape Point)
   *   (r type number default 1)
   *   (area method () (* Math.PI (pow r 2))))
   */
  const Point = classDef([], [
    { name: 'x', type: 'number', default: 0 },
    { name: 'y', type: 'number', default: 0 },
    {
      name: 'translate',
      type: 'method',
      args: [
        { name: 'dx', type: 'number', default: 0 },
        { name: 'dy', type: 'number', default: 0 },
      ],
      returns: 'self',
      translate(dx, dy) {
        this.x += dx;
        this.y += dy;
      }
    }
  ]);

  const Circle = classDef([Shape, Point], [
    { name: 'r', type: 'number', default: 1 },
    { name: 'area', type: 'function', args: [], returns: 'number', area() { return Math.PI * this.r**2; } },
  ]);

  const Rect = classDef([Shape, Point], [
    { name: 'h', type: 'number', default: 1 },
    { name: 'l', type: 'number', default: 1 },
    { name: 'area', type: 'function', args: [], returns: 'number', area() { return this.h * this.l; } },
  ]);

  let circ = Circle.instantiate();
  let rect = Rect.instantiate({ l: 3 });

  console.log(circ.area());
  console.log(rect.area());
  circ.translate(2, 3);
  circ.translate(4, 2);
  console.log(circ.x, circ.y);
}

testObject();

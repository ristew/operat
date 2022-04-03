
export function classDef(supers, slots) {
  let proto = {
    addSlot(slotDef) {
      console.log('addSlot', slotDef);
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
      // console.log(this, sup);

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
  const Shape = classDef([], {
    area: { type: 'function', args: [], returns: 'number', virtual: true },
  });

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

/* vtable: addMethod, lookup, allocate, delegated?
 * symbol: intern
 * closure: new
 */

// const symbol = classDef([], {
//   // TODO; should really be set
//   symlist: { type: [s`list`, s`symbol`], static: true, default: [] },
//   intern: { type: 'method', static: true, args: { sym: 'string' } }, returns: 'symbol', fn(sym) {
//     let found = this.symlist.find(s => s.toString() === sym);
//     if (found) return found;
//     let symbol = symbol.new(sym);
//     this.symlist.push(symbol);
//     return symbol;
//   }
// })


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
        } else if (def.default) {
          o[slot] = def.default;
        } else if (def.method) {
          o[slot] = this.wrapFn(def.method);
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
    { name: 'area', type: 'method' },
  ]);

  /*
   * (class Circle (Shape)
   *   (r type number default 1)
   *   (area method () (* Math.PI (pow r 2))))
   */
  const Circle = classDef([Shape], [
    { name: 'r', type: 'number', default: 1 },
    { name: 'area', method() { return Math.PI * this.r**2; } },
  ]);

  const Rect = classDef([Shape], [
    { name: 'h', type: 'number', default: 1 },
    { name: 'l', type: 'number', default: 1 },
    { name: 'area', method() { return this.h * this.l; } },
  ]);

  let circ = Circle.instantiate();
  let rect = Rect.instantiate({ l: 3 });

  console.log(circ.area());
  console.log(rect.area());
}

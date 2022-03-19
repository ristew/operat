
function classDef(supers, slots) {
  let proto = {
    addSlot(slotDef) {
      let name = slotDef.name;
      // check if a slot is being shadowed
      let cur = this[name];
      if (cur) {
        console.log('shadowed ', name);
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

    instantiate(passedVals) {
      let o = { meta: this };
      for (let slot of this.slots) {
        let def = this[slot];
        if (passedVals[slot]) {
          o[slot] = passedVals[slot];
        } else if (def.default) {
          o[slot] = def.default;
        } else if (def.optional) {
          o[slot] = null;
        } else {
          throw new Error('Missing value in instantiation: ' + slot);
        }
        if (def.type === 'method') {
          o[slot] = o[slot].bind(o);
        }
      }
      return o;
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

/*
 * { name: a, default: 2 }
 * { name a default 2 }
 * (map name a default 2)
 */

let A = classDef([], [{ name: 'a', type: 'number', default: 2 }]);
console.log(A);
let B = classDef([A], [
  { name: 'b', type: 'number', default: 3 },
  { name: 'test', type: 'method', default() { return this.a + this.b; } },
]);
console.log(B);
let C = classDef([A, B], [{ name: 'a', default: 4 }]);
console.log(C);

let c = C.instantiate({ b: 6 });
console.log(c.test());


export function classDef(supers, slots) {
  let proto = {
    wrapFn(def, bind = this) {
      let fn = def.fn.bind(bind);
      for (let prop in def) {
        if (prop !== 'fn') {
          fn[prop] = def[prop];
        }
      }
      return fn;
    },
    addSlot(name, slotDef) {
      // console.log('addSlot', name, slotDef);
      // check if a slot is being shadowed
      let cur = this[name];
      if (cur) {
        // console.log('shadowed', name);
        this[name] = { ...cur, ...slotDef };
      } else if (slotDef.static) {
        this[name] = this.wrapFn(slotDef);
      } else {
        this.slots.push(name);
        this[name] = slotDef;
      }
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
          o[slot] = this.wrapFn(def, o);
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
  for (let [slotName, slotDef] of Object.entries(slots)) {
    proto.addSlot(slotName, slotDef);
  }

  return proto;
}

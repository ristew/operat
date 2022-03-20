
function classDef(supers, slots) {
  let proto = {
    wrapFn(fn) {
      return new Proxy(fn, {
        apply(target, thisArg, args) {
          let res = target.apply(thisArg, args);
          if (target.def.after) {
            res = target.def.after(res);
          }
          return res;
        }
      })
    },
    addSlot(slotDef) {
      if (typeof slotDef === 'function') {
        slotDef = { name: slotDef.name, type: 'method', default: slotDef };
      }
      if ('after' in slotDef) {
        let target = this[slotDef.after];
        target.after = slotDef.fn;
        return;
      }
      if (slotDef.type === 'method') {
        slotDef.default = this.wrapFn(slotDef.default);
        slotDef.default.def = slotDef;
      }
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

    instantiate(passedVals = []) {
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

/*
 * { name: a, default: 2 }
 * { name a default 2 }
 * (map name a default 2)
 */

const Animal = classDef([], [
  { name: 'name', type: 'string' },
  function hello() {
    return `${this.name} says hello`;
  },
]);
const Dog = classDef([Animal], [
  { name: 'name', default: 'Dog' },
]);
const Cat = classDef([Animal], [
  { name: 'name', default: 'Cat' },
  { after: 'hello', fn(res) { return res + ' meowingly' } }
]);
let dog = Dog.instantiate();
let cat = Cat.instantiate();
console.log(dog.hello());
console.log(cat.hello());

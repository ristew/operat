/*
 * do OROM but vtables are metaclasses
 */

const MetaClass = {
  parents: [],
  methodCache: {},
  child: {
    method() {
      let child = this.new();
      child.parents = [this];
      return child;
    }
  },
  lookup: {
    method(name) {
      if (this[name]) {
        return this[name];
      } else {
        for (let parent of this.parents) {
          let found = parent.lookup(name);
          if (found) {
            return found;
          }
        }
      }
    }
  },
  new: {
    method() {
      return {
        meta: this,
      }
    }
  },
};

function findClass(object) {
  if ('meta' in object) {
    return object.meta;
  } else if (typeof object === 'number') {

  }
}

function findMeta(object) {
  return object.meta;
}

function send(object, messageName, args) {
  let meta = findMeta(object);
  return bind(object, messageName).method.apply(object, args);
}

function bind(object, messageName) {
  let metaClass = findMeta(object);
  if (object === MetaClass && messageName === 'lookup') {
    return MetaClass.lookup;
  } else {
    return send(metaClass, 'lookup', messageName);
  }
}

MetaClass.meta = MetaClass;

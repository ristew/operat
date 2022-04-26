/*
 * MetaClass -> Class -> objects
 */

function nativeMethod(fn) {
  return {
    method: fn,
  };
}

function send(object, message, args) {
  return findClass(object).lookup(message).apply(object, args);
}

function findClass(object) {
  if ('meta' in object) {
    return object.meta;
  } else if (typeof object === 'number') {

  }
}

const MetaClass = {
  slots: {
    slots: {},
    parents: [],
    new(args) {
      let child = { meta: this };
      for (let parent of this.parents) {
        parent.merge(child, args);
      }
      this.merge(child, args);
      return child;
    },
    merge(child, args) {
      for (let [name, def] of Object.entries(this.slots)) {
        child[name] = send(def, 'default', args[name]);
      }
      return child;
    },
  },
  parents: [],
  child() {
    let child = this.new();
    child.parents = [this];
    return child;
  },
  lookup(name) {
    console.log(this);
    if (this[name]) {
      return this[name];
    } else {
      for (let parent of this.parents) {
        let found = send(parent, 'lookup', [name]);
        if (found) {
          return found;
        }
      }
    }
  },
};
MetaClass.meta = MetaClass;

SlotDefinition = send(MetaClass, 'new', [{
  slots: {
    type: 'any',
  }
}])

console.log(SlotDefinition)


const StandardClass = {

  dispatch(name) {
    if (name in this) {
      return this[name];
    } else {
      findMeta(this).dispatch(name);
    }
  },
  new(args) {
    let child = { meta: this };
    for (let [name, val] of Object.entries(args)) {
      child[name] = merge(val, this[name]);
    }
  },
  call(name, args) {
    let fn = this.dispatch(name);
    if (typeof fn === 'function') {
      return fn.apply(this, args);
    } else {
      console.log(fn);
      throw new Error('tried to call non function');
    }
  }
};

function findMeta(object) {
  return object.meta;
}

function construct(objectForm) {

}

function dispatch(object, name) {
  if (name in object) {
    return object[name];
  } else {
    return dispatch(findMeta(object), name);
  }
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

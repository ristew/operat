/*
 * MetaClass -> Class -> objects
 */

function nativeMethod(fn) {
  return {
    method: fn,
  };
}

function dispatch(meta, message) {

}

function send(object, message, args) {
  return findClass(object).dispatch(message).apply(object, args);
}

function findClass(object) {
  if ('meta' in object) {
    return object.meta;
  } else if (typeof object === 'number') {

  }
}

const MetaClass = {
  parents: [],
  methodCache: {},
  child: nativeMethod(function() {
    let child = this.new();
    child.parents = [this];
    return child;
  }),
  lookup: nativeMethod(function (name) {
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
  }),
  new: nativeMethod(function () {
    return {
      meta: this,
    }
  }),
};

const StandardClass = {
  dispatch(name) {
    if (name in this) {
      return this[name];
    } else {
      findMeta(this).dispatch(name);
    }
  },
  instatiate(args) {

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

MetaClass.meta = MetaClass;

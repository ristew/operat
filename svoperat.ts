enum OpSymKind {
  Standard = 1,
  Vau = 2,
  Interface = 3,
  Class = 4,
  Message = 5,
}

let symPool = {};
let symCtr = 1;

class OpSym {
  _gen_id: number;
  _kind: OpSymKind;
  constructor({ gen_id, kind }) {

    this._gen_id = gen_id;
    this._kind = kind;
  }

  toString() {
    return symPool[this._gen_id];
  }

  static sym(name: string, kind = OpSymKind.Standard) {
    let genId = symCtr++;
    // idk map both ways? fuck it
    symPool[genId] = name;
    symPool[name] = genId;
    return new OpSym({ gen_id: genId, kind });
  }

  static iface(name: string) {
    return OpSym.sym(name, OpSymKind.Interface);
  }
}

function baseExtend(proto, methods) {
  for (let [key, val] of Object.entries(methods)) {
    proto.prototype[key] = val;
  }
}

baseExtend(Number, {
  eq(n) { return this === n },
});

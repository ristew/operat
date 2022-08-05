// try typescript with this bullshit
// whole language is just sigil'd symbols, {} mappings, [] lists, and () messages.
// symbols :$!~@%


type RefType = 'class' | 'interface' | 'var' | 'arg';

interface Context {
  find(type: RefType, name: string): any;
}

interface Expression {
  eval(ctx: Context): any;
}

class ObjectExpression implements Expression {
  _class: ClassRefExpression;
  _map: { string: Expression };

  eval(ctx: Context) {
    // make object
    const cls = this._class.eval(ctx);
    const props = {};
    for (let [key, val] of Object.entries(this._map)) {

    }
    return cls.create()
  }

  constructor(cls, map) {
    this._class = cls;
    this._map = map;
  }
}

class RefExpression {
  _type: RefType;
  _name: string;

  constructor(name: string) {
    this._name = name;
  }

  exprType(): RefType {
    return this._type;
  }

  eval(ctx: Context) {
    return ctx.find(this._type, this._name);
  }
}

class ClassRefExpression extends RefExpression {
  _type: RefType = 'class';
}

class InterfaceRefExpression extends RefExpression {
  _type: RefType = 'interface';
}

class VarRefExpression extends RefExpression {
  _type: RefType = 'var';

}

class ArgRefExpression extends RefExpression {
  _type: RefType = 'arg';

}

class CallExpression {

}

class VauExpression {

}

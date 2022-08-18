function TypeSym(ctx, s) {
  this._ctx = ctx;
  this._str = s;
}

function symgen(ctx, proto) {
  return new Proxy({}, {
    get(_, p, recv) {
      return new proto(ctx, p);
    }
  });
}

function Context() {
  this.csym = {};
  this.types = symgen(this, TypeSym);
}


let ctx = new Context();
console.log(ctx.types.class);

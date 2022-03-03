# operat

Operat is an operative Lisp on top of Javascript, based in large part on [Shutt's vau calculus](https://fexpr.blogspot.com/2011/04/fexpr.html).

> A list to be evaluated is a combination; its first element is the operator, and the rest of its elements are operands.  The action designated by the operator is a combiner.  A combiner that acts directly on its operands is an operative.  (Legacy terms: an operative that is a data value is a fexpr, an operative that is not a data value is a special form.)  A combiner that isn't operative is applicative; in that case, the operands are all evaluated, the results of these evaluations are called arguments, and the action is performed on the arguments instead of on the operands.

Operative combiners are prefixed wth `$`. By switching `$lambda` for `$vau` as the core combiner, we get first-class macros instead of special forms and source macro expansion. There is a performance penalty, as parts of this need to be interpreted instead of compiled given the dynamic nature of `$vau`. Some core combiners like `$if` or `eq` can be translated to Javascript recursively, and applicative calls can be simplified. This is helped by remaining semantically linked to Javascript, especially using the `this` object as the lexical environment, and replacing cons cells with arrays as the basic structural notion. Accordingly, the body of a naive Fibonacci implementation can be compiled like so:


    (log ($compile ($if (lt n 2)
      1
      (+ (fib (- n 1)) (fib (- n 2))))))

    "this['n'] < 2 ? 1 : this['fib']('unwrap', this['n'] - 1) + this['fib']('unwrap', this['n'] - 2)"


Which is only around 6x slower on my machine for `(fib 24)`, but I expect there may be more improvements in proper tail-call optimization - the recursive calls to `fib` will pass through a wrapper function that evals the operands into arguments and creates a new environment.

Currently, operat is a messy proof of concept. There are many pieces missing, including a standard library. I aim to build an object system for it and bring it into the browser where a native development environment can be created. I welcome comments and criticism, but am not yet seeking contributions.

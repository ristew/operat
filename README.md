# operat

Operat is an operative Lisp on top of JavaScript, based in large part on [Shutt's vau calculus](https://fexpr.blogspot.com/2011/04/fexpr.html). At the basis of computation, unlike normal lisp, is a construct called vau, akin to a lambda which doesn't evaluate its args. Lambda, then, is a case of this where the args are evaluated. This way, all operators are first-class objects, unlike in lisp where special forms like `if` are unavailable and macros are tied to a reading/parsing step. 

Basic definition:
   
    ($function fact (n)
      ($if (eq n 0)
        1
        (* n (fact (- n 1)))))

Compilation to JavaScript:

    %% (log ($compile ($if (lt n 2) 1 (* n (fact (- n 1))))))
      "this.n < 2 ? 1 : this.n * this.fact('$', this.n - 1)"

See core.operat for a very minimal and incomplete standard library and test suite. This isn't really Kernel, or Lisp for that matter, just a weird experiment and demonstration of JavaScript's flexibility. Currently, I'm exploring more object-oriented approaches to language design, so I doubt I will really come back to this.

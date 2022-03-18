import { newenv } from './lisp.js';

export async function start() {
  let core = await fetch('core.operat');
  let env = newenv();
  let replEnv = env.$childenv._(env);
  replEnv.hygenic = true;

  try {
    env.$log('loading lisp base');
    env.$run._(core);
  } catch (e) {
    env.$tryrecover(e, repl);
  }

  async function repl() {
    rl.question('%% ', answer => {
      try {
        replEnv.$log._(replEnv.$eval._(replEnv.$parseToplevel._(answer)[0]));
        repl();
      } catch (e) {
        env.$tryrecover._(e, repl);
      }
    })
  }
}

export function runCode(e) {
  let code = document.getElementById("code").value;
  console.log(code);
}

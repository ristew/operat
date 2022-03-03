import * as readline from 'readline';
import { newenv } from './lisp.js';
import { readFileSync } from 'fs';
const example = readFileSync('./core.operat').toString();

export let env = newenv();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});


let replEnv = env.$childenv();
replEnv.hygenic = true;

try {
  env.$log('loading lisp base');
  env.$progn.apply(env, env.$parseToplevel(example));
} catch (e) {
  env.$tryrecover(e, repl);
}

async function repl() {
  rl.question('%% ', answer => {
    try {
      replEnv.$log(replEnv.$eval(replEnv.$parseToplevel(answer)[0]));
      repl();
    } catch (e) {
      env.$tryrecover(e, repl);
    }
  })
}

repl();

import * as readline from 'readline';
import { newenv } from './lisp.js';
import { readFileSync } from 'fs';
const core = readFileSync('./core.operat').toString();

export let env = newenv();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});


let replEnv = env.$childenv._();
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

repl();

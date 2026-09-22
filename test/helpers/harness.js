'use strict';

let failed = 0;
let total = 0;

function test(name, fn) {
  total++;
  try {
    fn();
    console.log('ok - ' + name);
  } catch (error) {
    failed++;
    console.error('NG - ' + name + ': ' + error.message);
  }
}

function finish() {
  if (failed > 0) {
    console.error(failed + ' of ' + total + ' test(s) failed');
    process.exitCode = 1;
    return;
  }
  console.log('all tests passed');
}

module.exports = { test, finish };

'use strict';

const { parentPort, workerData } = require('worker_threads');
const { runGA } = require('./geneticAlgorithm');

try {
  const { problem, options } = workerData || {};
  const result = runGA(problem, options);
  parentPort.postMessage({ ok: true, result });
} catch (err) {
  parentPort.postMessage({
    ok: false,
    error: err && err.message ? err.message : String(err),
  });
}

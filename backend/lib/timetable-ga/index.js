'use strict';

const path = require('path');
const { Worker } = require('worker_threads');
const { runGA, evaluate, normalizeProblem, PENALTY, LAB_BLOCK_SLOT_INDICES } = require('./geneticAlgorithm');
const { PHANTOM_SECTION_ID } = require('./constants');

/**
 * Run timetable GA on the main thread (blocks until done).
 * @param {object} problem
 * @param {object} [options]
 */
function runTimetableGASync(problem, options) {
  return runGA(problem, options);
}

/**
 * Run timetable GA in a Worker Thread so the Express event loop stays responsive.
 * @param {object} problem — same shape as runTimetableGASync
 * @param {object} [options]
 * @returns {Promise<object>}
 */
function runTimetableGAInWorker(problem, options = {}) {
  return new Promise((resolve, reject) => {
    let finished = false;
    const workerPath = path.join(__dirname, 'timetableGaWorker.js');
    const worker = new Worker(workerPath, {
      workerData: { problem, options },
    });

    const fail = (err) => {
      if (finished) return;
      finished = true;
      worker.terminate().catch(() => {});
      reject(err);
    };

    worker.on('message', (msg) => {
      if (finished) return;
      finished = true;
      worker.terminate().catch(() => {});
      if (msg && msg.ok) resolve(msg.result);
      else fail(new Error((msg && msg.error) || 'Worker failed'));
    });
    worker.on('error', fail);
    worker.on('exit', (code) => {
      if (finished) return;
      if (code !== 0) {
        fail(new Error(`Timetable GA worker exited with code ${code}`));
      }
    });
  });
}

module.exports = {
  runTimetableGASync,
  runTimetableGAInWorker,
  runGA,
  evaluate,
  normalizeProblem,
  PENALTY,
  LAB_BLOCK_SLOT_INDICES,
  PHANTOM_SECTION_ID,
  buildGaProblemFromDb: require('./buildGaProblemFromDb').buildGaProblemFromDb,
  buildGaProblemForDepartment: require('./buildGaProblemFromDb').buildGaProblemForDepartment,
  assembleGaProblemFromMappings: require('./assembleGaProblem').assembleGaProblemFromMappings,
  appendDeptFacultyPhantoms: require('./appendDeptFacultyPhantoms').appendDeptFacultyPhantoms,
  scheduleFromGaResult: require('./scheduleFromGaResult').scheduleFromGaResult,
};

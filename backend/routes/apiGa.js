'use strict';

const express = require('express');
const { runTimetableGAInWorker } = require('../lib/timetable-ga');

const router = express.Router();

/**
 * POST /api/ga/timetable
 * Body: { problem: { ... }, options?: { populationSize, generations, ... } }
 * Runs GA in a worker thread (non-blocking for other HTTP requests on this process).
 */
router.post('/timetable', async (req, res) => {
  try {
    const { problem, options } = req.body || {};
    if (!problem || typeof problem !== 'object') {
      return res.status(400).json({ error: 'Missing `problem` object in JSON body.' });
    }
    const result = await runTimetableGAInWorker(problem, options || {});
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'GA generation failed' });
  }
});

module.exports = router;

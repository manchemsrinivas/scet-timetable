'use strict';

const { PHANTOM_SECTION_ID } = require('./constants');

/**
 * Convert GA output for one section into Timetable.schedule shape used by the admin grid save API.
 *
 * @param {object} gaResult — return value of runGA / worker
 * @param {string} sectionId — same string id used in problem.sectionIds[0]
 * @param {string[]} dayLabels — labels for each day row (length must match gaResult.meta.days)
 */
function scheduleFromGaResult(gaResult, sectionId, dayLabels, facultyMap = {}) {
  if (sectionId === PHANTOM_SECTION_ID) return [];
  const sec = gaResult.sections.find((s) => s.sectionId === sectionId);
  if (!sec || !sec.matrix5x8) return [];
  
  const metaDays = gaResult.meta?.days ?? sec.matrix5x8.length;
  let labels = dayLabels;
  if (!labels || labels.length !== metaDays) {
    labels = gaResult.meta?.dayLabels || [];
  }

  const schedule = [];
  for (let d = 0; d < sec.matrix5x8.length; d++) {
    const row = sec.matrix5x8[d];
    const periods = [];
    for (let s = 0; s < row.length; s++) {
      const cell = row[s];
      if (!cell || cell.kind === 'empty') continue;

      const facultyName = facultyMap[cell.facultyId] || cell.facultyId;

      if (cell.kind === 'lecture') {
        periods.push({
          period: cell.period,
          type: 'Subject',
          subject: cell.subjectId,
          faculty: { _id: cell.facultyId, name: facultyName },
          lab: null,
        });
      } else if (cell.kind === 'lab') {
        periods.push({
          period: cell.period,
          type: 'Lab',
          subject: cell.subjectId,
          faculty: { _id: cell.facultyId, name: facultyName },
          lab: cell.subjectId.replace('Lab:', ''),
          venue: cell.venue || null,
        });
      }
    }
    if (periods.length > 0) {
      periods.sort((a, b) => a.period - b.period);
      schedule.push({
        day: labels[d] || `Day ${d + 1}`,
        periods,
      });
    }
  }

  return schedule;
}

module.exports = { scheduleFromGaResult };

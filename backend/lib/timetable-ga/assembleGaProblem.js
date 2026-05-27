'use strict';

const Willingness = require('../../models/Willingness');

function sectionIdString(m) {
  if (!m.section) return 'unknown';
  return m.section._id ? m.section._id.toString() : m.section.toString();
}

/**
 * Build GA problem from Mapping + LabMapping documents (any number of sections).
 * First-slot rule applies to the `faculty` array in the returned problem (teaching set by default). Use `appendDeptFacultyPhantoms` for all department users.
 *
 * @param {import('mongoose').Document[]} mappings
 * @param {import('mongoose').Document[]} labMappings
 * @param {object} options
 */
async function assembleGaProblemFromMappings(mappings, labMappings, options = {}) {
  const weeklySlotsPerSubject = options.weeklySlotsPerSubject ?? 5;
  const subjectFrequencies = options.subjectFrequencies || null; // { subjectName: frequency }
  const days = options.days ?? 6;
  const slotsPerDay = options.slotsPerDay ?? 7;
  const dayLabels =
    options.dayLabels ||
    ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].slice(0, days);
  const periodLabels = options.periodLabels || Array.from({ length: slotsPerDay }, (_, i) => i + 1);

  if (mappings.length === 0 && labMappings.length === 0) {
    const err = new Error('No subject or lab mappings to schedule.');
    err.statusCode = 400;
    throw err;
  }

  const sectionIdSet = new Set();
  for (const m of mappings) sectionIdSet.add(sectionIdString(m));
  for (const lm of labMappings) sectionIdSet.add(sectionIdString(lm));
  const sectionIds = [...sectionIdSet];

  const facultyIdSet = new Set();
  for (const m of mappings) {
    if (m.faculty && m.faculty._id) facultyIdSet.add(m.faculty._id.toString());
  }
  for (const lm of labMappings) {
    if (lm.faculty && lm.faculty._id) facultyIdSet.add(lm.faculty._id.toString());
  }

  const facultyIdsArr = [...facultyIdSet];
  const wills = await Willingness.find({ faculty: { $in: facultyIdsArr } });
  const willByFaculty = new Map(wills.map((w) => [w.faculty.toString(), w]));

  const faculty = facultyIdsArr.map((id) => {
    const w = willByFaculty.get(id);
    let preferenceSubjectIds = [];
    if (w && Array.isArray(w.subjects) && w.subjects.length > 0) {
      preferenceSubjectIds = [...w.subjects]
        .sort((a, b) => (a.priority || 0) - (b.priority || 0))
        .map((s) => s.subjectName);
    }
    return { id, preferenceSubjectIds };
  });

  const lectures = [];

  for (const m of mappings) {
    if (!m.faculty || !m.faculty._id) continue;
    const sectionKey = sectionIdString(m);
    // Per-subject frequency: check subjectFrequencies map, then fall back to global
    const subjectFreq = subjectFrequencies && subjectFrequencies[m.subjectName] != null
      ? Math.min(Math.max(0, parseInt(subjectFrequencies[m.subjectName]) || 0), 8)
      : Math.min(Math.max(1, weeklySlotsPerSubject), 8);
    for (let i = 0; i < subjectFreq; i++) {
      lectures.push({
        id: `lec-${m._id}-${i}`,
        sectionId: sectionKey,
        subjectId: m.subjectName,
        facultyId: m.faculty._id.toString(),
        roomId: null,
      });
    }
  }

  const labs = labMappings.filter(lm => lm.faculty && lm.lab).map((lm) => ({
    id: `lm-${lm._id}`,
    sectionId: sectionIdString(lm),
    subjectId: `Lab:${lm.lab.name}`,
    facultyId: lm.faculty._id.toString(),
    roomId: lm.lab._id.toString(),
    venue: lm.labVenue || 'TBA',
  }));

  const subjectsMap = new Map();
  for (const m of mappings) {
    const sk = sectionIdString(m);
    const key = `${sk}\0${m.subjectName}`;
    const subjectFreq = subjectFrequencies && subjectFrequencies[m.subjectName] != null
      ? Math.min(Math.max(0, parseInt(subjectFrequencies[m.subjectName]) || 0), 8)
      : Math.min(Math.max(1, weeklySlotsPerSubject), 8);
    if (!subjectsMap.has(key)) {
      subjectsMap.set(key, {
        id: m.subjectName,
        sectionId: sk,
        maxSlotsPerWeek: subjectFreq,
      });
    }
  }
  for (const lm of labMappings) {
    const sk = sectionIdString(lm);
    const labSubjectId = `Lab:${lm.lab.name}`;
    const key = `${sk}\0${labSubjectId}`;
    if (!subjectsMap.has(key)) {
      subjectsMap.set(key, {
        id: labSubjectId,
        sectionId: sk,
        maxSlotsPerWeek: 5,
      });
    }
  }

  return {
    days,
    slotsPerDay,
    dayLabels,
    periodLabels,
    sectionIds,
    faculty,
    subjects: [...subjectsMap.values()],
    labs,
    lectures,
  };
}

module.exports = { assembleGaProblemFromMappings, sectionIdString };

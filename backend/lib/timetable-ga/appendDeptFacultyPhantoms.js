'use strict';

const User = require('../../models/User');
const Willingness = require('../../models/Willingness');
const { PHANTOM_SECTION_ID } = require('./constants');

/**
 * Extend problem so every faculty user in the department is in `faculty` and must satisfy
 * the first-period rule. Faculty with no teaching genes get one phantom period/week
 * (not tied to a real section; not saved into section timetables).
 *
 * @param {object} baseProblem — output of assembleGaProblemFromMappings
 * @param {string} department
 */
async function appendDeptFacultyPhantoms(baseProblem, department) {
  const deptUsers = await User.find({ role: 'faculty', department }).select('_id');
  if (deptUsers.length === 0) return baseProblem;

  const wills = await Willingness.find({
    faculty: { $in: deptUsers.map((u) => u._id) },
  });
  const willByFaculty = new Map(wills.map((w) => [w.faculty.toString(), w]));

  const faculty = deptUsers.map((u) => {
    const id = u._id.toString();
    const w = willByFaculty.get(id);
    let preferenceSubjectIds = [];
    if (w && Array.isArray(w.subjects) && w.subjects.length > 0) {
      preferenceSubjectIds = [...w.subjects]
        .sort((a, b) => (a.priority || 0) - (b.priority || 0))
        .map((s) => s.subjectName);
    }
    return { id, preferenceSubjectIds };
  });

  const teaching = new Set();
  for (const lec of baseProblem.lectures) teaching.add(lec.facultyId);
  for (const lab of baseProblem.labs) teaching.add(lab.facultyId);

  const phantomLectures = [];
  const phantomSubjects = [];

  for (const u of deptUsers) {
    const id = u._id.toString();
    if (teaching.has(id)) continue;
    const subjId = `__dept_obl__${id}`;
    phantomLectures.push({
      id: `phantom-${id}`,
      sectionId: PHANTOM_SECTION_ID,
      subjectId: subjId,
      facultyId: id,
      roomId: null,
      phantom: true,
    });
    phantomSubjects.push({
      id: subjId,
      sectionId: PHANTOM_SECTION_ID,
      maxSlotsPerWeek: 1,
    });
  }

  return {
    ...baseProblem,
    faculty,
    lectures: [...baseProblem.lectures, ...phantomLectures],
    subjects: [...baseProblem.subjects, ...phantomSubjects],
  };
}

module.exports = { appendDeptFacultyPhantoms };

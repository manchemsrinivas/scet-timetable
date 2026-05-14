'use strict';

const Section = require('../../models/Section');
const Mapping = require('../../models/Mapping');
const LabMapping = require('../../models/LabMapping');
const { assembleGaProblemFromMappings } = require('./assembleGaProblem');
const { appendDeptFacultyPhantoms } = require('./appendDeptFacultyPhantoms');

function wantsAllDeptFacultyFirstSlot(options) {
  return (
    options.firstSlotAllDepartmentFaculty === true ||
    options.includeAllDepartmentFacultyForFirstSlot === true
  );
}

/**
 * Build a GA problem payload from MongoDB mappings for one section.
 *
 * @param {string} sectionId
 * @param {object} [options]
 * @param {boolean} [options.firstSlotAllDepartmentFaculty] — every faculty user in the department must get period 1; non-teaching loads get a phantom period (not stored on section grids).
 * @param {boolean} [options.includeAllDepartmentFacultyForFirstSlot] — alias for firstSlotAllDepartmentFaculty.
 */
async function buildGaProblemFromDb(sectionId, options = {}) {
  const section = await Section.findById(sectionId);
  if (!section) {
    const err = new Error('Section not found');
    err.statusCode = 404;
    throw err;
  }

  const mappings = await Mapping.find({ section: sectionId }).populate('faculty', '_id name');
  const labMappings = await LabMapping.find({ section: sectionId })
    .populate('faculty', '_id name')
    .populate('lab', '_id name');

  let problem = await assembleGaProblemFromMappings(mappings, labMappings, options);
  problem = { ...problem, sectionIds: [section._id.toString()] };

  if (wantsAllDeptFacultyFirstSlot(options)) {
    problem = await appendDeptFacultyPhantoms(problem, section.department);
    problem = { ...problem, sectionIds: [section._id.toString()] };
  }

  return problem;
}

/**
 * Multi-section GA: all mappings/labs for every section in a department.
 *
 * @param {string} department
 * @param {object} [options] — same as single-section; use `firstSlotAllDepartmentFaculty` for full-department first-slot fairness.
 */
async function buildGaProblemForDepartment(department, options = {}) {
  if (!department || department === 'All') {
    const err = new Error('A specific department is required for department-wide generation.');
    err.statusCode = 400;
    throw err;
  }

  const sections = await Section.find({ department });
  if (sections.length === 0) {
    const err = new Error('No sections found for this department.');
    err.statusCode = 404;
    throw err;
  }

  const sectionObjectIds = sections.map((s) => s._id);

  const mappings = await Mapping.find({ section: { $in: sectionObjectIds } })
    .populate('faculty', '_id name')
    .populate('section', '_id');

  const labMappings = await LabMapping.find({ section: { $in: sectionObjectIds } })
    .populate('faculty', '_id name')
    .populate('lab', '_id name')
    .populate('section', '_id');

  let problem = await assembleGaProblemFromMappings(mappings, labMappings, options);

  if (wantsAllDeptFacultyFirstSlot(options)) {
    problem = await appendDeptFacultyPhantoms(problem, department);
  }

  return problem;
}

module.exports = { buildGaProblemFromDb, buildGaProblemForDepartment };

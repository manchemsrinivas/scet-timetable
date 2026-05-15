const express = require('express');
const router = express.Router();
const Willingness = require('../models/Willingness');
const Section = require('../models/Section');
const Mapping = require('../models/Mapping');
const Lab = require('../models/Lab');
const LabMapping = require('../models/LabMapping');
const Timetable = require('../models/Timetable');
const User = require('../models/User');
const { runTimetableGAInWorker } = require('../lib/timetable-ga');
const { buildGaProblemFromDb, buildGaProblemForDepartment } = require('../lib/timetable-ga/buildGaProblemFromDb');
const { scheduleFromGaResult } = require('../lib/timetable-ga/scheduleFromGaResult');

// Middleware to check if user is admin
const ensureAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') return next();
    res.status(401).json({ error: 'Unauthorized access. Please login as admin.' });
};

// Admin Dashboard Data
router.get('/dashboard', ensureAdmin, async (req, res) => {
    try {
        const { department } = req.query;
        let query = {};
        if (department && department !== 'All') {
            query.department = department;
        }

        const submissions = await Willingness.find(query).populate('faculty', 'name email');
        const sections = await Section.find(department && department !== 'All' ? { department } : {});
        
        const mappings = await Mapping.find(department && department !== 'All' ? { department } : {})
            .populate('faculty', 'name')
            .populate('section', 'name');
            
        const labs = await Lab.find(department && department !== 'All' ? { department } : {});
        const labMappings = await LabMapping.find(department && department !== 'All' ? { department } : {})
            .populate('faculty', 'name')
            .populate('lab', 'name')
            .populate('section', 'name');

        const approvedFaculty = await Willingness.find({ ...query, status: 'Approved' }).populate('faculty', 'name');
        
        // Get unique venues
        const venues = await LabMapping.distinct('labVenue', department !== 'All' ? { department } : {});

        res.json({ 
            submissions, 
            sections, 
            mappings, 
            labs,
            labMappings,
            approvedFaculty,
            venues,
            selectedDept: department || 'All' 
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// View Timetable Grid Data
router.get('/timetable/grid/:sectionId', ensureAdmin, async (req, res) => {
    try {
        const section = await Section.findById(req.params.sectionId);
        if (!section) return res.status(404).json({ error: 'Section not found.' });

        const mappings = await Mapping.find({ section: req.params.sectionId }).populate('faculty', 'name');
        const labMappings = await LabMapping.find({ section: req.params.sectionId })
            .populate('faculty', 'name')
            .populate('lab', 'name');
            
        const timetable = await Timetable.findOne({ section: req.params.sectionId });

        res.json({
            section,
            mappings,
            labMappings,
            timetable,
            days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
            periods: [1, 2, 3, 4, 5, 6, 7]
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// Add Section
router.post('/sections', ensureAdmin, async (req, res) => {
    try {
        const { name, department } = req.body;
        const section = new Section({ name, department });
        await section.save();
        res.json({ success: true, section });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Error creating section' });
    }
});

// Bulk Generate Sections
router.post('/sections/bulk', ensureAdmin, async (req, res) => {
    try {
        const { department, count } = req.body;
        const num = parseInt(count);
        if (!num || num < 1) return res.status(400).json({ success: false, error: 'Invalid count' });

        const created = [];
        for (let i = 0; i < num; i++) {
            const name = String.fromCharCode(65 + i);
            const exists = await Section.findOne({ name, department });
            if (!exists) {
                const newSec = await new Section({ name, department }).save();
                created.push(newSec);
            }
        }
        res.json({ success: true, count: created.length, sections: created });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Error bulk generating sections' });
    }
});

// Delete Section
router.post('/sections/delete/:id', ensureAdmin, async (req, res) => {
    try {
        await Section.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Section removed' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Error removing section' });
    }
});

// Add Lab
router.post('/labs', ensureAdmin, async (req, res) => {
    try {
        const { name, department } = req.body;
        const lab = new Lab({ name, department });
        await lab.save();
        res.json({ success: true, lab });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Error creating lab' });
    }
});

// Delete Lab
router.post('/labs/delete/:id', ensureAdmin, async (req, res) => {
    try {
        await Lab.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Lab removed' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Error removing lab' });
    }
});

// Create Mapping
router.post('/mappings', ensureAdmin, async (req, res) => {
    try {
        const { facultyId, subjectName, sectionId, department } = req.body;
        
        // Check if already exists
        const exists = await Mapping.findOne({ faculty: facultyId, subjectName, section: sectionId });
        if (exists) return res.status(400).json({ error: 'This faculty is already assigned to this subject for this section.' });

        const willingness = await Willingness.findOne({ faculty: facultyId });
        if (!willingness) return res.status(404).json({ error: 'Faculty willingness not found' });

        // Verify subject is in allotted list (optional but good)
        if (!willingness.allottedSubjects.includes(subjectName)) {
            return res.status(400).json({ error: 'Subject not in faculty allotted list' });
        }

        const mapping = new Mapping({
            faculty: facultyId,
            subjectName,
            section: sectionId,
            department: department || willingness.department
        });
        await mapping.save();
        res.json({ success: true, mapping });
    } catch (err) {
        console.error('Error creating mapping:', err);
        res.status(500).json({ error: 'Error creating mapping' });
    }
});

// Delete Mapping
router.post('/mappings/delete/:id', ensureAdmin, async (req, res) => {
    try {
        await Mapping.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Mapping removed' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Error removing mapping' });
    }
});

// Create Lab Mapping
router.post('/lab-mappings', ensureAdmin, async (req, res) => {
    try {
        const { facultyId, labId, sectionId, department, labVenue } = req.body;
        const mapping = new LabMapping({ faculty: facultyId, lab: labId, section: sectionId, department, labVenue });
        await mapping.save();
        res.json({ success: true, mapping });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error creating lab mapping' });
    }
});

// Delete Lab Mapping
router.post('/lab-mappings/delete/:id', ensureAdmin, async (req, res) => {
    try {
        await LabMapping.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Lab assignment removed' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Error removing lab mapping' });
    }
});

// Approve submission
router.post('/approve/:id', ensureAdmin, async (req, res) => {
    try {
        await Willingness.findByIdAndUpdate(req.params.id, { status: 'Approved' });
        res.json({ success: true, message: 'Submission approved successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error approving submission' });
    }
});

// Assign Subjects
router.post('/assign/:id', ensureAdmin, async (req, res) => {
    try {
        const { allottedSubjects } = req.body;
        let subjectsArray = Array.isArray(allottedSubjects) ? allottedSubjects : [allottedSubjects];
        await Willingness.findByIdAndUpdate(req.params.id, { allottedSubjects: subjectsArray, status: 'Approved' });
        res.json({ success: true, message: 'Subjects assigned successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error assigning subjects' });
    }
});

// GA Routes (already JSON based, but ensured consistent output)
router.post('/timetable/auto-generate', ensureAdmin, async (req, res) => {
    // ... logic preserved from monolithic version (it was already JSON-ish)
    // (Re-using existing logic but ensured res.json is called)
    try {
        const { sectionId, generations, populationSize, mutationRate, weeklySlotsPerSubject, days, slotsPerDay, firstSlotAllDepartmentFaculty } = req.body || {};
        if (!sectionId) return res.status(400).json({ error: 'sectionId is required.' });

        const problem = await buildGaProblemFromDb(sectionId, { 
            weeklySlotsPerSubject: weeklySlotsPerSubject || 5, 
            days: 6, 
            slotsPerDay: 7, 
            firstSlotAllDepartmentFaculty 
        });
        const gaResult = await runTimetableGAInWorker(problem, { generations: generations ?? 2000, populationSize: populationSize ?? 100, mutationRate: mutationRate ?? 0.25 });
        
        // Build faculty name map for better display
        const facultyIds = problem.faculty.map(f => f.id);
        const facultyDocs = await User.find({ _id: { $in: facultyIds } }, 'name');
        const facultyMap = {};
        facultyDocs.forEach(f => facultyMap[f._id.toString()] = f.name);

        const schedule = scheduleFromGaResult(gaResult, problem.sectionIds[0], problem.dayLabels, facultyMap);

        const section = await Section.findById(sectionId);
        let timetable = await Timetable.findOne({ section: sectionId });
        const fitnessPayload = { totalPenalty: gaResult.fitness.totalPenalty, breakdown: gaResult.fitness.breakdown };

        if (timetable) {
            timetable.schedule = schedule;
            timetable.gaMeta = fitnessPayload;
            await timetable.save();
        } else {
            timetable = new Timetable({ section: sectionId, department: section.department, schedule, gaMeta: fitnessPayload });
            await timetable.save();
        }
        res.json({ ok: true, fitness: gaResult.fitness, schedule });
    } catch (err) {
        res.status(err.statusCode || 500).json({ error: err.message });
    }
});

router.post('/timetable/semi-auto-generate', ensureAdmin, async (req, res) => {
    try {
        const { sectionId, fixedSlots, generations, populationSize, weeklySlotsPerSubject } = req.body;
        if (!sectionId) return res.status(400).json({ error: 'sectionId is required.' });

        const section = await Section.findById(sectionId);
        if (!section) return res.status(404).json({ error: 'Section not found' });

        let problem = await buildGaProblemForDepartment(section.department, { 
            weeklySlotsPerSubject: weeklySlotsPerSubject || 5, 
            days: 6, 
            slotsPerDay: 7 
        });

        // Convert grid-based fixedSlots to GA-friendly format
        // fixedSlots: [ { day, period, type, subject, facultyId, labId } ]
        const daysArr = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const processedFixed = [];
        
        // Tracking how many lectures/labs are already fixed
        const fixedCounts = {}; // "sectionId|facultyId|subjectId" -> count
        const fixedLabs = new Set(); // "sectionId|facultyId|labId"

        fixedSlots.forEach(fs => {
            if (!fs.subject || fs.subject === '-') return;
            
            const dayIdx = daysArr.indexOf(fs.day);
            const slotIdx = fs.period - 1;
            
            if (dayIdx === -1 || slotIdx === -1) return;

            processedFixed.push({
                day: dayIdx,
                slot: slotIdx,
                sectionId,
                facultyId: fs.facultyId || null,
                subjectId: fs.subject,
                kind: fs.type === 'Lab' ? 'lab' : 'lecture'
            });

            if (fs.type === 'Lab') {
                fixedLabs.add(`${sectionId}|${fs.facultyId}|${fs.labId}`);
            } else {
                const key = `${sectionId}|${fs.facultyId}|${fs.subject}`;
                fixedCounts[key] = (fixedCounts[key] || 0) + 1;
            }
        });

        // Filter out lectures that are already manually placed
        const remainingLectures = [];
        const currentTracker = {};
        problem.lectures.forEach(lec => {
            const key = `${lec.sectionId}|${lec.facultyId}|${lec.subjectId}`;
            const alreadyPlaced = fixedCounts[key] || 0;
            const alreadyAccounted = currentTracker[key] || 0;
            
            if (alreadyAccounted < alreadyPlaced) {
                currentTracker[key] = alreadyAccounted + 1;
                // Skip adding to remainingLectures because it's already in fixedSlots
            } else {
                remainingLectures.push(lec);
            }
        });

        // Filter out labs that are already manually placed
        const remainingLabs = problem.labs.filter(lab => {
            const key = `${lab.sectionId}|${lab.facultyId}|${lab.roomId}`;
            return !fixedLabs.has(key);
        });

        // Update problem with remaining items and fixed obstacles
        problem.lectures = remainingLectures;
        problem.labs = remainingLabs;
        problem.fixedSlots = processedFixed;

        const gaResult = await runTimetableGAInWorker(problem, { 
            generations: generations ?? 1500, 
            populationSize: populationSize ?? 80 
        });
        
        const facultyIds = problem.faculty.map(f => f.id);
        const facultyDocs = await User.find({ _id: { $in: facultyIds } }, 'name');
        const facultyMap = {};
        facultyDocs.forEach(f => facultyMap[f._id.toString()] = f.name);

        let targetSchedule = null;

        // Save timetables for ALL sections in the department to DB
        for (const sid of problem.sectionIds) {
            const schedule = scheduleFromGaResult(gaResult, sid, problem.dayLabels, facultyMap);
            
            // For the requested section, overlay the exact fixed slots to guarantee display consistency
            if (sid === sectionId) {
                schedule.forEach(daySchedule => {
                    const dayFixed = fixedSlots.filter(fs => fs.day === daySchedule.day);
                    dayFixed.forEach(fs => {
                        if (!fs.subject || fs.subject === '-') return;
                        const period = daySchedule.periods.find(p => p.period === fs.period);
                        if (period) {
                            Object.assign(period, fs);
                        }
                    });
                });
                targetSchedule = schedule;
            }

            const sec = await Section.findById(sid);
            if (sec) {
                await Timetable.findOneAndUpdate(
                    { section: sid }, 
                    { schedule: sid === sectionId ? targetSchedule : schedule, department: sec.department, gaMeta: { totalPenalty: gaResult.fitness.totalPenalty } }, 
                    { upsert: true }
                );
            }
        }

        res.json({ ok: true, fitness: gaResult.fitness, schedule: targetSchedule });
    } catch (err) {
        console.error(err);
        res.status(err.statusCode || 500).json({ error: err.message });
    }
});

router.post('/timetable/auto-generate-department', ensureAdmin, async (req, res) => {
    try {
        const { department, generations, populationSize, weeklySlotsPerSubject, days, slotsPerDay, firstSlotAllDepartmentFaculty } = req.body || {};
        if (!department || department === 'All') return res.status(400).json({ error: 'Specific department required.' });

        const problem = await buildGaProblemForDepartment(department, { 
            weeklySlotsPerSubject: weeklySlotsPerSubject || 5, 
            days: 6, 
            slotsPerDay: 7, 
            firstSlotAllDepartmentFaculty: firstSlotAllDepartmentFaculty ?? true 
        });
        const gaResult = await runTimetableGAInWorker(problem, { generations: generations ?? 450, populationSize: populationSize ?? 48 });

        // Build faculty name map
        const facultyIds = problem.faculty.map(f => f.id);
        const facultyDocs = await User.find({ _id: { $in: facultyIds } }, 'name');
        const facultyMap = {};
        facultyDocs.forEach(f => facultyMap[f._id.toString()] = f.name);

        const saved = [];
        for (const sid of problem.sectionIds) {
            const schedule = scheduleFromGaResult(gaResult, sid, problem.dayLabels, facultyMap);
            const section = await Section.findById(sid);
            await Timetable.findOneAndUpdate({ section: sid }, { schedule, department: section.department, gaMeta: { totalPenalty: gaResult.fitness.totalPenalty } }, { upsert: true });
            saved.push({ sectionId: sid });
        }
        res.json({ ok: true, fitness: gaResult.fitness, savedCount: saved.length });
    } catch (err) {
        res.status(err.statusCode || 500).json({ error: err.message });
    }
});

// Save Timetable Grid
router.post('/timetable/save', ensureAdmin, async (req, res) => {
    try {
        const { sectionId, schedule } = req.body;
        const section = await Section.findById(sectionId);
        if (!section) return res.status(404).json({ error: 'Section not found' });
        await Timetable.findOneAndUpdate({ section: sectionId }, { schedule, department: section.department }, { upsert: true });
        res.json({ success: true, message: 'Timetable saved successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
});

// Get Faculty Timetable
router.get('/faculty-timetable/:facultyId', ensureAdmin, async (req, res) => {
    try {
        const { facultyId } = req.params;
        const timetables = await Timetable.find().populate('section', 'name department');
        
        let facultySchedule = [];
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        
        days.forEach(day => {
            let dailyPeriods = [];
            for (let i = 1; i <= 7; i++) {
                dailyPeriods.push({ period: i, type: 'Break', subject: '-', faculty: null, lab: null, section: null });
            }
            facultySchedule.push({ day, periods: dailyPeriods });
        });

        // Loop through all section timetables to find assignments for this faculty
        timetables.forEach(timetable => {
            timetable.schedule.forEach(daySchedule => {
                const fDay = facultySchedule.find(d => d.day === daySchedule.day);
                if (!fDay) return;

                daySchedule.periods.forEach(period => {
                    let isAssigned = false;
                    
                    if (period.faculty) {
                        let pid;
                        if (typeof period.faculty === 'object') {
                            pid = (period.faculty._id || period.faculty.id || '').toString();
                        } else {
                            pid = period.faculty.toString();
                        }
                        if (pid === facultyId) isAssigned = true;
                    }

                    // Also check for lab mappings if multiple faculty can take a lab, or if faculty is assigned to lab
                    if (isAssigned) {
                        const fPeriod = fDay.periods.find(p => p.period === period.period);
                        if (fPeriod) {
                            fPeriod.type = period.type;
                            fPeriod.subject = period.subject;
                            fPeriod.lab = period.lab;
                            fPeriod.section = `${timetable.section.department}-${timetable.section.name}`;
                        }
                    }
                });
            });
        });

        res.json({ success: true, schedule: facultySchedule });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// Get Lab Venue Timetable
router.get('/venue-timetable/:venueName', ensureAdmin, async (req, res) => {
    try {
        const { venueName } = req.params;
        
        // Find all lab mappings for this venue
        const venueMappings = await LabMapping.find({ labVenue: venueName })
            .populate('lab', 'name')
            .populate('section', 'name department')
            .populate('faculty', 'name');

        const timetables = await Timetable.find().populate('section', 'name department');
        
        let venueSchedule = [];
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        
        days.forEach(day => {
            let dailyPeriods = [];
            for (let i = 1; i <= 7; i++) {
                dailyPeriods.push({ period: i, type: 'Free', subject: '-', faculty: null, lab: null, section: null });
            }
            venueSchedule.push({ day, periods: dailyPeriods });
        });

        // Loop through section timetables
        timetables.forEach(timetable => {
            const sectionId = timetable.section._id.toString();
            
            timetable.schedule.forEach(daySchedule => {
                const vDay = venueSchedule.find(d => d.day === daySchedule.day);
                if (!vDay) return;

                daySchedule.periods.forEach(period => {
                    if (period.type !== 'Lab' || !period.lab) return;

                    // Check if this lab session belongs to this venue
                    const labId = (typeof period.lab === 'object' ? (period.lab._id || period.lab.id) : period.lab)?.toString();
                    
                    const mapping = venueMappings.find(m => 
                        m.section._id.toString() === sectionId && 
                        m.lab._id.toString() === labId
                    );

                    if (mapping) {
                        const vPeriod = vDay.periods.find(p => p.period === period.period);
                        if (vPeriod) {
                            vPeriod.type = 'Lab';
                            vPeriod.subject = mapping.lab.name;
                            vPeriod.lab = mapping.lab.name;
                            vPeriod.faculty = mapping.faculty.name;
                            vPeriod.section = `${timetable.section.department}-${timetable.section.name}`;
                        }
                    }
                });
            });
        });

        res.json({ success: true, schedule: venueSchedule });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// Delete Submission
router.post('/submissions/delete/:id', ensureAdmin, async (req, res) => {
    try {
        await Willingness.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Submission removed successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error removing submission' });
    }
});

// Heatmap Analytics: Get departmental load per slot
router.get('/analytics/heatmap', ensureAdmin, async (req, res) => {
  try {
    const { department } = req.query;
    const query = department && department !== 'All' ? { department } : {};
    
    const timetables = await Timetable.find(query);
    const daysArr = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const slots = 7;
    
    // Initialize heatmap grid (count of faculty teaching per slot)
    const heatmap = Array.from({ length: 6 }, () => Array(slots).fill(0));
    
    timetables.forEach(tt => {
      if (tt.schedule) {
        tt.schedule.forEach(dayData => {
          const dIdx = daysArr.indexOf(dayData.day);
          if (dIdx !== -1) {
            dayData.periods.forEach(p => {
              if (p.subject && p.subject !== '-') {
                const sIdx = p.period - 1;
                if (sIdx >= 0 && sIdx < slots) {
                  heatmap[dIdx][sIdx]++;
                }
              }
            });
          }
        });
      }
    });

    // Get total approved faculty count for percentage calculation
    const totalFacultyCount = await User.countDocuments({ ...query, role: 'faculty' });

    res.json({ heatmap, totalFaculty: totalFacultyCount || 1, days: daysArr });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Heatmap calculation failed' });
  }
});

module.exports = router;

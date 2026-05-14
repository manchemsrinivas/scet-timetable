const express = require('express');
const router = express.Router();
const Willingness = require('../models/Willingness');
const Timetable = require('../models/Timetable');

// Middleware to check if user is faculty
const ensureFaculty = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'faculty') return next();
    res.status(401).json({ error: 'Unauthorized. Please login as faculty.' });
};

// Faculty Dashboard Data
router.get('/dashboard', ensureFaculty, async (req, res) => {
    try {
        const submission = await Willingness.findOne({ faculty: req.session.user.id });
        const timetables = await Timetable.find({})
            .populate('section', 'name')
            .populate('schedule.periods.lab', 'name')
            .populate('schedule.periods.faculty', 'name');
        
        res.json({ submission, timetables, userId: req.session.user.id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// Submit Willingness
router.post('/willingness', ensureFaculty, async (req, res) => {
    try {
        const { subjects, totalYearsExperience } = req.body;
        
        // Input validation could be added here
        
        let willingness = await Willingness.findOne({ faculty: req.session.user.id });
        if (willingness) {
            willingness.totalYearsExperience = totalYearsExperience || 0;
            willingness.subjects = subjects;
            willingness.status = 'Pending';
            willingness.submittedAt = Date.now();
            await willingness.save();
        } else {
            willingness = new Willingness({
                faculty: req.session.user.id,
                department: req.session.user.department,
                totalYearsExperience: totalYearsExperience || 0,
                subjects
            });
            await willingness.save();
        }

        res.json({ success: true, message: 'Willingness form submitted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to submit form' });
    }
});

module.exports = router;

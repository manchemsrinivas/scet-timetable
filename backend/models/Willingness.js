const mongoose = require('mongoose');

const WillingnessSchema = new mongoose.Schema({
    faculty: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    department: { type: String, required: true },
    totalYearsExperience: { type: Number, required: true, default: 0 },
    subjects: [{
        priority: { type: Number, required: true },
        subjectName: { type: String, required: true },
        timesHandled: { type: Number, default: 0 },
        certifications: { type: String, default: '' }
    }],
    status: { type: String, enum: ['Pending', 'Approved'], default: 'Pending' },
    allottedSubjects: [{ type: String }],
    submittedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Willingness', WillingnessSchema);

const mongoose = require('mongoose');

const TimetableSchema = new mongoose.Schema({
    section: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', required: true },
    department: { type: String, required: true },
    gaMeta: { type: mongoose.Schema.Types.Mixed, default: null },
    schedule: [{
        day: { type: String, required: true }, // e.g., 'Monday', 'Tuesday'
        periods: [{
            period: { type: Number, required: true },
            type: { type: String, enum: ['Subject', 'Lab', 'Break', 'Other'], default: 'Subject' },
            subject: { type: String },
            faculty: { type: mongoose.Schema.Types.Mixed }, // Store ID or {id, name}
            lab: { type: mongoose.Schema.Types.Mixed } // Store ID or name
        }]
    }],
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Timetable', TimetableSchema);

const mongoose = require('mongoose');

const LabSchema = new mongoose.Schema({
    name: { type: String, required: true },
    department: { type: String, required: true, enum: ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'S&H', 'MBA', 'CSBS', 'CSE-2', 'AIML', 'MCA'] },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Lab', LabSchema);

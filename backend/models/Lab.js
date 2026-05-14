const mongoose = require('mongoose');

const LabSchema = new mongoose.Schema({
    name: { type: String, required: true },
    department: { type: String, required: true, enum: ['CSE', 'IT', 'ECE', 'S&H', 'MBA'] },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Lab', LabSchema);

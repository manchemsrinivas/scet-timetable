const mongoose = require('mongoose');

const LabMappingSchema = new mongoose.Schema({
    faculty: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    lab: { type: mongoose.Schema.Types.ObjectId, ref: 'Lab', required: true },
    section: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', required: true },
    department: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('LabMapping', LabMappingSchema);

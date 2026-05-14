const mongoose = require('mongoose');

const MappingSchema = new mongoose.Schema({
    faculty: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    subjectName: { type: String, required: true },
    section: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', required: true },
    department: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Mapping', MappingSchema);

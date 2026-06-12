const mongoose = require('mongoose');

// Section schema represents a class section (e.g., A, B, C) for a department
const SectionSchema = new mongoose.Schema({
  name: { type: String, required: true }, // e.g., 'A', 'B', 'C'
  department: {
    type: String,
    required: true,
    enum: ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'S&H', 'MBA', 'CSBS', 'CSE-2', 'AIML', 'MCA']
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Section', SectionSchema);

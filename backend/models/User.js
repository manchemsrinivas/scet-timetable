const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'faculty'], default: 'faculty' },
    department: { type: String, enum: ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'S&H', 'MBA', 'CSBS', 'CSE-2', 'AIML', 'MCA'], required: function() { return this.role === 'faculty'; } }
});

UserSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

UserSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);

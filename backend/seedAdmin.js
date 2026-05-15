const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const seedAdmin = async () => {
    try {
        const uri = process.env.MONGODB_URI || 'mongodb+srv://<username>:<password>@cluster0.cjxmwws.mongodb.net/scet_timetable?retryWrites=true&w=majority';
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        const adminEmail = 'admin@scet.edu';
        const adminExists = await User.findOne({ email: adminEmail });
        
        if (adminExists) {
            console.log('Admin already exists:', adminExists.email);
            // Optional: Update password if you forgot it
            // adminExists.password = 'admin123';
            // await adminExists.save();
        } else {
            const admin = new User({
                name: 'System Admin',
                email: adminEmail,
                password: 'admin123',
                role: 'admin'
            });
            await admin.save();
            console.log('Admin user created successfully!');
            console.log('Email:', adminEmail);
            console.log('Password: admin123');
        }
        mongoose.connection.close();
    } catch (err) {
        console.error('Error seeding admin:', err);
        process.exit(1);
    }
};

seedAdmin();

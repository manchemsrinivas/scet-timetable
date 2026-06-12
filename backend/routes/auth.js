const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Register Handler
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, role, department } = req.body;
        
        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ error: 'Email already registered' });

        user = new User({ name, email, password, role, department });
        await user.save();
        res.json({ success: true, message: 'Registration successful' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Login Handler
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user || !(await user.matchPassword(password))) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        console.log(`[Login] Setting session for user: ${user.email}, SessionID: ${req.sessionID}`);
        req.session.user = { 
            id: user._id.toString(), 
            name: user.name, 
            role: user.role, 
            department: user.department 
        };
        
        req.session.save((err) => {
            if (err) {
                console.error('[Login] Session save error:', err);
                return res.status(500).json({ error: 'Login failed to save session' });
            }
            console.log(`[Login] Session saved successfully for: ${user.email}`);
            res.json({ success: true, user: req.session.user });
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Get Current User (Check session)
router.get('/me', (req, res) => {
    if (req.session.user) {
        res.json({ user: req.session.user });
    } else {
        res.status(401).json({ error: 'Not authenticated' });
    }
});

// Logout
router.post('/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true, message: 'Logged out' });
});

module.exports = router;

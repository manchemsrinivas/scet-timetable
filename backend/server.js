const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const path = require('path');
const cors = require('cors');
const flash = require('connect-flash');
const cookieParser = require('cookie-parser');
const MongoStore = require('connect-mongo');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;

// Trust proxy for secure cookies on Render/Heroku
app.set('trust proxy', 1);

app.use(cookieParser());

// Simplified CORS for testing
app.use(cors({
    origin: true, 
    credentials: true
}));

// Request logger with Session tracking
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    console.log(`- SessionID: ${req.sessionID}`);
    console.log(`- Cookies Present: ${!!req.headers.cookie}`);
    next();
});

// Body parser
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session configuration (Moved to top level)
const isProduction = process.env.NODE_ENV === 'production' || !!process.env.RENDER;

app.use(session({
    secret: process.env.SESSION_SECRET || 'scet_secret_key',
    resave: false,
    saveUninitialized: false,
    proxy: true,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/scet_timetable',
        collectionName: 'sessions',
        ttl: 24 * 60 * 60
    }),
    cookie: {
        secure: isProduction, // Only secure in production
        sameSite: isProduction ? 'none' : 'lax',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// Database Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/scet_timetable').then(() => {
    console.log('MongoDB Connected');
    
    // Debug route to check session status
    app.get('/api/debug-session', (req, res) => {
        res.json({
            sessionID: req.sessionID,
            hasUser: !!req.session.user,
            user: req.session.user || null,
            cookie: req.session.cookie,
            env: { NODE_ENV: process.env.NODE_ENV, RENDER: process.env.RENDER }
        });
    });

    // API Routes
    app.use('/api/auth', require('./routes/auth'));
    app.use('/api/faculty', require('./routes/faculty'));
    app.use('/api/admin', require('./routes/admin'));
    app.use('/api/ga', require('./routes/apiGa'));

    // Serve static files from the React app
    app.use(express.static(path.join(__dirname, '../frontend/dist')));

    // The "catchall" handler: for any request that doesn't
    // match one above, send back React's index.html file.
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
    });

    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}).catch(err => console.error('MongoDB connection error:', err));

process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
    console.error(err.name, err.message);
    console.error(err.stack);
});

process.on('unhandledRejection', (err) => {
    console.error('UNHANDLED REJECTION! 💥 Shutting down...');
    console.error(err.name, err.message);
    console.error(err.stack);
});

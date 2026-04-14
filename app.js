require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const flash = require('connect-flash');
const methodOverride = require('method-override');
const path = require('path');
const connectDB = require('./config/db');

console.log('[APP] 🚀 Starting EduTime server...');
console.log(`[APP] Environment: ${process.env.NODE_ENV || 'development'}`);

const app = express();

// Connect Database
connectDB();

// View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
console.log('[APP] View engine set to EJS');

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));
console.log('[APP] Middleware loaded');

// Session
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret-change-me',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
  cookie: { maxAge: 1000 * 60 * 60 * 8 } // 8 hours
}));
console.log('[APP] Session store initialized (MongoDB)');

// Flash
app.use(flash());

// Global vars
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  next();
});

// Request logger
app.use((req, res, next) => {
  console.log(`[REQ] ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/', require('./routes/authRoutes'));
app.use('/dashboard', require('./routes/dashboardRoutes'));
app.use('/subjects', require('./routes/subjectRoutes'));
app.use('/professors', require('./routes/professorRoutes'));
app.use('/rooms', require('./routes/roomRoutes'));
app.use('/classes', require('./routes/classRoutes'));
app.use('/timetable', require('./routes/timetableRoutes'));
app.use('/settings', require('./routes/settingsRoutes'));
app.use('/export', require('./routes/exportRoutes'));
console.log('[APP] All routes registered');

// 404
app.use((req, res) => {
  console.warn(`[APP] 404 - ${req.method} ${req.originalUrl}`);
  res.status(404).render('404', { title: '404 Not Found' });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error(`[APP] ❌ Error on ${req.method} ${req.path}:`, err.stack);
  res.status(500).render('error', { title: 'Error', message: err.message });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[APP] ✅ Server running on port ${PORT}`);
  console.log(`[APP] 🌐 URL: http://localhost:${PORT}`);
});

module.exports = app;

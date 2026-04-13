const Settings = require('../models/Settings');
const User = require('../models/User');

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

exports.getSettings = async (req, res) => {
  let settings = await Settings.findOne();
  if (!settings) settings = await Settings.create({});
  const users = await User.find().sort('name');
  res.render('settings/index', { title: 'Settings', settings, users, days: DAYS });
};

exports.postSettings = async (req, res) => {
  try {
    const {
      collegeName, departmentName, academicYear,
      workingDays, startTime, endTime,
      lectureDuration, labDuration, breakStart, breakEnd, maxLecturesPerDay
    } = req.body;

    const days = Array.isArray(workingDays) ? workingDays : (workingDays ? [workingDays] : []);

    let settings = await Settings.findOne();
    if (!settings) settings = new Settings();

    Object.assign(settings, {
      collegeName, departmentName, academicYear,
      workingDays: days, startTime, endTime,
      lectureDuration: parseInt(lectureDuration) || 50,
      labDuration: parseInt(labDuration) || 120,
      breakStart, breakEnd,
      maxLecturesPerDay: parseInt(maxLecturesPerDay) || 6
    });

    await settings.save();
    req.flash('success', 'Settings saved.');
    res.redirect('/settings');
  } catch (err) {
    req.flash('error', err.message);
    res.redirect('/settings');
  }
};

// User management
exports.postCreateUser = async (req, res) => {
  try {
    const { name, email, role, department } = req.body;
    await User.create({ name, email, role, department });
    req.flash('success', 'User created.');
  } catch (err) {
    req.flash('error', err.code === 11000 ? 'Email already exists.' : err.message);
  }
  res.redirect('/settings');
};

exports.deleteUser = async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  req.flash('success', 'User deleted.');
  res.redirect('/settings');
};
